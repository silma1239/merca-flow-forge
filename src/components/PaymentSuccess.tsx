import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Mail, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  payment_status: string;
  redirect_url: string;
  created_at: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(10);
  const { supportWhatsapp } = useSystemSettings();
  
  const orderId = searchParams.get('order');
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    if (orderId) {
      loadOrderDetails(orderId);
    }
    
    // Update payment status if we have payment_id
    if (paymentId && orderId) {
      updatePaymentStatus(orderId, paymentId);
    }
  }, [orderId, paymentId]);

  useEffect(() => {
    if (order?.redirect_url && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (order?.redirect_url && redirectCountdown === 0) {
      window.location.href = order.redirect_url;
    }
  }, [order, redirectCountdown]);

  const loadOrderDetails = async (orderId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!error && data) {
      setOrder(data);
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentId: string) => {
    // This would typically be handled by webhooks, but we can update the status here
    await supabase
      .from('orders')
      .update({ 
        payment_status: 'approved',
        mercadopago_payment_id: paymentId 
      })
      .eq('id', orderId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-success mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your payment has been processed successfully.
            </p>
          </div>
        </div>

        {order && (
          <Card className="shadow-lg border-success/20">
            <CardHeader className="text-center pb-3">
              <CardTitle className="flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                Order Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer:</span>
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{order.customer_email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="font-semibold">${order.total_amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    {order.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {order.redirect_url && (
                <div className="border-t pt-4">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You'll be redirected to your purchase in {redirectCountdown} seconds
                    </p>
                    <Button 
                      onClick={() => window.location.href = order.redirect_url}
                      className="w-full"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Access Your Purchase Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      A confirmation email has been sent to {order.customer_email}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our support team
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/">
              <Button variant="outline" size="sm">
                Voltar ao Início
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`https://wa.me/${supportWhatsapp.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Suporte
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}