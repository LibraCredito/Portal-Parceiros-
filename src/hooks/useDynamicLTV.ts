import { useState, useEffect } from 'react';

interface CityData {
  uf: string;
  Cidade: string;
  População: string;
  LTV: string;
}

interface DynamicLTVResult {
  maxLTV: number;
  isBlocked: boolean;
  reason: string;
  population: number | null;
  loading: boolean;
  error: string | null;
}

interface DynamicLTVParams {
  cityName: string;
  uf?: string;
  valorImovel: number;
  valorSolicitado: number;
  isRural: boolean;
  isAverbado: boolean;
  tipoConstrucao: string;
}

export const useDynamicLTV = ({
  cityName,
  uf,
  valorImovel,
  valorSolicitado,
  isRural,
  isAverbado,
  tipoConstrucao
}: DynamicLTVParams): DynamicLTVResult => {
  const [population, setPopulation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxLTV, setMaxLTV] = useState(50); // LTV padrão
  const [isBlocked, setIsBlocked] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!cityName || cityName.trim() === '') {
      setPopulation(null);
      setMaxLTV(50);
      setIsBlocked(false);
      setReason('');
      return;
    }

    const fetchPopulationAndCalculateLTV = async () => {
      setLoading(true);
      setError(null);

      try {
        // Buscar população da cidade
        const response = await fetch('/ltv/ltvs_formatado.json');
        if (!response.ok) {
          throw new Error('Arquivo JSON não encontrado');
        }

        const cityData: CityData[] = await response.json();
        
        // Buscar a cidade (case insensitive) - com ou sem UF
        let foundCity: CityData | undefined;
        
        if (uf && uf.trim() !== '') {
          // Busca mais específica: cidade + UF
          foundCity = cityData.find(city => 
            city.Cidade.toLowerCase().trim() === cityName.toLowerCase().trim() &&
            city.uf.toLowerCase().trim() === uf.toLowerCase().trim()
          );
        } else {
          // Busca apenas por cidade (fallback)
          foundCity = cityData.find(city => 
            city.Cidade.toLowerCase().trim() === cityName.toLowerCase().trim()
          );
        }

        if (foundCity) {
          const cityPopulation = Number(foundCity.População);
          setPopulation(cityPopulation);
          
          // Calcular LTV baseado nas regras
          let calculatedLTV = 50; // LTV padrão
          let blockReason = '';

          // Regra 1: Cidades com população menor que 10 mil - BLOQUEAR
          if (cityPopulation < 10000) {
            calculatedLTV = 0;
            blockReason = `Cidade com população menor que 10.000 habitantes (${cityPopulation.toLocaleString('pt-BR')} hab). Empréstimo não permitido.`;
          }
          // Regra 2: Cidades com população menor que 80 mil - LTV 30%
          else if (cityPopulation < 80000) {
            calculatedLTV = 30;
            blockReason = `Cidade com população menor que 80.000 habitantes (${cityPopulation.toLocaleString('pt-BR')} hab). LTV limitado a 30%.`;
          }
          // Regra 3: Imóvel rural - LTV 30%
          else if (isRural) {
            calculatedLTV = 30;
            blockReason = 'Imóvel rural. LTV limitado a 30%.';
          }
          // Regra 4: Não averbado - LTV 30%
          else if (!isAverbado) {
            calculatedLTV = 30;
            blockReason = 'Imóvel não averbado. LTV limitado a 30%.';
          }
          // Regra 5: Tipo de construção específico - LTV 30%
          else if (tipoConstrucao && tipoConstrucao.toLowerCase().includes('construção')) {
            calculatedLTV = 30;
            blockReason = 'Tipo de garantia: construção. LTV limitado a 30%.';
          }

          setMaxLTV(calculatedLTV);

          // Verificar se valor solicitado excede o permitido
          const valorMaximoPermitido = (valorImovel * calculatedLTV) / 100;
          
          if (valorSolicitado > valorMaximoPermitido) {
            setIsBlocked(true);
            setReason(`${blockReason} Valor solicitado (R$ ${valorSolicitado.toLocaleString('pt-BR')}) excede o valor máximo permitido (R$ ${valorMaximoPermitido.toLocaleString('pt-BR')}).`);
          } else {
            setIsBlocked(false);
            setReason(blockReason || 'Valor dentro dos limites permitidos.');
          }

        } else {
          setPopulation(null);
          setMaxLTV(50);
          setIsBlocked(false);
          setReason('');
          setError('Cidade não encontrada nos dados');
        }
      } catch (err) {
        console.error('Erro ao buscar população da cidade:', err);
        setError('Erro ao carregar dados da cidade');
        setPopulation(null);
        setMaxLTV(50);
        setIsBlocked(false);
        setReason('');
      } finally {
        setLoading(false);
      }
    };

    fetchPopulationAndCalculateLTV();
  }, [cityName, uf, valorImovel, valorSolicitado, isRural, isAverbado, tipoConstrucao]);

  return {
    maxLTV,
    isBlocked,
    reason,
    population,
    loading,
    error
  };
};
