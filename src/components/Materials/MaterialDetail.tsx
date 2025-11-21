
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, Video, Calendar, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaterialWithDetails {
  id: string;
  title: string;
  type: 'link' | 'file';
  url: string;
  description: string;
  content?: string;
  createdAt: string;
  imageUrl?: string;
}

interface MaterialFile {
  id: string;
  materials_id: string;
  file_path: string;
  original_name: string;
  created_at: string;
}

const MaterialDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [material, setMaterial] = useState<MaterialWithDetails | null>(null);
  const [materialFiles, setMaterialFiles] = useState<MaterialFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          toast({
            title: "Erro ao carregar material",
            description: "Não foi possível carregar os detalhes do material.",
            variant: "destructive",
          });
          setMaterial(null);
          return;
        }

        if (!data) {
          setMaterial(null);
          return;
        }

        const formattedMaterial: MaterialWithDetails = {
          id: data.id,
          title: data.title,
          type: (data.type === 'link' || data.type === 'file') ? data.type : 'file',
          url: data.url,
          description: data.description || '',
          content: data.content || '',
          createdAt: data.created_at,
          imageUrl: data.image_url || ''
        };

        setMaterial(formattedMaterial);
        
        // Se for do tipo arquivo, buscar os arquivos anexados
        if (data.type === 'file') {
          fetchMaterialFiles(data.id);
        }
      } catch (error) {
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro inesperado ao carregar o material.",
          variant: "destructive",
        });
        setMaterial(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [id, toast]);

  const fetchMaterialFiles = async (materialId: string) => {
    try {
      setLoadingFiles(true);
      
      // Buscar arquivos da tabela uploaded_material_files
      const { data: filesData, error: filesError } = await supabase
        .from('uploaded_material_files')
        .select('*')
        .eq('materials_id', materialId)
        .order('created_at', { ascending: false });

      if (filesError) {
        toast({
          title: "Erro ao carregar arquivos",
          description: "Não foi possível carregar os arquivos anexados.",
          variant: "destructive",
        });
        return;
      }
      
      if (filesData && filesData.length > 0) {
        setMaterialFiles(filesData);
      } else {
        setMaterialFiles([]);
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar arquivos",
        description: "Ocorreu um erro inesperado ao carregar os arquivos.",
        variant: "destructive",
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownload = () => {
    if (material?.url) {
      window.open(material.url, '_blank', 'noopener noreferrer');
    } else {
      toast({
        title: "Erro",
        description: "URL não disponível para este material.",
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = async (file: MaterialFile) => {
    try {
      // Construir URL para download do arquivo
      // Base URL do Supabase Storage
      const supabaseBaseUrl = 'https://rbopjgcyjnputwvazbes.supabase.co/storage/v1/object/public/materials/';
      
      // Combinar a base URL com o file_path do banco
      const fileUrl = `${supabaseBaseUrl}${file.file_path}`;
      
      // Fazer download do arquivo
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Obter o blob do arquivo
      const blob = await response.blob();
      
      // Criar URL para download
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Criar elemento de download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.original_name || 'arquivo';
      
      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar a URL criada
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download concluído",
        description: `${file.original_name} foi baixado com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo. Verifique se o arquivo ainda existe.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatContent = (content: string) => {
    if (!content) return null;
    return content.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-4 last:mb-0">
        {paragraph}
      </p>
    ));
  };

  const getTypeIcon = () => {
    return material?.type === 'file' ? FileText : Video;
  };

  const TypeIcon = getTypeIcon();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Button 
            onClick={() => navigate('/materiais')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Materiais
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600">Carregando material...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <Button 
            onClick={() => navigate('/materiais')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Materiais
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Material não encontrado
              </h3>
              <p className="text-gray-600">
                O material que você está procurando não existe ou foi removido.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <Button 
          onClick={() => navigate('/materiais')}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Materiais
        </Button>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="h-96 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <TypeIcon className="h-24 w-24 text-blue-500 mx-auto mb-4" />
              <Badge variant="outline" className="text-lg px-4 py-2">
                {material.type === 'file' ? 'Arquivo' : 'Link Externo'}
              </Badge>
            </div>
          </div>
          
          <div className="p-8">
            <header className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {material.title}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(material.createdAt)}</span>
                  </div>
                </div>

                {material.type === 'link' && material.url && (
                  <Button 
                    onClick={handleDownload}
                    size="lg"
                    className="ml-4"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Acessar Link
                  </Button>
                )}
              </div>
            </header>

            {/* Informações Gerais */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações Gerais</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Data de Criação</p>
                  <p className="text-sm text-gray-900">{formatDate(material.createdAt)}</p>
                </div>
                
                {material.description && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Descrição</p>
                    <p className="text-sm text-gray-900">{material.description}</p>
                  </div>
                )}

                {material.type === 'file' && materialFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Arquivos Anexados</p>
                    <p className="text-sm text-gray-900">{materialFiles.length} arquivo(s)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Arquivos para Download */}
            {material.type === 'file' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Arquivos para Download</h2>
                
                {loadingFiles ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Carregando arquivos...</p>
                  </div>
                ) : materialFiles.length > 0 ? (
                  <div className="space-y-3">
                    {materialFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <File className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.original_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(file.created_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleFileDownload(file)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Arquivoss
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum arquivo anexado a este material</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Os arquivos aparecerão aqui quando forem anexados
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo do Material */}
            {material.content && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Conteúdo do Material</h2>
                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                  {formatContent(material.content)}
                </div>
              </div>
            )}

            {/* Descrição */}
            {material.description && !material.content && (
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                {formatContent(material.description)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button 
            onClick={() => navigate('/materiais')}
            size="lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Materiais
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaterialDetail;
