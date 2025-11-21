
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    type: 'powerbi' | 'form';
    url: string;
    groupName: string;
  } | null;
}

const GroupViewModal: React.FC<GroupViewModalProps> = ({
  isOpen,
  onClose,
  content
}) => {
  const { toast } = useToast();

  if (!content) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(content.url);
      toast({
        title: "Link copiado",
        description: "O link foi copiado para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleOpenExternal = () => {
    window.open(content.url, '_blank', 'noopener,noreferrer');
  };

  const getTitle = () => {
    return content.type === 'powerbi' 
      ? `Power BI - ${content.groupName}`
      : `Formulário - ${content.groupName}`;
  };

  const getDescription = () => {
    return content.type === 'powerbi'
      ? 'Visualização do dashboard do Power BI'
      : 'Visualização do formulário';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {getTitle()}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir em Nova Aba
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 border rounded-lg overflow-hidden">
          <iframe
            src={content.url}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            title={getTitle()}
          />
        </div>

        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          <strong>URL:</strong> {content.url}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupViewModal;
