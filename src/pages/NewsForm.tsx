import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Image as ImageIcon, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TinyEditor from '@/components/News/TinyEditor';

const newsSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  imageUrl: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  excerpt: z.string().optional(),
  reading_time: z.number().min(1, "Tempo de leitura é obrigatório"),
  source: z.string().min(1, "Fonte é obrigatória"),
});

type NewsFormData = z.infer<typeof newsSchema>;

const categories = [
  { id: 'sistema', label: 'Sistema' },
  { id: 'treinamento', label: 'Treinamento' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'mercado', label: 'Mercado' },
  { id: 'atualizacoes', label: 'Atualizações' },
  { id: 'eventos', label: 'Eventos' }
];

const NewsForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: '',
      category: '',
      imageUrl: '',
      content: '',
      excerpt: '',
      reading_time: 0,
      source: '',
    },
  });

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      fetchNews();
    }
  }, [id]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching news:', error);
        toast({
          title: "Erro ao carregar notícia",
          description: "Não foi possível carregar a notícia.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        form.reset({
          title: data.title || '',
          category: data.category || '',
          imageUrl: data.image_url || '',
          content: data.content || '',
          excerpt: data.excerpt || '',
          reading_time: data.reading_time || 0,
          source: data.source || '',
        });
        if (data.image_url) {
          setPreviewUrl(data.image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Erro ao carregar notícia",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const onSubmit = async (data: NewsFormData) => {
    try {
      setUploading(true);

      let newsId = id;

      // Se não tem ID, criar nova notícia
      if (!newsId) {
        const { data: newNews, error: createError } = await supabase
          .from('news')
          .insert([
            {
              title: data.title,
              content: data.content,
              category: data.category,
              excerpt: data.excerpt || data.content.substring(0, 150) + (data.content.length > 150 ? '...' : ''),
              author_id: (await supabase.auth.getUser()).data.user?.id,
              reading_time: data.reading_time,
              source: data.source,
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating news:', createError);
          toast({
            title: "Erro ao criar notícia",
            description: "Não foi possível criar a notícia.",
            variant: "destructive",
          });
          return;
        }

        newsId = newNews.id;
      } else {
        // Atualizar notícia existente
        const { error: updateError } = await supabase
          .from('news')
          .update({
            title: data.title,
            content: data.content,
            category: data.category,
            excerpt: data.excerpt || data.content.substring(0, 150) + (data.content.length > 150 ? '...' : ''),
            reading_time: data.reading_time,
            source: data.source,
          })
          .eq('id', newsId);

        if (updateError) {
          console.error('Error updating news:', updateError);
          toast({
            title: "Erro ao atualizar notícia",
            description: "Não foi possível atualizar a notícia.",
            variant: "destructive",
          });
          return;
        }
      }

      // Se há arquivo de imagem, fazer upload
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('news_id', newsId);

        try {
          const uploadResponse = await fetch('https://ploomes-api.vercel.app/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error('Upload failed');
          }

          const uploadResult = await uploadResponse.json();
          
          // Atualizar notícia com a URL da imagem
          const { error: imageUpdateError } = await supabase
            .from('news')
            .update({ image_url: uploadResult.publicUrl })
            .eq('id', newsId);

          if (imageUpdateError) {
            console.error('Error updating image URL:', imageUpdateError);
            toast({
              title: "Aviso",
              description: "Notícia salva, mas houve um problema ao salvar a imagem.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sucesso",
              description: "Notícia e imagem salvos com sucesso!",
            });
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast({
            title: "Aviso",
            description: "Notícia salva, mas houve um problema ao fazer upload da imagem.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Sucesso",
          description: isEditing ? "Notícia atualizada com sucesso!" : "Notícia criada com sucesso!",
        });
      }

      // Redirecionar para a lista de notícias
      navigate('/noticias');
    } catch (error) {
      console.error('Error saving news:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a notícia.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/noticias')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Notícias
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isEditing ? 'Editar Notícia' : 'Criar Nova Notícia'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Título */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Notícia *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título da notícia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Categoria */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Resumo */}
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resumo (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite um resumo da notícia" 
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tempo de Leitura */}
                <FormField
                  control={form.control}
                  name="reading_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo de Leitura (minutos) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder="Ex: 5" 
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fonte */}
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonte *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Portal oficial, Blog da empresa, etc." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Upload de Imagem */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Imagem da Notícia (opcional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full h-auto max-h-48 mx-auto rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeFile}
                            className="absolute top-2 right-2"
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Clique para selecionar uma imagem
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF até 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Conteúdo - TinyEditor */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo da Notícia *</FormLabel>
                      <FormControl>
                        <div className="border rounded-lg overflow-hidden">
                          <TinyEditor
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/noticias')}
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading}
                    className="min-w-[120px]"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isEditing ? 'Atualizar' : 'Criar'} Notícia
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsForm; 