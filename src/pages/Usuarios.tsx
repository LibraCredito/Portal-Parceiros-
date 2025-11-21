
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, UserPlus, Edit, Users } from 'lucide-react';
import { User, UserRole, Group } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import UserModal from '@/components/UserModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Usuarios: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const getRoleDisplay = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'coordenador':
        return 'Coordenador';
      case 'usuario':
        return 'Usuário';
      default:
        return role;
    }
  };
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { user: currentUser, profile: currentProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersAndGroups();
  }, []);

  const fetchUsersAndGroups = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        });
        return;
      }

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (groupsError) {
        toast({
          title: "Erro ao carregar grupos",
          description: "Não foi possível carregar a lista de grupos.",
          variant: "destructive",
        });
      }

      const formattedUsers: User[] = usersData.map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        groupId: profile.group_id
      }));

      const formattedGroups: Group[] = groupsData?.map(group => ({
        id: group.id,
        name: group.name,
        powerBiUrl: group.power_bi_url || undefined,
        formUrl: group.form_url || undefined,
        createdAt: group.created_at
      })) || [];

      setUsers(formattedUsers);
      setGroups(formattedGroups);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };



  const handleDeleteUser = (user: User) => {
    if (currentUser?.id === user.id && currentUser.role === 'admin') {
      toast({
        title: "Ação não permitida",
        description: "Administradores não podem excluir a si mesmos.",
        variant: "destructive",
      });
      return;
    }
    
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleSaveUser = async (userData: Partial<User> & { password?: string }) => {
    try {
      if (selectedUser) {
        // Update existing user via API
        const updateData: any = {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          group_id: userData.groupId,
          UsuarioData: userData.UsuarioData || selectedUser.UsuarioData
        };

        // Adicionar senha apenas se fornecida
        if (userData.password) {
          updateData.password = userData.password;
        }

        const response = await fetch(`https://ploomes-api.vercel.app/supabase/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        const responseData = await response.json();

        if (!response.ok) {
          // Tratamento específico de erros baseado na API
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

        await fetchUsersAndGroups(); // Refresh the list
        setUserModalOpen(false);
        setSelectedUser(null);
      } else {
        // Create new user - this would need to be handled through Supabase Auth
        // For now, we'll show a message that this needs to be implemented
        toast({
          title: "Funcionalidade em desenvolvimento",
          description: "A criação de novos usuários será implementada em breve.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      // Tratamento específico de erros de rede e outros
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
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`https://ploomes-api.vercel.app/supabase/usuarios/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          toast({
            title: "❌ Usuário não encontrado",
            description: "O usuário que você está tentando excluir não foi encontrado.",
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
            title: "❌ Erro ao excluir usuário",
            description: errorData.error || "Não foi possível excluir o usuário. Tente novamente.",
            variant: "destructive",
            duration: 6000,
          });
        }
        return;
      }

      toast({
        title: "✅ Usuário excluído com sucesso!",
        description: `O usuário ${userToDelete.name} foi excluído do sistema.`,
        duration: 5000,
      });

      // Atualizar a lista de usuários sem recarregar a página
      await fetchUsersAndGroups();
    } catch (error) {
      // Tratamento específico de erros de rede e outros
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
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      coordenador: 'bg-blue-100 text-blue-800',
      usuario: 'bg-green-100 text-green-800'
    };

    const labels = {
      admin: 'Administrador',
      coordenador: 'Coordenador',
      usuario: 'Usuário'
    };

    return (
      <Badge className={colors[role]}>
        {labels[role]}
      </Badge>
    );
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return '-';
    
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo não encontrado';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesGroup = selectedGroup === 'all' || 
                        (selectedGroup === 'sem-grupo' && !user.groupId) ||
                        user.groupId === selectedGroup;
    return matchesSearch && matchesRole && matchesGroup;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
            <p className="text-gray-600">Carregando usuários...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-gray-600">Administre todos os usuários do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateUser}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque e filtre usuários</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
                <SelectItem value="usuario">Usuário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
                <SelectItem value="sem-grupo">Sem Grupo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários Organizada por Grupo */}
      <div className="space-y-6">
        {(() => {
          // Separar administradores e agrupar outros usuários
          const admins = filteredUsers.filter(user => user.role === 'admin');
          const nonAdmins = filteredUsers.filter(user => user.role !== 'admin');
          
          // Agrupar usuários não-admin por grupo
          const usersByGroup = nonAdmins.reduce((acc, user) => {
            const groupId = user.groupId || 'sem-grupo';
            const groupName = user.groupId ? getGroupName(user.groupId) : 'Sem Grupo';
            
            if (!acc[groupId]) {
              acc[groupId] = {
                groupId,
                groupName,
                users: []
              };
            }
            acc[groupId].users.push(user);
            return acc;
          }, {} as Record<string, { groupId: string; groupName: string; users: User[] }>);

          // Ordenar grupos por nome (Sem Grupo por último)
          const sortedGroups = Object.values(usersByGroup).sort((a, b) => {
            if (a.groupName === 'Sem Grupo') return 1;
            if (b.groupName === 'Sem Grupo') return -1;
            return a.groupName.localeCompare(b.groupName);
          });

          return (
            <>
              {/* Seção de Administradores */}
              {admins.length > 0 && (
                <Card key="administradores">
                  <CardHeader className="bg-blue-50 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Administradores
                        </CardTitle>
                        <CardDescription className="text-blue-700">
                          {admins.length} administrador(es) do sistema
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-sm bg-blue-100 text-blue-800">
                        {admins.length} usuário(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Nome</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Email</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Função</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Grupo</th>
                            <th className="text-left p-3 font-medium text-gray-700 text-sm">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admins.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-blue-600">
                                        {user.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-sm text-gray-600">{user.email}</td>
                              <td className="p-3">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {getRoleDisplay(user.role)}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {user.groupId ? getGroupName(user.groupId) : '-'}
                              </td>
                              <td className="p-3">
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seções de Grupos */}
              {sortedGroups.map((group) => (
            <Card key={group.groupId}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-blue-900">
                      {group.groupName}
                    </CardTitle>
                    <CardDescription className="text-blue-700 font-medium">
                      {group.users.length} usuário(s) neste grupo
                    </CardDescription>
                  </div>
                  <Badge className="text-sm bg-blue-200 text-blue-900 font-semibold border-blue-300">
                    {group.users.length} usuário(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-700 text-sm">Nome</th>
                        <th className="text-left p-3 font-medium text-gray-700 text-sm">Email</th>
                        <th className="text-left p-3 font-medium text-gray-700 text-sm">Função</th>
                        <th className="text-left p-3 font-medium text-gray-700 text-sm">Ações</th>
                    </tr>
                    </thead>
                    <tbody>
                      {group.users
                        .sort((a, b) => {
                          // Coordenador sempre em primeiro
                          if (a.role === 'coordenador' && b.role !== 'coordenador') return -1;
                          if (b.role === 'coordenador' && a.role !== 'coordenador') return 1;
                          // Depois admin
                          if (a.role === 'admin' && b.role === 'usuario') return -1;
                          if (b.role === 'admin' && a.role === 'usuario') return 1;
                          // Depois ordem alfabética por nome
                          return a.name.localeCompare(b.name);
                        })
                        .map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium text-gray-900">{user.name}</td>
                          <td className="p-3 text-gray-600">{user.email}</td>
                          <td className="p-3">{getRoleBadge(user.role)}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                                title="Editar usuário"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                                title="Excluir usuário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
              ))}
            </>
          );
        })()}

        {/* Mensagem quando não há usuários */}
        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {users.length === 0 ? 'Nenhum usuário encontrado.' : 'Nenhum usuário corresponde aos filtros aplicados.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
        onSuccess={() => fetchUsersAndGroups()}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o usuário ${userToDelete?.name}? Esta ação não poderá ser desfeita.`}
      />
    </div>
  );
};

export default Usuarios;
