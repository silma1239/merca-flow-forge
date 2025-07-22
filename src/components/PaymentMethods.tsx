import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QrCode, CreditCard, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodsProps {
  total: number;
  onPaymentSubmit: (method: string, data?: any) => void;
  isLoading: boolean;
  paymentResult?: any;
}

export default function PaymentMethods({ total, onPaymentSubmit, isLoading, paymentResult }: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card'>('pix');
  const [customerDocument, setCustomerDocument] = useState('');
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código PIX copiado para área de transferência",
    });
  };

  const handlePayment = () => {
    if (selectedMethod === 'pix') {
      onPaymentSubmit('pix', { document: customerDocument });
    }
  };

  // Show PIX result after payment creation
  if (paymentResult && paymentResult.paymentMethod === 'pix') {
    return (
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            Pagamento PIX Gerado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge variant="secondary" className="bg-warning/10 text-warning mb-4">
              <Clock className="h-4 w-4 mr-1" />
              Aguardando Pagamento
            </Badge>
            <p className="text-sm text-muted-foreground">
              Efetue o pagamento através do QR Code ou código PIX abaixo
            </p>
          </div>

          {/* QR Code */}
          {paymentResult.pix?.qr_code_base64 && (
            <div className="text-center space-y-4">
              <img 
                src={`data:image/png;base64,${paymentResult.pix.qr_code_base64}`}
                alt="QR Code PIX"
                className="mx-auto border rounded-lg p-4 bg-white"
                style={{ maxWidth: '250px' }}
              />
              <p className="text-xs text-muted-foreground">
                Escaneie o QR Code com seu banco ou app de pagamento
              </p>
            </div>
          )}

          {/* PIX Copy-Paste Code */}
          {paymentResult.pix?.qr_code && (
            <div className="space-y-3">
              <Label>Código PIX Copia e Cola:</Label>
              <div className="relative">
                <Input 
                  value={paymentResult.pix.qr_code}
                  readOnly
                  className="pr-12 font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => copyToClipboard(paymentResult.pix.qr_code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copie e cole no seu app de pagamento
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Valor total:</span>
              <span className="font-semibold">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Status:</span>
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                Pendente
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>O pagamento será confirmado automaticamente após a compensação</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Método de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div className="grid grid-cols-1 gap-4">
          <div 
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedMethod === 'pix' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedMethod('pix')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">PIX</h3>
                  <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                </div>
              </div>
              {selectedMethod === 'pix' && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
            </div>
          </div>

          {/* Credit Card - Coming Soon */}
          <div className="p-4 rounded-lg border-2 border-border bg-muted/50 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-muted-foreground">Cartão de Crédito</h3>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                </div>
              </div>
              <Badge variant="secondary">Em breve</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* PIX Payment Form */}
        {selectedMethod === 'pix' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document">CPF/CNPJ (opcional)</Label>
              <Input
                id="document"
                value={customerDocument}
                onChange={(e) => setCustomerDocument(e.target.value)}
                placeholder="Digite seu CPF ou CNPJ"
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground">
                Para comprovante fiscal (opcional)
              </p>
            </div>

            <div className="bg-success/10 rounded-lg p-4 text-center">
              <QrCode className="h-8 w-8 text-success mx-auto mb-2" />
              <h4 className="font-semibold text-success mb-1">PIX Instantâneo</h4>
              <p className="text-sm text-muted-foreground">
                Após confirmar, você receberá o QR Code para pagamento
              </p>
            </div>
          </div>
        )}

        {/* Total and Pay Button */}
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total a pagar:</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full text-lg py-6"
            size="lg"
          >
            {isLoading ? 'Processando...' : 'Gerar Pagamento PIX'}
          </Button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Pagamento 100% seguro via Mercado Pago</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}