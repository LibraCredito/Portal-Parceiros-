
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calculator, TrendingUp, Home, CreditCard, FileText, Info, CheckCircle, AlertCircle, BookOpen, Clock, DollarSign, Shield, Users, ArrowRight, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatadorInput } from '@/components/FormInputs/formatadorInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReactToPrint } from 'react-to-print';

interface SimulacaoData {
  vlr_imovel: number;
  valor_solicitado: number;
  juros: number;
  numero_parcelas: number;
  carencia: number;
  amortizacao: 'SAC' | 'PRICE';
}

interface SimulacaoVariables {
  min_property_value: number;
  max_property_value: number;
  min_requested_value: number;
  max_requested_value: number;
  min_installments: number;
  max_installments: number;
  min_interest_rate: number;
  max_interest_rate: number;
}

interface InfoGeral {
  Carencia: string;
  Prazo: number;
  Seguro_DFI: string;
  Seguro_prestamista: string;
  Valor_do_credito: number;
  Valor_garantia: number;
  Valor_liberado: number;
  infos_CET: {
    CET_Anual: string;
    tir_mensal_CET: string;
  };
  infos_juros: {
    taxa_anual: number;
    taxa_mensal: number;
    ipca: string;
  };
}

interface Parcela {
  amortizacao: number[];
  juros: number[];
  parcela: number[];
  parcela_final: number[];
  parcela_normal: number[];
  saldo_devedor: number[];
  seguros_taxa: number[];
}

interface SimulacaoResult {
  infos_gerais: InfoGeral;
  parcelas: { [key: string]: Parcela };
  status: boolean;
  tamanho: number;
}

const Simulador: React.FC = () => {
  const navigate = useNavigate();
  
  const formatMonetaryValue = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };
  
  const [formData, setFormData] = useState<SimulacaoData>({
    vlr_imovel: 200000,
    valor_solicitado: 75000,
    juros: 1.19,
    numero_parcelas: 84,
    carencia: 1,
    amortizacao: 'PRICE'
  });

  const [displayValues, setDisplayValues] = useState({
    vlr_imovel: formatMonetaryValue(200000),
    valor_solicitado: formatMonetaryValue(75000),
    juros: '1,19'
  });

  const [simulacaoVariables, setSimulacaoVariables] = useState<SimulacaoVariables>({
    min_property_value: 200000,
    max_property_value: 50000000,
    min_requested_value: 75000,
    max_requested_value: 5000000,
    min_installments: 36,
    max_installments: 240,
    min_interest_rate: 1.19,
    max_interest_rate: 2
  });

  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    vlr_imovel?: string;
    valor_solicitado?: string;
  }>({});
  const [isLoadingVariables, setIsLoadingVariables] = useState(true);
  const { toast } = useToast();
  const [resultado, setResultado] = useState<SimulacaoResult | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = React.useRef<HTMLDivElement>(null);

  // Buscar variáveis da simulação da API
  useEffect(() => {
    const fetchSimulacaoVariables = async () => {
      try {
        const response = await fetch('https://ploomes-api.vercel.app/simulation/variables/');
        if (!response.ok) {
          throw new Error('Erro ao buscar variáveis da simulação');
        }
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const variables = data.data[0];
          setSimulacaoVariables(variables);
          
          // Atualizar valores padrão baseados nas variáveis da API
          setFormData(prev => ({
            ...prev,
            vlr_imovel: variables.min_property_value,
            valor_solicitado: variables.min_requested_value,
            juros: variables.min_interest_rate,
            numero_parcelas: variables.min_installments
          }));
          
          setDisplayValues(prev => ({
            ...prev,
            vlr_imovel: formatMonetaryValue(variables.min_property_value),
            valor_solicitado: formatMonetaryValue(variables.min_requested_value),
            juros: variables.min_interest_rate.toFixed(2).replace('.', ',')
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar variáveis da simulação:', error);
        toast({
          title: "Erro ao carregar configurações",
          description: "Usando valores padrão para a simulação.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingVariables(false);
      }
    };

    fetchSimulacaoVariables();
  }, [toast]);

  const handleInputChange = (field: keyof SimulacaoData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

type FieldKey = 'vlr_imovel' | 'valor_solicitado';

const getLimitsReais = (field: FieldKey) => {
  if (field === 'vlr_imovel') {
    return {
      min: simulacaoVariables?.min_property_value ?? 200_000,
      max: simulacaoVariables?.max_property_value ?? 50_000_000, // 50 milhões (em REAIS)
    };
  }
  return {
    min: simulacaoVariables?.min_requested_value ?? 75_000,
    max: simulacaoVariables?.max_requested_value ?? 5_000_000, // 5 milhões (em REAIS)
  };
};

// Detecta se o formatador interpreta a string como centavos (ex.: "1" -> "0,01")
const FORMATTER_IS_CENTS = (() => {
  try {
    const s = formatadorInput.formatarValorMonetario('1') || '';
    return /,0?0?1$/.test(s) || s.endsWith(',01');
  } catch {
    return false;
  }
})();

const onlyDigits = (s: string) => s.replace(/\D+/g, '');

const handleMonetaryInputChange = (field: FieldKey, rawValue: string) => {
  // Permite apagar
  if (rawValue.trim() === '') {
    setDisplayValues(prev => ({ ...prev, [field]: '' }));
    setFormData(prev => ({ ...prev, [field]: undefined as any }));
    setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    return;
  }

  // 1) Trabalhe sempre com dígitos puros (sem pontuação)
  let digits = onlyDigits(rawValue);
  if (digits === '') digits = '0';

  // 2) Defina limites em REAIS e derive limites na mesma unidade da DIGITAÇÃO
  const { min, max } = getLimitsReais(field);          // reais
  const maxInInputUnits = FORMATTER_IS_CENTS ? max * 100 : max; // centavos vs reais
  const minInInputUnits = FORMATTER_IS_CENTS ? min * 100 : min;

  // 3) Valor digitado na MESMA unidade que o formatador espera
  let valueInInputUnits = Number(digits);

  // 4) Clamp em tempo real SOMENTE no teto durante digitação
  if (valueInInputUnits > maxInInputUnits) valueInInputUnits = maxInInputUnits;

  // 5) Formata passando a MESMA unidade que o formatador espera
  const formatted = formatadorInput.formatarValorMonetario(String(valueInInputUnits));

  // 6) Converta para REAIS para guardar no formData e validar
  const valueReais = FORMATTER_IS_CENTS
    ? Math.floor(valueInInputUnits / 100)
    : valueInInputUnits;

  setDisplayValues(prev => ({ ...prev, [field]: formatted }));
  setFormData(prev => ({ ...prev, [field]: valueReais }));

  // 7) Validação em tempo real usando REAIS (seu validateField já espera reais)
  validateField(field, valueReais);
};

const handleBlur = (field: FieldKey) => {
  const { min, max } = getLimitsReais(field);
  let v = Number((formData as any)[field] ?? 0); // reais

  if (v < min) v = min;
  if (v > max) v = max;

  setFormData(prev => ({ ...prev, [field]: v }));

  const displayUnits = FORMATTER_IS_CENTS ? v * 100 : v;
  setDisplayValues(prev => ({
    ...prev,
    [field]: formatadorInput.formatarValorMonetario(String(displayUnits)),
  }));

  validateField(field, v);
};

 
  const validateField = (field: 'vlr_imovel' | 'valor_solicitado', value: number) => {
    let errorMessage = '';
    
    if (field === 'vlr_imovel') {
      const minValue = simulacaoVariables.min_property_value || 200000;
      const maxValue = simulacaoVariables.max_property_value || 50000000;
      
      if (value < minValue) {
        errorMessage = `Valor mínimo permitido: R$ ${minValue.toLocaleString('pt-BR')}`;
      } else if (value > maxValue) {
        errorMessage = `Valor máximo permitido: R$ ${maxValue.toLocaleString('pt-BR')}`;
      }
    } else if (field === 'valor_solicitado') {
      const minValue = simulacaoVariables.min_requested_value || 75000;
      const maxValue = simulacaoVariables.max_requested_value || 5000000;
      
      if (value < minValue) {
        errorMessage = `Valor mínimo permitido: R$ ${minValue.toLocaleString('pt-BR')}`;
      } else if (value > maxValue) {
        errorMessage = `Valor máximo permitido: R$ ${maxValue.toLocaleString('pt-BR')}`;
      }
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: errorMessage || undefined
    }));
  };

  const validateForm = () => {
    const minPropertyValue = simulacaoVariables.min_property_value || 200000;
    const maxPropertyValue = simulacaoVariables.max_property_value || 50000000;
    const minRequestedValue = simulacaoVariables.min_requested_value || 75000;
    const maxRequestedValue = simulacaoVariables.max_requested_value || 5000000;
    
    if (formData.vlr_imovel < minPropertyValue || formData.vlr_imovel > maxPropertyValue) {
      toast({
        title: "Valor do imóvel inválido",
        description: `O valor deve estar entre R$ ${minPropertyValue.toLocaleString('pt-BR')} e R$ ${maxPropertyValue.toLocaleString('pt-BR')}`,
        variant: "destructive"
      });
      return false;
    }

    if (formData.valor_solicitado < minRequestedValue || formData.valor_solicitado > maxRequestedValue) {
      toast({
        title: "Valor do crédito inválido",
        description: `O valor deve estar entre R$ ${minRequestedValue.toLocaleString('pt-BR')} e R$ ${maxRequestedValue.toLocaleString('pt-BR')}`,
        variant: "destructive"
      });
      return false;
    }

    if (formData.valor_solicitado > formData.vlr_imovel) {
      toast({
        title: "Valor do crédito inválido",
        description: "O valor solicitado não pode ser maior que o valor do imóvel",
        variant: "destructive"
      });
      return false;
    }

    if (formData.numero_parcelas < simulacaoVariables.min_installments || formData.numero_parcelas > simulacaoVariables.max_installments) {
      toast({
        title: "Número de parcelas inválido",
        description: `O número de parcelas deve estar entre ${simulacaoVariables.min_installments} e ${simulacaoVariables.max_installments}`,
        variant: "destructive"
      });
      return false;
    }

    if (formData.juros < simulacaoVariables.min_interest_rate || formData.juros > simulacaoVariables.max_interest_rate) {
      toast({
        title: "Taxa de juros inválida",
        description: `A taxa de juros deve estar entre ${simulacaoVariables.min_interest_rate}% e ${simulacaoVariables.max_interest_rate}%`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('https://api-calculos.vercel.app/simulacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Erro na simulação');
      }

      const result = await response.json();
      
      // Adiciona um delay de 2 segundos antes de exibir o resultado
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mostrar resultado na mesma página
      setResultado(result);
      
      toast({
        title: "Simulação gerada com sucesso!",
        description: "Os resultados foram processados e estão disponíveis para visualização.",
      });
      
    } catch (error) {
      console.error('Erro na simulação:', error);
      toast({
        title: "Erro na simulação",
        description: "Não foi possível gerar a simulação. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovaSimulacao = () => {
    setResultado(null);
    const minPropertyValue = simulacaoVariables.min_property_value || 200000;
    const minRequestedValue = simulacaoVariables.min_requested_value || 75000;
    const minInstallments = simulacaoVariables.min_installments || 36;
    const minInterestRate = simulacaoVariables.min_interest_rate || 1.19;
    
    setFormData(prev => ({
      ...prev,
      vlr_imovel: minPropertyValue,
      valor_solicitado: minRequestedValue,
      juros: minInterestRate,
      numero_parcelas: minInstallments
    }));
    setDisplayValues(prev => ({
      ...prev,
      vlr_imovel: formatMonetaryValue(minPropertyValue),
      valor_solicitado: formatMonetaryValue(minRequestedValue),
      juros: minInterestRate.toFixed(2).replace('.', ',')
    }));
    setValidationErrors({}); // Limpar erros de validação
    toast({
      title: "Simulação reiniciada",
      description: "Os dados foram resetados para uma nova simulação.",
    });
  };

  // const generatePDF = useReactToPrint({
  //   content: () => pdfRef.current,
  //   documentTitle: "SimulacaoFinanciamento",
  //   onBeforeGetContent: () => {
  //     setIsGeneratingPDF(true);
  //     return new Promise(resolve => {
  //       setTimeout(() => {
  //         resolve();
  //       }, 1000); // Simula um tempo de carregamento
  //     });
  //   },
  //   onAfterPrint: () => {
  //     setIsGeneratingPDF(false);
  //     toast({
  //       title: "PDF Gerado",
  //       description: "Seu PDF foi gerado com sucesso!",
  //     });
  //   },
  //   onPrintError: (err) => {
  //     setIsGeneratingPDF(false);
  //     toast({
  //       title: "Erro ao Gerar PDF",
  //       description: `Erro ao gerar PDF: ${err.message}`,
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const generatePDF = async () => {
    
  //   if (!pdfRef.current) return;

  //   setIsGeneratingPDF(true);
    
  //   try {
  //     const element = pdfRef.current;
      
  //     // Adicionar espaçamento extra no final do elemento antes de capturar
  //     const originalPadding = element.style.paddingBottom;
  //     element.style.paddingBottom = '50px';
      
  //     const canvas = await html2canvas(element, {
  //       scale: 2,
  //       useCORS: true,
  //       allowTaint: true,
  //       backgroundColor: '#ffffff',
  //       width: element.scrollWidth,
  //       height: element.scrollHeight,
  //       logging: false,
  //       removeContainer: true
  //     });

  //     // Restaurar padding original
  //     element.style.paddingBottom = originalPadding;

  //     const imgData = canvas.toDataURL('image/png');
  //     const pdf = new jsPDF('p', 'mm', 'a4');
      
  //     const imgWidth = 210;
  //     const pageHeight = 295;
  //     const imgHeight = (canvas.height * imgWidth) / canvas.width;
  //     let heightLeft = imgHeight;

  //     let position = 0;

  //     // Primeira página
  //     pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  //     heightLeft -= pageHeight;

  //     // Páginas adicionais com espaçamento
  //     while (heightLeft >= 0) {
  //       position = heightLeft - imgHeight;
  //       pdf.addPage();
        
  //       // Adicionar margem superior para evitar conteúdo colado
  //       const adjustedPosition = Math.max(position - 10, -10);
  //       pdf.addImage(imgData, 'PNG', 0, adjustedPosition, imgWidth, imgHeight);
  //       heightLeft -= pageHeight;
  //     }

  //     const fileName = `simulacao_${new Date().toISOString().split('T')[0]}.pdf`;
  //     pdf.save(fileName);

  //     toast({
  //       title: "PDF gerado com sucesso!",
  //       description: "O arquivo foi baixado automaticamente para sua pasta de downloads.",
  //     });
  //   } catch (error) {
  //     console.error('Erro ao gerar PDF:', error);
  //     toast({
  //       title: "Erro ao gerar PDF",
  //       description: "Não foi possível gerar o PDF. Verifique se há conteúdo para exportar e tente novamente.",
  //       variant: "destructive"
  //     });
  //   } finally {
  //     setIsGeneratingPDF(false);
  //   }
  // };

  // const generatePDF = async () => {
  //   if (!pdfRef.current) return;
  //   setIsGeneratingPDF(true);
  
  //   try {
  //     const element = pdfRef.current;
  
  //     const canvas = await html2canvas(element, {
  //       scale: 2,
  //       useCORS: true,
  //       allowTaint: true,
  //       backgroundColor: '#ffffff',
  //       width: element.scrollWidth,
  //       height: element.scrollHeight,
  //       logging: false
  //     });
  
  //     const pdf = new jsPDF('p', 'mm', 'a4');
  //     const pageWmm = pdf.internal.pageSize.getWidth();     // ex.: 210
  //     const pageHmm = pdf.internal.pageSize.getHeight();    // ex.: 297
  
  //     // px por mm no canvas capturado
  //     const pxPerMm = canvas.width / pageWmm;
  //     const pageHPx  = Math.floor(pageHmm * pxPerMm);       // altura da página em px
  
  //     // canvas temporário para a “fatia” da página
  //     const pageCanvas = document.createElement('canvas');
  //     pageCanvas.width  = canvas.width;
  //     pageCanvas.height = pageHPx;
  //     const pageCtx = pageCanvas.getContext('2d');
  
  //     let renderedPx = 0;
  //     let firstPage = true;
  
  //     while (renderedPx < canvas.height) {
  //       const sliceHeight = Math.min(pageHPx, canvas.height - renderedPx);
  
  //       // limpa e desenha a fatia da vez
  //       pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
  //       pageCtx.drawImage(
  //         canvas,
  //         0, renderedPx,               // src x,y
  //         canvas.width, sliceHeight,   // src w,h
  //         0, 0,                        // dst x,y
  //         pageCanvas.width, sliceHeight// dst w,h
  //       );
  
  //       const imgData = pageCanvas.toDataURL('image/png');
  
  //       if (!firstPage) pdf.addPage();
  //       firstPage = false;
  
  //       // altura da fatia convertida para mm (mantém escala 1:1 na página)
  //       const sliceHmm = sliceHeight / pxPerMm;
  //       pdf.addImage(imgData, 'PNG', 0, 0, pageWmm, sliceHmm);
  
  //       renderedPx += sliceHeight; // avança para a próxima fatia
  //     }
  
  //     const fileName = `simulacao_${new Date().toISOString().split('T')[0]}.pdf`;
  //     pdf.save(fileName);
  
  //     toast({
  //       title: "PDF gerado com sucesso!",
  //       description: "O arquivo foi baixado automaticamente para sua pasta de downloads."
  //     });
  //   } catch (error) {
  //     console.error('Erro ao gerar PDF:', error);
  //     toast({
  //       title: "Erro ao gerar PDF",
  //       description: "Não foi possível gerar o PDF. Verifique o conteúdo e tente novamente.",
  //       variant: "destructive"
  //     });
  //   } finally {
  //     setIsGeneratingPDF(false);
  //   }
  // };
  
  // const generatePDF = async () => {
  //   if (!pdfRef.current) return;
  //   setIsGeneratingPDF(true);
  
  //   try {
  //     const element = pdfRef.current;
  
  //     const canvas = await html2canvas(element, {
  //       scale: 2,
  //       useCORS: true,
  //       allowTaint: true,
  //       backgroundColor: '#ffffff',
  //       logging: false
  //     });
  
  //     const pdf = new jsPDF('p', 'mm', 'a4');
  //     const pageWmm = pdf.internal.pageSize.getWidth();   // ~210
  //     const pageHmm = pdf.internal.pageSize.getHeight();  // ~297
  
  //     // === MARGENS (ajuste à vontade) ===
  //     const marginMm = 6; // 12–15mm costuma ficar ótimo
  //     const contentWmm = pageWmm - marginMm * 2;
  //     const contentHmm = pageHmm - marginMm * 2;
  
  //     // px por mm considerando a LARGURA útil do conteúdo
  //     const pxPerMm = canvas.width / contentWmm;
  
  //     // Altura (em px) que cabe por página dentro da área útil
  //     const pageHPx = Math.floor(contentHmm * pxPerMm);
  
  //     // Canvas temporário para cada fatia
  //     const pageCanvas = document.createElement('canvas');
  //     pageCanvas.width  = canvas.width;
  //     pageCanvas.height = pageHPx;
  //     const pageCtx = pageCanvas.getContext('2d');
  
  //     let renderedPx = 0;
  //     let firstPage = true;
  
  //     while (renderedPx < canvas.height) {
  //       const sliceHeight = Math.min(pageHPx, canvas.height - renderedPx);
  
  //       pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
  //       pageCtx.drawImage(
  //         canvas,
  //         0, renderedPx,                 // src x,y
  //         canvas.width, sliceHeight,     // src w,h
  //         0, 0,                          // dst x,y
  //         pageCanvas.width, sliceHeight  // dst w,h
  //       );
  
  //       const imgData = pageCanvas.toDataURL('image/png');
  
  //       if (!firstPage) pdf.addPage();
  //       firstPage = false;
  
  //       // Altura da fatia em mm, mantendo a proporção com a largura útil
  //       const sliceHmm = sliceHeight / pxPerMm;
  
  //       // Desenha com MARGEM (x,y) e dentro da área útil (contentWmm)
  //       pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWmm, sliceHmm);
  
  //       renderedPx += sliceHeight;
  //     }
  
  //     const fileName = `simulacao_${new Date().toISOString().split('T')[0]}.pdf`;
  //     pdf.save(fileName);
  
  //     toast({
  //       title: 'PDF gerado com sucesso!',
  //       description: 'O arquivo foi baixado automaticamente para sua pasta de downloads.'
  //     });
  //   } catch (error) {
  //     console.error('Erro ao gerar PDF:', error);
  //     toast({
  //       title: 'Erro ao gerar PDF',
  //       description: 'Não foi possível gerar o PDF. Verifique o conteúdo e tente novamente.',
  //       variant: 'destructive'
  //     });
  //   } finally {
  //     setIsGeneratingPDF(false);
  //   }
  // };
  
  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPDF(true);
  
    try {
      const element = pdfRef.current;
  
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
  
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWmm = pdf.internal.pageSize.getWidth();
      const pageHmm = pdf.internal.pageSize.getHeight();
  
      // MARGENS
      const marginMm = 6;
      const contentWmm = pageWmm - marginMm * 2;
      const contentHmm = pageHmm - marginMm * 2;
  
      // px por mm (com base na largura útil)
      const pxPerMm = canvas.width / contentWmm;
  
      // Altura útil por página em px
      const pageHPx = Math.floor(contentHmm * pxPerMm);
  
      // Canvas temporário para cada fatia (tamanho ajustado dentro do loop)
      const pageCanvas = document.createElement('canvas');
  
      let renderedPx = 0;
      let firstPage = true;
  
      while (renderedPx < canvas.height) {
        const sliceHeight = Math.min(pageHPx, canvas.height - renderedPx);
  
        // >>> ajuste crítico: tamanho do canvas = exatamente a fatia
        if (pageCanvas.width !== canvas.width) pageCanvas.width = canvas.width;
        if (pageCanvas.height !== sliceHeight) pageCanvas.height = sliceHeight;
  
        const pageCtx = pageCanvas.getContext('2d')!;
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
  
        pageCtx.drawImage(
          canvas,
          0, renderedPx,                 // src x,y
          canvas.width, sliceHeight,     // src w,h
          0, 0,                          // dst x,y
          pageCanvas.width, sliceHeight  // dst w,h (mesma altura da fatia)
        );
  
        const imgData = pageCanvas.toDataURL('image/png');
  
        if (!firstPage) pdf.addPage();
        firstPage = false;
  
        // Altura da fatia em mm proporcional
        const sliceHmm = sliceHeight / pxPerMm;
  
        // Desenha respeitando as margens
        pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWmm, sliceHmm);
  
        renderedPx += sliceHeight;
      }
  
      const fileName = `simulacao_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
  
      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O arquivo foi baixado automaticamente para sua pasta de downloads.'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o PDF. Verifique o conteúdo e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('R$', 'R$ ').trim();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full shadow-sm">
            <Calculator className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Loading das variáveis */}
        {isLoadingVariables && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-700 text-lg">Carregando configurações da simulação...</p>
            </div>
          </div>
        )}

        {/* Exibir resultado se existir */}
        {!isLoadingVariables && resultado && (
          <div className="space-y-6">
            {/* Header do Resultado */}
            <div className="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Calculator className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Libra Crédito</h1>
                  <p className="text-blue-600 font-medium">Empréstimo justo, sustentável e equilibrado</p>
                  <p className="text-sm text-gray-500 mt-1">Simulação de Crédito com Garantia de Imóvel</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={generatePDF} 
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Gerando PDF...</span>
                    </div>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDFs
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleNovaSimulacao} 
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50 shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Nova Simulação
                </Button>
              </div>
            </div>

            {/* Conteúdo para PDF */}
            <div ref={pdfRef} className="bg-white p-6 border border-gray-200 rounded-lg" style={{ paddingBottom: '60px' }}>
              {/* Banner Principal */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white py-6 px-6 rounded-lg text-center mb-6 shadow-lg">
                {/* Logo da Libra */}
                <div className="flex justify-center mb-4">
                  <img 
                    src="https://portal-parceiros-beta.vercel.app/logo-libra.png"
                    alt="Logo Libra Crédito"
                    className="h-16 w-auto"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">Crédito com Garantia de Imóvel</h2>
                <p className="text-blue-100 text-sm">
                  Solução completa para suas necessidades financeiras
                </p>
              </div>

              {/* Informações Gerais */}
              <Card className="shadow-sm mb-6">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200 py-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    Informações da Simulação
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Coluna 1 - Valores */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Valor Líquido do crédito:</div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(resultado.infos_gerais.Valor_liberado)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Valor Total do empréstimo:</div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(resultado.infos_gerais.Valor_do_credito)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (Valor Líquido, IOF, custas cartorárias, análise jurídica, despesas com estruturação, despesas administrativas)
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Valor do Imóvel:</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(resultado.infos_gerais.Valor_garantia)}
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2 - Condições */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Taxa de juros:</div>
                        <div className="text-lg font-bold text-purple-600">
                          {resultado.infos_gerais.infos_juros.taxa_mensal}% a.m.
                        </div>
                        <div className="text-sm text-gray-600">
                          {resultado.infos_gerais.infos_juros.taxa_anual}% a.a
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Prazo:</div>
                        <div className="text-lg font-bold text-gray-900">
                          {resultado.infos_gerais.Prazo} meses
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">CET:</div>
                        <div className="text-lg font-bold text-orange-600">
                          {resultado.infos_gerais.infos_CET.tir_mensal_CET}% a.m.
                        </div>
                        <div className="text-sm text-gray-600">
                          {resultado.infos_gerais.infos_CET.CET_Anual}% a.a
                        </div>
                      </div>
                    </div>

                    {/* Coluna 3 - Específicos */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Carência:</div>
                        <div className="text-lg font-bold text-gray-900">
                          {resultado.infos_gerais.Carencia} {resultado.infos_gerais.Carencia === '01' ? 'Mês' : 'Meses'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Indexador:</div>
                        <div className="text-lg font-bold text-gray-900">
                          {resultado.infos_gerais.infos_juros.ipca || 'IPCA'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-1">Sistema de amortização:</div>
                        <div className="text-lg font-bold text-gray-900">
                          {formData.amortizacao}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Parcelas */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 py-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    Tabela de Parcelas
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Detalhamento completo de todas as parcelas do financiamento
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                          <TableHead className="text-white font-semibold text-center">Mês</TableHead>
                          <TableHead className="text-white font-semibold text-right">Saldo Devedor</TableHead>
                          <TableHead className="text-white font-semibold text-right">Juros</TableHead>
                          <TableHead className="text-white font-semibold text-right">Amortização</TableHead>
                          <TableHead className="text-white font-semibold text-right">Valor Parcela</TableHead>
                          <TableHead className="text-white font-semibold text-right">Seguro + Taxas</TableHead>
                          <TableHead className="text-white font-semibold text-right">Parcela Final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(resultado.parcelas).map(([key, parcela], index) => {
                          const parcelaData = parcela as Parcela;
                          return (
                            <TableRow 
                              key={key} 
                              className={`hover:bg-blue-50 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                            >
                              <TableCell className="font-medium text-center text-gray-700">
                                {index}
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-900">
                                {formatCurrency(parcelaData.saldo_devedor[0])}
                              </TableCell>
                              <TableCell className="text-right text-gray-700">
                                {formatCurrency(parcelaData.juros[0])}
                              </TableCell>
                              <TableCell className="text-right text-gray-700">
                                {formatCurrency(parcelaData.amortizacao[0])}
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-900">
                                {formatCurrency(parcelaData.parcela_normal[0])}
                              </TableCell>
                              <TableCell className="text-right text-gray-700">
                                {formatCurrency(parcelaData.seguros_taxa[0])}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-blue-600">
                                {formatCurrency(parcelaData.parcela_final[0])} +IPCA
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Resumo da Tabela */}
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="text-center md:text-left">
                        <div className="text-xl font-bold text-blue-600">
                          {Object.keys(resultado.parcelas).length - 1}
                        </div>
                        <div className="text-sm text-gray-600">Total de Parcelas</div>
                      </div>
                      <div className="text-center md:text-left">
                        <div className="text-lg font-semibold text-gray-800">
                          {formatCurrency(resultado.infos_gerais.Valor_do_credito)}
                        </div>
                        <div className="text-sm text-gray-600">Valor Total do Empréstimo</div>
                      </div>
                      <div className="text-center md:text-left">
                        <div className="text-lg font-semibold text-gray-800">
                          {formatCurrency(resultado.infos_gerais.Valor_liberado)}
                        </div>
                        <div className="text-sm text-gray-600">Valor Líquido</div>
                      </div>
                      <div className="text-center md:text-left">
                        <div className="text-lg font-semibold text-gray-800">
                          {resultado.infos_gerais.Prazo} meses
                        </div>
                        <div className="text-sm text-gray-600">Prazo Total</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aviso Profissional */}
              <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calculator className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Informação Importante
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Esta simulação é meramente informativa e não constitui uma oferta de crédito. 
                    Os valores apresentados são estimativas baseadas nos parâmetros informados. 
                    Para obter informações precisas sobre condições, taxas e valores reais, 
                    entre em contato com nossos consultores especializados.
                  </p>
                  <div className="mt-4 text-sm text-gray-600">
                    <strong>Libra Crédito</strong> - Soluções financeiras personalizadas para suas necessidades
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layout de duas colunas - Formulário e Instruções */}
        {!isLoadingVariables && !resultado && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Esquerda - Formulário */}
            <div className="space-y-6">
              <Card className="shadow-lg border border-gray-200 bg-white">
                <CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-3">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    Gerar Simulação
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Preencha os dados abaixo para calcular sua simulação
                  </p>
                </CardHeader>
                
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Amortização */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-gray-700">
                        Amortização: <span className="text-blue-600 font-bold">{formData.amortizacao}</span>
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.amortizacao === 'PRICE' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, amortizacao: 'PRICE' }))}
                          className="px-6 py-3"
                        >
                          PRICE
                        </Button>
                        <Button
                          type="button"
                          variant={formData.amortizacao === 'SAC' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, amortizacao: 'SAC' }))}
                          className="px-6 py-3"
                        >
                          SAC
                        </Button>
                      </div>
                    </div>
                    
                    {/* Carência */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-gray-700">Carência:</Label>
                      <ToggleGroup 
                        type="single" 
                        value={formData.carencia.toString()}
                        onValueChange={(value) => {
                          if (value) {
                            handleInputChange('carencia', parseInt(value));
                          }
                        }}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="1" className="px-6 py-3 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:border-green-600">
                          1 Mês
                        </ToggleGroupItem>
                        <ToggleGroupItem value="2" className="px-6 py-3 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:border-green-600">
                          2 Meses
                        </ToggleGroupItem>
                        <ToggleGroupItem value="3" className="px-6 py-3 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:border-green-600">
                          3 Meses
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {/* Valor Imóvel */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <Home className="h-4 w-4 text-blue-600" />
                        Valor Imóvel:
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">
                          R$
                        </div>
                        <Input
                          type="text"
                          value={displayValues.vlr_imovel}
                          onChange={(e) => handleMonetaryInputChange('vlr_imovel', e.target.value)}
                          onBlur={() => handleBlur('vlr_imovel')}
                          className={`pl-12 h-12 text-lg border rounded-lg ${
                            validationErrors.vlr_imovel 
                              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          }`}
                          placeholder="0,00"
                          min={simulacaoVariables.min_property_value || 200000}
                          max={simulacaoVariables.max_property_value || 50000000}
                          step={1000}
                        />
                      </div>
                      <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                        💡 Valor imóvel entre R$ {simulacaoVariables.min_property_value?.toLocaleString('pt-BR') || '200.000'} e R$ {simulacaoVariables.max_property_value?.toLocaleString('pt-BR') || '50.000.000'}
                      </p>
                      {validationErrors.vlr_imovel && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                          ⚠️ {validationErrors.vlr_imovel}
                        </p>
                      )}
                    </div>

                    {/* Valor Crédito */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        Valor Crédito:
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">
                          R$
                        </div>
                        <Input
                          type="text"
                          value={displayValues.valor_solicitado}
                          onChange={(e) => handleMonetaryInputChange('valor_solicitado', e.target.value)}
                          onBlur={() => handleBlur('valor_solicitado')}
                          className={`pl-12 h-12 text-lg border rounded-lg ${
                            validationErrors.valor_solicitado 
                              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          }`}
                          placeholder="0,00"
                          min={simulacaoVariables.min_requested_value}
                          max={simulacaoVariables.max_requested_value}
                          step={1000}
                        />
                      </div>
                      <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                        💡 Valor mínimo R$ {simulacaoVariables.min_requested_value?.toLocaleString('pt-BR') || '75.000'} e Máximo de R$ {simulacaoVariables.max_requested_value?.toLocaleString('pt-BR') || '5.000.000'}
                      </p>
                      {validationErrors.valor_solicitado && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                          ⚠️ {validationErrors.valor_solicitado}
                        </p>
                      )}
                    </div>

                    {/* Quantidade de Parcelas */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-gray-700">
                        Quantidade de Parcelas: <span className="text-blue-600 font-bold">{formData.numero_parcelas}</span>
                      </Label>
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <Slider
                          value={[formData.numero_parcelas]}
                          onValueChange={(value) => {
                            if (value && value.length > 0) {
                              handleInputChange('numero_parcelas', value[0]);
                            }
                          }}
                          max={simulacaoVariables.max_installments}
                          min={simulacaoVariables.min_installments}
                          step={12}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                          <span className="font-medium">{simulacaoVariables.min_installments}</span>
                          <span className="font-medium">{simulacaoVariables.max_installments}</span>
                        </div>
                      </div>
                    </div>

                    {/* Taxa de Juros */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold text-gray-700">
                        Taxa de Juros: <span className="text-green-600 font-bold">{displayValues.juros}%</span>
                      </Label>
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <Slider
                          value={[formData.juros]}
                          onValueChange={(value) => {
                            if (value && value.length > 0) {
                              const jurosValue = value[0];
                              setFormData(prev => ({ ...prev, juros: jurosValue }));
                              setDisplayValues(prev => ({
                                ...prev,
                                juros: jurosValue.toFixed(2).replace('.', ',')
                              }));
                            }
                          }}
                          max={simulacaoVariables.max_interest_rate}
                          min={simulacaoVariables.min_interest_rate}
                          step={0.01}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                          <span className="font-medium">{simulacaoVariables.min_interest_rate.toFixed(2).replace('.', ',')}%</span>
                          <span className="font-medium">{simulacaoVariables.max_interest_rate.toFixed(2).replace('.', ',')}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Submissão */}
                    <div className="pt-6">
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Gerando Simulação...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            <span>Gerar Simulação</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Instruções e Informações */}
            <div className="space-y-6">
              {/* Card de Como Fazer a Simulação */}
              <Card className="shadow-lg border border-gray-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Como Fazer a Simulação
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Escolha o Sistema de Amortização</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>PRICE:</strong> Parcelas fixas, juros decrescentes<br/>
                          <strong>SAC:</strong> Amortização constante, juros decrescentes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Defina o Período de Carência</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Período inicial sem pagamento de parcelas (1 a 3 meses)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Informe o Valor do Imóvel</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Valor de avaliação ou compra do imóvel (mín. R$ {simulacaoVariables.min_property_value?.toLocaleString('pt-BR') || '200.000'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Digite o Valor do Crédito</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Valor que deseja financiar (R$ {simulacaoVariables.min_requested_value?.toLocaleString('pt-BR') || '75.000'} a R$ {simulacaoVariables.max_requested_value?.toLocaleString('pt-BR') || '5.000.000'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">5</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Ajuste o Prazo</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Número de parcelas ({simulacaoVariables.min_installments} a {simulacaoVariables.max_installments} meses)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">6</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Configure a Taxa de Juros</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Taxa mensal entre {simulacaoVariables.min_interest_rate}% e {simulacaoVariables.max_interest_rate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Informações Importantes */}
              <Card className="shadow-lg border border-gray-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Informações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Garantia Imobiliária</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          O imóvel serve como garantia do financiamento
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900">Prazo Flexível</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Prazos de 3 a 20 anos para pagamento
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-purple-900">Taxas Competitivas</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Taxas a partir de {simulacaoVariables.min_interest_rate}% ao mês
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <Users className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-orange-900">Atendimento Personalizado</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          Suporte especializado durante todo o processo
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Dicas */}
              <Card className="shadow-lg border border-gray-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-gray-200">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-yellow-600" />
                    Dicas para uma Boa Simulação
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Use valores realistas para o imóvel (mín. R$ {simulacaoVariables.min_property_value?.toLocaleString('pt-BR') || '200.000'})</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Considere sua capacidade de pagamento</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Compare diferentes prazos ({simulacaoVariables.min_installments} a {simulacaoVariables.max_installments} meses) e taxas</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Analise o CET (Custo Efetivo Total)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">Consulte um especialista se necessário</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Simulador;
