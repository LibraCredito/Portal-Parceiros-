
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Material } from '@/types/auth';
import TinyEditor from './TinyEditor';

const materialSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  type: z.enum(['link', 'file'], { required_error: 'Tipo é obrigatório' }),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  imageUrl: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MaterialFormData & { imageFile?: File }) => void;
  material?: Material | null;
  isUploading?: boolean;
}

const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  material,
  isUploading = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      title: material?.title || '',
      description: material?.description || '',
      content: '', // Será preenchido quando o campo for adicionado ao banco
      type: material?.type || 'link',
      url: material?.url || '',
      imageUrl: '', // Será preenchido quando o campo for adicionado ao banco
    },
  });

  const watchType = form.watch('type');

  useEffect(() => {
    if (material) {
      form.reset({
        title: material.title,
        description: material.description || '',
        content: '', // Será preenchido quando o campo for adicionado ao banco
        type: material.type,
        url: material.url,
        imageUrl: '', // Será preenchido quando o campo for adicionado ao banco
      });
    } else {
      form.reset({
        title: '',
        description: '',
        content: '',
        type: 'link',
        url: '',
        imageUrl: '',
      });
    }
  }, [material, form, isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Funcionalidade em desenvolvimento
  };

  const removeFile = () => {
    // Funcionalidade em desenvolvimento
  };

  const handleSubmit = (data: MaterialFormData) => {
    // Passar os dados sem arquivo de imagem por enquanto
    onSave({ ...data, imageFile: undefined });
    form.reset();
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {material ? 'Editar Material' : 'Novo Material'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o título do material" />
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
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchType === 'link' ? 'URL Externa *' : 'Link do Arquivo *'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={
                            watchType === 'link' 
                              ? "https://exemplo.com" 
                              : "https://drive.google.com/file/d/..."
                          }
                          type="url"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-500">
                        {watchType === 'link' 
                          ? 'Link para conteúdo externo (site, vídeo, etc.)'
                          : 'Link do Google Drive ou outro serviço de armazenamento'
                        }
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem do Material (opcional) - Em desenvolvimento</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* Campo de upload */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors opacity-50">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="image-upload"
                              disabled={true}
                            />
                            <label htmlFor="image-upload" className="cursor-not-allowed">
                              <div className="flex flex-col items-center space-y-2">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    Funcionalidade em desenvolvimento
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Upload de imagem será implementado em breve
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>

                          {/* Campo oculto para manter compatibilidade */}
                          <input
                            type="hidden"
                            {...field}
                            value=""
                          />
                        </div>
                      </FormControl>
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
                          {...field} 
                          placeholder="Descreva o material..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel>Conteúdo do Material * - Em desenvolvimento</FormLabel>
                      <FormControl>
                        <div className="border rounded-lg overflow-hidden opacity-50">
                          <div className="p-8 text-center text-gray-500">
                            <p className="text-lg font-medium mb-2">Editor de Conteúdo</p>
                            <p className="text-sm">Esta funcionalidade será implementada em breve</p>
                          </div>
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
                    {material ? 'Salvando...' : 'Criando...'}
                  </>
                ) : (
                  material ? 'Salvar Alterações' : 'Criar Material'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialModal;
