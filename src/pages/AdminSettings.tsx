import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Settings, CreditCard, Key, ArrowLeft, Building, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  user_roles: { role: string }[];
}

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_description: string;
  updated_at: string;
}

interface OrderBumpSetting {
  id: string;
  product_id: string;
  bump_product_id: string;
  title: string;
  description: string;
  discount_percentage: number;
  delivery_link: string;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [orderBumps, setOrderBumps] = useState<OrderBumpSetting[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [mercadoPagoToken, setMercadoPagoToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [systemName, setSystemName] = useState("");
  
  // Order Bump form states
  const [newBumpTitle, setNewBumpTitle] = useState("");
  const [newBumpDescription, setNewBumpDescription] = useState("");
  const [newBumpProductId, setNewBumpProductId] = useState("");
  const [newBumpBumpProductId, setNewBumpBumpProductId] = useState("");
  const [newBumpDiscount, setNewBumpDiscount] = useState(0);
  const [newBumpDeliveryLink, setNewBumpDeliveryLink] = useState("");

  useEffect(() => {
    loadSettings();
    loadUsers();
    loadSystemSettings();
    loadOrderBumps();
    loadProducts();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive",
      });
      return;
    }

    setSettings(data || []);
    
    // Load Mercado Pago token if exists
    const mpToken = data?.find(s => s.setting_key === 'MERCADO_PAGO_ACCESS_TOKEN');
    if (mpToken) {
      setMercadoPagoToken(mpToken.setting_value || "");
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
      return;
    }

    // Load user roles separately
    const usersWithRoles = await Promise.all((data || []).map(async (user) => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.user_id);
      
      return {
        ...user,
        user_roles: roles || []
      };
    }));

    setUsers(usersWithRoles);
  };

  const loadSystemSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do sistema",
        variant: "destructive",
      });
      return;
    }

    setSystemSettings(data || []);
    
    // Load system name if exists
    const nameConfig = data?.find(s => s.setting_key === 'SYSTEM_NAME');
    if (nameConfig) {
      setSystemName(nameConfig.setting_value || "");
    }
  };

  const loadOrderBumps = async () => {
    const { data, error } = await supabase
      .from('order_bump_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar order bumps",
        variant: "destructive",
      });
      return;
    }

    setOrderBumps(data || []);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos",
        variant: "destructive",
      });
      return;
    }

    setProducts(data || []);
  };

  const saveMercadoPagoToken = async () => {
    if (!mercadoPagoToken.trim()) {
      toast({
        title: "Erro",
        description: "Token do Mercado Pago é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'MERCADO_PAGO_ACCESS_TOKEN',
        setting_value: mercadoPagoToken,
        updated_by: user?.id
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar token do Mercado Pago",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Token do Mercado Pago salvo com sucesso",
      });
      loadSettings();
    }
    
    setLoading(false);
  };

  const saveSystemName = async () => {
    if (!systemName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do sistema é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'SYSTEM_NAME',
        setting_value: systemName,
        setting_description: 'Nome do sistema exibido na interface',
        updated_by: user?.id
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar nome do sistema",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Nome do sistema salvo com sucesso",
      });
      loadSystemSettings();
    }
    
    setLoading(false);
  };

  const createOrderBump = async () => {
    if (!newBumpTitle || !newBumpProductId || !newBumpBumpProductId) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('order_bump_settings')
      .insert({
        title: newBumpTitle,
        description: newBumpDescription,
        product_id: newBumpProductId,
        bump_product_id: newBumpBumpProductId,
        discount_percentage: newBumpDiscount,
        delivery_link: newBumpDeliveryLink,
        created_by: user?.id
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar order bump",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Order bump criado com sucesso",
      });
      // Reset form
      setNewBumpTitle("");
      setNewBumpDescription("");
      setNewBumpProductId("");
      setNewBumpBumpProductId("");
      setNewBumpDiscount(0);
      setNewBumpDeliveryLink("");
      loadOrderBumps();
    }
    
    setLoading(false);
  };

  const toggleOrderBump = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('order_bump_settings')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do order bump",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: `Order bump ${!isActive ? 'ativado' : 'desativado'} com sucesso`,
      });
      loadOrderBumps();
    }
  };

  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de senha",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar senha: " + error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso",
      });
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações Administrativas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie configurações do sistema, usuários e APIs
            </p>
          </div>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="mercadopago" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Mercado Pago
            </TabsTrigger>
            <TabsTrigger value="order-bumps" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Bumps
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Senha
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Configure informações básicas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-name">Nome do Sistema</Label>
                  <Input
                    id="system-name"
                    placeholder="Ex: Minha Loja Online"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nome exibido em toda a interface do sistema
                  </p>
                </div>
                <Button 
                  onClick={saveSystemName}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Salvando..." : "Salvar Nome do Sistema"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mercadopago">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Mercado Pago</CardTitle>
                <CardDescription>
                  Configure o token de acesso do Mercado Pago para processar pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mp-token">Token de Acesso do Mercado Pago</Label>
                  <Input
                    id="mp-token"
                    type="password"
                    placeholder="APP_USR-..."
                    value={mercadoPagoToken}
                    onChange={(e) => setMercadoPagoToken(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Token de produção ou sandbox do Mercado Pago
                  </p>
                </div>
                <Button 
                  onClick={saveMercadoPagoToken}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Salvando..." : "Salvar Token"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="order-bumps">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Criar Novo Order Bump</CardTitle>
                  <CardDescription>
                    Configure order bumps com links entregáveis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bump-title">Título *</Label>
                      <Input
                        id="bump-title"
                        placeholder="Ex: Oferta Especial"
                        value={newBumpTitle}
                        onChange={(e) => setNewBumpTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bump-discount">Desconto (%)</Label>
                      <Input
                        id="bump-discount"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={newBumpDiscount}
                        onChange={(e) => setNewBumpDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bump-description">Descrição</Label>
                    <Textarea
                      id="bump-description"
                      placeholder="Descreva a oferta..."
                      value={newBumpDescription}
                      onChange={(e) => setNewBumpDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bump-product">Produto Principal *</Label>
                      <Select value={newBumpProductId} onValueChange={setNewBumpProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bump-bump-product">Produto do Bump *</Label>
                      <Select value={newBumpBumpProductId} onValueChange={setNewBumpBumpProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto bump" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - R$ {product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bump-delivery-link">Link Entregável</Label>
                    <Input
                      id="bump-delivery-link"
                      type="url"
                      placeholder="https://..."
                      value={newBumpDeliveryLink}
                      onChange={(e) => setNewBumpDeliveryLink(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Link que será enviado ao cliente após a compra
                    </p>
                  </div>

                  <Button 
                    onClick={createOrderBump}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Criando..." : "Criar Order Bump"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Bumps Existentes</CardTitle>
                  <CardDescription>
                    Gerencie os order bumps criados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderBumps.map((bump) => (
                      <div key={bump.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{bump.title}</h3>
                            <Badge variant={bump.is_active ? 'default' : 'secondary'}>
                              {bump.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {bump.description}
                          </p>
                          <div className="text-xs text-muted-foreground mt-2">
                            Desconto: {bump.discount_percentage}% | 
                            Criado em: {new Date(bump.created_at).toLocaleDateString('pt-BR')}
                          </div>
                          {bump.delivery_link && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Link: {bump.delivery_link}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={bump.is_active ? "destructive" : "default"}
                          onClick={() => toggleOrderBump(bump.id, bump.is_active)}
                        >
                          {bump.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>
                  Visualize todos os usuários registrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Cadastrado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {user.user_roles?.map((role, index) => (
                          <Badge key={index} variant={role.role === 'admin' ? 'default' : 'secondary'}>
                            {role.role === 'admin' ? 'Administrador' : 'Usuário'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Altere sua senha de acesso ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={changePassword}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Técnicas</CardTitle>
                <CardDescription>
                  Visualize todas as configurações armazenadas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-3">Configurações Administrativas</h3>
                    {settings.map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                        <div>
                          <p className="font-medium">{setting.setting_key}</p>
                          <p className="text-sm text-muted-foreground">
                            Atualizado em: {new Date(setting.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {setting.setting_value ? 'Configurado' : 'Não configurado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-3">Configurações do Sistema</h3>
                    {systemSettings.map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                        <div>
                          <p className="font-medium">{setting.setting_key}</p>
                          <p className="text-sm text-muted-foreground">
                            {setting.setting_description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado em: {new Date(setting.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {setting.setting_value ? 'Configurado' : 'Não configurado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}