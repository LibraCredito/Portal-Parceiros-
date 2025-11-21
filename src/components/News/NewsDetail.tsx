
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewsWithCategory {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  category: string;
  imageUrl?: string;
  excerpt: string;
  reading_time: number;
  source: string;
}

const NewsDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [news, setNews] = useState<NewsWithCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      if (!id) {
        console.error('NewsDetail: No ID provided in URL params');
        setLoading(false);
        return;
      }

  

      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('id', id)
          .maybeSingle();



        if (error) {
          console.error('NewsDetail: Error fetching news:', error);
          toast({
            title: "Erro ao carregar notícia",
            description: "Não foi possível carregar os detalhes da notícia.",
            variant: "destructive",
          });
          setNews(null);
          return;
        }

        if (!data) {
  
          setNews(null);
          return;
        }

        const formattedNews: NewsWithCategory = {
          id: data.id,
          title: data.title,
          content: data.content,
          createdAt: data.created_at,
          authorId: data.author_id,
          category: data.category || 'sistema',
          imageUrl: data.image_url || undefined,
          excerpt: data.excerpt || data.content.substring(0, 150) + (data.content.length > 150 ? '...' : ''),
          reading_time: data.reading_time || 0,
          source: data.source || ''
        };


        setNews(formattedNews);
      } catch (error) {
        console.error('NewsDetail: Unexpected error:', error);
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro inesperado ao carregar a notícia.",
          variant: "destructive",
        });
        setNews(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Button 
            onClick={() => navigate('/noticias')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Notícias
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600">Carregando notícia...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Button 
            onClick={() => navigate('/noticias')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Notícias
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Notícia não encontrada
              </h3>
              <p className="text-gray-600">
                A notícia que você está procurando não existe ou foi removida.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const categories = {
    sistema: 'Sistema',
    treinamento: 'Treinamento',
    manutencao: 'Manutenção',
    mercado: 'Mercado',
    atualizacoes: 'Atualizações',
    eventos: 'Eventos'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">

      <div className="relative h-96 bg-gradient-to-r from-blue-500 to-blue-600">
        {news.imageUrl ? (
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            Notícia sem imagem
          </div>
        )}
        
        {/* Overlay escuro para melhorar legibilidade do texto */}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Conteúdo do banner */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">{news.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações Gerais */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                {news.title}
              </h1>
          
          {news.description && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
              <p className="text-gray-700">{news.description}</p>
            </div>
          )}

        </div>

        <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(news.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Administração</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 font-medium">
                    ⏱️ {news.reading_time} min de leitura
                  </span>
                </div>
              </div>

        {/* Conteúdo HTML */}
        {news.content && (
          <div className="bg-white rounded-lg shadow-sm pt-6 mb-8">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </div>
        )}

        {/* Botão Voltar */}
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/noticias')}
            className="bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Notícias
          </Button>
        </div>

      </div>

      </div>
    </div>
  );
};

export default NewsDetail;
