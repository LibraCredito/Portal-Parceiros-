import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download, 
  Calendar, 
  Target, 
  Activity, 
  Users, 
  ArrowLeft, 
  DollarSign,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  BarChart,
  LineChart,
  PieChart as PieChartIcon,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
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

// Função para calcular dias entre duas datas
const calcularDiasEntre = (dataInicio: string, dataFim: string) => {
  if (!dataInicio || !dataFim) return 0;
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const diffTime = Math.abs(fim.getTime() - inicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Função para exportar dados para Excel (CSV)
const exportarParaExcel = (dados: ClientePowerBI[], nomeArquivo: string) => {
  const headers = [
    'ID',
    'Cliente',
    'Parceiro',
    'Responsável',
    'Situação',
    'Estágio',
    'Valor',
    'Valor Final',
    'Data Início',
    'Data Término',
    'Entrada Comercial',
    'Entrada Crédito',
    'Entrada Comitê',
    'Entrada Negociação',
    'Entrada Registro',
    'Entrada Jurídica',
    'Motivo de Perda',
    'Pendências'
  ];

  const csvContent = [
    headers.join(','),
    ...dados.map(cliente => [
      cliente.Id,
      `"${cliente.Cliente}"`,
      `"${cliente.Parceiros}"`,
      `"${cliente['Responsável (Parceiro)']}"`,
      cliente.Situação,
      cliente.Estágio,
      cliente.Valor,
      cliente['Valor (FINAL)'] || '',
      formatarData(cliente.Início),
      cliente.Término ? formatarData(cliente.Término) : '',
      cliente['Entrada Comercial'] ? formatarData(cliente['Entrada Comercial']) : '',
      cliente['Entrada Crédito'] ? formatarData(cliente['Entrada Crédito']) : '',
      cliente['Entrada Comitê'] ? formatarData(cliente['Entrada Comitê']) : '',
      cliente['Entrada Negociação'] ? formatarData(cliente['Entrada Negociação']) : '',
      cliente['Entrada Registro'] ? formatarData(cliente['Entrada Registro']) : '',
      cliente['Entrada AIJ'] ? formatarData(cliente['Entrada AIJ']) : '',
      cliente['Motivo de perda'] ? `"${cliente['Motivo de perda']}"` : '',
      cliente['Pendências da etapa'] ? `"${cliente['Pendências da etapa']}"` : ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${nomeArquivo}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const MetricasRelatorios: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [clientes, setClientes] = useState<ClientePowerBI[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGroup, setUserGroup] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroSituacao, setFiltroSituacao] = useState<string>('Todos');
  const [filtroEstagio, setFiltroEstagio] = useState<string>('Todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('Todos');

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
      
      // Filtrar dados pelo grupo do usuário
      const dadosFiltrados = data.filter((cliente: ClientePowerBI) => {
        const parceiroCliente = cliente.Parceiros;
        const grupoUsuario = grupoNome;
        return parceiroCliente === grupoUsuario;
      });
      
      setClientes(dadosFiltrados);
    } catch (error) {
      console.error('❌ Erro ao buscar dados do Power BI:', error);
      setError('Erro ao carregar dados do Power BI. Verifique se o link está corretoa.');
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
          console.error('Error fetching user group:', error);
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
      console.error('Error fetching user group:', error);
      setError('Erro ao carregar dados do usuário');
    }
  };

  useEffect(() => {
    if (profile) {
      fetchUserGroup();
    }
  }, [profile]);

  // Função para mapear estágios para categorias principais
  const mapearEstagioParaCategoria = (estagio: string) => {
    const estagioLower = estagio.toLowerCase();
    
    // 1. Comercial
    if (estagioLower.includes('conexão') || estagioLower.includes('qualificação') || 
        estagioLower.includes('dia 1') || estagioLower.includes('dia 2') || 
        estagioLower.includes('dia 3') || estagioLower.includes('data marcada')) {
      return 'Comercial';
    }
    
    // 2. Análise Financeira
    if (estagioLower.includes('scr') || estagioLower.includes('certidões') || 
        estagioLower.includes('análise financeira') || estagioLower.includes('doc af')) {
      return 'Análise Financeira';
    }
    
    // 3. Análise Jurídica
    if (estagioLower.includes('análise do imóvel') || estagioLower.includes('análise jurídica') || 
        estagioLower.includes('doc aj')) {
      return 'Análise Jurídica';
    }
    
    // 4. Comitê
    if (estagioLower.includes('doc cdc') || estagioLower.includes('comitê de crédito') || 
        estagioLower.includes('comitê')) {
      return 'Comitê';
    }
    
    // 5. Negociação
    if (estagioLower.includes('negociação') || estagioLower.includes('fechamento')) {
      return 'Negociação';
    }
    
    // 6. Pré-Cartório
    if (estagioLower.includes('laudo') || estagioLower.includes('certificado') || 
        estagioLower.includes('formalização') || estagioLower.includes('assinatura')) {
      return 'Pré-Cartório';
    }
    
    // 7. Cartório
    if (estagioLower.includes('registro') || estagioLower.includes('liquidação')) {
      return 'Cartório';
    }
    
    // 8. Carteira
    if (estagioLower.includes('ativo') || estagioLower.includes('inserção')) {
      return 'Carteira';
    }
    
    // Se não encontrar correspondência, retorna o estágio original
    return estagio;
  };

  // Calcular métricas usando useMemo
  const metricas = useMemo(() => {
    if (!clientes.length) return null;

    // Filtrar clientes baseado nos filtros
    let clientesFiltrados = clientes;
    
    if (filtroSituacao !== 'Todos') {
      clientesFiltrados = clientesFiltrados.filter(c => c.Situação === filtroSituacao);
    }
    
    if (filtroEstagio !== 'Todos') {
      clientesFiltrados = clientesFiltrados.filter(c => mapearEstagioParaCategoria(c.Estágio) === filtroEstagio);
    }
    
    if (filtroResponsavel !== 'Todos') {
      clientesFiltrados = clientesFiltrados.filter(c => c['Responsável (Parceiro)'] === filtroResponsavel);
    }

         const totalClientes = clientesFiltrados.length;
     const clientesEmAberto = clientesFiltrados.filter(c => c.Situação === 'Em aberto').length;
     const clientesPerdidos = clientesFiltrados.filter(c => c.Situação === 'Perdida').length;
     const clientesCarteira = clientesFiltrados.filter(c => mapearEstagioParaCategoria(c.Estágio) === 'Carteira').length;
     
     // Clientes em aberto (excluindo os que estão na carteira)
     const clientesEmAbertoAtivos = clientesFiltrados.filter(c => 
       c.Situação === 'Em aberto' && mapearEstagioParaCategoria(c.Estágio) !== 'Carteira'
     ).length;
     
     const valorTotal = clientesFiltrados.reduce((sum, c) => sum + c.Valor, 0);
     const valorFinal = clientesFiltrados.reduce((sum, c) => sum + (c['Valor (FINAL)'] || 0), 0);
     const valorCarteira = clientesFiltrados
       .filter(c => mapearEstagioParaCategoria(c.Estágio) === 'Carteira')
       .reduce((sum, c) => sum + (c['Valor financiado (FINAL)'] || 0), 0);
     
     // Valor dos clientes em aberto ativos
     const valorEmAbertoAtivos = clientesFiltrados
       .filter(c => c.Situação === 'Em aberto' && mapearEstagioParaCategoria(c.Estágio) !== 'Carteira')
       .reduce((sum, c) => sum + c.Valor, 0);
     
     const taxaConversao = totalClientes > 0 ? (clientesCarteira / totalClientes) * 100 : 0;
     const taxaPerda = totalClientes > 0 ? (clientesPerdidos / totalClientes) * 100 : 0;
     const taxaEmAbertoAtivos = totalClientes > 0 ? (clientesEmAbertoAtivos / totalClientes) * 100 : 0;

    // Distribuição por estágio (usando categorias principais)
    const distribuicaoEstagio = clientesFiltrados.reduce((acc, cliente) => {
      const categoria = mapearEstagioParaCategoria(cliente.Estágio);
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Distribuição por parceiro
    const distribuicaoParceiro = clientesFiltrados.reduce((acc, cliente) => {
      acc[cliente.Parceiros] = (acc[cliente.Parceiros] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Tempo médio de processamento
    const temposProcessamento = clientesFiltrados
      .filter(c => c.Início && c.Término)
      .map(c => calcularDiasEntre(c.Início, c.Término!))
      .filter(tempo => tempo > 0);

    const tempoMedio = temposProcessamento.length > 0 
      ? temposProcessamento.reduce((sum, tempo) => sum + tempo, 0) / temposProcessamento.length 
      : 0;

    // Evolução mensal (últimos 6 meses)
    const agora = new Date();
    const evolucaoMensal = Array.from({ length: 6 }, (_, i) => {
      const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const clientesMes = clientesFiltrados.filter(c => {
        const dataInicio = new Date(c.Início);
        return dataInicio.getMonth() === data.getMonth() && dataInicio.getFullYear() === data.getFullYear();
      }).length;
      return { mes: mesAno, quantidade: clientesMes };
    }).reverse();

         return {
       totalClientes,
       clientesEmAberto,
       clientesPerdidos,
       clientesCarteira,
       clientesEmAbertoAtivos,
       valorTotal,
       valorFinal,
       valorCarteira,
       valorEmAbertoAtivos,
       taxaConversao,
       taxaPerda,
       taxaEmAbertoAtivos,
       distribuicaoEstagio,
       distribuicaoParceiro,
       tempoMedio,
       evolucaoMensal,
       clientesFiltrados
     };
  }, [clientes, filtroSituacao, filtroEstagio, filtroResponsavel]);

  const handleRefresh = () => {
    if (userGroup?.name) {
      fetchPowerBIData(userGroup.name);
    }
  };

  const handleExportarRelatorio = () => {
    if (metricas?.clientesFiltrados) {
      const nomeArquivo = `relatorio_metricas_${userGroup?.name || 'geral'}_${new Date().toISOString().split('T')[0]}`;
      exportarParaExcel(metricas.clientesFiltrados, nomeArquivo);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6" />
            <p className="text-gray-800 text-xl font-semibold">Carregando métricas...</p>
            <p className="text-gray-600 mt-2">Aguarde enquanto processamos os dados</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6  space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Métricas e Relatórios</h1>
              <p className="text-gray-600 mt-2">Erro ao carregar dados</p>
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

  if (!metricas) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg">Nenhum dado disponível para análise</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Métricas e Relatórios</h1>
            <p className="text-gray-600 mt-2">
              Análise detalhada dos dados do parceiro: <span className="font-semibold text-blue-600">{userGroup?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleExportarRelatorio}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

             {/* Filtros */}
       <Card className="bg-white shadow-md border-gray-200">
         <CardContent className="p-6">
           <div className="space-y-4">
             {/* Header dos Filtros */}
             <div className="flex items-center space-x-2">
               <Filter className="h-5 w-5 text-gray-600" />
               <span className="font-medium text-gray-700">Filtros</span>
             </div>
             
             {/* Grid responsivo para os filtros */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Filtro por Situação */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Situação</label>
                 <select
                   value={filtroSituacao}
                   onChange={(e) => setFiltroSituacao(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                 >
                   <option value="Todos">Todas as Situações</option>
                   <option value="Em aberto">Em Aberto</option>
                   <option value="Perdida">Perdidos</option>
                 </select>
               </div>
               
               {/* Filtro por Estágio */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Estágio</label>
                 <select
                   value={filtroEstagio}
                   onChange={(e) => setFiltroEstagio(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                 >
                   <option value="Todos">Todos os Estágios</option>
                   <option value="Comercial">1. Comercial</option>
                   <option value="Análise Financeira">2. Análise Financeira</option>
                   <option value="Análise Jurídica">3. Análise Jurídica</option>
                   <option value="Comitê">4. Comitê</option>
                   <option value="Negociação">5. Negociação</option>
                   <option value="Pré-Cartório">6. Pré-Cartório</option>
                   <option value="Cartório">7. Cartório</option>
                   <option value="Carteira">8. Carteira</option>
                 </select>
               </div>
               
               {/* Filtro por Responsável */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Responsável</label>
                 <select
                   value={filtroResponsavel}
                   onChange={(e) => setFiltroResponsavel(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                 >
                   <option value="Todos">Todos os Responsáveis</option>
                   {Array.from(new Set(clientes.map(c => c['Responsável (Parceiro)'])))
                     .sort()
                     .map(responsavel => (
                       <option key={responsavel} value={responsavel}>
                         {responsavel}
                       </option>
                     ))}
                 </select>
               </div>
             </div>
             
             {/* Botão para limpar filtros */}
             <div className="flex justify-end pt-2">
               <Button
                 variant="outline"
                 onClick={() => {
                   setFiltroSituacao('Todos');
                   setFiltroEstagio('Todos');
                   setFiltroResponsavel('Todos');
                 }}
                 className="text-sm px-4 py-2 bg-gray-50 border-gray-300 hover:bg-gray-100"
               >
                 Limpar Filtros
               </Button>
             </div>
           </div>
         </CardContent>
       </Card>

             {/* Key Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-100">Total de Clientes</p>
                  <p className="text-3xl font-bold text-white">{metricas.totalClientes}</p>
                  <p className="text-xs text-blue-100 mt-1">
                    Todos os clientes do pipeline
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-600 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-100">Clientes na Carteira</p>
                  <p className="text-3xl font-bold text-white">{metricas.clientesCarteira}</p>
                  <p className="text-xs text-green-100 mt-1">
                    {metricas.taxaConversao.toFixed(1)}% do total
                  </p>
                  <p className="text-xs text-green-100">
                    Finalizaram todo o processo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-100">Em Aberto Ativos</p>
                  <p className="text-3xl font-bold text-white">{metricas.clientesEmAbertoAtivos}</p>
                  <p className="text-xs text-orange-100 mt-1">
                    {metricas.taxaEmAbertoAtivos.toFixed(1)}% do total
                  </p>
                  <p className="text-xs text-orange-100">
                    Excluindo carteira
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-gradient-to-br from-red-500 to-red-600 border-red-600 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-100">Perdidos</p>
                  <p className="text-3xl font-bold text-white">{metricas.clientesPerdidos}</p>
                  <p className="text-xs text-red-100 mt-1">
                    {metricas.taxaPerda.toFixed(1)}% do total
                  </p>
                  <p className="text-xs text-red-100">
                    Clientes que não prosseguiram
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-purple-600 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-100">Valor Financiado</p>
                  <p className="text-2xl font-bold text-white">{formatarValor(metricas.valorCarteira)}</p>
                  <p className="text-xs text-purple-100 mt-1">
                    Média: {formatarValor(metricas.clientesCarteira > 0 ? metricas.valorCarteira / metricas.clientesCarteira : 0)}
                  </p>
                  <p className="text-xs text-purple-100">
                    Apenas clientes na carteira
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
       </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <Card className="bg-white shadow-md border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <LineChart className="h-5 w-5" />
              <span>Evolução Mensal</span>
            </CardTitle>
            <CardDescription>Quantidade de clientes por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2 p-4">
              {metricas.evolucaoMensal.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600"
                    style={{ 
                      height: `${Math.max((item.quantidade / Math.max(...metricas.evolucaoMensal.map(m => m.quantidade))) * 200, 10)}px` 
                    }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    <div className="font-medium">{item.quantidade}</div>
                    <div className="text-gray-400">{item.mes}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Estágio */}
        <Card className="bg-white shadow-md border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <PieChartIcon className="h-5 w-5" />
              <span>Distribuição por Estágio</span>
            </CardTitle>
            <CardDescription>Clientes em cada estágio do pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metricas.distribuicaoEstagio).map(([estagio, quantidade], index) => {
                const porcentagem = (quantidade / metricas.totalClientes) * 100;
                
                // Cores específicas para cada categoria
                const coresPorCategoria: Record<string, string> = {
                  'Comercial': 'bg-blue-500',
                  'Análise Financeira': 'bg-green-500',
                  'Análise Jurídica': 'bg-purple-500',
                  'Comitê': 'bg-orange-500',
                  'Negociação': 'bg-yellow-500',
                  'Pré-Cartório': 'bg-indigo-500',
                  'Cartório': 'bg-pink-500',
                  'Carteira': 'bg-teal-500'
                };
                
                const cor = coresPorCategoria[estagio] || 'bg-gray-500';
                
                return (
                  <div key={estagio} className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${cor}`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{estagio}</span>
                        <span className="text-gray-600">{quantidade} ({porcentagem.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${cor}`}
                          style={{ width: `${porcentagem}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

             {/* Performance Metrics */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="bg-white shadow-md border-gray-200">
           <CardContent className="p-6">
             <div className="text-center space-y-4">
               <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                 <Clock className="h-6 w-6 text-blue-600" />
               </div>
               <div>
                 <h3 className="font-semibold text-gray-900">Tempo Médio</h3>
                 <p className="text-2xl font-bold text-blue-600">{metricas.tempoMedio.toFixed(0)} dias</p>
                 <p className="text-sm text-gray-600 mt-1">Tempo médio de processamento</p>
               </div>
             </div>
           </CardContent>
         </Card>

                  <Card className="bg-white shadow-md border-gray-200">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Taxa de Conversão</h3>
                  <p className="text-2xl font-bold text-green-600">{metricas.taxaConversao.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600 mt-1">Clientes que finalizaram</p>
                </div>
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-white shadow-md border-gray-200">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Valor em Aberto</h3>
                  <p className="text-2xl font-bold text-orange-600">{formatarValor(metricas.valorEmAbertoAtivos)}</p>
                  <p className="text-sm text-gray-600 mt-1">Clientes ativos no pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>

                  <Card className="bg-white shadow-md border-gray-200">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Valor Financiado</h3>
                  <p className="text-2xl font-bold text-purple-600">{formatarValor(metricas.valorCarteira)}</p>
                  <p className="text-sm text-gray-600 mt-1">Valor total na carteira</p>
                </div>
              </div>
            </CardContent>
          </Card>
       </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Top Responsáveis */}
         <Card className="bg-white shadow-md border-gray-200">
           <CardHeader>
             <CardTitle className="flex items-center space-x-2 text-gray-900">
               <Users className="h-5 w-5" />
               <span>Ranking de Responsáveis</span>
             </CardTitle>
             <CardDescription>Todos os responsáveis ordenados por quantidade de clientes</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
               {Object.entries(
                 metricas.clientesFiltrados.reduce((acc, cliente) => {
                   acc[cliente['Responsável (Parceiro)']] = (acc[cliente['Responsável (Parceiro)']] || 0) + 1;
                   return acc;
                 }, {} as Record<string, number>)
               )
                 .sort(([,a], [,b]) => b - a)
                 .map(([responsavel, quantidade], index) => (
                   <div key={responsavel} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                     <div className="flex items-center space-x-3">
                       <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${
                         index === 0 ? 'bg-yellow-500' : 
                         index === 1 ? 'bg-gray-400' : 
                         index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                       }`}>
                         {index + 1}
                       </div>
                       <div className="flex flex-col">
                         <span className="font-medium text-gray-900">{responsavel}</span>
                         <span className="text-xs text-gray-500">Responsável</span>
                       </div>
                     </div>
                     <div className="text-right">
                       <span className="text-blue-600 font-bold text-lg">{quantidade}</span>
                       <div className="text-xs text-gray-500">clientes</div>
                     </div>
                   </div>
                 ))}
             </div>
           </CardContent>
         </Card>

        {/* Análise de Valores */}
        <Card className="bg-white shadow-md border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <BarChart className="h-5 w-5" />
              <span>Análise de Valores</span>
            </CardTitle>
            <CardDescription>Distribuição de valores por faixa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const faixas = [
                  { min: 0, max: 50000, label: 'Até R$ 50k' },
                  { min: 50000, max: 100000, label: 'R$ 50k - R$ 100k' },
                  { min: 100000, max: 200000, label: 'R$ 100k - R$ 200k' },
                  { min: 200000, max: 500000, label: 'R$ 200k - R$ 500k' },
                  { min: 500000, max: Infinity, label: 'Acima de R$ 500k' }
                ];

                const distribuicao = faixas.map(faixa => ({
                  ...faixa,
                  quantidade: metricas.clientesFiltrados.filter(c => c.Valor >= faixa.min && c.Valor < faixa.max).length
                }));

                return distribuicao.map((faixa, index) => {
                  const porcentagem = (faixa.quantidade / metricas.totalClientes) * 100;
                  const cores = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
                  
                  return (
                    <div key={faixa.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{faixa.label}</span>
                        <span className="text-gray-600">{faixa.quantidade} ({porcentagem.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${cores[index]}`}
                          style={{ width: `${porcentagem}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card className="bg-white shadow-md border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Download className="h-5 w-5" />
            <span>Exportar Relatórios</span>
          </CardTitle>
          <CardDescription>Baixe relatórios detalhados em formato Excel</CardDescription>
        </CardHeader>
        <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Button 
               variant="outline" 
               onClick={() => exportarParaExcel(metricas.clientesFiltrados, `relatorio_completo_${userGroup?.name || 'geral'}`)}
               className="flex items-center space-x-2 p-4 h-auto"
             >
               <FileSpreadsheet className="h-5 w-5" />
               <div className="text-left">
                 <div className="font-medium">Relatório Completo</div>
                 <div className="text-sm text-gray-600">Todos os dados filtrados</div>
               </div>
             </Button>
             
             <Button 
               variant="outline" 
               onClick={() => exportarParaExcel(
                 metricas.clientesFiltrados.filter(c => c.Situação === 'Em aberto'), 
                 `relatorio_em_aberto_${userGroup?.name || 'geral'}`
               )}
               className="flex items-center space-x-2 p-4 h-auto"
             >
               <CheckCircle className="h-5 w-5" />
               <div className="text-left">
                 <div className="font-medium">Em Aberto</div>
                 <div className="text-sm text-gray-600">Apenas clientes ativos</div>
               </div>
             </Button>
             
             <Button 
               variant="outline" 
               onClick={() => exportarParaExcel(
                 metricas.clientesFiltrados.filter(c => 
                   c.Situação === 'Em aberto' && mapearEstagioParaCategoria(c.Estágio) !== 'Carteira'
                 ), 
                 `relatorio_em_aberto_ativos_${userGroup?.name || 'geral'}`
               )}
               className="flex items-center space-x-2 p-4 h-auto"
             >
               <Activity className="h-5 w-5" />
               <div className="text-left">
                 <div className="font-medium">Em Aberto Ativos</div>
                 <div className="text-sm text-gray-600">Excluindo carteira</div>
               </div>
             </Button>
             
             <Button 
               variant="outline" 
               onClick={() => exportarParaExcel(
                 metricas.clientesFiltrados.filter(c => c.Situação === 'Perdida'), 
                 `relatorio_perdidos_${userGroup?.name || 'geral'}`
               )}
               className="flex items-center space-x-2 p-4 h-auto"
             >
               <XCircle className="h-5 w-5" />
               <div className="text-left">
                 <div className="font-medium">Perdidos</div>
                 <div className="text-sm text-gray-600">Clientes perdidos</div>
               </div>
             </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricasRelatorios; 