import React, { useState, useEffect } from 'react';

interface CityData {
  uf: string;
  Cidade: string;
  População: string;
  LTV: string;
}

interface CityPopulationDisplayProps {
  cityName: string;
  uf?: string;
}

const CityPopulationDisplay: React.FC<CityPopulationDisplayProps> = ({ cityName, uf }) => {
  const [population, setPopulation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityName || cityName.trim() === '') {
      setPopulation(null);
      return;
    }

    const searchCityPopulation = async () => {
      setLoading(true);
      setError(null);

      try {
        // Carregar o arquivo JSON
        const response = await fetch('/ltv/ltvs_formatado.json');
        if (!response.ok) {
          throw new Error('Erro ao carregar dados das cidades');
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
          setPopulation(foundCity.População);
        } else {
          setError('Cidade não encontrada nos dados');
          setPopulation(null);
        }
      } catch (err) {
        setError('Erro ao buscar dados da cidade');
        setPopulation(null);
        console.error('Erro ao buscar população da cidade:', err);
      } finally {
        setLoading(false);
      }
    };

    searchCityPopulation();
  }, [cityName, uf]);

  if (loading) {
    return (
      <div className="text-sm text-blue-600 flex items-center">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
        Buscando população...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (population) {
    return (
      <div className="text-sm text-green-600 font-medium">
        População: {parseInt(population).toLocaleString('pt-BR')} habitantes
      </div>
    );
  }

  return null;
};

export default CityPopulationDisplay;
