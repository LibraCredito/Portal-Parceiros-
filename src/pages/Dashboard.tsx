
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, BookOpen, Calculator, TrendingUp, Activity, BarChart3, Settings, Info, Zap, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Group } from '@/types/auth';

interface DashboardStats {
  totalUsers: number;
  admins: number;
  coordenadores: number;
  usuarios: number;
  totalGroups: number;
  totalNews: number;
  totalMaterials: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'news' | 'material';
  description: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    admins: 0,
    coordenadores: 0,
    usuarios: 0,
    totalGroups: 0,
    totalNews: 0,
    totalMaterials: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualizar hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Função para formatar hora de Brasília
  const formatBrasiliaTime = () => {
    return currentTime.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Função para formatar data de Brasília
  const formatBrasiliaDate = () => {
    return currentTime.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  };

  // Função para calcular a última atualização (hora em ponto mais recente)
  const getLastUpdateTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const lastUpdate = new Date(now);
    lastUpdate.setMinutes(0, 0, 0); // Define para hora em ponto (minutos e segundos = 0)
    
    // Se já passou da hora atual, usa a hora anterior
    if (now.getMinutes() > 0 || now.getSeconds() > 0) {
      lastUpdate.setHours(currentHour);
    } else {
      // Se é exatamente hora em ponto, usa a hora atual
      lastUpdate.setHours(currentHour);
    }
    
    return lastUpdate.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para calcular a próxima atualização (próxima hora em ponto)
  const getNextUpdateTime = () => {
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setMinutes(0, 0, 0); // Define para hora em ponto
    nextUpdate.setHours(now.getHours() + 1); // Adiciona 1 hora
    
    return nextUpdate.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para calcular tempo restante até próxima atualização
  const getTimeUntilNextUpdate = () => {
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setMinutes(0, 0, 0);
    nextUpdate.setHours(now.getHours() + 1);
    
    const diffMs = nextUpdate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDashboardData();
    } else {
      fetchUserGroupData();
    }
  }, [profile]);

  const fetchUserGroupData = async () => {
    try {
      setLoading(true);
      
      if (profile?.group_id) {
        
        const { data: groupData, error } = await supabase
          .from('groups')
          .select('*')
          .eq('id', profile.group_id)
          .single();

        if (error) {
          console.error('Error fetching user group:', error);
        } else {
          const formattedGroup: Group = {
            id: groupData.id,
            name: groupData.name,
            formUrl: groupData.form_url || undefined,
            createdAt: groupData.created_at
          };
          
  
          setUserGroup(formattedGroup);
        }
      } else {
        setUserGroup(null);
      }
    } catch (error) {
      console.error('Error fetching user group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Count users by role
      const userStats = profiles?.reduce((acc, profile) => {
        acc.totalUsers++;
        if (profile.role === 'admin') acc.admins++;
        else if (profile.role === 'coordenador') acc.coordenadores++;
        else if (profile.role === 'usuario') acc.usuarios++;
        return acc;
      }, { totalUsers: 0, admins: 0, coordenadores: 0, usuarios: 0 }) || 
      { totalUsers: 0, admins: 0, coordenadores: 0, usuarios: 0 };

      // Fetch groups count
      const { count: groupsCount, error: groupsError } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true });

      if (groupsError) {
        console.error('Error fetching groups count:', groupsError);
      }

      // Fetch news count
      const { count: newsCount, error: newsError } = await supabase
        .from('news')
        .select('*', { count: 'exact', head: true });

      if (newsError) {
        console.error('Error fetching news count:', newsError);
      }

      // Fetch materials count
      const { count: materialsCount, error: materialsError } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true });

      if (materialsError) {
        console.error('Error fetching materials count:', materialsError);
      }

      setStats({
        ...userStats,
        totalGroups: groupsCount || 0,
        totalNews: newsCount || 0,
        totalMaterials: materialsCount || 0
      });

      // Fetch recent activity
      await fetchRecentActivity();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Get recent users
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent news
      const { data: recentNews } = await supabase
        .from('news')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent materials
      const { data: recentMaterials } = await supabase
        .from('materials')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];

      // Add recent users
      recentProfiles?.forEach(profile => {
        activities.push({
          id: `user-${profile.name}`,
          type: 'user',
          description: `Novo usuário cadastrado: ${profile.name}`,
          createdAt: profile.created_at
        });
      });

      // Add recent news
      recentNews?.forEach(news => {
        activities.push({
          id: `news-${news.title}`,
          type: 'news',
          description: `Notícia publicada: ${news.title}`,
          createdAt: news.created_at
        });
      });

      // Add recent materials
      recentMaterials?.forEach(material => {
        activities.push({
          id: `material-${material.title}`,
          type: 'material',
          description: `Material adicionado: ${material.title}`,
          createdAt: material.created_at
        });
      });

      // Sort by creation date and take the 5 most recent
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `há ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `há ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `há ${days} dia${days !== 1 ? 's' : ''}`;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-500';
      case 'news': return 'bg-green-500';
      case 'material': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const AdminDashboard = () => (
    <div className="space-y-6">
      {/* Mensagem de atualização automática */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800 font-medium">Atualização Automática</p>
          <p className="text-xs text-blue-700">A base de dados é atualizada automaticamente a cada 1 hora</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
            
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Admins:</span>
                <span className="font-medium">{loading ? '...' : stats.admins}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Coordenadores:</span>
                <span className="font-medium">{loading ? '...' : stats.coordenadores}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Usuários:</span>
                <span className="font-medium">{loading ? '...' : stats.usuarios}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">Grupos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notícias Publicadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalNews}</div>
            <p className="text-xs text-muted-foreground">Notícias no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiais Disponíveis</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">Materiais cadastrados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-muted-foreground">Carregando atividades...</div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center text-muted-foreground">Nenhuma atividade recente</div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type)}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às principais funções</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-accent hover:border-primary transition-all"
                onClick={() => navigate('/usuarios')}
              >
                <Users className="h-6 w-6 text-blue-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">Gerenciar Usuários</p>
                  <p className="text-xs text-muted-foreground">Acesse a lista de usuários</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-accent hover:border-primary transition-all"
                onClick={() => navigate('/noticias')}
              >
                <FileText className="h-6 w-6 text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">Criar Notícia</p>
                  <p className="text-xs text-muted-foreground">Publique uma nova notícia</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-accent hover:border-primary transition-all"
                onClick={() => navigate('/materiais')}
              >
                <BookOpen className="h-6 w-6 text-purple-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">Adicionar Material</p>
                  <p className="text-xs text-muted-foreground">Cadastre material de apoio</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-accent hover:border-primary transition-all"
                onClick={() => navigate('/simulador-config')}
              >
                <Settings className="h-6 w-6 text-orange-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">Config. Simulador</p>
                  <p className="text-xs text-muted-foreground">Ajuste as variáveis</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const UserDashboard = () => {
    if (!userGroup) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 text-lg">Carregando...</p>
          </div>
        </div>
      );
    }
    
    if(profile?.role === 'coordenador'){
      return (
        <div className="space-y-6">
          {/* Mensagem de atualização automática */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Atualização Automática</p>
              <p className="text-xs text-blue-700">A base de dados é atualizada automaticamente a cada 1 hora</p>
            </div>
          </div>

          {/* Resumo do Grupo */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
              <h2 className="text-2xl font-bold mb-2">
                  Bem-vindo, {profile?.name
                    ? profile.name.charAt(0).toUpperCase() + profile.name.slice(1).toLowerCase()
                    : ""}
                  !
                </h2>
                <p className="text-blue-100 text-lg">Grupo: {userGroup.name}</p>
                <p className="text-blue-200 text-sm mt-1">Coordenador do grupo {(userGroup.name).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatBrasiliaDate()}</div>
                <div className="text-blue-200 text-sm">{formatBrasiliaTime()}</div>
              </div>
            </div>
          </div>

          {/* Main Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visualizar Clientes Cadastrados */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 cursor-pointer">
              <CardContent className="p-8" onClick={() => navigate('/clientes-cadastrados')}>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Visualizar Clientes
                    </h3>
                    <p className="text-gray-600 mt-2">
                      Acesse a lista completa de clientes cadastrados no sistema
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-blue-600 group-hover:text-blue-700">
                    <span className="text-sm font-medium">Acessar</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Métricas e Relatórios */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-green-300 cursor-pointer">
              <CardContent className="p-8" onClick={() => navigate('/metricas-relatorios')}>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      Métricas e Relatórios
                    </h3>
                    <p className="text-gray-600 mt-2">
                      Visualize estatísticas, métricas e relatórios detalhados
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-green-600 group-hover:text-green-700">
                    <span className="text-sm font-medium">Acessar</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informações Adicionais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status do Sistema */}
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Status do Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Sistema Online</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Ativo</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Última Atualização</span>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">{getLastUpdateTime()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Próxima Atualização</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-purple-600 font-medium">{getNextUpdateTime()}</div>
                      <div className="text-xs text-gray-500">em {getTimeUntilNextUpdate()}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-900">
                  <Zap className="h-5 w-5" />
                  <span>Ações Rápidas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => navigate('/cadastro-de-proposta')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => navigate('/materiais')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ver Materiais
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => navigate('/noticias')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ler Notícias
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          {/* Mensagem de atualização automática */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Atualização Automática</p>
              <p className="text-xs text-blue-700">A base de dados é atualizada automaticamente a cada 1 hora</p>
            </div>
          </div>

          {/* Resumo do Grupo */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Bem-vindo, {profile?.name}!</h2>
                <p className="text-blue-100 text-lg">Grupo: {userGroup.name}</p>
                <p className="text-blue-200 text-sm mt-1">Usuário do sistema</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatBrasiliaDate()}</div>
                <div className="text-blue-200 text-sm">{formatBrasiliaTime()}</div>
              </div>
            </div>
          </div>

          {/* Main Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            {/* Visualizar Clientes Cadastrados */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 cursor-pointer">
              <CardContent className="p-8" onClick={() => navigate('/clientes-cadastrados')}>
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Visualizar Clientes
                    </h3>
                    <p className="text-gray-600 mt-2">
                      Acesse a lista completa de clientes cadastrados no sistema
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-blue-600 group-hover:text-blue-700">
                    <span className="text-sm font-medium">Acessar</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Informações Adicionais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status do Sistema */}
            <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Status do Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Sistema Online</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Ativo</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Última Atualização</span>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">{getLastUpdateTime()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Próxima Atualização</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-purple-600 font-medium">{getNextUpdateTime()}</div>
                      <div className="text-xs text-gray-500">em {getTimeUntilNextUpdate()}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-900">
                  <Zap className="h-5 w-5" />
                  <span>Ações Rápidas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => navigate('/cadastro-de-proposta')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => navigate('/materiais')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ver Materiais
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => navigate('/noticias')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ler Notícias
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="p-6">
      {profile?.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
};

export default Dashboard;
