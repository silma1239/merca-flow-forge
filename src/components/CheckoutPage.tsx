import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Tag, CreditCard, Shield, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  redirect_url: string;
}

interface OrderBump {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  bump_product_id: string;
  product: Product;
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
  const { toast } = useToast();

  const productId = searchParams.get('product');

  useEffect(() => {
    if (productId) {
      loadProduct(productId);
      loadOrderBumps(productId);
    }
  }, [productId]);

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
        title: "Product not found",
        description: "The requested product could not be loaded."
      });
    } else {
      setProduct(data);
    }
  };

  const loadOrderBumps = async (productId: string) => {
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
      setOrderBumps(data as OrderBump[]);
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
        title: "Invalid coupon",
        description: "The coupon code is not valid or has expired."
      });
      return;
    }

    // Check if coupon is still valid
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast({
        variant: "destructive",
        title: "Coupon expired",
        description: "This coupon has expired."
      });
      return;
    }

    // Check minimum order amount
    if (data.min_order_amount > subtotal) {
      toast({
        variant: "destructive",
        title: "Minimum amount not met",
        description: `This coupon requires a minimum order of $${data.min_order_amount}.`
      });
      return;
    }

    setAppliedCoupon(data as Coupon);
    toast({
      variant: "default",
      title: "Coupon applied!",
      description: `You saved $${data.discount_type === 'percentage' ? 
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

  const handleCheckout = async () => {
    if (!product || !customerInfo.name || !customerInfo.email) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields."
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          productId: product.id,
          customerInfo,
          selectedBumps: Array.from(selectedBumps),
          couponCode: appliedCoupon?.code,
          subtotal,
          discount,
          total: subtotal - discount
        }
      });

      if (error) throw error;

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Checkout error",
        description: "There was an issue processing your order. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your product.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-success" />
              Secure Checkout
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4 text-success" />
              Safe Payment
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Money Back Guarantee
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Information */}
            <div className="space-y-6">
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-md mt-4"
                    />
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{product.description}</p>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">${product.price}</div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">5.0 (2,431 reviews)</span>
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
                      ? 'border-success bg-success/5 shadow-lg' 
                      : 'border-border hover:border-primary/50'
                  }`}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg line-through text-muted-foreground">
                          ${bump.product.price}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          ${(bump.product.price * (1 - bump.discount_percentage / 100)).toFixed(2)}
                        </span>
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          Save {bump.discount_percentage}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Checkout Form */}
            <div className="space-y-6">
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Checkout Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <Separator />

                  {/* Coupon Code */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Coupon Code
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter coupon code"
                        disabled={!!appliedCoupon}
                      />
                      <Button
                        variant="outline"
                        onClick={applyCoupon}
                        disabled={!couponCode.trim() || !!appliedCoupon}
                      >
                        Apply
                      </Button>
                    </div>
                    {appliedCoupon && (
                      <p className="text-sm text-success flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Coupon "{appliedCoupon.code}" applied!
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-success">
                        <span>Discount:</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${(subtotal - discount).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    {isLoading ? 'Processing...' : `Complete Purchase - $${(subtotal - discount).toFixed(2)}`}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By clicking "Complete Purchase", you agree to our terms and conditions.
                    Your payment is secured by Mercado Pago.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}