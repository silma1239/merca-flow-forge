import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, DollarSign, Users, TrendingUp, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  redirect_url: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  conversionRate: number;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalRevenue: 0, totalOrders: 0, conversionRate: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    redirect_url: '',
    image_url: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsData) setProducts(productsData);

      // Load stats
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, payment_status');

      if (ordersData) {
        const totalOrders = ordersData.length;
        const totalRevenue = ordersData
          .filter(order => order.payment_status === 'approved')
          .reduce((sum, order) => sum + order.total_amount, 0);

        setStats({
          totalProducts: productsData?.length || 0,
          totalRevenue,
          totalOrders,
          conversionRate: totalOrders > 0 ? (totalRevenue / totalOrders) : 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', redirect_url: '', image_url: '' });
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        redirect_url: formData.redirect_url,
        image_url: formData.image_url || null,
        is_active: true
      };

      if (editingProduct) {
        await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        await supabase
          .from('products')
          .insert([productData]);
        toast({ title: "Produto criado com sucesso!" });
      }

      loadDashboardData();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ 
        variant: "destructive",
        title: "Erro ao salvar produto",
        description: "Tente novamente." 
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      redirect_url: product.redirect_url,
      image_url: product.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      
      toast({ title: "Produto desativado com sucesso!" });
      loadDashboardData();
    } catch (error) {
      toast({ 
        variant: "destructive",
        title: "Erro ao desativar produto" 
      });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-4xl font-bold">Dashboard Admin</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar' : 'Criar'} Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="redirect_url">URL de Redirecionamento</Label>
                  <Input
                    id="redirect_url"
                    value={formData.redirect_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, redirect_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="image_url">URL da Imagem (opcional)</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  />
                </div>
                <Button onClick={handleSaveProduct} className="w-full">
                  {editingProduct ? 'Atualizar' : 'Criar'} Produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.conversionRate.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">R$ {product.price}</Badge>
                        <Badge variant={product.is_active ? "default" : "destructive"}>
                          {product.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}