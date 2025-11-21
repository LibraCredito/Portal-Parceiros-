
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, User, ArrowRight, FileText } from 'lucide-react';
import { News } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import NewsFilter from '@/components/News/NewsFilter';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NewsWithCategory extends News {
  category: string;
  imageUrl?: string;
  excerpt: string;
  reading_time: number;
  source: string;
}

const Noticias: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Verificação de admin com logs para debug
  const isAdmin = profile?.role === 'admin';
  
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<NewsWithCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [categoryFilter, setCategoryFilter] = useState('todas');

  const [news, setNews] = useState<NewsWithCategory[]>([]);

  const categories = [
    { id: 'todas', label: 'Todas as Notícias' },
    { id: 'sistema', label: 'Sistema' },
    { id: 'treinamento', label: 'Treinamento' },
    { id: 'manutencao', label: 'Manutenção' },
    { id: 'mercado', label: 'Mercado' },
    { id: 'atualizacoes', label: 'Atualizações' },
    { id: 'eventos', label: 'Eventos' }
  ];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching news:', error);
        toast({
          title: "Erro ao carregar notícias",
          description: "Não foi possível carregar as notícias.",
          variant: "destructive",
        });
        return;
      }

      const formattedNews: NewsWithCategory[] = data.map(newsItem => ({
        id: newsItem.id,
        title: newsItem.title,
        content: newsItem.content,
        createdAt: newsItem.created_at,
        authorId: newsItem.author_id,
        category: newsItem.category || 'sistema',
        imageUrl: newsItem.image_url || undefined,
        excerpt: newsItem.excerpt || newsItem.content.substring(0, 150) + (newsItem.content.length > 150 ? '...' : ''),
        reading_time: newsItem.reading_time || 0,
        source: newsItem.source || ''
      }));

      setNews(formattedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Erro ao carregar notícias",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleReadMore = (newsId: string) => {
    navigate(`/noticias/${newsId}`);
  };

  const handleCreateNews = () => {
    navigate('/noticias/criar');
  };

  const handleEditNews = (newsItem: NewsWithCategory) => {
    navigate(`/noticias/editar/${newsItem.id}`);
  };

  const handleDeleteNews = (newsItem: NewsWithCategory) => {
    setNewsToDelete(newsItem);
    setDeleteModalOpen(true);
  };

  const confirmDeleteNews = async () => {
    if (!newsToDelete) return;

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', newsToDelete.id);

      if (error) {
        console.error('Error deleting news:', error);
        toast({
          title: "Erro ao deletar notícia",
          description: "Não foi possível deletar a notícia.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Notícia deletada",
        description: "A notícia foi deletada com sucesso.",
      });

      // Atualizar a lista
      setNews(news.filter(item => item.id !== newsToDelete.id));
    } catch (error) {
      console.error('Error deleting news:', error);
      toast({
        title: "Erro ao deletar notícia",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setDeleteModalOpen(false);
      setNewsToDelete(null);
    }
  };

  const filteredNews = useMemo(() => {
    let filtered = news;

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoria
    if (categoryFilter !== 'todas') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Ordenar
    switch (sortBy) {
      case 'recent':
        filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title':
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [news, searchTerm, categoryFilter, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 text-lg">Carregando...</p>
          </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notícias</h1>
        {isAdmin && (
          <Button onClick={handleCreateNews} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar Notícia
          </Button>
        )}
      </div>

      <NewsFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        totalResults={filteredNews.length}
        appliedFilters={[]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredNews.map((newsItem) => (
          <Card key={newsItem.id} className="hover:shadow-lg transition-shadow">
            {newsItem.imageUrl && (
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img
                  src={newsItem.imageUrl}
                  alt={newsItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{newsItem.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{categories.find(c => c.id === newsItem.category)?.label || newsItem.category}</Badge>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditNews(newsItem)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteNews(newsItem)}
                    >
                      Deletar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 line-clamp-3 mb-4">
                {newsItem.excerpt}
              </p>
              
              {/* Tempo de leitura e fonte */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-blue-600 font-medium">
                    ⏱️ {newsItem.reading_time} min
                  </span>
                </div>
                {newsItem.source && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(newsItem.source, '_blank')}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    🔗 Fonte
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(newsItem.createdAt)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReadMore(newsItem.id)}
                  className="flex items-center gap-1"
                >
                  Ler mais
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNews.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma notícia encontrada.</p>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteNews}
        title="Deletar Notícia"
        message={`Tem certeza que deseja deletar a notícia "${newsToDelete?.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default Noticias;
