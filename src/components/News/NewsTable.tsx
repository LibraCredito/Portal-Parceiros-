
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface NewsTableProps {
  news: any[];
  onEdit: (news: any) => void;
  onDelete: (news: any) => void;
}

const NewsTable: React.FC<NewsTableProps> = ({ news, onEdit, onDelete }) => {
  const categories = {
    sistema: 'Sistema',
    treinamento: 'Treinamento',
    manutencao: 'Manutenção',
    mercado: 'Mercado',
    atualizacoes: 'Atualizações',
    eventos: 'Eventos'
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'sistema':
        return 'default';
      case 'treinamento':
        return 'secondary';
      case 'manutencao':
        return 'destructive';
      case 'mercado':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Data de Publicação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {news.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                Nenhuma notícia encontrada
              </TableCell>
            </TableRow>
          ) : (
            news.map((newsItem) => (
              <TableRow key={newsItem.id}>
                <TableCell className="font-medium">
                  <div className="max-w-xs truncate" title={newsItem.title}>
                    {newsItem.title}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getCategoryVariant(newsItem.category)}>
                    {categories[newsItem.category as keyof typeof categories] || newsItem.category}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(newsItem.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(newsItem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(newsItem)}
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

export default NewsTable;
