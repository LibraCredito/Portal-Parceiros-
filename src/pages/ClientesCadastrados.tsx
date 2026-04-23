import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, Filter, Plus, ArrowLeft, Construction, DollarSign, Calendar, User, Building, RefreshCw, TrendingUp, AlertTriangle, Clock, Target, BarChart3, PieChart, Activity, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { env } from '@/config/env';

// Interface para os dados do Power BI
interface ClientePowerBI {
  "Parceiros": string;
  "Pendências da etapa": string | null;
  "Entrada Negociação": string | null;
  "Entrada Comercial": string | null;
  "Entrada Crédito": string | null;
  "Entrada Operações": string | null;
  "Responsável (Parceiro)": string;
  "Valor": number;
  "Entrada Registro": string | null;
  "Entrada Comitê": string | null;
  "Cliente": string;
  "Valor financiado (FINAL)": number | null;
  "Entrada AIJ": string | null;
  "Valor (FINAL)": number | null;
  "Término": string | null;
  "Id": number;
  "Motivo de perda": string | null;
  "Estágio": string;
  "Início": string;
  "Situação": string;
}

// Definição dos estágios do pipeline
const estagiosPipeline = [
  { 
    id: 'comercial', 
    nome: 'Comercial', 
    cor: 'blue',
    subestagios: ['Conexãos', 'Qualificação', 'Dia 1', 'Dia 2', 'Dia 3', 'Data Marcada']
  },
  { 
    id: 'analise-financeira', 
    nome: 'Análise Financeira', 
    cor: 'green',
    subestagios: ['SCR/Certidões', 'Análise Financeira', 'Doc AF']
  },
  { 
    id: 'analise-juridica', 
    nome: 'Análise Jurídica', 
    cor: 'purple',
    subestagios: ['Análise do Imóvel', 'Análise Jurídica', 'Doc AJ']
  },
  { 
    id: 'comite', 
    nome: 'Comitê', 
    cor: 'orange',
    subestagios: ['Doc CdC', 'Comitê de Crédito']
  },
  { 
    id: 'negociacao', 
    nome: 'Negociação', 
    cor: 'yellow',
    subestagios: ['Negociação', 'Fechamento']
  },
  { 
    id: 'pre-cartorio', 
    nome: 'Pré-Cartório', 
    cor: 'indigo',
    subestagios: ['Laudo/Certificado', 'Formalização', 'Assinatura']
  },
  { 
    id: 'cartorio', 
    nome: 'Cartório', 
    cor: 'pink',
    subestagios: ['Registro', 'Liquidação']
  },
];

// Função para mapear estágio do cliente para o pipeline
const mapearEstagioParaPipeline = (estagio: string) => {
  const mapeamento: { [key: string]: string } = {
    // Comercial
    'Conexão': 'comercial',
    'Qualificação': 'comercial',
    'Dia 1': 'comercial',
    'Dia 2': 'comercial',
    'Dia 3': 'comercial',
    'Data Marcada': 'comercial',
    'Comercial': 'comercial',
    
    // Análise Financeira
    'SCR/Certidões': 'analise-financeira',
    'Análise Financeira': 'analise-financeira',
    'Doc AF': 'analise-financeira',
    
    // Análise Jurídica
    'Análise do Imóvel': 'analise-juridica',
    'Análise Jurídica': 'analise-juridica',
    'Doc AJ': 'analise-juridica',
    
    // Comitê
    'Doc CdC': 'comite',
    'Comitê de Crédito': 'comite',
    'Comitê': 'comite',
    
    // Negociação
    'Negociação': 'negociacao',
    'Fechamento': 'negociacao',
    
    // Pré-Cartório
    'Laudo/Certificado': 'pre-cartorio',
    'Formalização': 'pre-cartorio',
    'Assinatura': 'pre-cartorio',
    'Pré-Cartório': 'pre-cartorio',
    
    // Cartório
    'Registro': 'cartorio',
    'Liquidação': 'cartorio',
    'Cartório': 'cartorio',
    
  };
  return mapeamento[estagio] || 'comercial';
};

// Função para formatar valor monetário
const formatarValor = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Função para formatar data
const formatarData = (dataString: string) => {
  if (!dataString) return '-';
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR');
};

// Função para formatar nome (apenas primeiro e segundo nome)
const formatarNome = (nomeCompleto: string) => {
  if (!nomeCompleto) return '-';
  const nomes = nomeCompleto.trim().split(' ');
  if (nomes.length <= 2) {
    return nomeCompleto;
  }
  return `${nomes[0]} ${nomes[1]}`;
};

// Componente do card do cliente
const ClienteCard: React.FC<{ cliente: ClientePowerBI; onClick: () => void }> = ({ cliente, onClick }) => {
  const getStatusColor = (situacao: string) => {
    switch (situacao) {
      case 'Em aberto': return 'bg-green-500 text-white border-green-600';
      case 'Perdida': return 'bg-red-500 text-white border-red-600';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:border-blue-400 bg-white shadow-md hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardContent className="p-4 2xl:p-5">
        <div className="space-y-3 2xl:space-y-4">
          {/* Header do card */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-base truncate 2xl:text-lg">
                {formatarNome(cliente.Cliente)}
              </h4>
              <p className="text-sm text-gray-700 truncate mt-1 font-medium">
                {cliente['Responsável (Parceiro)']}
              </p>
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(cliente.Situação)} shadow-sm`}>
              {cliente.Situação}
            </span>
          </div>

          {/* Valor */}
          <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg 2xl:p-3">
            <DollarSign className="h-4 w-4 text-green-600 2xl:h-5 2xl:w-5" />
            <span className="text-base font-bold text-gray-900 2xl:text-lg">
              {formatarValor(cliente.Valor)}
            </span>
          </div>

          {/* Parceiro */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-blue-600 2xl:h-5 2xl:w-5" />
            <span className="text-sm text-gray-700 truncate font-medium">
              {cliente.Parceiros}
            </span>
          </div>

          {/* Data de início */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-600 2xl:h-5 2xl:w-5" />
            <span className="text-sm text-gray-700 font-medium">
              Início: {formatarData(cliente.Início)}
            </span>
          </div>

          {/* ID do cliente */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 font-medium 2xl:pt-3">
            ID: {cliente.Id}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente do estágio do pipeline
const EstagioPipeline: React.FC<{ 
  estagio: any; 
  clientes: ClientePowerBI[]; 
  onClienteClick: (cliente: ClientePowerBI) => void 
}> = ({ estagio, clientes, onClienteClick }) => {
  const cores = {
    blue: 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-400 shadow-md',
    green: 'bg-gradient-to-br from-green-100 to-green-200 border-green-400 shadow-md',
    purple: 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-400 shadow-md',
    orange: 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-400 shadow-md',
    yellow: 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 shadow-md',
    indigo: 'bg-gradient-to-br from-indigo-100 to-indigo-200 border-indigo-400 shadow-md',
    pink: 'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-400 shadow-md',
    teal: 'bg-gradient-to-br from-teal-100 to-teal-200 border-teal-400 shadow-md'
  };

  const coresTexto = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    purple: 'text-purple-900',
    orange: 'text-orange-900',
    yellow: 'text-yellow-900',
    indigo: 'text-indigo-900',
    pink: 'text-pink-900',
    teal: 'text-teal-900'
  };

  const coresIndicador = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500'
  };

  // Calcular total de valor dos clientes neste estágio
  const valorTotal = clientes.reduce((sum, cliente) => sum + (cliente.Valor || 0), 0);
  const quantidadeClientes = clientes.length;

  return (
    <div className={`w-80 min-w-80 ${cores[estagio.cor as keyof typeof cores]} rounded-lg border-2 p-3 h-[600px] flex flex-col 2xl:w-96 2xl:min-w-96 2xl:p-4 2xl:h-[700px]`}>
      {/* Header do estágio */}
      <div className="mb-3 flex-shrink-0 2xl:mb-4">
        <h3 className={`font-bold text-base mb-1 ${coresTexto[estagio.cor as keyof typeof coresTexto]} 2xl:text-lg 2xl:mb-2`}>{estagio.nome}</h3>
        
        {/* Total de valor e quantidade - estilo da segunda imagem */}
        <div className="mb-2">
          <div className={`text-sm font-medium ${coresTexto[estagio.cor as keyof typeof coresTexto]} opacity-80`}>
            {formatarValor(valorTotal)} - {quantidadeClientes} negócio{quantidadeClientes !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${coresTexto[estagio.cor as keyof typeof coresTexto]}`}>
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          </span>
          <div className={`w-3 h-3 ${coresIndicador[estagio.cor as keyof typeof coresIndicador]} rounded-full shadow-sm`}></div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 2xl:space-y-4">
        {clientes.length > 0 ? (
          clientes.map((cliente, index) => (
            <ClienteCard 
              key={`${cliente.Id}-${index}`} 
              cliente={cliente} 
              onClick={() => onClienteClick(cliente)}
            />
          ))
        ) : (
          <div className="text-center py-8 2xl:py-12">
            <Users className="h-10 w-10 text-gray-400 mx-auto mb-2 2xl:h-12 2xl:w-12 2xl:mb-3" />
            <p className="text-sm text-gray-600 font-medium">Nenhum cliente</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Função para calcular métricas de performance
const calcularMetricas = (clientes: ClientePowerBI[], todosClientes: ClientePowerBI[]) => {
  const totalClientes = clientes.length;
  
  // Clientes "Em Aberto" = todos os funis exceto perdidos
  const clientesEmAberto = clientes.filter(c => {
    return c.Situação !== 'Perdida'; // Excluir apenas perdidos
  }).length;
  
  // Clientes perdidos = situação "Perdida" (sempre do total)
  const clientesPerdidos = clientes.filter(c => c.Situação === 'Perdida').length;
  
  // Clientes na carteira (ganhos) = 0 (estágio removido)
  const clientesNaCarteira = 0;
  
  // Valores dos clientes filtrados
  const valorTotal = clientes.reduce((sum, c) => sum + (c.Valor || 0), 0);
  
  // Valor em aberto dos clientes filtrados
  const valorEmAberto = clientes
    .filter(c => {
      return c.Situação !== 'Perdida';
    })
    .reduce((sum, c) => sum + (c.Valor || 0), 0);
  
  // Taxa de conversão = 0 (estágio carteira removido)
  const totalProcessados = clientesPerdidos + clientesNaCarteira;
  const taxaConversao = '0';
  
  return {
    totalClientes,
    clientesEmAberto,
    clientesPerdidos,
    clientesNaCarteira,
    valorTotal,
    valorEmAberto,
    taxaConversao,
    totalProcessados,
    // Flag para indicar se há filtros ativos
    temFiltros: clientes.length !== todosClientes.length
  };
};

// Função para calcular distribuição por estágio
const calcularDistribuicaoEstagio = (clientes: ClientePowerBI[]) => {
  const distribuicao = estagiosPipeline.map(estagio => {
    const clientesNoEstagio = clientes.filter(cliente => 
      mapearEstagioParaPipeline(cliente.Estágio) === estagio.id
    );
    
    const valorTotal = clientesNoEstagio.reduce((sum, c) => sum + (c.Valor || 0), 0);
    const percentual = clientes.length > 0 ? ((clientesNoEstagio.length / clientes.length) * 100).toFixed(1) : '0';
    
    return {
      ...estagio,
      quantidade: clientesNoEstagio.length,
      valor: valorTotal,
      percentual: parseFloat(percentual)
    };
  });
  
  return distribuicao;
};

// Função para identificar clientes com pendências
const identificarPendencias = (clientes: ClientePowerBI[]) => {
  const hoje = new Date();
  const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return clientes.filter(cliente => {
    if (cliente.Situação !== 'Em aberto') return false;
    
    // Verificar se há pendências há mais de 7 dias
    const dataInicio = new Date(cliente.Início);
    return dataInicio < umaSemanaAtras;
  });
};

// Função para calcular atividades recentes
const calcularAtividadesRecentes = (clientes: ClientePowerBI[]) => {
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const atividades = [];
  
  clientes.forEach(cliente => {
    if (cliente.Situação === 'Em aberto') {
      const dataInicio = new Date(cliente.Início);
      
      if (dataInicio.toDateString() === hoje.toDateString()) {
        atividades.push({
          tipo: 'novo',
          descricao: `Cliente ${cliente.Cliente} iniciou processo`,
          cliente: cliente,
          tempo: 'Hoje',
          prioridade: 'alta'
        });
      } else if (dataInicio.toDateString() === ontem.toDateString()) {
        atividades.push({
          tipo: 'recente',
          descricao: `Cliente ${cliente.Cliente} iniciou processo`,
          cliente: cliente,
          tempo: 'Ontem',
          prioridade: 'media'
        });
      } else if (dataInicio > umaSemanaAtras) {
        atividades.push({
          tipo: 'semana',
          descricao: `Cliente ${cliente.Cliente} iniciou processo`,
          cliente: cliente,
          tempo: 'Esta semana',
          prioridade: 'baixa'
        });
      }
    }
  });
  
  return atividades.slice(0, 10); // Limitar a 10 atividades
};

const ClientesCadastrados: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [clienteSelecionado, setClienteSelecionado] = useState<ClientePowerBI | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [clientes, setClientes] = useState<ClientePowerBI[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGroup, setUserGroup] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('Em aberto'); // Filtro padrão
  const [dataLoaded, setDataLoaded] = useState(false); // Controle para evitar recarregamento
  const [filtroValor, setFiltroValor] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos');

  // Buscar dados do Power BI
  const fetchPowerBIData = async (grupoNome: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const powerBiUrl = env.POWER_BI_URL;

      const response = await fetch(powerBiUrl);
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}`);
      }
      
      const data = await response.json();

      console.log('data', data.length);

      // Informações do usuário para debug
      const usuarioData = profile?.UsuarioData;
      const usuarioRole = profile?.role;
      
      // Filtrar dados pelo grupo do usuário E pelo usuário logado
      const dadosFiltrados = data.filter((cliente: any) => {
        // Tentar diferentes variações de nomes de campos (case-insensitive)
        const encontrarCampo = (chaves: string[], objeto: any): string => {
          for (const chave of chaves) {
            // Buscar exato
            if (objeto[chave] !== undefined && objeto[chave] !== null && objeto[chave] !== '') {
              return String(objeto[chave]).trim();
            }
            // Buscar case-insensitive
            const chaveLower = chave.toLowerCase();
            for (const key in objeto) {
              if (key.toLowerCase() === chaveLower && objeto[key] !== undefined && objeto[key] !== null && objeto[key] !== '') {
                return String(objeto[key]).trim();
              }
            }
          }
          return '';
        };
        
        // Tentar encontrar o campo Parceiros com variações
        const parceiroCliente = encontrarCampo([
          'Parceiros',
          'Parceiro',
          'Grupo',
          'Parceiro Responsável'
        ], cliente);
        
        // Tentar encontrar o campo Responsável com variações
        const responsavelCliente = encontrarCampo([
          'Responsável (Parceiro)',
          'Responsável',
          'Responsavel',
          'Responsável Parceiro',
          'Parceiro Responsável'
        ], cliente);
        
        const grupoUsuario = (grupoNome || '').trim();
        const usuarioDataNormalizado = (usuarioData || '').trim();
        
        // Se UsuarioData contém o nome do grupo (ex: "Cristhiano NCX"), extrair apenas o nome
        const nomeUsuario = usuarioDataNormalizado.includes(' ') 
          ? usuarioDataNormalizado.split(' ').slice(0, -1).join(' ').trim() // Remove última palavra (grupo)
          : usuarioDataNormalizado;
        
        // Primeiro verificar se o parceiro do cliente corresponde ao grupo do usuário
        // Se parceiroCliente estiver vazio, usar lógica alternativa
        let grupoCorreto = false;
        if (parceiroCliente) {
          grupoCorreto = parceiroCliente.toLowerCase() === grupoUsuario.toLowerCase();
        } else {
          // Se não tiver parceiro definido, O Cliente não irá pertencer então a nenhum grupo // 23/04/2025 Ajuste.
          // (campos podem estar vazios mas o cliente ainda pertence ao grupo)
          grupoCorreto = false; 
        }
        
        // Depois verificar se o usuário logado é o responsável pelo cliente
        // ou se é um coordenador/admin que pode ver todos os clientes do grupo
        let podeVerCliente = false;
        
        if (usuarioRole === 'admin' || usuarioRole === 'coordenador') {
          // Admin e coordenador veem todos os clientes do grupo
          podeVerCliente = grupoCorreto;
        } else if (responsavelCliente) {
          // Usuário comum: verificar se é o responsável
          podeVerCliente = (
            responsavelCliente.toLowerCase() === usuarioDataNormalizado.toLowerCase() ||
            responsavelCliente.toLowerCase() === nomeUsuario.toLowerCase() ||
            responsavelCliente.toLowerCase().includes(nomeUsuario.toLowerCase()) ||
            nomeUsuario.toLowerCase().includes(responsavelCliente.toLowerCase())
          );
        } else {
          // Se não tiver responsável definido e for usuário comum, não mostrar
          podeVerCliente = false;
        }
        
        // Log detalhado para os primeiros clientes (para debug)
        
        // Log apenas para clientes que passam no filtro (primeiros 3)
        if (data.indexOf(cliente) < 3 && grupoCorreto && podeVerCliente) {
          console.log('✅ Cliente que PASSA no filtro:', {
            cliente: cliente.Cliente || cliente.cliente,
            parceiro: parceiroCliente,
            responsavel: responsavelCliente
          });
        }
        
        return grupoCorreto && podeVerCliente;
      });
      
      setClientes(dadosFiltrados);
      setDataLoaded(true); // Marcar que os dados foram carregados com sucesso
    } catch (error: any) {
      console.error('❌ Erro completo ao buscar dados do Power BI:', error);
      setError(`Erro ao carregar dados do Power BI: ${error.message || 'Erro desconhecido'}. Verifique se o link está correto e se retorna um JSON válido.`);
      // Usar dados de fallback em caso de erro
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar grupo do usuário
  const fetchUserGroup = async () => {
    try {
      if (profile?.group_id) {
        const { data: groupData, error } = await supabase
          .from('groups')
          .select('*')
          .eq('id', profile.group_id)
          .single();

        if (error) {
          setError('Erro ao carregar dados do grupo');
          return;
        }

        setUserGroup(groupData);


        // Sempre usar a URL do Power BI da variável de ambiente
        await fetchPowerBIData(groupData.name);
      } else {
        setError('Usuário não possui grupo associado');
      }
    } catch (error) {
      setError('Erro ao carregar dados do usuário');
    }
  };

  useEffect(() => {
    if (profile && !dataLoaded) {
      fetchUserGroup();
    } else if (profile && dataLoaded) {
      // Se os dados já foram carregados, apenas definir loading como false
      setLoading(false);
    }
  }, [profile, dataLoaded]);

  // Calcular clientes filtrados usando useMemo para evitar recálculos desnecessários
  // Excluir clientes com estágio "Ativo" ou "Carteira" do dashboard
  const clientesFiltrados = useMemo(() => {
    let clientesFiltrados = clientes;

    // Primeiro, excluir clientes com estágio "Ativo" ou "Carteira"
    const estagiosExcluidos = ['Ativo', 'Carteira', 'ativo', 'carteira'];
    clientesFiltrados = clientesFiltrados.filter(cliente => {
      const estagio = cliente.Estágio?.trim() || '';
      return !estagiosExcluidos.includes(estagio);
    });

    // Depois filtrar por situação
    if (filtroSituacao !== 'Todos') {
      clientesFiltrados = clientesFiltrados.filter((cliente) => cliente.Situação === filtroSituacao);
    }

    // Depois filtrar por termo de busca
    if (searchTerm.trim()) {
      const termoLower = searchTerm.toLowerCase().trim();
      clientesFiltrados = clientesFiltrados.filter((cliente) => {
        // Buscar principalmente pelo nome do cliente
        const nomeCliente = cliente.Cliente.toLowerCase();
        if (nomeCliente.includes(termoLower)) {
          return true;
        }

        // Buscar também por outros campos relevantes
        const responsavel = cliente['Responsável (Parceiro)']?.toLowerCase() || '';
        const parceiro = cliente.Parceiros?.toLowerCase() || '';
        const id = cliente.Id.toString();

        return (
          responsavel.includes(termoLower) ||
          parceiro.includes(termoLower) ||
          id.includes(termoLower)
        );
      });
    }

    
    return clientesFiltrados;
  }, [clientes, searchTerm, filtroSituacao]);

  // Calcular métricas
  const metricas = useMemo(() => calcularMetricas(clientesFiltrados, clientes), [clientesFiltrados, clientes]);
  const distribuicaoEstagio = useMemo(() => calcularDistribuicaoEstagio(clientesFiltrados), [clientesFiltrados]);
  const pendencias = useMemo(() => identificarPendencias(clientesFiltrados), [clientesFiltrados]);
  const atividadesRecentes = useMemo(() => calcularAtividadesRecentes(clientesFiltrados), [clientesFiltrados]);

  // Organizar clientes por estágio
  const clientesPorEstagio = estagiosPipeline.map(estagio => {
    const clientesNoEstagio = clientesFiltrados.filter(cliente => 
      mapearEstagioParaPipeline(cliente.Estágio) === estagio.id
    );
    
    return {
      ...estagio,
      clientes: clientesNoEstagio
    };
  });

  const handleClienteClick = (cliente: ClientePowerBI) => {
    setClienteSelecionado(cliente);
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setClienteSelecionado(null);
  };

  const handleRefresh = () => {
    if (userGroup?.name) {
      setDataLoaded(false); // Resetar o estado para permitir recarregamento
      fetchPowerBIData(userGroup.name);
    }
  };

  // Função para lidar com mudanças no campo de busca
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const termo = event.target.value;
    setSearchTerm(termo);
  };

  // Função para limpar a busca
  const limparBusca = () => {
    setSearchTerm('');
  };

  // Função para mudar filtro de situação
  const handleFiltroSituacaoChange = (situacao: string) => {
    setFiltroSituacao(situacao);
  };

  // Função para aplicar filtros avançados
  const aplicarFiltrosAvancados = (clientes: ClientePowerBI[]) => {
    let clientesFiltrados = clientes;

    // Filtro por valor
    if (filtroValor !== 'todos') {
      switch (filtroValor) {
        case 'baixo':
          clientesFiltrados = clientesFiltrados.filter(c => (c.Valor || 0) < 100000);
          break;
        case 'medio':
          clientesFiltrados = clientesFiltrados.filter(c => (c.Valor || 0) >= 100000 && (c.Valor || 0) < 500000);
          break;
        case 'alto':
          clientesFiltrados = clientesFiltrados.filter(c => (c.Valor || 0) >= 500000);
          break;
      }
    }

    // Filtro por período
    if (filtroPeriodo !== 'todos') {
      const hoje = new Date();
      const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      const umMesAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      switch (filtroPeriodo) {
        case 'semana':
          clientesFiltrados = clientesFiltrados.filter(c => new Date(c.Início) > umaSemanaAtras);
          break;
        case 'mes':
          clientesFiltrados = clientesFiltrados.filter(c => new Date(c.Início) > umMesAtras);
          break;
        case 'antigo':
          clientesFiltrados = clientesFiltrados.filter(c => new Date(c.Início) <= umMesAtras);
          break;
      }
    }

    // Filtro por responsável
    if (filtroResponsavel !== 'todos') {
      clientesFiltrados = clientesFiltrados.filter(c => c['Responsável (Parceiro)'] === filtroResponsavel);
    }

    return clientesFiltrados;
  };

  // Aplicar filtros avançados aos clientes já filtrados
  // Excluir clientes com estágio "Ativo" ou "Carteira" da esteira comercial
  const clientesComFiltrosAvancados = useMemo(() => {
    const clientesFiltradosAvancados = aplicarFiltrosAvancados(clientesFiltrados);
    
    // Filtrar clientes que estão no estágio "Ativo" ou "Carteira"
    const estagiosExcluidos = ['Ativo', 'Carteira', 'ativo', 'carteira'];
    return clientesFiltradosAvancados.filter(cliente => {
      const estagio = cliente.Estágio?.trim() || '';
      return !estagiosExcluidos.includes(estagio);
    });
  }, [clientesFiltrados, filtroValor, filtroPeriodo, filtroResponsavel]);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 bg-white border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6" />
            <p className="text-gray-800 text-xl font-semibold">Carregando dados...</p>
            <p className="text-gray-600 mt-2">Aguarde enquanto buscamos as informações dos clientes</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 bg-white border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pipeline de Clientes</h1>
              <p className="text-gray-700 mt-2 font-medium">Erro ao carregar dados</p>
            </div>
          </div>
        </div>
        <Card className="border-red-400 bg-red-100 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">!</span>
              </div>
              <h3 className="text-xl font-bold text-red-900 mb-3">Erro ao Carregar Dados</h3>
              <p className="text-red-800 mb-6 text-lg">{error}</p>
              <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3">
                <RefreshCw className="h-5 w-5 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 min-h-screen 2xl:p-6 2xl:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 bg-white border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          {/* <div>
            <h1 className="text-3xl font-bold text-gray-900">Pipeline de Clientes   </h1>
            <p className="text-gray-700 mt-2">
              Visualize o progresso dos clientes através dos estágios 
              {userGroup && (
                <span className="text-blue-700 font-medium">
                  • Grupo: {userGroup.name} • Filtrado por parceiro
                </span>
              )}
            </p>
          </div> */}
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate('/cadastro-de-proposta')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Mensagem de Boas-vindas Personalizada */}
             {profile && (
         <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
           <CardContent className="p-4 2xl:p-6">
             <div className="flex items-center space-x-3 2xl:space-x-4">
               <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center 2xl:w-12 2xl:h-12">
                 <Users className="h-5 w-5 text-white 2xl:h-6 2xl:w-6" />
               </div>
              <div className="flex-1">
                                 <h2 className="text-lg font-bold text-blue-900 mb-1 2xl:text-xl">
                   Bem-vindo, {profile.name}!
                 </h2>
                 <p className="text-blue-700 text-sm 2xl:text-base">
                  {profile.role === 'usuario' ? (
                    <>Aqui você pode visualizar todos os <strong>seus clientes cadastrados</strong> no sistema.</>
                  ) : profile.role === 'coordenador' ? (
                    <>Como coordenador, você pode visualizar <strong>todos os clientes do seu grupo</strong>.</>
                  ) : (
                    <>Como administrador, você pode visualizar <strong>todos os clientes do grupo</strong>.</>
                  )}
                </p>
                {profile.role === 'usuario' && (
                  <p className="text-xs text-blue-600 mt-1 2xl:text-sm 2xl:mt-2">
                    💡 <strong>Dica:</strong> Os clientes são filtrados automaticamente para mostrar apenas aqueles onde você é o responsável.
                    {profile.UsuarioData && (
                      <span className="block mt-1">
                        🔍 <strong>Identificador:</strong> {profile.UsuarioData}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Executivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 2xl:gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Valor Total</p>
                <p className="text-3xl font-bold text-white">{formatarValor(metricas.valorTotal)}</p>
                <p className="text-xs text-blue-200 mt-1">
                  {metricas.totalClientes} cliente{metricas.totalClientes !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                <DollarSign className="h-6 w-6 text-white 2xl:h-8 2xl:w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Valor em Abertos</p>
                <p className="text-3xl font-bold text-white">{formatarValor(metricas.valorEmAberto)}</p>
                <p className="text-xs text-green-200 mt-1">
                  {metricas.clientesEmAberto} cliente{metricas.clientesEmAberto !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                <Target className="h-6 w-6 text-white 2xl:h-8 2xl:w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center space-x-2 2xl:space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                <Users className="h-5 w-5 text-white 2xl:h-6 2xl:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100">Total de Clientes</p>
                <p className="text-3xl font-bold text-white">{metricas.totalClientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center space-x-2 2xl:space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                <Users className="h-5 w-5 text-white 2xl:h-6 2xl:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-100">Em Aberto</p>
                <p className="text-3xl font-bold text-white">{metricas.clientesEmAberto}</p>
                {/* <p className="text-3xl font-bold text-white">
                  {clientes.filter(c => {
                    const estagioPipeline = mapearEstagioParaPipeline(c.Estágio);
                    return estagioPipeline !== 'carteira' && c.Situação !== 'Perdida';
                  }).length}
                </p> */}
                <p className="text-xs text-green-100 mt-1">
                  
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center space-x-2 2xl:space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                 <Users className="h-5 w-5 text-white 2xl:h-6 2xl:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-100">Em Análise</p>
                <p className="text-3xl font-bold text-white">
                  {clientes.filter(c => {
                    const estagioPipeline = mapearEstagioParaPipeline(c.Estágio);
                    return (estagioPipeline === 'analise-financeira' || estagioPipeline === 'analise-juridica') && c.Situação == 'Em aberto';
                  }).length}
                </p>
                <p className="text-xs text-orange-100 mt-1">
                  Análise Financeira + Jurídica (total real)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-teal-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center space-x-2 2xl:space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                 <Users className="h-5 w-5 text-white 2xl:h-6 2xl:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-teal-100">Na Carteira</p>
                <p className="text-3xl font-bold text-white">0</p>
                <p className="text-xs text-teal-100 mt-1">
                  Clientes finalizados com sucesso (total real)
                </p>
              </div>
            </div>
          </CardContent>
        </Card> */}

        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-red-600 shadow-lg">
          <CardContent className="p-4 2xl:p-6">
            <div className="flex items-center space-x-2 2xl:space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg 2xl:p-3">
                <Users className="h-5 w-5 text-white 2xl:h-6 2xl:w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-100">Perdidos</p>
                <p className="text-3xl font-bold text-white">{metricas.clientesPerdidos}</p>
                <p className="text-xs text-red-100 mt-1">
                  Clientes perdidos (total real)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Search and Filters */}
             <Card className="bg-white shadow-md border-gray-200">
         <CardContent className="p-4 2xl:p-6">
           <div className="space-y-3 2xl:space-y-4">
            {/* Busca principal */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome do cliente, responsável, parceiro ou ID..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
                {searchTerm && (
                  <button
                    onClick={limparBusca}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {searchTerm && (
                  <div className="text-sm text-gray-700 font-medium">
                    {clientesComFiltrosAvancados.length} resultado{clientesComFiltrosAvancados.length !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={filtroSituacao}
                    onChange={(e) => handleFiltroSituacaoChange(e.target.value)}
                    className="px-3 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Perdida">Perdidos</option>
                    <option value="Em aberto">Em Aberto</option>
                  </select>
                </div>
              </div>
            </div>

                         {/* Filtros avançados */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200 2xl:pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Faixa de Valor</label>
                <select
                  value={filtroValor}
                  onChange={(e) => setFiltroValor(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                >
                  <option value="todos">Todas as faixas</option>
                  <option value="baixo">Até R$ 100.000</option>
                  <option value="medio">R$ 100.000 - R$ 500.000</option>
                  <option value="alto">Acima de R$ 500.000</option>
                </select>
              </div>
              
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período de Início</label>
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
                >
                  <option value="todos">Todos os períodos</option>
                  <option value="semana">Última semana</option>
                  <option value="mes">Último mês</option>
                  <option value="antigo">Mais antigo</option>
                </select>
              </div> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Distribuição por Estágio */}
      {/* <Card className="bg-white shadow-md border-gray-200">
         <CardHeader className="pb-3 2xl:pb-0">
           <CardTitle className="flex items-center space-x-2 text-gray-900">
             <BarChart3 className="h-5 w-5" />
             <span>Distribuição por Estágio</span>
           </CardTitle>
           <CardDescription className="text-gray-700">
             Visualize a distribuição de clientes e valores por estágio do pipeline
           </CardDescription>
         </CardHeader>
         <CardContent className="p-4 2xl:p-6">
           <div className="space-y-3 2xl:space-y-4">
            {distribuicaoEstagio.map((estagio) => (
              <div key={estagio.id} className="flex items-center space-x-4">
                <div className="w-32 text-sm font-medium text-gray-700">{estagio.nome}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className={`h-6 rounded-full transition-all duration-300 ${
                      estagio.cor === 'blue' ? 'bg-blue-500' :
                      estagio.cor === 'green' ? 'bg-green-500' :
                      estagio.cor === 'purple' ? 'bg-purple-500' :
                      estagio.cor === 'orange' ? 'bg-orange-500' :
                      estagio.cor === 'yellow' ? 'bg-yellow-500' :
                      estagio.cor === 'indigo' ? 'bg-indigo-500' :
                      estagio.cor === 'pink' ? 'bg-pink-500' :
                      'bg-teal-500'
                    }`}
                    style={{ width: `${Math.max(estagio.percentual, 5)}%` }}
                  ></div>
                </div>
                <div className="w-20 text-right text-sm font-medium text-gray-700">
                  {estagio.quantidade}
                </div>
                <div className="w-24 text-right text-sm text-gray-600">
                  {estagio.percentual.toFixed(1)}%
                </div>
                <div className="w-32 text-right text-sm font-medium text-gray-700">
                  {formatarValor(estagio.valor)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}

      {/* Pipeline Visualization */}
    <Card className="bg-white shadow-md border-gray-200">
         <CardHeader className="bg-gray-50 border-b border-gray-200 pb-3 2xl:pb-0">
           <CardTitle className="flex items-center space-x-2 text-gray-900">
             <Users className="h-5 w-5" />
             <span>Pipeline de Clientes</span>
           </CardTitle>
           <CardDescription className="text-gray-700">
             Visualize o progresso dos clientes através dos diferentes estágios do processo
           </CardDescription>
         </CardHeader>
         <CardContent className="p-4 2xl:p-6">
                     <div className="flex gap-4 overflow-x-auto pb-4 px-2 2xl:gap-8">
            {estagiosPipeline.map((estagio) => {
              const clientesNoEstagio = clientesComFiltrosAvancados.filter(cliente => 
                mapearEstagioParaPipeline(cliente.Estágio) === estagio.id
              );
              
              return (
                <EstagioPipeline
                  key={estagio.id}
                  estagio={estagio}
                  clientes={clientesNoEstagio}
                  onClienteClick={handleClienteClick}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes do cliente */}
      {showModal && clienteSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-200">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{formatarNome(clienteSelecionado.Cliente)}</h2>
                    <p className="text-blue-100 text-sm">ID: {clienteSelecionado.Id}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={fecharModal}
                  className="bg-white/20 border-white/30 hover:bg-white/30 text-white w-10 h-10 p-0 rounded-full"
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="p-8">
              {/* Status e Valores - Destaque */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-green-800">Status e Valores</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-600 mb-1">Situação</p>
                    <p className="text-lg font-bold text-green-800">{clienteSelecionado.Situação}</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-600 mb-1">Estágio</p>
                    <p className="text-lg font-bold text-green-800">{clienteSelecionado.Estágio}</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-600 mb-1">Valor Principal</p>
                    <p className="text-xl font-bold text-green-800">{formatarValor(clienteSelecionado.Valor)}</p>
                  </div>
                </div>
                {clienteSelecionado['Valor (FINAL)'] && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-700">Valor Final:</span>
                      <span className="text-2xl font-bold text-blue-800">{formatarValor(clienteSelecionado['Valor (FINAL)'])}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Informações Básicas */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border-2 border-gray-200 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Informações Básicas</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Parceiro</p>
                        <p className="text-base font-semibold text-gray-900">{clienteSelecionado.Parceiros}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Responsável</p>
                        <p className="text-base font-semibold text-gray-900">{clienteSelecionado['Responsável (Parceiro)']}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datas Importantes - Reorganizada */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-blue-800">Cronograma do Processo</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coluna 1 - Datas Principais */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-blue-700 text-lg mb-3 border-b border-blue-200 pb-2">Datas Principais</h4>
                    
                    <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-semibold text-blue-700">Início do Processo</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900 ml-6">{formatarData(clienteSelecionado.Início)}</p>
                    </div>

                    {clienteSelecionado.Término && (
                      <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-semibold text-blue-700">Término</span>
                        </div>
                        <p className="text-lg font-bold text-blue-900 ml-6">{formatarData(clienteSelecionado.Término)}</p>
                      </div>
                    )}
                  </div>

                  {/* Coluna 2 - Entradas por Etapa */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-blue-700 text-lg mb-3 border-b border-blue-200 pb-2">Entradas por Etapa</h4>
                    
                    <div className="space-y-3">
                      {clienteSelecionado['Entrada Comercial'] && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700 text-sm">Comercial</span>
                            <span className="font-bold text-blue-900">{formatarData(clienteSelecionado['Entrada Comercial'])}</span>
                          </div>
                        </div>
                      )}
                      
                      {clienteSelecionado['Entrada Crédito'] && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700 text-sm">Crédito</span>
                            <span className="font-bold text-blue-900">{formatarData(clienteSelecionado['Entrada Crédito'])}</span>
                          </div>
                        </div>
                      )}
                      
                      {clienteSelecionado['Entrada Comitê'] && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700 text-sm">Comitê</span>
                            <span className="font-bold text-blue-900">{formatarData(clienteSelecionado['Entrada Comitê'])}</span>
                          </div>
                        </div>
                      )}
                      
                      {clienteSelecionado['Entrada Negociação'] && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700 text-sm">Negociação</span>
                            <span className="font-bold text-blue-900">{formatarData(clienteSelecionado['Entrada Negociação'])}</span>
                          </div>
                        </div>
                      )}
                      
                      {clienteSelecionado['Entrada Registro'] && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700 text-sm">Registro</span>
                            <span className="font-bold text-blue-900">{formatarData(clienteSelecionado['Entrada Registro'])}</span>
                          </div>
                        </div>
                      )}
                      
                                             {clienteSelecionado['Entrada AIJ'] && (
                         <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                           <div className="flex items-center justify-between">
                             <span className="font-medium text-blue-700 text-sm">Jurídica</span>
                             <span className="font-bold text-blue-900">{formatarData(clienteSelecionado['Entrada AIJ'])}</span>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              {(clienteSelecionado['Motivo de perda'] || clienteSelecionado['Pendências da etapa']) && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-200 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-yellow-800">Informações Adicionais</h3>
                  </div>
                  <div className="space-y-4">
                    {clienteSelecionado['Motivo de perda'] && (
                      <div className="bg-white p-4 rounded-lg border border-yellow-200">
                        <p className="font-semibold text-yellow-700 mb-2">Motivo de Perda:</p>
                        <p className="text-yellow-900">{clienteSelecionado['Motivo de perda']}</p>
                      </div>
                    )}
                    {clienteSelecionado['Pendências da etapa'] && (
                      <div className="bg-white p-4 rounded-lg border border-yellow-200">
                        <p className="font-semibold text-yellow-700 mb-2">Pendências da Etapa:</p>
                        <p className="text-yellow-900">{clienteSelecionado['Pendências da etapa']}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={fecharModal}
                  className="bg-white border-gray-300 hover:bg-gray-50 font-semibold px-6 py-2"
                >
                  Fechar
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-2 shadow-lg">
                  Editar Cliente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesCadastrados; 