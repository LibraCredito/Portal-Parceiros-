import { useState, useEffect } from 'react';

interface CityData {
  uf: string;
  Cidade: string;
  População: string;
  LTV: string;
}

export const useCityPopulation = (cityName: string, uf?: string) => {
  const [population, setPopulation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityName || cityName.trim() === '') {
      setPopulation(null);
      return;
    }

    const fetchPopulation = async () => {
      setLoading(true);
      setError(null);

      try {
        // Buscar o arquivo JSON
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
          setPopulation(Number(foundCity.População));
        } else {
          setPopulation(null);
          setError('Cidade não encontrada no banco de dados');
        }
      } catch (err) {
        console.error('Erro ao buscar população da cidade:', err);
        setError('Erro ao carregar dados da cidade');
        setPopulation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPopulation();
  }, [cityName, uf]);

  return { population, loading, error };
};
