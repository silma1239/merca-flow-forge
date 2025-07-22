import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, CreditCard, Zap, Shield, Star, ArrowRight, CheckCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  redirect_url: string;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="container mx-auto text-center space-y-8">
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
              🚀 Powered by Mercado Pago
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight">
              Custom Checkout
              <span className="text-primary block">Experience</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Seamless payment processing with real-time order tracking, coupon codes, 
              and intelligent order bumps. Built for conversion.
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Secure Payments</div>
                <div className="text-muted-foreground">256-bit SSL encryption</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Real-time Processing</div>
                <div className="text-muted-foreground">Instant confirmations</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-warning" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Money-back Guarantee</div>
                <div className="text-muted-foreground">30-day refund policy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Our Checkout?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built with modern technology and optimized for maximum conversion rates
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/20 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <CreditCard className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Smart Order Bumps</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Increase average order value with intelligent upsells and cross-sells 
                  that complement the main purchase.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-success/20 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <ShoppingCart className="w-12 h-12 text-success mx-auto mb-4" />
                <CardTitle>Coupon Integration</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Flexible discount system with percentage and fixed amount coupons, 
                  minimum order requirements, and expiration dates.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-warning/20 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Zap className="w-12 h-12 text-warning mx-auto mb-4" />
                <CardTitle>Real-time Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Complete order lifecycle tracking from payment initiation 
                  to successful completion with automatic redirects.
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
            <h2 className="text-3xl font-bold mb-4">Demo Products</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience our custom checkout with these demo products. Each has unique features 
              including order bumps and coupon compatibility.
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
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
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
                        ${product.price}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                        ))}
                      </div>
                    </div>
                    <Link to={`/checkout?product=${product.id}`}>
                      <Button className="w-full" size="lg">
                        Buy Now
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
          <h2 className="text-4xl font-bold">Ready to Experience Our Checkout?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Try our demo products above or explore the complete checkout experience 
            with real Mercado Pago integration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`/checkout?product=${products[0]?.id}`}>
              <Button size="lg" variant="secondary" className="bg-background text-primary hover:bg-background/90">
                Try Demo Checkout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                Login / Cadastro
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                Gerenciar Produtos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
