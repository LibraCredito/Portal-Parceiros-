import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputText } from '@/components/FormInputs/InputText';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calculator, Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const SimuladorConfig: React.FC = () => {
  const [variables, setVariables] = useState<SimulacaoVariables>({
    min_property_value: 150000,
    max_property_value: 10000000,
    min_requested_value: 75000,
    max_requested_value: 5000000,
    min_installments: 36,
    max_installments: 240,
    min_interest_rate: 1.19,
    max_interest_rate: 2
  });

  const [originalVariables, setOriginalVariables] = useState<SimulacaoVariables | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Carregar variáveis da API
  useEffect(() => {
    const fetchVariables = async () => {
      try {
        const response = await fetch('https://ploomes-api.vercel.app/simulation/variables/');
        if (!response.ok) {
          throw new Error('Erro ao carregar configurações');
        }
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const loadedVariables = data.data[0];
          setVariables(loadedVariables);
          setOriginalVariables(loadedVariables);
        }
      } catch (error) {
        console.error('Erro ao carregar variáveis:', error);
        toast({
          title: "Erro ao carregar configurações",
          description: "Usando valores padrão. Verifique a conexão com a API.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVariables();
  }, [toast]);

  // Verificar mudanças
  useEffect(() => {
    if (originalVariables) {
      const changed = JSON.stringify(variables) !== JSON.stringify(originalVariables);
      setHasChanges(changed);
    }
  }, [variables, originalVariables]);

  const handleInputChange = (field: keyof SimulacaoVariables, value: string | number) => {
    let numValue: number;
    
    if (typeof value === 'string') {
      if (field === 'min_installments' || field === 'max_installments') {
        // Para parcelas, apenas converte para número
        numValue = parseInt(value) || 0;
      } else {
        // Remove formatação de moeda (R$, pontos, vírgulas)
        const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
        numValue = parseFloat(cleanValue) || 0;
      }
    } else {
      numValue = value;
    }
    
    setVariables(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleInterestRateChange = (field: 'min_interest_rate' | 'max_interest_rate', value: string) => {
    // Remove formatação de juros (vírgulas)
    const cleanValue = value.replace(',', '.');
    const numericValue = parseFloat(cleanValue) || 0;
    
    // Atualiza o estado das variáveis
    setVariables(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('https://ploomes-api.vercel.app/simulation/variables/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      const result = await response.json();
      
      toast({
        title: "Configurações salvas!",
        description: "As variáveis do simulador foram atualizadas com sucesso.",
      });

      // Atualizar variáveis originais
      setOriginalVariables({ ...variables });
      setHasChanges(false);

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalVariables) {
      setVariables(originalVariables);
      setHasChanges(false);
      toast({
        title: "Configurações resetadas",
        description: "Os valores foram restaurados para a última versão salva.",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configuração do Simulador</h1>
          </div>
          <p className="text-gray-600">
            Configure os parâmetros e limites para o simulador de financiamento imobiliário.
          </p>
        </div>

        {/* Formulário Principal */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Parâmetros do Simulador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Valores de Imóvel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="min_property_value" className="text-sm font-medium text-gray-700">
                  Valor Mínimo do Imóvel
                </Label>
                <InputText
                  id="min_property_value"
                  termo={formatCurrency(variables.min_property_value)}
                  onSetName={(value) => handleInputChange('min_property_value', value)}
                  placeholder="R$ 0,00"
                  typeInput="Money"
                  inputName=""
                />
              </div>
            </div>

            {/* Valores Solicitados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="min_requested_value" className="text-sm font-medium text-gray-700">
                  Valor Mínimo Solicitado
                </Label>
                <InputText
                  id="min_requested_value"
                  termo={formatCurrency(variables.min_requested_value)}
                  onSetName={(value) => handleInputChange('min_requested_value', value)}
                  placeholder="R$ 0,00"
                  typeInput="Money"
                  inputName=""
                />
              </div>
              <div>
                <Label htmlFor="max_requested_value" className="text-sm font-medium text-gray-700">
                  Valor Máximo Solicitado
                </Label>
                <InputText
                  id="max_requested_value"
                  termo={formatCurrency(variables.max_requested_value)}
                  onSetName={(value) => handleInputChange('max_requested_value', value)}
                  placeholder="R$ 0,00"
                  typeInput="Money"
                  inputName=""
                />
              </div>
            </div>

            {/* Parcelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="min_installments" className="text-sm font-medium text-gray-700">
                  Número Mínimo de Parcelas
                </Label>
                <InputText
                  id="min_installments"
                  termo={variables.min_installments.toString()}
                  onSetName={(value) => handleInputChange('min_installments', value)}
                  placeholder="36"
                  typeInput="Text"
                  inputName=""
                />
                <p className="text-xs text-gray-500 mt-1">Em meses</p>
              </div>
              <div>
                <Label htmlFor="max_installments" className="text-sm font-medium text-gray-700">
                  Número Máximo de Parcelas
                </Label>
                <InputText
                  id="max_installments"
                  termo={variables.max_installments.toString()}
                  onSetName={(value) => handleInputChange('max_installments', value)}
                  placeholder="240"
                  typeInput="Text"
                  inputName=""
                />
                <p className="text-xs text-gray-500 mt-1">Em meses</p>
              </div>
            </div>

            {/* Taxa de Juros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="min_interest_rate" className="text-sm font-medium text-gray-700">
                  Taxa de Juros Mínima (% ao mês)
                </Label>
                <InputText
                  id="min_interest_rate"
                  termo={variables.min_interest_rate.toString().replace('.', ',')}
                  onSetName={(value) => handleInterestRateChange('min_interest_rate', value)}
                  placeholder="1,19"
                  typeInput="Juros"
                  inputName=""
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 1,19%</p>
              </div>
              <div>
                <Label htmlFor="max_interest_rate" className="text-sm font-medium text-gray-700">
                  Taxa de Juros Máxima (% ao mês)
                </Label>
                <InputText
                  id="max_interest_rate"
                  termo={variables.max_interest_rate.toString().replace('.', ',')}
                  onSetName={(value) => handleInterestRateChange('max_interest_rate', value)}
                  placeholder="2,00"
                  typeInput="Juros"
                  inputName=""
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 2,00%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validações e Ações */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2">
                {hasChanges ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className={`text-sm ${hasChanges ? 'text-orange-600' : 'text-green-600'}`}>
                  {hasChanges ? 'Há alterações não salvas' : 'Todas as alterações foram salvas'}
                </span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges || isSaving}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Resetar
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Os valores são validados automaticamente para garantir consistência.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>As alterações afetam diretamente o comportamento do simulador para todos os usuários.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Recomenda-se testar as configurações antes de aplicá-las em produção.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimuladorConfig;
