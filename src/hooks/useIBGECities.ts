import { useEffect, useState, useCallback } from 'react';

export interface IBGECity {
  id: number;
  nome: string;
  microrregiao: {
    id: number;
    nome: string;
    mesorregiao: {
      id: number;
      nome: string;
      UF: {
        id: number;
        sigla: string;
        nome: string;
        regiao: {
          id: number;
          sigla: string;
          nome: string;
        };
      };
    };
  };
  'regiao-imediata': {
    id: number;
    nome: string;
    'regiao-intermediaria': {
      id: number;
      nome: string;
      UF: {
        id: number;
        sigla: string;
        nome: string;
        regiao: {
          id: number;
          sigla: string;
          nome: string;
        };
      };
    };
  };
}

export interface CityOption {
  Id: string;
  Name: string;
  cityData: IBGECity;
}

interface CachedCities {
  cities: IBGECity[];
  timestamp: number;
}

const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 dias em millisegundos
const CACHE_KEY = 'ibge_cities_raw_cache';
const DEBOUNCE_DELAY = 300; // 300ms de debounce

// Função para extrair a UF de forma robusta
const extractUF = (city: IBGECity): string => {
  // Tenta primeiro a estrutura microrregiao
  if (city.microrregiao?.mesorregiao?.UF?.sigla) {
    return city.microrregiao.mesorregiao.UF.sigla;
  }
  
  // Tenta a estrutura regiao-imediata como fallback
  if (city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla) {
    return city['regiao-imediata']['regiao-intermediaria'].UF.sigla;
  }
  
  return 'UF'; // Fallback genérico
};

// Função para ordenar cidades alfabeticamente
const sortCities = (cities: CityOption[]): CityOption[] => {
  return [...cities].sort((a, b) => {
    return a.Name.localeCompare(b.Name, 'pt-BR', { 
      sensitivity: 'base',
      numeric: true 
    });
  });
};

// Função para buscar cidades baseada no texto
const searchCities = (cities: IBGECity[], searchText: string): CityOption[] => {
  const normalizedSearch = searchText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return cities
    .filter(city => {
      const cityName = city.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const uf = extractUF(city).toLowerCase();
      
      return cityName.includes(normalizedSearch) || uf.includes(normalizedSearch);
    })
    .map(city => ({
      Id: city.id.toString(),
      Name: `${city.nome} - ${extractUF(city)}`,
      cityData: city
    }))
    .slice(0, 50); // Limita a 50 resultados para performance
};

const getCachedCities = (): IBGECity[] | null => {
  // Temporariamente desabilitado para evitar problemas de quota
  return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (!cached) return null;
    
    const parsed: CachedCities = JSON.parse(cached);
    const now = Date.now();
    
    // Verifica se o cache ainda é válido
    if (now - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return parsed.cities;
  } catch (error) {
    return null;
  }
};

const setCachedCities = (cities: IBGECity[]): void => {
  // Temporariamente desabilitado para evitar problemas de quota
  return;
  
  try {
    const cacheData: CachedCities = {
      cities,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
  }
};

// Função para limpar o cache das cidades
export const clearIBGECitiesCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
  }
};

export function useIBGECities() {
  const [allCities, setAllCities] = useState<IBGECity[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  // Função para buscar cidades com debounce
  const searchCitiesWithDebounce = useCallback(
    debounce((text: string, cities: IBGECity[]) => {
      setSearchLoading(true);
      const results = searchCities(cities, text);
      setFilteredCities(sortCities(results));
      setSearchLoading(false);
    }, DEBOUNCE_DELAY),
    []
  );

  // Carregar todas as cidades uma vez
  useEffect(() => {
    async function fetchAllCities() {
      setLoading(true);
      setError(null);
      
      // Primeiro, tenta buscar do cache
      const cachedCities = getCachedCities();
      
      if (cachedCities) {
        setAllCities(cachedCities);
        setLoading(false);
        return;
      }
      
      // Se não há cache válido, faz a requisição
      try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: IBGECity[] = await response.json();
        
        // Filtra apenas cidades com estrutura válida
        const validCities = data.filter(city => city && city.nome && extractUF(city));
        
        // Salva no cache
        setCachedCities(validCities);
        setAllCities(validCities);
        
      } catch (err) {
        setError(`Erro ao buscar cidades do IBGE: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllCities();
  }, []);

  // Buscar cidades quando o texto de busca mudar
  useEffect(() => {
    if (allCities.length > 0 && searchText.length >= 2) {
      searchCitiesWithDebounce(searchText, allCities);
    } else if (searchText.length < 2) {
      setFilteredCities([]); // Limpa resultados se texto for muito curto
    }
  }, [searchText, allCities, searchCitiesWithDebounce]);

  // Função para atualizar o texto de busca
  const updateSearchText = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  // Função para marcar que uma opção foi selecionada
  const onOptionSelected = useCallback((cityId: string) => {
    setSelectedCityId(cityId);
    setSearchText(''); // Limpa o texto de busca
    setFilteredCities([]); // Limpa as opções filtradas
  }, []);

  // Retorna as opções incluindo a cidade selecionada se necessário
  const getCitiesForSelect = useCallback(() => {
    // Se há uma cidade selecionada, sempre incluí-la nas opções
    if (selectedCityId) {
      const selectedCity = allCities.find(city => city.id.toString() === selectedCityId);
      if (selectedCity) {
        const selectedOption = {
          Id: selectedCity.id.toString(),
          Name: `${selectedCity.nome} - ${extractUF(selectedCity)}`,
          cityData: selectedCity
        };
        
        // Se há opções filtradas, adiciona a selecionada no início
        if (filteredCities.length > 0) {
          return [selectedOption, ...filteredCities];
        }
        
        // Se não há opções filtradas, retorna apenas a selecionada
        return [selectedOption];
      }
    }
    
    // Se não há seleção, retorna as opções filtradas
    return filteredCities;
  }, [selectedCityId, filteredCities, allCities]);

  return { 
    cities: getCitiesForSelect(), 
    loading, 
    searchLoading,
    error, 
    updateSearchText,
    searchText,
    onOptionSelected
  };
}

// Função debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
