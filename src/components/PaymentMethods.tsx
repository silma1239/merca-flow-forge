import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  QrCode, 
  CreditCard, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText,
  Smartphone,
  Shield,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodsProps {
  total: number;
  onPaymentSubmit: (method: string, data?: any) => void;
  isLoading: boolean;
  paymentResult?: any;
  paymentMethods?: string[];
}

export default function PaymentMethods({ 
  total, 
  onPaymentSubmit, 
  isLoading, 
  paymentResult,
  paymentMethods = ['pix', 'credit_card', 'boleto']
}: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  const [customerDocument, setCustomerDocument] = useState('');
  const [installments, setInstallments] = useState(1);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para área de transferência",
    });
  };

  const handlePayment = () => {
    const paymentData = {
      document: customerDocument,
      ...(selectedMethod === 'credit_card' && { installments })
    };
    onPaymentSubmit(selectedMethod, paymentData);
  };

  // Payment method configurations
  const methodConfigs = {
    pix: {
      icon: QrCode,
      title: 'PIX',
      subtitle: 'Pagamento instantâneo',
      description: 'Aprovação imediata',
      gradient: 'bg-gradient-to-r from-pix/20 to-primary/10',
      borderColor: 'border-pix/30',
      textColor: 'text-pix'
    },
    credit_card: {
      icon: CreditCard,
      title: 'Cartão de Crédito',
      subtitle: 'Parcele em até 12x',
      description: 'Parcelamento sem juros',
      gradient: 'bg-gradient-to-r from-credit-card/20 to-purple-100',
      borderColor: 'border-credit-card/30',
      textColor: 'text-credit-card'
    },
    boleto: {
      icon: FileText,
      title: 'Boleto Bancário',
      subtitle: 'Vencimento em 3 dias',
      description: 'Pagamento tradicional',
      gradient: 'bg-gradient-to-r from-boleto/20 to-orange-100',
      borderColor: 'border-boleto/30',
      textColor: 'text-boleto'
    }
  };

  // Show payment result after creation
  if (paymentResult) {
    return (
      <Card className="border-primary/20 shadow-[var(--shadow-payment)]">
        <CardHeader className="text-center bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center justify-center gap-2">
            {selectedMethod === 'pix' && <QrCode className="h-6 w-6 text-pix" />}
            {selectedMethod === 'credit_card' && <CreditCard className="h-6 w-6 text-credit-card" />}
            {selectedMethod === 'boleto' && <FileText className="h-6 w-6 text-boleto" />}
            {selectedMethod === 'pix' && 'Pagamento PIX Gerado'}
            {selectedMethod === 'credit_card' && 'Cartão Processado'}
            {selectedMethod === 'boleto' && 'Boleto Gerado'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="text-center">
            <Badge variant="secondary" className="bg-warning-light text-warning mb-4 px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {paymentResult.status === 'approved' ? 'Aprovado' : 'Aguardando Pagamento'}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {selectedMethod === 'pix' && 'Efetue o pagamento através do QR Code ou código PIX abaixo'}
              {selectedMethod === 'credit_card' && 'Seu cartão está sendo processado'}
              {selectedMethod === 'boleto' && 'Pague seu boleto até o vencimento'}
            </p>
          </div>

          {/* PIX specific content */}
          {selectedMethod === 'pix' && paymentResult.pix && (
            <>
              {paymentResult.pix.qr_code_base64 && (
                <div className="text-center space-y-4">
                  <div className="inline-block p-4 bg-white rounded-xl shadow-[var(--shadow-card)]">
                    <img 
                      src={`data:image/png;base64,${paymentResult.pix.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="mx-auto"
                      style={{ maxWidth: '200px' }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>Escaneie com seu app de pagamento</span>
                  </div>
                </div>
              )}

              {paymentResult.pix.qr_code && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Código PIX Copia e Cola
                  </Label>
                  <div className="relative">
                    <Input 
                      value={paymentResult.pix.qr_code}
                      readOnly
                      className="pr-12 font-mono text-xs bg-muted/50"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={() => copyToClipboard(paymentResult.pix.qr_code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Boleto specific content */}
          {selectedMethod === 'boleto' && paymentResult.boleto && (
            <div className="space-y-4">
              <div className="text-center">
                <Button 
                  onClick={() => window.open(paymentResult.boleto.pdf_url, '_blank')}
                  className="bg-gradient-to-r from-boleto to-orange-500 hover:from-boleto/90 hover:to-orange-500/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar Boleto
                </Button>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p>Código de barras será copiado automaticamente</p>
              </div>
            </div>
          )}

          {/* Payment summary */}
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Valor total:</span>
              <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge 
                variant={paymentResult.status === 'approved' ? "default" : "secondary"}
                className={paymentResult.status === 'approved' 
                  ? "bg-success text-success-foreground" 
                  : "bg-warning-light text-warning"
                }
              >
                {paymentResult.status === 'approved' ? 'Aprovado' : 'Pendente'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Pagamento protegido pelo Mercado Pago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-[var(--shadow-elegant)]">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Método de Pagamento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Escolha como deseja pagar de forma segura
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Payment Method Selection */}
        <div className="grid grid-cols-1 gap-4">
          {paymentMethods.map((method) => {
            const config = methodConfigs[method as keyof typeof methodConfigs];
            const Icon = config.icon;
            const isSelected = selectedMethod === method;
            const isEnabled = method === 'pix' || method === 'credit_card' || method === 'boleto';
            
            return (
              <div
                key={method}
                className={`
                  relative overflow-hidden rounded-xl border-2 cursor-pointer transition-all duration-300
                  ${isSelected 
                    ? `${config.borderColor} ${config.gradient} shadow-[var(--shadow-card)]` 
                    : 'border-border hover:border-primary/30 hover:shadow-md'
                  }
                  ${!isEnabled && 'opacity-50 cursor-not-allowed'}
                `}
                onClick={() => isEnabled && setSelectedMethod(method as any)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${isSelected ? 'bg-white/80' : 'bg-muted/50'}`}>
                        <Icon className={`h-6 w-6 ${isSelected ? config.textColor : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{config.title}</h3>
                        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Zap className="h-3 w-3 text-success" />
                          <span className="text-xs text-success">{config.description}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className={`h-6 w-6 ${config.textColor}`} />
                    )}
                    {!isEnabled && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        Em breve
                      </Badge>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-primary/20" />
                )}
              </div>
            );
          })}
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Payment Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CPF/CNPJ {selectedMethod !== 'pix' && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="document"
              value={customerDocument}
              onChange={(e) => setCustomerDocument(e.target.value)}
              placeholder="Digite seu CPF ou CNPJ"
              maxLength={18}
              className="bg-muted/30 border-primary/20 focus:border-primary"
              required={selectedMethod !== 'pix'}
            />
            <p className="text-xs text-muted-foreground">
              {selectedMethod === 'pix' 
                ? 'Para comprovante fiscal (opcional)' 
                : 'Obrigatório para este método de pagamento'
              }
            </p>
          </div>

          {/* Credit Card Installments */}
          {selectedMethod === 'credit_card' && (
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas</Label>
              <select
                id="installments"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full p-2 border border-primary/20 rounded-md bg-muted/30 focus:border-primary"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                  <option key={num} value={num}>
                    {num}x de R$ {(total / num).toFixed(2)} {num === 1 ? 'à vista' : 'sem juros'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment method benefits */}
          <div className={`rounded-xl p-4 text-center ${methodConfigs[selectedMethod].gradient}`}>
            {(() => {
              const Icon = methodConfigs[selectedMethod].icon;
              return <Icon className={`h-8 w-8 mx-auto mb-2 ${methodConfigs[selectedMethod].textColor}`} />;
            })()}
            <h4 className={`font-semibold mb-1 ${methodConfigs[selectedMethod].textColor}`}>
              {methodConfigs[selectedMethod].title}
            </h4>
            <p className="text-sm text-muted-foreground">
              {selectedMethod === 'pix' && 'Pagamento aprovado na hora'}
              {selectedMethod === 'credit_card' && 'Parcelamento sem juros no cartão'}
              {selectedMethod === 'boleto' && 'Pagamento seguro via banco'}
            </p>
          </div>
        </div>

        {/* Total and Pay Button */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total a pagar:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </span>
            </div>
            {selectedMethod === 'credit_card' && installments > 1 && (
              <div className="text-center mt-2 text-sm text-muted-foreground">
                {installments}x de R$ {(total / installments).toFixed(2)} sem juros
              </div>
            )}
          </div>

          <Button 
            onClick={handlePayment}
            disabled={isLoading || (selectedMethod !== 'pix' && !customerDocument)}
            className={`
              w-full text-lg py-6 font-semibold transition-all duration-300
              bg-gradient-to-r from-primary to-primary-hover 
              hover:from-primary-hover hover:to-primary
              shadow-[var(--shadow-payment)] hover:shadow-[var(--shadow-glow)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = methodConfigs[selectedMethod].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {selectedMethod === 'pix' && 'Gerar Pagamento PIX'}
                {selectedMethod === 'credit_card' && 'Pagar com Cartão'}
                {selectedMethod === 'boleto' && 'Gerar Boleto'}
              </div>
            )}
          </Button>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Pagamento 100% seguro via Mercado Pago</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>Criptografia SSL</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Dados protegidos</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}