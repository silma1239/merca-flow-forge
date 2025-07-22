import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Tag, Edit, Trash2, CalendarIcon, Copy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '0',
    max_uses: '',
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCoupons(data as Coupon[]);
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '0',
      max_uses: '',
    });
    setExpiryDate(undefined);
    setEditingCoupon(null);
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSaveCoupon = async () => {
    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: parseFloat(formData.min_order_amount),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: expiryDate ? expiryDate.toISOString() : null,
        is_active: true
      };

      if (editingCoupon) {
        await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
        toast({ title: "Cupom atualizado com sucesso!" });
      } else {
        await supabase
          .from('coupons')
          .insert([{ ...couponData, current_uses: 0 }]);
        toast({ title: "Cupom criado com sucesso!" });
      }

      loadCoupons();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar cupom",
        description: "Tente novamente."
      });
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      max_uses: coupon.max_uses?.toString() || '',
    });
    setExpiryDate(coupon.expires_at ? new Date(coupon.expires_at) : undefined);
    setIsDialogOpen(true);
  };

  const handleToggleCoupon = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      toast({ title: `Cupom ${!isActive ? 'ativado' : 'desativado'} com sucesso!` });
      loadCoupons();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar status do cupom"
      });
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      if (!window.confirm("Tem certeza que deseja excluir este cupom?")) {
        return;
      }

      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: "Cupom excluído com sucesso!"
      });
      
      loadCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir cupom",
        description: "Não foi possível excluir o cupom"
      });
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!", description: `Cupom "${code}" copiado para área de transferência` });
  };

  const isExpired = (expiresAt?: string) => {
    return expiresAt ? new Date(expiresAt) < new Date() : false;
  };

  const isLimitReached = (coupon: Coupon) => {
    return coupon.max_uses ? coupon.current_uses >= coupon.max_uses : false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-4xl font-bold">Gestão de Cupons</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cupom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCoupon ? 'Editar' : 'Criar'} Cupom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="code">Código do Cupom</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="Ex: DESCONTO10"
                    />
                  </div>
                  <Button type="button" onClick={generateCouponCode} className="mt-6">
                    Gerar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Desconto</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed') => 
                        setFormData(prev => ({ ...prev, discount_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor do Desconto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                      placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Mínimo do Pedido (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Máximo de Usos (opcional)</Label>
                    <Input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value }))}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div>
                  <Label>Data de Expiração (opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "dd/MM/yyyy", { locale: ptBR }) : "Sem expiração"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button onClick={handleSaveCoupon} className="w-full">
                  {editingCoupon ? 'Atualizar' : 'Criar'} Cupom
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Cupons ({coupons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="border rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg font-mono">{coupon.code}</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyCouponCode(coupon.code)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Badge variant={coupon.is_active ? "default" : "destructive"}>
                          {coupon.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        {isExpired(coupon.expires_at) && (
                          <Badge variant="destructive">Expirado</Badge>
                        )}
                        {isLimitReached(coupon) && (
                          <Badge variant="destructive">Limite Atingido</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong>Desconto:</strong>{' '}
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}%`
                            : `R$ ${coupon.discount_value.toFixed(2)}`
                          }
                        </div>
                        <div>
                          <strong>Mín. pedido:</strong> R$ {coupon.min_order_amount.toFixed(2)}
                        </div>
                        <div>
                          <strong>Usos:</strong> {coupon.current_uses}
                          {coupon.max_uses ? ` / ${coupon.max_uses}` : ' (ilimitado)'}
                        </div>
                      </div>

                      {coupon.expires_at && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <strong>Expira em:</strong>{' '}
                          {format(new Date(coupon.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditCoupon(coupon)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={coupon.is_active ? "destructive" : "default"}
                        onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                      >
                        {coupon.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCoupon(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {coupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cupom encontrado. Crie seu primeiro cupom!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}