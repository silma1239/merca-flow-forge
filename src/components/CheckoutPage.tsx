import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Tag, Shield, Star, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PaymentMethods from './PaymentMethods';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  banner_image_url?: string;
  uploaded_image_url?: string;
  redirect_url: string;
  payment_methods?: string[];
}

interface OrderBump {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  bump_product_id: string;
  product: Product;
  delivery_link?: string;
}

interface Coupon {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'form' | 'payment'>('form');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { metaPixelId, checkoutColors } = useSystemSettings();

  // Apply dynamic colors to CSS variables
  useEffect(() => {
    if (checkoutColors) {
      const root = document.documentElement;
      root.style.setProperty('--checkout-primary', checkoutColors.primary);
      root.style.setProperty('--checkout-secondary', checkoutColors.secondary);
      root.style.setProperty('--checkout-accent', checkoutColors.accent);
      root.style.setProperty('--checkout-success', checkoutColors.success);
      root.style.setProperty('--checkout-warning', checkoutColors.warning);
    }
  }, [checkoutColors]);

  // Real-time payment status monitoring
  useEffect(() => {
    if (!paymentResult?.orderId) return;

    console.log('Setting up real-time monitoring for order:', paymentResult.orderId);

    // Listen for order status changes
    const orderChannel = supabase
      .channel('order-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${paymentResult.orderId}`
        },
        (payload) => {
          console.log('Order status updated:', payload);
          const newStatus = payload.new.payment_status;
          setOrderStatus(newStatus);
          
          if (newStatus === 'approved') {
            toast({
              title: "Pagamento Aprovado!",
              description: "Redirecionando para seu produto...",
            });
            
            // Redirect to product or success page
            setTimeout(() => {
              if (product?.redirect_url) {
                window.open(product.redirect_url, '_blank');
              }
              window.location.href = `/payment-success?order=${paymentResult.orderId}&product=${product?.id}`;
            }, 2000);
          } else if (newStatus === 'failed' || newStatus === 'rejected') {
            toast({
              title: "Pagamento Recusado",
              description: "Tente novamente ou escolha outro método.",
              variant: "destructive"
            });
            
            setTimeout(() => {
              window.location.href = `/payment-failure?order=${paymentResult.orderId}`;
            }, 2000);
          }
        }
      )
      .subscribe();

    // Listen for payment notifications
    const notificationChannel = supabase
      .channel('payment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_notifications',
          filter: `order_id=eq.${paymentResult.orderId}`
        },
        (payload) => {
          console.log('Payment notification received:', payload);
          const notification = payload.new;
          
          if (notification.status === 'approved') {
            setOrderStatus('approved');
          } else if (notification.status === 'rejected' || notification.status === 'failed') {
            setOrderStatus('failed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [paymentResult?.orderId, product?.redirect_url, product?.id, toast]);

  // Monitor payment status in real-time
  const monitorPaymentStatus = (orderId: string, paymentId: string) => {
    // Set up realtime subscription for order status changes
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Order status updated:', payload);
          const newOrder = payload.new;
          
          if (newOrder.payment_status === 'approved') {
            // Payment approved - redirect to success page
            window.location.href = `/payment-success?order=${orderId}&payment_id=${paymentId}`;
          } else if (newOrder.payment_status === 'failed') {
            // Payment failed - redirect to failure page
            window.location.href = `/payment-failure?order=${orderId}`;
          }
        }
      )
      .subscribe();

    // Clean up subscription after 10 minutes
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 600000);
  };

  const productId = searchParams.get('product');

  useEffect(() => {
    if (productId) {
      loadProduct(productId);
      loadOrderBumps(productId);
    }

    // Load Meta Pixel if configured
    if (metaPixelId && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${metaPixelId}');
        fbq('track', 'PageView');
        fbq('track', 'InitiateCheckout');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" />`;
      document.head.appendChild(noscript);
    }
  }, [productId, metaPixelId]);

  useEffect(() => {
    calculateTotals();
  }, [product, selectedBumps, appliedCoupon]);

  const loadProduct = async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Produto não encontrado",
        description: "O produto solicitado não pôde ser carregado."
      });
    } else {
      setProduct({
        ...data,
        payment_methods: Array.isArray(data.payment_methods) 
          ? (data.payment_methods as string[])
          : ['pix', 'credit_card', 'boleto']
      });
      if (data.banner_image_url) {
        setBannerImage(data.banner_image_url);
      }
    }
  };

  const loadOrderBumps = async (productId: string) => {
    try {
      // Carrega order bumps configurados
      const { data: settingsData, error: settingsError } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (!settingsError && settingsData && settingsData.length > 0) {
        console.log('Order bumps settings encontrados:', settingsData);
        
        // Para cada order bump setting, buscar o produto associado
        const orderBumpsWithProducts = await Promise.all(
          settingsData.map(async (setting) => {
            const { data: productData } = await supabase
              .from('products')
              .select('id, name, description, price, redirect_url, image_url, uploaded_image_url')
              .eq('id', setting.bump_product_id)
              .single();
            
            return {
              id: setting.id,
              title: setting.title,
              description: setting.description || '',
              discount_percentage: setting.discount_percentage || 0,
              bump_product_id: setting.bump_product_id,
              delivery_link: setting.delivery_link,
              product: productData || {
                id: setting.bump_product_id,
                name: 'Produto não encontrado',
                description: '',
                price: 0,
                redirect_url: '',
                image_url: null,
                uploaded_image_url: null
              }
            };
          })
        );
        
        setOrderBumps(orderBumpsWithProducts);
        return;
      }

      // Se não encontrar na tabela settings, tenta da tabela legacy
      const { data, error } = await supabase
        .from('order_bumps')
        .select(`
          id,
          title,
          description,
          discount_percentage,
          bump_product_id,
          product:products!order_bumps_bump_product_id_fkey (
            id,
            name,
            description,
            price,
            redirect_url
          )
        `)
        .eq('product_id', productId)
        .eq('is_active', true);

      if (!error && data) {
        console.log('Order bumps carregados da tabela legacy:', data);
        setOrderBumps(data as OrderBump[]);
      }
    } catch (error) {
      console.error('Erro ao carregar order bumps:', error);
    }
  };

  const calculateTotals = () => {
    if (!product) return;

    let subtotalAmount = product.price;
    
    // Add selected order bumps
    orderBumps.forEach(bump => {
      if (selectedBumps.has(bump.id)) {
        const discountedPrice = bump.product.price * (1 - bump.discount_percentage / 100);
        subtotalAmount += discountedPrice;
      }
    });

    setSubtotal(subtotalAmount);

    // Apply coupon discount
    let discountAmount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        discountAmount = subtotalAmount * (appliedCoupon.discount_value / 100);
      } else {
        discountAmount = appliedCoupon.discount_value;
      }
    }
    setDiscount(discountAmount);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Cupom inválido",
        description: "O código do cupom não é válido ou expirou."
      });
      return;
    }

    // Check if coupon is still valid
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast({
        variant: "destructive",
        title: "Cupom expirado",
        description: "Este cupom expirou."
      });
      return;
    }

    // Check minimum order amount
    if (data.min_order_amount > subtotal) {
      toast({
        variant: "destructive",
        title: "Valor mínimo não atingido",
        description: `Este cupom requer pedido mínimo de R$ ${data.min_order_amount}.`
      });
      return;
    }

    setAppliedCoupon(data as Coupon);
    toast({
      variant: "default",
      title: "Cupom aplicado!",
      description: `Você economizou R$ ${data.discount_type === 'percentage' ? 
        (subtotal * data.discount_value / 100).toFixed(2) : 
        data.discount_value.toFixed(2)}!`
    });
  };

  const toggleOrderBump = (bumpId: string) => {
    const newSelected = new Set(selectedBumps);
    if (newSelected.has(bumpId)) {
      newSelected.delete(bumpId);
    } else {
      newSelected.add(bumpId);
    }
    setSelectedBumps(newSelected);
  };

  const handlePaymentSubmit = async (method: string, data?: any) => {
    if (!product || !customerInfo.name || !customerInfo.email) {
      toast({
        variant: "destructive",
        title: "Informações obrigatórias",
        description: "Preencha todos os campos obrigatórios."
      });
      return;
    }

    // Validate document for non-PIX payments
    if (method !== 'pix' && !data?.document) {
      toast({
        title: "CPF/CNPJ obrigatório",
        description: "Por favor, informe seu CPF ou CNPJ.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Creating payment with method:', method, 'data:', data);
      
      const { data: result, error } = await supabase.functions.invoke('create-transparent-payment', {
        body: {
          productId: product.id,
          customerInfo: { ...customerInfo, document: data?.document },
          selectedBumps: Array.from(selectedBumps),
          couponCode: appliedCoupon?.code,
          subtotal,
          discount,
          total: subtotal - discount,
          paymentMethod: method,
          ...(method === 'credit_card' && { 
            cardData: { 
              installments: data?.installments || 1 
            } 
          })
        }
      });

      if (error) {
        console.error('Payment creation error:', error);
        throw error;
      }

      console.log('Payment created successfully:', result);
      setPaymentResult(result);
      setCurrentStep('payment');
      
      toast({
        title: "Pagamento criado!",
        description: method === 'pix' ? 
          "QR Code gerado. Complete o pagamento para liberar seu acesso." :
          method === 'credit_card' ?
          "Processando seu cartão de crédito..." :
          "Boleto gerado. Pague até o vencimento.",
      });

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Carregando...</h1>
          <p className="text-muted-foreground">Aguarde enquanto carregamos seu produto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with back button */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar à Loja
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-success" />
              <span className="text-sm font-medium">Checkout Seguro</span>
            </div>
          </div>
        </div>
      </header>
      {/* Banner Hero */}
      {bannerImage && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img 
            src={bannerImage} 
            alt="Banner do Checkout"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                {product?.name}
              </h1>
              <p className="text-lg md:text-xl opacity-90">
                Oferta Especial - Não Perca!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Banner (apenas se não há banner personalizado) */}
      {!bannerImage && (
        <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-background">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="container mx-auto py-12 px-4 text-center relative">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-4">
              Checkout Seguro
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Finalize sua compra com segurança e praticidade
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-success" />
              Checkout Seguro
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Pagamento Protegido
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Garantia de Devolução
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Information */}
            <div className="space-y-6">
              <Card className="border-2 shadow-lg" style={{ borderColor: checkoutColors.primary + '33' }}>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
                  {(product.uploaded_image_url || product.image_url) && (
                    <img 
                      src={product.uploaded_image_url || product.image_url} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-md mt-4"
                    />
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{product.description}</p>
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: checkoutColors.primary }}>R$ {product.price.toFixed(2)}</div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className="h-4 w-4" style={{ fill: checkoutColors.warning, color: checkoutColors.warning }} />
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">5.0 (2.431 avaliações)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Bumps */}
              {orderBumps.map(bump => (
                <Card 
                  key={bump.id}
                  className={`cursor-pointer transition-all duration-300 border-2 ${
                    selectedBumps.has(bump.id) 
                      ? 'shadow-lg' 
                      : 'border-border'
                  }`}
                  style={{
                    borderColor: selectedBumps.has(bump.id) ? checkoutColors.success : 'rgb(229 231 235)',
                    backgroundColor: selectedBumps.has(bump.id) ? checkoutColors.success + '0D' : 'transparent'
                  }}
                  onClick={() => toggleOrderBump(bump.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{bump.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{bump.description}</p>
                      </div>
                      {selectedBumps.has(bump.id) && (
                        <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {/* Product Image */}
                      {(bump.product.image_url || bump.product.uploaded_image_url) && (
                        <div className="flex-shrink-0">
                          <img 
                            src={bump.product.uploaded_image_url || bump.product.image_url} 
                            alt={bump.product.name}
                            className="w-16 h-16 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                      
                      {/* Price Section */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg line-through text-muted-foreground">
                            R$ {bump.product.price.toFixed(2)}
                          </span>
                          <span className="text-xl font-bold text-primary">
                            R$ {(bump.product.price * (1 - bump.discount_percentage / 100)).toFixed(2)}
                          </span>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            {bump.discount_percentage}% OFF
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {bump.product.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Checkout Form or Payment */}
            <div className="space-y-6">
              {currentStep === 'form' ? (
                <>
                  <Card className="border-2 border-primary/20 shadow-lg">
                    <CardHeader>
                      <CardTitle>Informações de Contato</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Digite seu nome completo"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Digite seu email"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Digite seu telefone"
                        />
                      </div>

                      <Separator />

                      {/* Coupon Code */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Cupom de Desconto
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="Digite o código do cupom"
                            disabled={!!appliedCoupon}
                          />
                          <Button
                            variant="outline"
                            onClick={applyCoupon}
                            disabled={!couponCode.trim() || !!appliedCoupon}
                          >
                            Aplicar
                          </Button>
                        </div>
                        {appliedCoupon && (
                          <p className="text-sm text-success flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Cupom "{appliedCoupon.code}" aplicado!
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Order Summary */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>R$ {subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm text-success">
                            <span>Desconto:</span>
                            <span>-R$ {discount.toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>R$ {(subtotal - discount).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <PaymentMethods 
                    total={subtotal - discount}
                    onPaymentSubmit={handlePaymentSubmit}
                    isLoading={isLoading}
                    paymentMethods={product?.payment_methods || ['pix', 'credit_card', 'boleto']}
                  />
                </>
              ) : (
                <PaymentMethods 
                  total={subtotal - discount}
                  onPaymentSubmit={handlePaymentSubmit}
                  isLoading={isLoading}
                  paymentResult={paymentResult}
                  paymentMethods={product?.payment_methods || ['pix', 'credit_card', 'boleto']}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}