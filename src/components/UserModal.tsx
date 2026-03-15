
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, UserRole, Group } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePloomesOptions, PloomesOption } from '@/hooks/usePloomesOptions';
import { CADASTRO_USUARIO_OPTIONS_ID } from '@/hooks/ploomesOptionsIds';
import { SelectInput } from '@/components/FormMVP/SelectInput';
import { useAuth } from '@/contexts/AuthContext';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (userData: Partial<User> & { password?: string }) => void;
  onSuccess?: () => void; // Callback opcional para quando o usuário for criado com sucesso
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, user, onSave, onSuccess }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'usuario' as UserRole,
    groupId: 'none',
    usuarioData: { Id: 0, Name: '' } as PloomesOption
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserGroup, setCurrentUserGroup] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  // Hook para buscar opções do Ploomes
  // skipCache: true para sempre recarregar os dados quando o modal abrir
  const { options: ploomesOptions, loading: loadingOptions } = usePloomesOptions(
    isOpen ? CADASTRO_USUARIO_OPTIONS_ID : undefined,
    isOpen // Quando o modal está aberto, skipCache = true para recarregar dados
  );

  // Função para buscar o grupo do coordenador atual
  const fetchCurrentUserGroup = async () => {
    try {
      if (profile?.group_id) {
        const { data: groupData, error } = await supabase
          .from('groups')
          .select('id, name')
          .eq('id', profile.group_id)
          .single();

        if (error) {
        } else {
          setCurrentUserGroup({
            id: groupData.id,
            name: groupData.name
          });
        }
      }
    } catch (error) {
    }
  };

  // Filtrar opções baseado no grupo do coordenador atual (apenas para coordenadores)
  // Administradores veem todas as opções sem filtro
  const filteredPloomesOptions = profile?.role === 'admin' 
    ? ploomesOptions 
    : ploomesOptions.filter(option => {
        if (!currentUserGroup) return false;
        return option.Name.toLowerCase().includes(currentUserGroup.name.toLowerCase());
      });

  // Buscar grupo do coordenador atual quando o modal abrir
  useEffect(() => {
    if (isOpen && profile?.group_id) {
      fetchCurrentUserGroup();
    }
  }, [isOpen, profile?.group_id]);

  // Fetch groups from Supabase
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .order('name');

        if (error) {
          toast({
            title: "Erro ao carregar grupos",
            description: "Não foi possível carregar a lista de grupos.",
            variant: "destructive",
          });
          return;
        }

        const formattedGroups: Group[] = data.map(group => ({
          id: group.id,
          name: group.name,
          powerBiUrl: group.power_bi_url || undefined,
          formUrl: group.form_url || undefined,
          createdAt: group.created_at
        }));

        setGroups(formattedGroups);
      } catch (error) {
        toast({
          title: "Erro ao carregar grupos",
          description: "Ocorreu um erro inesperado ao carregar grupos.",
          variant: "destructive",
        });
      } finally {
        setLoadingGroups(false);
      }
    };

    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen, toast]);

  useEffect(() => {
    if (user) {
      // Modo edição - converter UsuarioData de string para objeto se existir
      let usuarioData = { Id: 0, Name: '' };
      
      if (user.UsuarioData) {
        try {
          // Tentar fazer parse do JSON se for uma string JSON
          const parsed = JSON.parse(user.UsuarioData);
          if (parsed && typeof parsed === 'object' && parsed.Id && parsed.Name) {
            usuarioData = parsed;
          } else {
            // Se não for JSON válido, usar como nome
            usuarioData = { Id: 0, Name: user.UsuarioData };
          }
        } catch {
          // Se não conseguir fazer parse, usar como nome
          usuarioData = { Id: 0, Name: user.UsuarioData };
        }
      }

      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        groupId: user.groupId || 'none',
        usuarioData: usuarioData
      });
    } else {
      // Modo criação
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'usuario',
        groupId: 'none',
        usuarioData: { Id: 0, Name: '' }
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de e-mail inválido';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    }

    // Validação de senha - só se uma senha foi fornecida
    if (formData.password && formData.password.trim() !== '') {
      if (formData.password.length < 6) {
        newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
      }
      
      // Só validar confirmação se uma senha foi fornecida
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
      }
    }

    if (!formData.role) {
      newErrors.role = 'Role é obrigatório';
    }

    // Validação específica para coordenadores - apenas coordenadores precisam de grupo
    if (formData.role === 'coordenador' && formData.groupId === 'none') {
      newErrors.groupId = 'Coordenadores devem ter um grupo associado';
    }

    // Validação do campo Ploomes para criação
    if (!user && (!formData.usuarioData || !formData.usuarioData.Id)) {
      newErrors.usuarioData = 'Selecione um parceiro do Ploomes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (user) {
        // Modo edição - usar função onSave existente
        const userData: Partial<User> & { password?: string } = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          groupId: formData.groupId === 'none' ? null : formData.groupId,
          UsuarioData: formData.usuarioData.Name || ''
        };

        if (formData.password) {
          userData.password = formData.password;
        }

        onSave(userData);
      } else {
        // Modo criação - usar API externa
        const userData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          group_id: formData.groupId === 'none' ? null : formData.groupId,
          UsuarioData: formData.usuarioData.Name || 'Cadastro realizado via portal'
        };

        const response = await fetch('https://ploomes-api.vercel.app/supabase/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        const responseData = await response.json();

        if (!response.ok) {
          // Tratamento específico de erros baseado na API
          if (response.status === 400) {
            if (responseData.code === 'email_exists') {
              toast({
                title: "❌ E-mail já cadastrado",
                description: "Este e-mail já está sendo usado por outro usuário. Tente com um e-mail diferente.",
                variant: "destructive",
                duration: 6000,
              });
            } else if (responseData.error && responseData.error.includes('coordenador')) {
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

        // Sucesso
        toast({
          title: "✅ Usuário criado com sucesso!",
          description: "O usuário foi cadastrado no sistema e terá acesso ao Power BI e ao Ploomes.",
          duration: 5000,
        });

        // Limpar formulário e chamar callback de sucesso (mantém modal aberto)
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'usuario',
          groupId: 'none',
          usuarioData: { Id: 0, Name: '' }
        });
        setErrors({});
        
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Para edição, usar o fluxo normal
      toast({
        title: user ? "Usuário atualizado" : "Usuário criado",
        description: user ? "Os dados do usuário foram atualizados com sucesso." : "Novo usuário foi criado com sucesso.",
      });
      onClose();
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
      setIsSubmitting(false);
    }
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Grupo não encontrado';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[160vw]  h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="Nome completo do usuário"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Senhas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                {user ? 'Nova Senha (deixe em branco para manter atual)' : 'Senha *'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? 'border-red-500' : ''}
                placeholder={user ? 'Nova senha (opcional)' : 'Senha do usuário'}
              />
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                {user ? 'Confirmar Nova Senha' : 'Confirmar Senha *'}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'border-red-500' : ''}
                placeholder={user ? 'Confirme a nova senha' : 'Confirme a senha'}
              />
              {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          {/* Role e Grupo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => handleInputChange('role', value)}
              >
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="usuario">Usuário</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-red-500 mt-1">{errors.role}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Grupo {formData.role === 'coordenador' ? '*' : '(opciosnal)'}
              </Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => handleInputChange('groupId', value)}
                disabled={loadingGroups}
              >
                <SelectTrigger className={errors.groupId ? 'border-red-500' : ''}>
                  <SelectValue placeholder={loadingGroups ? "Carregando grupos..." : "Selecione um grupo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem grupo</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.groupId && <p className="text-sm text-red-500 mt-1">{errors.groupId}</p>}
              {formData.groupId !== 'none' && formData.groupId && (
                <p className="text-xs text-blue-600 mt-1">
                  Grupo selecionado: {getGroupName(formData.groupId)}
                </p>
              )}
              {formData.groupId === 'none' && (
                <p className="text-xs text-gray-600 mt-1">
                  Usuário será cadastrado sem grupo
                </p>
              )}
            </div>
          </div>

          {/* Campo do Ploomes - criação e edição */}
          <div className="space-y-2 w-[50%]">
              <Label className="text-sm font-semibold">
                Puxar dados de qual parceiro do ploomes?
              </Label>
              <SelectInput
                options={filteredPloomesOptions}
                value={formData.usuarioData.Id}
                onChange={(option) => handleInputChange('usuarioData', option)}
                placeholder="Selecione uma opção"
                error={errors.usuarioData}
                tooltip={`Selecione uma opção da tabela do Ploomes que será armazenada no campo UsuarioData${profile?.role === 'admin' ? ' (todas as opções disponíveis)' : ` (filtrado para opções do grupo ${currentUserGroup?.name || 'atual'})`}`}
              />
              {loadingOptions && (
                <p className="text-sm text-blue-600 flex items-center gap-2 mt-1">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  Carregando opções do Ploomes...
                </p>
              )}
              {/* Exibir opção selecionada */}
              {formData.usuarioData && formData.usuarioData.Name && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800 font-medium">Opção selecionada:</p>
                  <p className="text-sm text-blue-900">{formData.usuarioData.Name}</p>
                </div>
              )}
              
              {profile?.role === 'admin' ? (
                <p className="text-xs text-gray-600 mt-1">
                  Mostrando <span className="font-semibold">todas as opções</span>
                </p>
              ) : currentUserGroup && (
                <p className="text-xs text-gray-600 mt-1">
                  Mostrando opções do grupo: <span className="font-semibold">{currentUserGroup.name}</span>
                </p>
              )}
            </div>
        </div>

        <DialogFooter className="pt-8">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                {user ? 'Atualizando...' : 'Criando...'}
              </>
            ) : (
              user ? 'Atualizar' : 'Criar Usuário'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserModal;
