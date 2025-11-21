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
import { Upload, X, Image as ImageIcon, ArrowLeft, Save, File, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TinyEditor from '@/components/Materials/TinyEditor';

const materialSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  url: z.string().url("URL inválida").optional().or(z.literal('')),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface FileItem {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
}

const MaterialForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);

  const isEditing = Boolean(id);

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: '',
      type: 'link',
      url: '',
      content: '',
      description: '',
      imageUrl: '',
    },
  });

  const watchType = form.watch('type');

  useEffect(() => {
    if (isEditing && id) {
      fetchMaterial();
    }
  }, [id, isEditing]);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: "Erro ao carregar material",
          description: "Não foi possível carregar o material.",
          variant: "destructive",
        });
        navigate('/materiais');
        return;
      }

             form.reset({
         title: data.title,
         type: data.type,
         url: data.url || '',
         content: data.content || '', // Será preenchido quando o campo for adicionado ao banco
         description: data.description || '',
         imageUrl: data.image_url || '',
       });

       // Se há imagem, mostrar preview
       if (data.image_url) {
         setPreviewUrl(data.image_url);
       }

    } catch (error) {
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }

      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Verificar tamanho do arquivo (máximo 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 50MB.`,
          variant: "destructive",
        });
        return;
      }

      const fileItem: FileItem = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type
      };

      setSelectedFiles(prev => [...prev, fileItem]);
    });
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(item => item.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFilesToAPI = async (materialId: string) => {
    if (selectedFiles.length === 0) return;

    const uploadPromises = selectedFiles.map(async (fileItem) => {
      const formData = new FormData();
      formData.append('file', fileItem.file);
      formData.append('materials_id', materialId);

      try {
        const response = await fetch('https://ploomes-api.vercel.app/files/file/material/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${fileItem.name}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Salvar informações do arquivo na tabela uploaded_material_files
        if (result.db_record) {
          try {
            const { error: dbError } = await supabase
              .from('uploaded_material_files')
              .insert({
                materials_id: materialId,
                file_path: result.db_record.file_path,
                original_name: result.db_record.original_name
              });

            if (dbError) {
              toast({
                title: "Aviso",
                description: `Arquivo ${fileItem.name} enviado, mas houve problema ao salvar no banco.`,
                variant: "destructive",
              });
            }
          } catch (dbError) {
          }
        }

        return { success: true, fileName: fileItem.name, result };
      } catch (error) {
        return { success: false, fileName: fileItem.name, error };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      toast({
        title: "Upload de arquivos",
        description: `${successful.length} arquivo(s) enviado(s) com sucesso!`,
      });
    }

    if (failed.length > 0) {
      toast({
        title: "Erro no upload",
        description: `${failed.length} arquivo(s) falharam no envio.`,
        variant: "destructive",
      });
    }

    return results;
  };

  const onSubmit = async (data: MaterialFormData) => {
    try {
      setUploading(true);
      let materialId: string;

      // 1. Primeiro criar/atualizar o material
      if (isEditing) {
        const { data: updateData, error: updateError } = await supabase
          .from('materials')
          .update({
            title: data.title,
            type: data.type,
            url: data.url,
            content: data.content,
            description: data.description,
          })
          .eq('id', id)
          .select('id')
          .single();

        if (updateError) {
          toast({
            title: "Erro ao atualizar material",
            description: "Não foi possível atualizar o material.",
            variant: "destructive",
          });
          return;
        }

        materialId = updateData.id;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('materials')
          .insert({
            title: data.title,
            type: data.type,
            url: data.url,
            content: data.content,
            description: data.description,
          })
          .select('id')
          .single();

        if (insertError) {
          toast({
            title: "Erro ao criar material",
            description: "Não foi possível criar o material.",
            variant: "destructive",
          });
          return;
        }

        materialId = insertData.id;
      }

      // 2. Se o tipo for "Arquivo" e há arquivos selecionados, fazer upload
      if (data.type === 'file' && selectedFiles.length > 0) {
        await uploadFilesToAPI(materialId);
      }

      // 3. Se há arquivo de imagem, fazer upload e vincular ao material
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('materials_id', materialId);

        try {
          const uploadResponse = await fetch('https://ploomes-api.vercel.app/files/img/material', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error('Upload failed');
          }

          const uploadResult = await uploadResponse.json();
          
          // 3. Atualizar o material com a URL da imagem
          const { error: imageUpdateError } = await supabase
            .from('materials')
            .update({ image_url: uploadResult.publicUrl })
            .eq('id', materialId);

          if (imageUpdateError) {
            toast({
              title: "Aviso",
              description: "Material salvo, mas houve um problema ao vincular a imagem.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sucesso",
              description: "Material e imagem salvos com sucesso!",
          });
        }
      } catch (uploadError) {
        toast({
            title: "Aviso",
            description: "Material salvo, mas houve um problema ao fazer upload da imagem.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Sucesso",
          description: isEditing ? "Material atualizado com sucesso!" : "Material criado com sucesso!",
        });
      }

      navigate('/materiais');
    } catch (error) {
      toast({
        title: "Erro ao salvar material",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    navigate('/materiais');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Materiais
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Editar Material' : 'Criar Novo Material'}
            </h1>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1  gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Material *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o título do material" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="link">Link Externo</SelectItem>
                          <SelectItem value="file">Arquivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite uma descrição do material" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchType === 'link' && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Externa</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="https://exemplo.com"
                            type="url"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-500">
                          Link para conteúdo externo (site, vídeo, etc.)
                        </p>
                      </FormItem>
                    )}
                  />
                )}

                {watchType === 'file' && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormLabel>Arquivos Anexados</FormLabel>
                      
                      {/* Lista de arquivos selecionados */}
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          {selectedFiles.map((fileItem) => (
                            <div key={fileItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <File className="h-5 w-5 text-blue-500" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{fileItem.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(fileItem.size)} • {fileItem.type || 'Tipo desconhecido'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSelectedFile(fileItem.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botão de upload */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          multiple
                          onChange={handleFilesSelect}
                          className="hidden"
                          id="files-upload"
                          disabled={uploading}
                        />
                        <label htmlFor="files-upload" className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <div className="flex flex-col items-center space-y-2">
                            <Upload className="h-8 w-8 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {uploading ? 'Processando...' : 'Clique para selecionar arquivos'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Todos os tipos de arquivo • Máximo 50MB por arquivo
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem do Material</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* Campo de upload */}

                          {/* Preview da imagem */}
                          {previewUrl ? (
                            <div className="relative">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  className="max-w-full h-auto max-h-48 mx-auto rounded"
                                />
                                <button
                                  type="button"
                                  onClick={removeFile}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {selectedFile?.name}
                              </p>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="image-upload"
                              disabled={uploading}
                            />
                            <label htmlFor="image-upload" className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className="flex flex-col items-center space-y-2">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    {uploading ? 'Processando...' : 'Clique para selecionar uma imagem'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    PNG, JPG, GIF até 5MB
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>
                          )}

                          {/* Campo oculto para manter compatibilidade */}
                          <input
                            type="hidden"
                            {...field}
                            value={previewUrl}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
              </div>

              <div className="lg:col-span-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo do Material *</FormLabel>
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
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleBack} disabled={uploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditing ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  isEditing ? 'Salvar Alterações' : 'Criar Material'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default MaterialForm;
