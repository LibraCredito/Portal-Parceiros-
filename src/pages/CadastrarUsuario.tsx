import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SelectInput } from '@/components/FormMVP/SelectInput';
import { usePloomesOptions } from '@/hooks/usePloomesOptions';
import { CADASTRO_USUARIO_OPTIONS_ID } from '@/hooks/ploomesOptionsIds';
import { ArrowLeft, Save, UserPlus, Users, Crown, Building2, Calendar, Mail, Shield, CheckCircle, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PloomesOption {
  Id: number;
  Name: string;
}

interface GroupInfo {
  id: string;
  name: string;
  powerBiUrl?: string;
  formUrl?: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface ExternalUser {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    role?: string;
    email_verified?: boolean;
    usuarioData?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

const CadastrarUsuario: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();
  
  // Estados do formulário
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'usuario';
    groupId: string | null;
    usuarioData: PloomesOption;
  }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'usuario',
    groupId: currentProfile?.group_id || null,
    usuarioData: { Id: 0, Name: '' }
  });

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Estados para informações do grupo
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loadingGroupInfo, setLoadingGroupInfo] = useState(true);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [loadingExternalUsers, setLoadingExternalUsers] = useState(false);
  
  // Estados para modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ExternalUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Estados para modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<ExternalUser | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    usuarioData: PloomesOption;
  }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    usuarioData: { Id: 0, Name: '' }
  });
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});
  const [updatingUser, setUpdatingUser] = useState(false);

  // Hook para buscar opções do Ploomes (tableId: 46321)
  // skipCache: true para sempre buscar dados atualizados do Ploomes
  const { options: ploomesOptions, loading: loadingOptions, error: optionsError } = usePloomesOptions(CADASTRO_USUARIO_OPTIONS_ID, true);

  // Filtrar opções que contêm o nome do grupo do usuário logado
  // Administradores veem todas as opções sem filtro
  const filteredPloomesOptions = currentProfile?.role === 'admin' 
    ? ploomesOptions 
    : ploomesOptions.filter(option => 
        option.Name.toLowerCase().includes(groupInfo?.name?.toLowerCase() || '')
      );

  useEffect(() => {
    // Usuário logado
  }, [currentProfile]);

  // Buscar informações detalhadas do grupo
  useEffect(() => {
    if (currentProfile?.group_id) {
      fetchGroupDetails();
      fetchExternalUsers();
    }
  }, [currentProfile]);

  const fetchGroupDetails = async () => {
    if (!currentProfile?.group_id) return;
    
    try {
      setLoadingGroupInfo(true);
      
      // Buscar informações do grupo
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', currentProfile.group_id)
        .single();

      if (groupError) {
        console.error('Erro ao buscar grupo:', groupError);
        return;
      }

      const group: GroupInfo = {
        id: groupData.id,
        name: groupData.name,
        powerBiUrl: groupData.power_bi_url || undefined,
        formUrl: groupData.form_url || undefined,
        createdAt: groupData.created_at
      };

      setGroupInfo(group);

    } catch (error) {
      console.error('Erro ao buscar detalhes do grupo:', error);
    } finally {
      setLoadingGroupInfo(false);
    }
  };

  const fetchExternalUsers = async () => {
    if (!currentProfile?.group_id) return;
    
    try {
      setLoadingExternalUsers(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, UsuarioData')
        .eq('group_id', currentProfile.group_id)
        .order('name');

      if (error) {
        setExternalUsers([]);
        return;
      }
      
      // Mapear para o formato esperado (ExternalUser)
      const mappedUsers = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email || 'Email não disponível',
        user_metadata: {
          name: user.name || 'Nome não informado',
          role: user.role || 'usuario',
          email_verified: true,
          usuarioData: user.UsuarioData || ''
        },
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: null
      }));
      
      setExternalUsers(mappedUsers);

    } catch (error) {
      setExternalUsers([]);
    } finally {
      setLoadingExternalUsers(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }


    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    if (!formData.usuarioData.Id || formData.usuarioData.Id === 0) {
      newErrors.usuarioData = 'Selecione uma opção do Ploomes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Preparar dados para envio à API externa
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        group_id: formData.groupId === 'no-group' ? null : formData.groupId,
        UsuarioData: formData.usuarioData.Name
      };

      // Enviar para API externa
      const response = await fetch('https://ploomes-api.vercel.app/supabase/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Tratar erros específicos da API
        if (response.status === 400) {
          if (errorData.code === 'email_exists') {
            toast({
              title: "❌ Email já cadastrado",
              description: "Este email já está sendo usado por outro usuário. Tente com um email diferente.",
              variant: "destructive",
              duration: 8000,
            });
            return;
          } else if (errorData.error && errorData.error.includes('coordenador')) {
            toast({
              title: "❌ Coordenador já existe",
              description: "Já existe um coordenador para este grupo. Troque o coordenador atual ou exclua ele para inserir um novo.",
              variant: "destructive",
              duration: 8000,
            });
            return;
          } else {
            toast({
              title: "❌ Erro de validação",
              description: errorData.error || "Dados inválidos. Verifique as informações e tente novamente.",
              variant: "destructive",
              duration: 6000,
            });
            return;
          }
        } else if (response.status === 500) {
          toast({
            title: "❌ Erro interno do servidor",
            description: "Ocorreu um erro interno. Tente novamente em alguns minutos ou entre em contato com o suporte.",
            variant: "destructive",
            duration: 8000,
          });
          return;
        } else {
          toast({
            title: "❌ Erro inesperado",
            description: errorData.error || `Erro HTTP: ${response.status}`,
            variant: "destructive",
            duration: 6000,
          });
          return;
        }
      }

      const result = await response.json();

      // Exibir banner de sucesso
      toast({
        title: "🎉 Usuário Cadastrado com Sucesso!",
        description: `O usuário ${formData.name} foi cadastrado no sistema.`,
        duration: 5000, // 5 segundos
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // Limpar formulário
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'usuario',
        groupId: currentProfile?.group_id || null,
        usuarioData: { Id: 0, Name: '' }
      });

      // Recarregar apenas os dados dos usuários sem recarregar a página
      await fetchExternalUsers();

    } catch (error) {
      // Tratar diferentes tipos de erro
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "❌ Erro de conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
          variant: "destructive",
          duration: 8000,
        });
      } else if (error instanceof SyntaxError) {
        toast({
          title: "❌ Erro de resposta do servidor",
          description: "O servidor retornou uma resposta inválida. Tente novamente em alguns minutos.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "❌ Erro ao Cadastrar Usuário",
          description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
          variant: "destructive",
          duration: 7000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      coordenador: 'bg-blue-100 text-blue-800 border-blue-200',
      usuario: 'bg-green-100 text-green-800 border-green-200'
    };

    const labels = {
      admin: 'Administrador',
      coordenador: 'Coordenador',
      usuario: 'Usuário'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[role as keyof typeof colors] || colors.usuario}`}>
        {labels[role as keyof typeof labels] || labels.usuario}
      </span>
    );
  };

  // Função para abrir modal de exclusão
  const openDeleteModal = (user: ExternalUser) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Função para fechar modal de exclusão
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  // Função para abrir modal de edição
  const openEditModal = (user: ExternalUser) => {
    setUserToEdit(user);
    
    // Converter UsuarioData de string para objeto se existir
    let usuarioData = { Id: 0, Name: '' };
    if (user.user_metadata?.usuarioData) {
      try {
        const parsed = JSON.parse(user.user_metadata.usuarioData);
        if (parsed && typeof parsed === 'object' && parsed.Id && parsed.Name) {
          usuarioData = parsed;
        } else {
          // Se não for JSON válido, tentar encontrar nas opções do Ploomes pelo nome
          const foundOption = ploomesOptions.find(option => 
            option.Name === user.user_metadata.usuarioData
          );
          if (foundOption) {
            usuarioData = foundOption;
          } else {
            usuarioData = { Id: 0, Name: user.user_metadata.usuarioData };
          }
        }
      } catch {
        // Se não conseguir fazer parse, tentar encontrar nas opções do Ploomes pelo nome
        const foundOption = ploomesOptions.find(option => 
          option.Name === user.user_metadata.usuarioData
        );
        if (foundOption) {
          usuarioData = foundOption;
        } else {
          usuarioData = { Id: 0, Name: user.user_metadata.usuarioData };
        }
      }
    }

    setEditFormData({
      name: user.user_metadata?.name || '',
      email: user.email,
      password: '',
      confirmPassword: '',
      usuarioData: usuarioData
    });
    
    setEditErrors({});
    setShowEditModal(true);
  };

  // Função para fechar modal de edição
  const closeEditModal = () => {
    setShowEditModal(false);
    setUserToEdit(null);
    setEditFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      usuarioData: { Id: 0, Name: '' }
    });
    setEditErrors({});
  };

  // Validação do formulário de edição
  const validateEditForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!editFormData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!editFormData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(editFormData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validação de senha - só se uma senha foi fornecida
    if (editFormData.password && editFormData.password.trim() !== '') {
      if (editFormData.password.length < 6) {
        newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
      }
      
      // Só validar confirmação se uma senha foi fornecida
      if (editFormData.password !== editFormData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função para atualizar usuário
  const updateUser = async () => {
    if (!userToEdit || !validateEditForm()) {
      return;
    }

    setUpdatingUser(true);

    try {
      const updateData: any = {
        name: editFormData.name,
        email: editFormData.email,
        UsuarioData: editFormData.usuarioData.Name || ''
      };

      // Adicionar senha apenas se fornecida
      if (editFormData.password && editFormData.password.trim() !== '') {
        updateData.password = editFormData.password;
      }

      const response = await fetch(`https://ploomes-api.vercel.app/supabase/${userToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          if (responseData.error && responseData.error.includes('coordenador')) {
            toast({
              title: "❌ Coordenador já existe",
              description: "Já existe um coordenador para este grupo. Troque o coordenador atual ou exclua ele para inserir um novo.",
              variant: "destructive",
              duration: 8000,
            });
          } else {
            toast({
              title: "❌ Erro de validação",
              description: responseData.error || "Dados inválidos. Verifique as informações e tente novamente.",
              variant: "destructive",
              duration: 6000,
            });
          }
        } else if (response.status === 404) {
          toast({
            title: "❌ Usuário não encontrado",
            description: "O usuário que você está tentando editar não foi encontrado.",
            variant: "destructive",
            duration: 6000,
          });
        } else if (response.status === 500) {
          toast({
            title: "❌ Erro interno do servidor",
            description: "Ocorreu um erro interno. Tente novamente em alguns minutos ou entre em contato com o suporte.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          toast({
            title: "❌ Erro inesperado",
            description: responseData.error || "Ocorreu um erro inesperado. Tente novamente.",
            variant: "destructive",
            duration: 6000,
          });
        }
        return;
      }

      toast({
        title: "✅ Usuário atualizado com sucesso!",
        description: "As informações do usuário foram atualizadas com sucesso.",
        duration: 5000,
      });

      // Fechar modal e recarregar dados
      closeEditModal();
      await fetchExternalUsers();

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "❌ Erro de conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
          variant: "destructive",
          duration: 8000,
        });
      } else if (error instanceof SyntaxError) {
        toast({
          title: "❌ Erro de resposta do servidor",
          description: "O servidor retornou uma resposta inválida. Tente novamente em alguns minutos.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "❌ Erro inesperado",
          description: "Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } finally {
      setUpdatingUser(false);
    }
  };

  // Função para excluir usuário
  const deleteUser = async () => {
    if (!userToDelete) return;

    setDeletingUser(true);
    try {
      const response = await fetch(`https://ploomes-api.vercel.app/supabase/usuarios/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }

      // Exibir banner de sucesso
      toast({
        title: "🗑️ Usuário Excluído com Sucesso!",
        description: `O usuário ${userToDelete.user_metadata?.name || userToDelete.email} foi removido do sistema.`,
        duration: 5000,
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // Fechar modal e recarregar dados
      closeDeleteModal();
      
      // Recarregar apenas os dados dos usuários sem recarregar a página
      await fetchExternalUsers();

    } catch (error) {
      toast({
        title: "❌ Erro ao Excluir Usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setDeletingUser(false);
    }
  };

  // Usuários já filtrados por group_id na consulta do Supabase
  const filteredExternalUsers = externalUsers;

  // Encontrar o coordenador do grupo entre os usuários externos
  const groupCoordinator = filteredExternalUsers.find(user => 
    user.user_metadata?.role === 'coordenador'
  );

  // Total de usuários do grupo (apenas usuários externos filtrados)
  // Ordenar usuários para que o coordenador apareça sempre em primeiro
  const groupUsers = filteredExternalUsers.sort((a, b) => {
    // Se 'a' é coordenador, deve vir primeiro
    if (a.user_metadata?.role === 'coordenador') return -1;
    // Se 'b' é coordenador, deve vir primeiro
    if (b.user_metadata?.role === 'coordenador') return 1;
    // Manter ordem alfabética para os demais
    const nameA = a.user_metadata?.name || a.email;
    const nameB = b.user_metadata?.name || b.email;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-8 shadow-lg">
          <div className="relative z-10">

                         <h1 className="text-4xl font-bold mb-4 text-gray-900">Cadastrar Novo Usuário</h1>
             <div className="space-y-3">
               <p className="text-gray-600 text-lg">
                 Preencha os dados para criar um novo usuário no sistema
               </p>
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <div className="flex items-start gap-3">
                   <div className="p-2 bg-blue-100 rounded-lg mt-1">
                     <Shield className="h-5 w-5 text-blue-600" />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-sm font-semibold text-blue-800 mb-2">Acesso e Privilégios</h3>
                     <div className="space-y-2 text-sm text-blue-700">
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                         <span>Acesso ao relatório dos negócios que ele cadastrou</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                         <span>Privilégios de usuário padrão configurados</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>

         {/* Formulário Principal */}
            <Card className="border border-gray-200 shadow-lg bg-white">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <UserPlus className="h-6 w-6 text-gray-600" />
                  </div>
                  Dados do Usuário
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Informações básicas para cadastro no sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Nome e Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                        Nome Completo *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Digite o nome completo"
                        className={`h-12 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Digite o email"
                        className={`h-12 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    
                  </div>

                  {/* Senha e Confirmação */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                        Senha *
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Digite a senha"
                        className={`h-12 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {errors.password && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                        Confirmar Senha *
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirme a senha"
                        className={`h-12 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                   <div className="space-y-2 w-[30%]">
                     <Label className="text-sm font-semibold text-gray-700">
                       Puxar dados de qual {groupInfo?.name}?
                     </Label>
                     <SelectInput
                       options={filteredPloomesOptions}
                       value={formData.usuarioData.Id}
                       onChange={(option) => handleInputChange('usuarioData', option)}
                       placeholder="Selecione uma opção"
                       error={errors.usuarioData}
                     />
                     {loadingOptions && (
                       <p className="text-sm text-blue-600 flex items-center gap-2 mt-1">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                         Carregando opções do Ploomes...
                       </p>
                     )}
                     {errors.usuarioData && (
                       <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         {errors.usuarioData}
                       </p>
                     )}
                   </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-4 pt-6">
                                         <Button
                       type="submit"
                       disabled={loading}
                       className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                     >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Salvando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Cadastrar Usuário
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

         {/* Seção de Informações do Grupo e Usuários */}
         {groupInfo && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Informações do Grupo */}
             <Card className="border border-gray-200 shadow-lg bg-white">
               <CardHeader className="bg-gray-50 border-b border-gray-200">
                 <CardTitle className="flex items-center gap-3 text-gray-900">
                   <div className="p-2 bg-gray-100 rounded-lg">
                     <Building2 className="h-5 w-5 text-gray-600" />
                   </div>
                   Informações do Grupo
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                 <div className="space-y-4">
                   <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                     <h3 className="text-xl font-bold text-gray-900 mb-1">{groupInfo.name}</h3>
                     <p className="text-sm text-gray-600">Grupo Ativo</p>
                   </div>

                   <div className="space-y-3">
                     <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                       <Calendar className="h-4 w-4 text-gray-600" />
                       <div>
                         <p className="text-xs font-medium text-gray-800">Criado em</p>
                         <p className="text-sm text-gray-700">{formatDate(groupInfo.createdAt)}</p>
                       </div>
                     </div>

                                           {groupCoordinator && (
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <Crown className="h-4 w-4 text-yellow-600" />
                          <div>
                            <p className="text-xs font-medium text-yellow-800">Coordenador</p>
                            <p className="text-sm text-yellow-700 font-medium">
                              {groupCoordinator.user_metadata?.name || 'Nome não informado'}
                            </p>
                            <p className="text-xs text-yellow-600">{groupCoordinator.email}</p>
                          </div>
                        </div>
                      )}

                     <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                       <Users className="h-4 w-4 text-blue-600" />
                       <div>
                         <p className="text-xs font-medium text-blue-800">Total de Usuários</p>
                         <p className="text-2xl font-bold text-blue-700">{groupUsers.length}</p>
                       </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* Lista de Usuários do Grupo */}
             <Card className="border border-gray-200 shadow-lg bg-white">
               <CardHeader className="bg-gray-50 border-b border-gray-200">
                 <CardTitle className="flex items-center gap-3 text-gray-900">
                   <div className="p-2 bg-gray-100 rounded-lg">
                     <Users className="h-5 w-5 text-gray-600" />
                   </div>
                   Usuários do Grupo
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                 {groupUsers.length > 0 ? (
                   <div className="space-y-3 max-h-80 overflow-y-auto">
                     {groupUsers.map((user) => (
                       <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium text-gray-900 truncate">
                             {user.user_metadata?.name || 'Nome não informado'}
                           </p>
                           <p className="text-xs text-gray-500 truncate">{user.email}</p>
                         </div>
                         <div className="ml-2 flex items-center gap-2">
                           {user.user_metadata?.role && getRoleBadge(user.user_metadata.role)}
                           <div className="flex items-center gap-1">
                             {/* Botão de editar para todos os usuários */}
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => openEditModal(user)}
                               className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                               title="Editar usuário"
                             >
                               <Edit className="h-4 w-4" />
                             </Button>
                             {/* Só exibir botão de exclusão se não for coordenador */}
                             {user.user_metadata?.role !== 'coordenador' && (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => openDeleteModal(user)}
                                 className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                                 title="Excluir usuário"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center p-4 text-gray-500">
                     <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                     <p>Nenhum usuário no grupo</p>
                   </div>
                 )}
               </CardContent>
             </Card>
           </div>
         )}

         {/* Seção de Usuários Externos da API */}
         {/* {filteredExternalUsers.length > 0 && (
           <Card className="border border-gray-200 shadow-lg bg-white">
             <CardHeader className="bg-gray-50 border-b border-gray-200">
               <CardTitle className="flex items-center gap-3 text-gray-900">
                 <div className="p-2 bg-gray-100 rounded-lg">
                   <Users className="h-5 w-5 text-gray-600" />
                 </div>
                 Usuários do Sistema (API Externa)
                 <span className="ml-2 text-sm font-normal text-gray-500">
                   Filtrado para domínio @bext.com
                 </span>
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
               {loadingExternalUsers ? (
                 <div className="space-y-4">
                   <div className="animate-pulse">
                     <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                     <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                   </div>
                   <div className="animate-pulse">
                     <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                     <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-3 max-h-80 overflow-y-auto">
                   {filteredExternalUsers.map((user) => (
                     <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium text-gray-900 truncate">
                           {user.user_metadata?.name || 'Nome não informado'}
                         </p>
                         <p className="text-xs text-gray-500 truncate">{user.email}</p>
                         <p className="text-xs text-gray-400">
                           Criado em: {formatDate(user.created_at)}
                         </p>
                       </div>
                       <div className="ml-2 flex flex-col items-end gap-1">
                         {user.user_metadata?.role && (
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                             user.user_metadata.role === 'admin' ? 'bg-red-100 text-red-800 border-red-200' :
                             user.user_metadata.role === 'coordenador' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                             'bg-green-100 text-green-800 border-green-200'
                           }`}>
                             {user.user_metadata.role === 'admin' ? 'Administrador' :
                              user.user_metadata.role === 'coordenador' ? 'Coordenador' : 'Usuário'}
                           </span>
                         )}
                         {user.last_sign_in_at && (
                           <span className="text-xs text-gray-400">
                             Último acesso: {formatDate(user.last_sign_in_at)}
                           </span>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
           </Card>
         )} */}

         {/* Loading do Grupo */}
         {!groupInfo && currentProfile?.group_id && (
           <Card className="border border-gray-200 shadow-lg bg-white">
             <CardHeader className="bg-gray-50 border-b border-gray-200">
               <CardTitle className="flex items-center gap-3 text-gray-900">
                 <div className="p-2 bg-gray-100 rounded-lg">
                   <Building2 className="h-5 w-5 text-gray-600" />
                 </div>
                 Carregando Informações do Grupo
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
               <div className="space-y-4">
                 <div className="animate-pulse">
                   <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                   <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                 </div>
                 <div className="animate-pulse">
                   <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                   <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}

         {/* Modal de Edição de Usuário */}
         {showEditModal && userToEdit && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 shadow-xl overflow-y-auto h-[90vh]">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue-100 rounded-lg">
                   <Edit className="h-6 w-6 text-blue-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-gray-900">Editar Usuário</h3>
               </div>
               
               <form onSubmit={(e) => { e.preventDefault(); updateUser(); }} className="space-y-6">
                 {/* Nome e Email */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="editName" className="text-sm font-semibold text-gray-700">
                       Nome Completo *
                     </Label>
                     <Input
                       id="editName"
                       value={editFormData.name}
                       onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                       placeholder="Digite o nome completo"
                       className={`h-10 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                         editErrors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                       }`}
                     />
                     {editErrors.name && (
                       <p className="text-sm text-red-600 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         {editErrors.name}
                       </p>
                     )}
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="editEmail" className="text-sm font-semibold text-gray-700">
                       Email *
                     </Label>
                     <Input
                       id="editEmail"
                       type="email"
                       value={editFormData.email}
                       onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                       placeholder="Digite o email"
                       className={`h-10 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                         editErrors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                       }`}
                     />
                     {editErrors.email && (
                       <p className="text-sm text-red-600 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         {editErrors.email}
                       </p>
                     )}
                   </div>
                 </div>

                 {/* Senhas */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="editPassword" className="text-sm font-semibold text-gray-700">
                       Nova Senha (deixe em branco para manter atual)
                     </Label>
                     <Input
                       id="editPassword"
                       type="password"
                       value={editFormData.password}
                       onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                       placeholder="Nova senha (opcional)"
                       className={`h-10 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                         editErrors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                       }`}
                     />
                     {editErrors.password && (
                       <p className="text-sm text-red-600 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         {editErrors.password}
                       </p>
                     )}
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="editConfirmPassword" className="text-sm font-semibold text-gray-700">
                       Confirmar Nova Senha
                     </Label>
                     <Input
                       id="editConfirmPassword"
                       type="password"
                       value={editFormData.confirmPassword}
                       onChange={(e) => setEditFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                       placeholder="Confirme a nova senha"
                       className={`h-10 border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                         editErrors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200'
                       }`}
                     />
                     {editErrors.confirmPassword && (
                       <p className="text-sm text-red-600 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                         {editErrors.confirmPassword}
                       </p>
                     )}
                   </div>
                 </div>

                 {/* Campo do Ploomes */}
                 <div className="space-y-2 w-[40%]">
                   <Label className="text-sm font-semibold text-gray-700">
                     Puxar dados de qual parceiro do ploomes?
                   </Label>
                   <SelectInput
                     options={filteredPloomesOptions}
                     value={editFormData.usuarioData.Id}
                     onChange={(option) => setEditFormData(prev => ({ ...prev, usuarioData: option }))}
                     placeholder="Selecione uma opção"
                     error={editErrors.usuarioData}
                   />
                   {loadingOptions && (
                     <p className="text-sm text-blue-600 flex items-center gap-2 mt-1">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                       Carregando opções do Ploomes...
                     </p>
                   )}
                   {editErrors.usuarioData && (
                     <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                       <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                       {editErrors.usuarioData}
                     </p>
                   )}
                   {/* Exibir opção selecionada */}
                   {editFormData.usuarioData && editFormData.usuarioData.Name && (
                     <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                       <p className="text-xs text-blue-800 font-medium">Opção selecionada:</p>
                       <p className="text-sm text-blue-900">{editFormData.usuarioData.Name}</p>
                     </div>
                   )}
                 </div>

                 {/* Botões */}
                 <div className="flex justify-end gap-3 pt-4">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={closeEditModal}
                     disabled={updatingUser}
                     className="border-gray-300 text-gray-700 hover:bg-gray-50"
                   >
                     Cancelar
                   </Button>
                   <Button
                     type="submit"
                     disabled={updatingUser}
                     className="bg-blue-600 hover:bg-blue-700 text-white"
                   >
                     {updatingUser ? (
                       <div className="flex items-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                         Atualizando...
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <Edit className="h-4 w-4" />
                         Atualizar Usuário
                       </div>
                     )}
                   </Button>
                 </div>
               </form>
             </div>
           </div>
         )}

         {/* Modal de Confirmação de Exclusão */}
         {showDeleteModal && userToDelete && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-red-100 rounded-lg">
                   <Trash2 className="h-6 w-6 text-red-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
               </div>
               
               <p className="text-gray-600 mb-6">
                 Tem certeza que deseja excluir o usuário{' '}
                 <span className="font-semibold text-gray-900">
                   {userToDelete.user_metadata?.name || userToDelete.email}
                 </span>?
               </p>
               
               <p className="text-sm text-red-600 mb-6">
                 ⚠️ Esta ação não pode ser desfeita e removerá permanentemente o usuário do sistema.
               </p>
               
               <div className="flex justify-end gap-3">
                 <Button
                   variant="outline"
                   onClick={closeDeleteModal}
                   disabled={deletingUser}
                   className="border-gray-300 text-gray-700 hover:bg-gray-50"
                 >
                   Cancelar
                 </Button>
                 <Button
                   variant="destructive"
                   onClick={deleteUser}
                   disabled={deletingUser}
                   className="bg-red-600 hover:bg-red-700 text-white"
                 >
                   {deletingUser ? (
                     <div className="flex items-center gap-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       Excluindo...
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <Trash2 className="h-4 w-4" />
                       Excluir Usuário
                     </div>
                   )}
                 </Button>
               </div>
             </div>
           </div>
         )}
       </div>
     </div>
   );
 };

 export default CadastrarUsuario;
