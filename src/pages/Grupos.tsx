
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Eye, Plus } from 'lucide-react';
import { Group } from '@/types/auth';
import GroupModal from '@/components/GroupModal';
import GroupViewModal from '@/components/GroupViewModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Grupos: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [viewingContent, setViewingContent] = useState<{type: 'powerbi' | 'form', url: string, groupName: string} | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching groups:', error);
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
      console.error('Error fetching groups:', error);
      toast({
        title: "Erro ao carregar grupos",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to get user count by group from profiles table
  const getUserCountByGroup = async (groupId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (error) {
        console.error('Error fetching user count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching user count:', error);
      return 0;
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = async (group: Group) => {
    // Verificar se o grupo tem usuários antes de permitir exclusão
    const userCount = await getUserCountByGroup(group.id);
    
    if (userCount > 0) {
      toast({
        title: "❌ Não é possível excluir o grupo",
        description: `Este grupo possui ${userCount} usuário(s) vinculado(s). Remova todos os usuários do grupo antes de excluí-lo.`,
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    
    setDeletingGroup(group);
    setIsDeleteModalOpen(true);
  };

  const handleViewContent = (type: 'powerbi' | 'form', url: string, groupName: string) => {
    setViewingContent({ type, url, groupName });
    setIsViewModalOpen(true);
  };

  const handleSaveGroup = async (groupData: Omit<Group, 'id' | 'createdAt'>) => {
    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('groups')
          .update({
            name: groupData.name,
          })
          .eq('id', editingGroup.id);

        if (error) {
          console.error('Error updating group:', error);
          toast({
            title: "Erro ao atualizar grupo",
            description: "Não foi possível atualizar o grupo.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Grupo atualizado",
          description: "As informações do grupo foram atualizadas com sucesso.",
        });
      } else {
        // Create new group
        const { error } = await supabase
          .from('groups')
          .insert({
            name: groupData.name,
          });

        if (error) {
          console.error('Error creating group:', error);
          toast({
            title: "Erro ao criar grupo",
            description: "Não foi possível criar o grupo.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Grupo criado",
          description: "O novo grupo foi criado com sucesso.",
        });
      }

      await fetchGroups(); // Refresh the list
      setIsGroupModalOpen(false);
      setEditingGroup(null);
    } catch (error) {
      console.error('Error saving group:', error);
      toast({
        title: "Erro ao salvar grupo",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', deletingGroup.id);

      if (error) {
        console.error('Error deleting group:', error);
        toast({
          title: "Erro ao excluir grupo",
          description: "Não foi possível excluir o grupo.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Grupo excluído",
        description: "O grupo foi removido com sucesso.",
      });

      await fetchGroups(); // Refresh the list
      setIsDeleteModalOpen(false);
      setDeletingGroup(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Erro ao excluir grupo",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Grupos</h1>
            <p className="text-muted-foreground mt-1">Carregando grupos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Grupos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie grupos, links do Power BI e formulários
          </p>
        </div>
        <Button onClick={handleCreateGroup} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Grupo</TableHead>
              <TableHead>Power BI</TableHead>
              <TableHead>Formulário</TableHead>
              <TableHead>Usuários Vinculados</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum grupo encontrado. Clique em "Novo Grupo" para criar o primeiro.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <GroupRow 
                  key={group.id} 
                  group={group}
                  onEdit={handleEditGroup}
                  onDelete={handleDeleteGroup}
                  onViewContent={handleViewContent}
                  getUserCount={getUserCountByGroup}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
        group={editingGroup}
      />

      <GroupViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingContent(null);
        }}
        content={viewingContent}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingGroup(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Grupo"
        message={`Tem certeza que deseja excluir o grupo "${deletingGroup?.name}"? Esta ação não poderá ser desfeita e todos os usuários vinculados perderão o acesso aos recursos do grupo.`}
      />
    </div>
  );
};

// Separate component for group row to handle async user count
const GroupRow: React.FC<{
  group: Group;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onViewContent: (type: 'powerbi' | 'form', url: string, groupName: string) => void;
  getUserCount: (groupId: string) => Promise<number>;
}> = ({ group, onEdit, onDelete, onViewContent, getUserCount }) => {
  const [userCount, setUserCount] = useState<number>(0);
  const [loadingUserCount, setLoadingUserCount] = useState(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      setLoadingUserCount(true);
      const count = await getUserCount(group.id);
      setUserCount(count);
      setLoadingUserCount(false);
    };
    fetchUserCount();
  }, [group.id, getUserCount]);

  return (
    <TableRow>
      <TableCell className="font-medium">{group.name}</TableCell>
      <TableCell>
        {group.powerBiUrl ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
      
              onViewContent('powerbi', group.powerBiUrl!, group.name);
            }}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            Ver
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Não configurado</span>
        )}
      </TableCell>
      <TableCell>
        {group.formUrl ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewContent('form', group.formUrl!, group.name)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            Ver
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Não configurado</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {loadingUserCount ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {userCount} usuário{userCount !== 1 ? 's' : ''}
              </span>
              {userCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  Protegido
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(group)}
            className="h-8 w-8 p-0"
            title="Editar grupo"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(group)}
            disabled={loadingUserCount || userCount > 0}
            className={`h-8 w-8 p-0 ${
              userCount > 0 
                ? 'text-gray-400 cursor-not-allowed hover:bg-gray-50' 
                : 'text-destructive hover:text-destructive hover:bg-destructive/10'
            }`}
            title={
              userCount > 0 
                ? `Não é possível excluir: ${userCount} usuário(s) vinculado(s)` 
                : 'Excluir grupo'
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default Grupos;
