
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import TinyEditor from './TinyEditor';

const newsSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  imageUrl: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  excerpt: z.string().optional(),
});

type NewsFormData = z.infer<typeof newsSchema>;

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewsFormData & { imageFile?: File }) => void;
  editingNews?: any;
  isUploading?: boolean;
}

const categories = [
  { id: 'sistema', label: 'Sistema' },
  { id: 'treinamento', label: 'Treinamento' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'mercado', label: 'Mercado' },
  { id: 'atualizacoes', label: 'Atualizações' },
  { id: 'eventos', label: 'Eventos' }
];

const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, onSave, editingNews, isUploading = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const form = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: '',
      category: '',
      imageUrl: '',
      content: '',
      excerpt: '',
    },
  });

  useEffect(() => {
    if (editingNews) {
      form.reset({
        title: editingNews.title || '',
        category: editingNews.category || '',
        imageUrl: editingNews.imageUrl || '',
        content: editingNews.content || '',
        excerpt: editingNews.excerpt || '',
      });
      if (editingNews.imageUrl) {
        setPreviewUrl(editingNews.imageUrl);
      }
    } else {
      form.reset({
        title: '',
        category: '',
        imageUrl: '',
        content: '',
        excerpt: '',
      });
      setSelectedFile(null);
      setPreviewUrl('');
    }
  }, [editingNews, form, isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
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
    form.setValue('imageUrl', '');
  };

  const onSubmit = (data: NewsFormData) => {
    // Generate excerpt if not provided
    if (!data.excerpt && data.content) {
      data.excerpt = data.content.substring(0, 150) + (data.content.length > 150 ? '...' : '');
    }
    
    // Passar o arquivo selecionado junto com os dados
    onSave({ ...data, imageFile: selectedFile || undefined });
    form.reset();
    setSelectedFile(null);
    setPreviewUrl('');
    onClose();
  };

  const handleClose = () => {
    form.reset();
    setSelectedFile(null);
    setPreviewUrl('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editingNews ? 'Editar Notícia' : 'Nova Notícia'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Notícia *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o título da notícia" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem da Notícia (opcional)</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* Campo de upload */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="image-upload"
                              disabled={isUploading}
                            />
                            <label htmlFor="image-upload" className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className="flex flex-col items-center space-y-2">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    {isUploading ? 'Processando...' : 'Clique para selecionar uma imagem'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    PNG, JPG, GIF até 5MB
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>

                          {/* Preview da imagem */}
                          {previewUrl && (
                            <div className="relative">
                              <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
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

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resumo (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Resumo breve da notícia" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-500">
                        Se não fornecido, será gerado automaticamente
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column - Content */}
              <div className="lg:col-span-2">
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
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingNews ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  editingNews ? 'Salvar Alterações' : 'Criar Notícia'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewsModal;
