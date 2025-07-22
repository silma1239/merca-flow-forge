import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  bucket: 'product-images' | 'banner-images';
  value?: string;
  onChange: (url: string) => void;
  label: string;
  className?: string;
}

export function ImageUpload({ bucket, value, onChange, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "Por favor, selecione apenas arquivos de imagem."
        });
        return;
      }

      // Verificar tamanho (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "O arquivo deve ter no máximo 5MB."
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        onChange(urlData.publicUrl);
        toast({
          title: "Upload realizado!",
          description: "Imagem enviada com sucesso."
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover rounded-md border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-4">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <Label
              htmlFor={`upload-${bucket}`}
              className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
            >
              Clique para fazer upload da imagem
            </Label>
            <Input
              id={`upload-${bucket}`}
              type="file"
              accept="image/*"
              onChange={uploadImage}
              disabled={uploading}
              className="hidden"
            />
            {uploading && (
              <div className="mt-2">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                <p className="text-xs text-muted-foreground">Enviando...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}