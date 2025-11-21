
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Material } from '@/types/auth';

interface MaterialWithDetails extends Material {
  thumbnailUrl?: string;
  downloadUrl?: string;
}

interface MaterialTableProps {
  materials: MaterialWithDetails[];
  onEdit: (material: MaterialWithDetails) => void;
  onDelete: (materialId: string) => void;
}

const MaterialTable: React.FC<MaterialTableProps> = ({
  materials,
  onEdit,
  onDelete
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-center">Link de Download</TableHead>
            <TableHead className="text-center">Data de Criação</TableHead>
            <TableHead className="text-center w-32">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                Nenhum material cadastrado
              </TableCell>
            </TableRow>
          ) : (
            materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-medium">
                  {material.title}
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={material.description}>
                    {material.description}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {material.url ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Disponível
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      Não disponível
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {formatDate(material.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(material)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(material.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MaterialTable;
