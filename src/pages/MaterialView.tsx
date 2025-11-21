import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Download, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Material {
  id: string;
  title: string;
  type: 'link' | 'file';
  url: string;
  description?: string;
  content?: string;
  image_url?: string;
  created_at: string;
}

const MaterialView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchMaterial();
    }
  }, [id]);


  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching material:', error);
        toast({
          title: "Erro ao carregar material",
          description: "Não foi possível carregar o material.",
          variant: "destructive",
        });
        navigate('/materiais');
        return;
      }

      setMaterial(data);
    } catch (error) {
      console.error('Error fetching material:', error);
      toast({
        title: "Erro ao carregar material",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      navigate('/materiais');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessLink = () => {
    if (material?.url) {
      window.open(material.url, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    if (type === 'link') {
      return <ExternalLink className="h-16 w-16 text-blue-600" />;
    } else {
      return <Download className="h-16 w-16 text-blue-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    if (type === 'link') {
      return 'Link Externo';
    } else {
      return 'Arquivo';
    }
  };

  const handleFileDownload = async () => {
    try {
      if (!material?.id) {
        toast({
          title: "Erro",
          description: "ID do material não encontrado.",
          variant: "destructive",
        });
        return;
      }

      // Fazer requisição à API para obter a lista de arquivos
      const apiResponse = await fetch(`https://ploomes-api.vercel.app/files/file/material/download/${material.id}`);
      
      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

      const apiData = await apiResponse.json();
      
      if (!apiData.data || apiData.data.length === 0) {
        toast({
          title: "Nenhum arquivo encontrado",
          description: "Este material não possui arquivos para download.",
          variant: "destructive",
        });
        return;
      }

      const supabaseBaseUrl = 'https://rbopjgcyjnputwvazbes.supabase.co/storage/v1/object/public/materials/';
      
      // Mostrar toast de início do download
      toast({
        title: "Iniciando download",
        description: `Baixando ${apiData.data.length} arquivo(s)...`,
      });

      // Baixar cada arquivo individualmente
      for (let i = 0; i < apiData.data.length; i++) {
        const fileData = apiData.data[i];
        const filePath = fileData.file_path;
        
        // Combinar a base URL com o file_path do banco
        const fileUrl = `${supabaseBaseUrl}${filePath}`;
        
        try {
          // Fazer download do arquivo
          const response = await fetch(fileUrl);
          
          if (!response.ok) {
            console.warn(`Erro ao baixar arquivo ${filePath}: HTTP ${response.status}`);
            continue; // Continua com o próximo arquivo
          }
          
          // Obter o blob do arquivo
          const blob = await response.blob();
          
          // Extrair nome do arquivo do file_path
          const fileName = filePath.split('/').pop() || 'arquivo';
          
          // Criar URL para download
          const downloadUrl = window.URL.createObjectURL(blob);
          
          // Criar elemento de download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          
          // Adicionar ao DOM, clicar e remover
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Limpar a URL criada
          window.URL.revokeObjectURL(downloadUrl);
          
          // Pequeno delay para evitar sobrecarga do navegador
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (fileError) {
          console.error(`Erro ao baixar arquivo ${filePath}:`, fileError);
          // Continua com o próximo arquivo
        }
      }

      toast({
        title: "Download concluído",
        description: `${apiData.data.length} arquivo(s) foram processados para download!`,
      });
      
    } catch (error) {
      console.error('Error downloading files:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar os arquivos. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-700 text-lg">Material não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Principal */}
      <div className="relative h-96 bg-gradient-to-r from-blue-500 to-blue-600">
        {material.image_url ? (
          <img
            src={material.image_url}
            alt={material.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getTypeIcon(material.type)}
          </div>
        )}
        
        {/* Overlay escuro para melhorar legibilidade do texto */}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Conteúdo do banner */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">{material.title}</h1>
            <p className="text-xl opacity-90">{getTypeLabel(material.type)}</p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações Gerais */}
        <div className="rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Informações Gerais</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <span>{formatDate(material.created_at)}</span>
            </div>
            
            <Button
              onClick={() => handleFileDownload()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Material de Apoio
            </Button>
          </div>

          {material.description && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
              <p className="text-gray-700">{material.description}</p>
            </div>
          )}

        </div>

        {/* Conteúdo HTML */}
        {material.content && (
          <div className="rounded-lg shadow-sm pt-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Conteúdo do Material</h2>
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: material.content }}
            />
          </div>
        )}

        {/* Botão Voltar */}
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/materiais')}
            className="bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Materiais
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaterialView;
