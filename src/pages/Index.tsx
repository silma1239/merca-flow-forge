import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';  
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingCart, CreditCard, Zap, Shield, Star, ArrowRight, CheckCircle, Package, LogIn, Settings, LogOut } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  uploaded_image_url?: string;
  redirect_url: string;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, userRole, signOut } = useAuth();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Sua Loja
              </span>
            </div>
            <nav className="flex items-center space-x-6">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden md:block">
                    Olá, {user.email}
                  </span>
                  {userRole?.role === 'admin' && (
                    <>
                      <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                        <Settings className="h-4 w-4 inline mr-1" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </Link>
                      <Link to="/products" className="text-muted-foreground hover:text-foreground transition-colors">
                        <Package className="h-4 w-4 inline mr-1" />
                        <span className="hidden sm:inline">Produtos</span>
                      </Link>
                      <Link to="/orders" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ShoppingCart className="h-4 w-4 inline mr-1" />
                        <span className="hidden sm:inline">Pedidos</span>
                      </Link>
                      <Link to="/coupons" className="text-muted-foreground hover:text-foreground transition-colors">
                        <Star className="h-4 w-4 inline mr-1" />
                        <span className="hidden sm:inline">Cupons</span>
                      </Link>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que Escolher Nosso Sistema?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Construído com tecnologia moderna e otimizado para máximas taxas de conversão
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/20 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <CreditCard className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Order Bumps Inteligentes</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Aumente o valor médio do pedido com upsells e cross-sells inteligentes 
                  que complementam a compra principal.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-success/20 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <ShoppingCart className="w-12 h-12 text-success mx-auto mb-4" />
                <CardTitle>Sistema de Cupons</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Sistema flexível de descontos com cupons de porcentagem e valor fixo, 
                  requisitos de pedido mínimo e datas de expiração.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-warning/20 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Zap className="w-12 h-12 text-warning mx-auto mb-4" />
                <CardTitle>Rastreamento em Tempo Real</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Acompanhamento completo do ciclo de vida dos pedidos desde o pagamento 
                  até a conclusão com redirecionamentos automáticos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nossos Produtos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Conheça nossos produtos disponíveis. Cada um com recursos únicos 
              incluindo order bumps e compatibilidade com cupons.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-48 bg-muted rounded-md"></div>
                    <div className="h-6 bg-muted rounded mt-4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                  <CardHeader>
                    {(product.uploaded_image_url || product.image_url) ? (
                      <img 
                        src={product.uploaded_image_url || product.image_url} 
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center">
                        <ShoppingCart className="w-12 h-12 text-primary" />
                      </div>
                    )}
                    <CardTitle className="mt-4">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-primary">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                        ))}
                      </div>
                    </div>
                    <Link to={`/checkout?product=${product.id}`}>
                      <Button className="w-full" size="lg">
                        Comprar Agora
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground">
        <div className="container mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold">Pronto para Começar?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            {!user ? 'Faça login para acessar o painel administrativo ou experimente nossos produtos.' : 
             userRole?.role === 'admin' ? 'Acesse o painel administrativo para gerenciar seus produtos.' :
             'Explore nossos produtos disponíveis.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {products.length > 0 && (
              <Link to={`/checkout?product=${products[0]?.id}`}>
                <Button size="lg" variant="secondary" className="bg-background text-primary hover:bg-background/90">
                  Experimentar Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
            {!user ? (
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  Login / Cadastro
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : userRole?.role === 'admin' && (
              <>
                <Link to="/products">
                  <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                    Gerenciar Produtos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                    Dashboard Admin
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
