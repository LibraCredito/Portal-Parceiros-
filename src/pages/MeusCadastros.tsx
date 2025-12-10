import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, User, Building2, FileText, Filter, RefreshCw, Edit2, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface RegisterProposal {
  id: string;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  type_people: 'fisica' | 'juridica' | null;
  created_at: string;
  group_id?: string | null;
  user_id?: string | null;
  form_link?: string | null;
  form_link_garantidor?: string | null;
  form_link_garantia?: string | null;
  // novos links múltiplos (podem vir vazios)
  form_link_t2?: string | null;
  form_link_t3?: string | null;
  form_link_t4?: string | null;
  form_link_g1?: string | null;
  form_link_g2?: string | null;
  form_link_g3?: string | null;
  form_link_g4?: string | null;
  tipo_imovel?: string | null;
  nome_user?: string | null;
  email_user?: string | null;
  profiles?: {
    name: string;
    email: string;
  };
  groups?: {
    name: string;
  };
  [key: string]: any; // Permite campos adicionais
}

const MeusCadastros: React.FC = () => {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<RegisterProposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<RegisterProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false); // Controle para evitar recarregamentos
  // Modal removido: não há item selecionado
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Estados para filtro de coordenador
  const [groupUsers, setGroupUsers] = useState<{id: string, name: string, email: string}[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loadingGroupUsers, setLoadingGroupUsers] = useState(false);
  
  // Estados para filtro de datas
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Estados para edição de nome
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Buscar usuários do grupo (apenas para coordenadores)
  const fetchGroupUsers = async () => {
    if (profile?.role === 'coordenador' && profile?.group_id) {
      try {
      setLoadingGroupUsers(true);
      
      const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .eq('group_id', profile.group_id)
          .order('name');

        if (error) {
          setGroupUsers([]);
          return;
        }
        
        // Mapear para o formato esperado
        const mappedUsers = (data || []).map((user: any) => ({
          id: user.id,
          name: user.name || 'Usuário sem nome',
          email: user.email || 'Email não disponível'
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setGroupUsers(mappedUsers);

      } catch (error) {
        setGroupUsers([]);
      } finally {
        setLoadingGroupUsers(false);
      }
    }
  };

  // Buscar cadastros baseado no role do usuário
  const fetchProposals = async (forceReload = false) => {
    // Se já carregou e não é um reload forçado, não recarrega
    if (hasLoaded && !forceReload) {
      return;
    }

    try {
      setLoading(true);
      
      let proposalsData: RegisterProposal[] = [];
      
      // Buscar todos os cadastros primeiro
      const { data, error } = await supabase
        .from('register_proposal')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar cadastros",
          variant: "destructive",
        });
        return;
      }

      // Filtrar baseado no role do usuário
      if (profile?.role === 'usuario' && profile?.id) {
        // Usuário comum vê apenas seus cadastros
        proposalsData = (data || []).filter((proposal: any) => {
          return proposal.user_id === profile.id;
        });
      } else if (profile?.role === 'coordenador' && profile?.group_id) {
        // Coordenador vê apenas cadastros do seu grupo
        proposalsData = (data || []).filter((proposal: any) => {
          return proposal.group_id === profile.group_id;
        });
      } else {
        // Outros roles veem todos os cadastros
        proposalsData = data || [];
      }

      // Buscar informações dos usuários e grupos separadamente
      const enrichedProposals = await Promise.all(
        proposalsData.map(async (proposal) => {
          const enrichedProposal: RegisterProposal = { ...proposal };

          // Buscar dados do usuário sempre usando user_id
          if (proposal.user_id) {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', proposal.user_id)
              .maybeSingle();
            
            if (userData && !userError) {
              enrichedProposal.profiles = {
                name: userData.name || 'Nome não encontrado',
                email: userData.email || 'Email não disponível'
              };
            } else {
              // Fallback para dados salvos se não encontrar na tabela profiles
              enrichedProposal.profiles = {
                name: proposal.nome_user || `Usuário ${proposal.user_id.substring(0, 8)}`,
                email: proposal.email_user || 'Email não disponível'
              };
            }
          } else {
            // Se não tiver user_id, usar dados salvos como fallback
            enrichedProposal.profiles = {
              name: proposal.nome_user || 'Usuário não identificado',
              email: proposal.email_user || 'Email não disponível'
            };
          }

          // Buscar dados do grupo
          if (proposal.group_id) {
            const { data: groupData } = await supabase
              .from('groups')
              .select('name')
              .eq('id', proposal.group_id)
              .single();
            
            if (groupData) {
              enrichedProposal.groups = groupData;
            }
          }

          return enrichedProposal;
        })
      );

      setProposals(enrichedProposals);
      setFilteredProposals(enrichedProposals);
      setHasLoaded(true); // Marcar que os dados foram carregados
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar cadastros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar filtro por usuário e datas
  const applyFilters = (userId: string, startDateFilter?: string, endDateFilter?: string, nameFilter?: string) => {
    let filtered = proposals;

    // Filtro por usuário
    if (userId !== 'all') {
      filtered = filtered.filter(proposal => 
        proposal.user_id === userId || 
        (proposal.nome_user && groupUsers.find(user => user.name === proposal.nome_user)?.id === userId)
      );
    }

    // Filtro por datas
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter(proposal => {
        const proposalDate = new Date(proposal.created_at);
        
        // Normalizar datas para comparar apenas a parte da data (ignorar horário)
        const proposalDateOnly = new Date(proposalDate.getFullYear(), proposalDate.getMonth(), proposalDate.getDate());
        
        const startDate = startDateFilter ? new Date(startDateFilter + 'T00:00:00') : null;
        const endDate = endDateFilter ? new Date(endDateFilter + 'T23:59:59') : null;

        // Se tem data de início, verifica se a proposta é posterior ou igual
        if (startDate && proposalDateOnly < startDate) {
          return false;
        }

        // Se tem data de fim, verifica se a proposta é anterior ou igual
        if (endDate && proposalDate > endDate) {
          return false;
        }

        return true;
      });
    }

    // Filtro por nome (case-insensitive)
    if (nameFilter && nameFilter.trim().length > 0) {
      const term = nameFilter.trim().toLowerCase();
      filtered = filtered.filter(proposal => (proposal.nome || '').toLowerCase().includes(term));
    }

    setFilteredProposals(filtered);
  };

  // Aplicar filtro quando selectedUserId, startDate, endDate ou proposals mudarem
  useEffect(() => {
    applyFilters(selectedUserId, startDate, endDate, searchTerm);
  }, [selectedUserId, startDate, endDate, searchTerm, proposals]);

  useEffect(() => {
    if (profile && !hasLoaded) {
      fetchProposals();
      if (profile.role === 'coordenador') {
        fetchGroupUsers();
      }
    }
  }, [profile, hasLoaded]);

  // Função para recarregar dados manualmente
  const handleRefresh = () => {
    setHasLoaded(false);
    fetchProposals(true);
    if (profile?.role === 'coordenador') {
      fetchGroupUsers();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypePeopleLabel = (type: string | null) => {
    switch (type) {
      case 'fisica':
        return 'Pessoa Física';
      case 'juridica':
        return 'Pessoa Jurídica';
      default:
        return 'Não informado';
    }
  };

  const getTypePeopleBadgeVariant = (type: string | null) => {
    switch (type) {
      case 'fisica':
        return 'default';
      case 'juridica':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Removido copiar para clipboard do modal

  const openFormLink = (link: string) => {
    window.open(link, '_blank');
  };

  // Utilitário para coletar links existentes por proposta
  const getProposalLinks = (proposal: RegisterProposal) => {
    const links: { id: string; label: string; url: string }[] = [];
    
    // Função auxiliar para verificar se o link é válido (não é "Sem link" ou vazio)
    const isValidLink = (link: string | null | undefined): boolean => {
      return link && link.trim() !== '' && link.trim() !== 'Sem link';
    };
    
    // Tomadores (compatibilidade: form_link -> T1)
    if (isValidLink(proposal.form_link)) links.push({ id: 't1', label: 'Formulário Tomador T1', url: proposal.form_link! });
    if (isValidLink(proposal.form_link_t2)) links.push({ id: 't2', label: 'Formulário Tomador T2', url: proposal.form_link_t2! });
    if (isValidLink(proposal.form_link_t3)) links.push({ id: 't3', label: 'Formulário Tomador T3', url: proposal.form_link_t3! });
    if (isValidLink(proposal.form_link_t4)) links.push({ id: 't4', label: 'Formulário Tomador T4', url: proposal.form_link_t4! });

    // Garantidores (compatibilidade: form_link_garantidor -> G1)
    if (isValidLink(proposal.form_link_garantidor)) links.push({ id: 'g1c', label: 'Formulário Garantidor G1', url: proposal.form_link_garantidor! });
    if (isValidLink(proposal.form_link_g1)) links.push({ id: 'g1', label: 'Formulário Garantidor G1', url: proposal.form_link_g1! });
    if (isValidLink(proposal.form_link_g2)) links.push({ id: 'g2', label: 'Formulário Garantidor G2', url: proposal.form_link_g2! });
    if (isValidLink(proposal.form_link_g3)) links.push({ id: 'g3', label: 'Formulário Garantidor G3', url: proposal.form_link_g3! });
    if (isValidLink(proposal.form_link_g4)) links.push({ id: 'g4', label: 'Formulário Garantidor G4', url: proposal.form_link_g4! });

    // Garantia
    if (isValidLink(proposal.form_link_garantia)) links.push({ id: 'garantia', label: 'Formulário Garantia', url: proposal.form_link_garantia! });
    return links;
  };

  // Função para limpar filtros de data
  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Função para iniciar edição do nome
  const handleStartEdit = (proposal: RegisterProposal) => {
    setEditingProposalId(proposal.id);
    setEditingName(proposal.nome);
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setEditingProposalId(null);
    setEditingName('');
  };

  // Função para salvar nome editado
  const handleSaveName = async (proposalId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode estar vazio",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o usuário tem permissão para editar este registro
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) {
      toast({
        title: "Erro",
        description: "Registro não encontrado",
        variant: "destructive",
      });
      return;
    }

    // Verificar permissões: usuário só pode editar seus próprios registros
    // Coordenador pode editar registros do seu grupo
    // Admin pode editar todos
    if (profile?.role === 'usuario' && proposal.user_id !== profile?.id) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para editar este registro",
        variant: "destructive",
      });
      return;
    }

    if (profile?.role === 'coordenador' && proposal.group_id !== profile?.group_id) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para editar este registro",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      console.log('Atualizando nome:', { proposalId, novoNome: editingName.trim() });
      
      // Atualizar no Supabase com select para verificar se foi atualizado
      const { data, error } = await supabase
        .from('register_proposal')
        .update({ nome: editingName.trim() })
        .eq('id', proposalId)
        .select()
        .single();

      if (error) {
        console.error('Erro do Supabase ao atualizar nome:', error);
        console.error('Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Verificar se os dados foram retornados (confirma que a atualização foi bem-sucedida)
      if (!data) {
        console.error('Nenhum dado retornado após atualização');
        throw new Error('A atualização não foi confirmada pelo banco de dados');
      }

      if (data.nome !== editingName.trim()) {
        console.error('Nome não corresponde:', { esperado: editingName.trim(), recebido: data.nome });
        throw new Error('A atualização não foi confirmada pelo banco de dados');
      }

      console.log('Nome atualizado com sucesso:', data);

      // Atualizar o estado local
      setProposals(prevProposals =>
        prevProposals.map(proposal =>
          proposal.id === proposalId
            ? { ...proposal, nome: editingName.trim() }
            : proposal
        )
      );

      setFilteredProposals(prevFiltered =>
        prevFiltered.map(proposal =>
          proposal.id === proposalId
            ? { ...proposal, nome: editingName.trim() }
            : proposal
        )
      );

      toast({
        title: "Sucesso",
        description: "Nome atualizado com sucesso",
      });

      setEditingProposalId(null);
      setEditingName('');
    } catch (error: any) {
      console.error('Erro completo ao atualizar nome:', error);
      const errorMessage = error.message || error.details || error.hint || "Erro ao atualizar nome. Verifique as permissões do banco de dados (RLS).";
      toast({
        title: "Erro ao atualizar",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Carregando cadastros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {profile?.role === 'coordenador' ? 'Cadastros do Grupo' : 'Meus Cadastros'}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <p className="text-gray-600">
            {profile?.role === 'coordenador' 
              ? 'Visualize todos os cadastros de propostas do seu grupo'
              : 'Visualize todos os seus cadastros de propostas'
            }
          </p>
          
          {/* Filtros */}
          <div className="mt-4 space-y-4">
            {/* Filtro por nome */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Pesquisar por nome:</span>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o nome do cadastrado"
              />
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Limpar
                </Button>
              )}
            </div>
            {/* Filtro para coordenadores */}
            {profile?.role === 'coordenador' && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filtrar por usuário:</span>
                </div>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {loadingGroupUsers ? (
                      <SelectItem value="loading" disabled>
                        Carregando usuários...
                      </SelectItem>
                    ) : groupUsers.length > 0 ? (
                      groupUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-users" disabled>
                        Nenhum usuário encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {groupUsers.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {groupUsers.length} usuário(s) encontrado(s)
                  </span>
                )}
              </div>
            )}

            {/* Filtro de datas */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filtrar por período:</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Data início"
                />
                <span className="text-gray-500">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Data fim"
                />
                {(startDate || endDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDateFilters}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum cadastro encontrado
            </h3>
            <p className="text-gray-600">
              {profile?.role === 'coordenador' 
                ? (selectedUserId === 'all' ? 'Ainda não há cadastros no seu grupo' : 'Nenhum cadastro encontrado para este usuário')
                : 'Você ainda não possui cadastros'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProposals.map((proposal) => (
              <Card 
                key={proposal.id} 
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingProposalId === proposal.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 text-lg font-semibold text-gray-900 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            disabled={isUpdatingName}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName(proposal.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveName(proposal.id)}
                            disabled={isUpdatingName}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isUpdatingName}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                            {proposal.nome}
                          </CardTitle>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(proposal)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Editar nome"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Badge variant={getTypePeopleBadgeVariant(proposal.type_people)}>
                      {getTypePeopleLabel(proposal.type_people)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(proposal.created_at)}
                  </div>
                  
                  {(proposal.nome_user || proposal.profiles || proposal.user_id) && (
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">Responsável:</span>
                        <span className="ml-1">
                          {proposal.nome_user || proposal.profiles?.name || `ID: ${proposal.user_id}`}
                        </span>
                      </div>
                      {(proposal.email_user || proposal.profiles?.email) && (
                        <div className="flex items-center text-xs text-gray-500 ml-6">
                          <span className="font-medium">Email:</span>
                          <span className="ml-1">
                            {proposal.email_user || proposal.profiles?.email}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {proposal.groups && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-2" />
                      {proposal.groups.name}
                    </div>
                  )}
                  
                  {/* Links dos formulários (em acordeão para compactar) - só aparece se houver links válidos */}
                  {getProposalLinks(proposal).length > 0 && (
                    <div className="pt-2 border-t">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="links">
                          <AccordionTrigger className="text-sm">Links dos formulários</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {getProposalLinks(proposal).map((item) => (
                                <Button
                                  key={proposal.id + '_' + item.id}
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFormLink(item.url);
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  {item.label}
                                </Button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal removido */}
      </div>
    </div>
  );
};

export default MeusCadastros;
