
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calculator, TrendingUp, Home, CreditCard, Download, FileText, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatadorInput } from '@/components/FormInputs/formatadorInput';

interface SimulacaoData {
  vlr_imovel: number;
  valor_solicitado: number;
  juros: number;
  numero_parcelas: number;
  carencia: number;
  amortizacao: 'SAC' | 'PRICE';
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
  const [formData, setFormData] = useState<SimulacaoData>({
    vlr_imovel: 150000,
    valor_solicitado: 75000,
    juros: 1.5,
    numero_parcelas: 120,
    carencia: 1,
    amortizacao: 'PRICE'
  });

  const [displayValues, setDisplayValues] = useState({
    vlr_imovel: 'R$ 150.000,00',
    valor_solicitado: 'R$ 75.000,00',
    juros: '1,50'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<SimulacaoResult | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultado) {
      // Scroll suave para o topo da página
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  }, [resultado]);

  const handleInputChange = (field: keyof SimulacaoData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  const handleMonetaryInputChange = (field: 'vlr_imovel' | 'valor_solicitado', value: string) => {
    const formattedValue = formatadorInput.formatarValorMonetario(value);
    const numericValue = formatadorInput.tratandoValoresInput(formattedValue);
    
    setDisplayValues(prev => ({
      ...prev,
      [field]: formattedValue
    }));
    
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const validateForm = () => {
    if (formData.vlr_imovel < 150000) {
      toast({
        title: "Valor do imóvel inválido",
        description: "O valor mínimo do imóvel é R$ 150.000,00",
        variant: "destructive"
      });
      return false;
    }

    if (formData.valor_solicitado < 75000 || formData.valor_solicitado > 5000000) {
      toast({
        title: "Valor do crédito inválido",
        description: "O valor deve estar entre R$ 75.000,00 e R$ 5.000.000,00",
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

    if (formData.numero_parcelas < 36 || formData.numero_parcelas > 240) {
      toast({
        title: "Número de parcelas inválido",
        description: "O número de parcelas deve estar entre 36 e 240",
        variant: "destructive"
      });
      return false;
    }

    if (formData.juros < 1.19 || formData.juros > 2) {
      toast({
        title: "Taxa de juros inválida",
        description: "A taxa de juros deve estar entre 1,19% e 2%",
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
      const response = await fetch('http://127.0.0.1:5000/simulacao/offline', {
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
      
      setResultado(result);
      
      toast({
        title: "Simulação gerada com sucesso!",
        description: "Os resultados foram processados e estão disponíveis para visualização.",
      });
      
    } catch (error) {
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
  };

  const handleSalvar = () => {
    // Implementar lógica para salvar a simulação
    toast({
      title: "Simulação salva!",
      description: "A simulação foi salva com sucesso em seus favoritos.",
    });
  };

  const generatePDF = async () => {
    
    // if (!pdfRef.current) return;
    // setIsGeneratingPDF(true);

    // console.log('pdfRef.current', pdfRef.current);
  
    // try {
    //   const element = pdfRef.current;

    //   console.log('element', element);
    //   console.log('element.scrollWidth', element.scrollWidth);
    //   console.log('element.scrollHeight', element.scrollHeight);
  
    //   const canvas = await html2canvas(element, {
    //     scale: 2,
    //     useCORS: true,
    //     allowTaint: true,
    //     backgroundColor: '#ffffff',
    //     width: element.scrollWidth,
    //     height: element.scrollHeight,
    //     logging: false
    //   });
  
    //   const pdf = new jsPDF('p', 'mm', 'a4');
    //   const pageWmm = pdf.internal.pageSize.getWidth();     // ex.: 210
    //   const pageHmm = pdf.internal.pageSize.getHeight();    // ex.: 297
  
    //   // px por mm no canvas capturado
    //   const pxPerMm = canvas.width / pageWmm;
    //   const pageHPx  = Math.floor(pageHmm * pxPerMm);       // altura da página em px
  
    //   // canvas temporário para a “fatia” da página
    //   const pageCanvas = document.createElement('canvas');
    //   pageCanvas.width  = canvas.width;
    //   pageCanvas.height = pageHPx;
    //   const pageCtx = pageCanvas.getContext('2d');
  
    //   let renderedPx = 0;
    //   let firstPage = true;
  
    //   while (renderedPx < canvas.height) {
    //     const sliceHeight = Math.min(pageHPx, canvas.height - renderedPx);
  
    //     // limpa e desenha a fatia da vez
    //     pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    //     pageCtx.drawImage(
    //       canvas,
    //       0, renderedPx,               // src x,y
    //       canvas.width, sliceHeight,   // src w,h
    //       0, 0,                        // dst x,y
    //       pageCanvas.width, sliceHeight// dst w,h
    //     );
  
    //     const imgData = pageCanvas.toDataURL('image/png');
  
    //     if (!firstPage) pdf.addPage();
    //     firstPage = false;
  
    //     // altura da fatia convertida para mm (mantém escala 1:1 na página)
    //     const sliceHmm = sliceHeight / pxPerMm;
    //     pdf.addImage(imgData, 'PNG', 0, 0, pageWmm, sliceHmm);
  
    //     renderedPx += sliceHeight; // avança para a próxima fatia
    //   }
  
    //   const fileName = `simulacao_${new Date().toISOString().split('T')[0]}.pdf`;
    //   pdf.save(fileName);
  
    //   toast({
    //     title: "PDF gerado com sucesso!",
    //     description: "O arquivo foi baixado automaticamente para sua pasta de downloads."
    //   });
    // } catch (error) {
    //   console.error('Erro ao gerar PDF:', error);
    //   toast({
    //     title: "Erro ao gerar PDF",
    //     description: "Não foi possível gerar o PDF. Verifique o conteúdo e tente novamente.",
    //     variant: "destructive"
    //   });
    // } finally {
    //   setIsGeneratingPDF(false);
    // }
  };
  

  if (resultado) {
  return (
      <div className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
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
                    Baixar PDF
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
          <div ref={pdfRef} className="bg-white p-6 border border-gray-200 rounded-lg">
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
                        {resultado.infos_gerais.Carencia} mês{resultado.infos_gerais.Carencia !== '1' ? 'es' : ''}
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
                      {Object.entries(resultado.parcelas).map(([key, parcela], index) => (
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
                            {formatCurrency(parcela.saldo_devedor[0])}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {formatCurrency(parcela.juros[0])}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {formatCurrency(parcela.amortizacao[0])}
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-900">
                            {formatCurrency(parcela.parcela_normal[0])}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {formatCurrency(parcela.seguros_taxa[0])}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            {formatCurrency(parcela.parcela_final[0])} +IPCA
                          </TableCell>
                        </TableRow>
                      ))}
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
      </div>
    );
  }

  return (
    // <div className="min-h-screen p-6">
    //   <div className="mx-auto max-w-4xl">
    //     {/* Header Simples */}
    //     <div className="text-center mb-8">
    //       <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
    //         <Calculator className="h-8 w-8 text-blue-600" />
    //       </div>
    //       <h1 className="text-3xl font-bold text-gray-900 mb-2">
    //         Simulador de Financiamento
    //       </h1>
    //       <p className="text-gray-600">
    //         Funcionalidade em desenvolvimento
    //       </p>
    //     </div>

    //     {/* Card Simples */}
    //     <Card className="bg-white shadow-md">
    //       <CardContent className="p-8 text-center">
    //         <div className="space-y-4">
    //           <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
    //             <TrendingUp className="h-8 w-8 text-orange-600" />
    //           </div>
              
    //           <h2 className="text-xl font-semibold text-gray-900">
    //             Em Construção
    //           </h2>
    //           <p className="text-gray-600 max-w-md mx-auto">
    //             Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
    //           </p>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </div>

    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full shadow-sm">
            <Calculator className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Simulador de Financiamento
            </h1>
            <p className="text-gray-600 text-lg">
              Calcule sua simulação de financiamento imobiliário
            </p>
          </div>
            </div>

        {/* Formulário */}
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
                    className="pl-12 h-12 text-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                    placeholder="0,00"
                    min={150000}
                    step={1000}
                  />
                </div>
                <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                  💡 Valor imóvel no mínimo R$ 150.000,00
                </p>
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
                    className="pl-12 h-12 text-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                    placeholder="0,00"
                    min={75000}
                    max={5000000}
                    step={1000}
                  />
                </div>
                <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                  💡 Valor mínimo R$ 75.000,00 e Máximo de R$ 5.000.000,00
                </p>
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
                    max={240}
                    min={36}
                    step={12}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span className="font-medium">36</span>
                    <span className="font-medium">240</span>
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
                    max={2}
                    min={1.19}
                    step={0.01}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span className="font-medium">1,19%</span>
                    <span className="font-medium">2%</span>
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
    </div>
  );
};

export default Simulador;