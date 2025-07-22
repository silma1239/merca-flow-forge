import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package, DollarSign, Image, Link, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  redirect_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  image_url: string;
  redirect_url: string;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    image_url: '',
    redirect_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: error.message
      });
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      redirect_url: ''
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      image_url: formData.image_url || null,
      redirect_url: formData.redirect_url
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Produto atualizado!",
          description: "Produto foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Produto criado!",
          description: "Novo produto foi criado com sucesso."
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar produto",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image_url: product.image_url || '',
      redirect_url: product.redirect_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir produto",
        description: error.message
      });
    } else {
      toast({
        title: "Produto excluído!",
        description: "Produto foi removido com sucesso."
      });
      loadProducts();
    }
  };

  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message
      });
    } else {
      toast({
        title: "Status atualizado!",
        description: `Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`
      });
      loadProducts();
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Carregando produtos...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Gerenciar Produtos
          </h1>
          <p className="text-muted-foreground mt-2">
            Crie e gerencie seus produtos para vendas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Criar Novo Produto'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Atualize as informações do produto.' : 'Preencha os dados para criar um novo produto.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Nome do Produto *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite o nome do produto"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Preço (R$) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o produto..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL da Imagem
                </Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/imagem.jpg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="redirect_url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  URL de Redirecionamento *
                </Label>
                <Input
                  id="redirect_url"
                  type="url"
                  value={formData.redirect_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, redirect_url: e.target.value }))}
                  placeholder="https://example.com/acesso-produto"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className={`relative ${!product.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {product.description || 'Sem descrição'}
                  </CardDescription>
                </div>
                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                  {product.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-md mb-3"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              <div className="space-y-3">
                <div className="text-2xl font-bold text-primary">
                  R$ {product.price.toFixed(2)}
                </div>
                
                <div className="flex items-center justify-between">
                  <Switch
                    checked={product.is_active}
                    onCheckedChange={() => toggleProductStatus(product.id, product.is_active)}
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(`/checkout?product=${product.id}`, '_blank')}
                >
                  Ver Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Comece criando seu primeiro produto
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Primeiro Produto
          </Button>
        </div>
      )}
    </div>
  );
}