import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Eye, Mail, Phone, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total_amount: number;
  discount_amount: number;
  payment_status: string;
  payment_method?: string;
  coupon_code?: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product: {
    name: string;
    price: number;
  };
  quantity: number;
  unit_price: number;
  is_order_bump: boolean;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    
    // Set up real-time subscription for orders
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          console.log('Orders updated, reloading...');
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (name, price)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 text-success';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando pedidos...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-4xl font-bold">Gestão de Pedidos</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, email ou ID do pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status do pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pedidos ({filteredOrders.length})</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Total: R$ {filteredOrders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{order.customer_name}</h3>
                        <Badge className={getStatusColor(order.payment_status)}>
                          {getStatusText(order.payment_status)}
                        </Badge>
                        {order.payment_method && (
                          <Badge variant="outline">
                            {order.payment_method.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {order.customer_email}
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {order.customer_phone}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold">R$ {order.total_amount.toFixed(2)}</div>
                        {order.discount_amount > 0 && (
                          <div className="text-sm text-success">
                            Desconto: R$ {order.discount_amount.toFixed(2)}
                          </div>
                        )}
                        {order.coupon_code && (
                          <Badge variant="secondary" className="text-xs">
                            {order.coupon_code}
                          </Badge>
                        )}
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Pedido</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Informações do Cliente</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Nome:</strong> {selectedOrder.customer_name}</p>
                                    <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                                    {selectedOrder.customer_phone && (
                                      <p><strong>Telefone:</strong> {selectedOrder.customer_phone}</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Informações do Pagamento</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Status:</strong> 
                                      <Badge className={`ml-2 ${getStatusColor(selectedOrder.payment_status)}`}>
                                        {getStatusText(selectedOrder.payment_status)}
                                      </Badge>
                                    </p>
                                    {selectedOrder.payment_method && (
                                      <p><strong>Método:</strong> {selectedOrder.payment_method.toUpperCase()}</p>
                                    )}
                                    <p><strong>Data:</strong> {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</p>
                                  </div>
                                </div>
                              </div>

                              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Itens do Pedido
                                  </h4>
                                  <div className="space-y-2">
                                    {selectedOrder.order_items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <div>
                                          <p className="font-medium">{item.product.name}</p>
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>Qtd: {item.quantity}</span>
                                            {item.is_order_bump && (
                                              <Badge variant="secondary" className="text-xs">Order Bump</Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-semibold">R$ {(item.unit_price * item.quantity).toFixed(2)}</p>
                                          <p className="text-sm text-muted-foreground">R$ {item.unit_price.toFixed(2)} cada</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="border-t pt-4">
                                <div className="flex justify-between items-center text-lg font-bold">
                                  <span>Total:</span>
                                  <span>R$ {selectedOrder.total_amount.toFixed(2)}</span>
                                </div>
                                {selectedOrder.discount_amount > 0 && (
                                  <div className="flex justify-between items-center text-sm text-success">
                                    <span>Desconto aplicado:</span>
                                    <span>-R$ {selectedOrder.discount_amount.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}

              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido encontrado com os filtros aplicados.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}