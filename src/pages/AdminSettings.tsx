import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Settings, CreditCard, Key, ArrowLeft, Building, Package, Trash2 } from "lucide-react";
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
  const [storeName, setStoreName] = useState("");
  const [checkoutPrimaryColor, setCheckoutPrimaryColor] = useState("#3b82f6");
  const [checkoutSecondaryColor, setCheckoutSecondaryColor] = useState("#f1f5f9");
  const [checkoutAccentColor, setCheckoutAccentColor] = useState("#06b6d4");
  const [checkoutSuccessColor, setCheckoutSuccessColor] = useState("#16a34a");
  const [checkoutWarningColor, setCheckoutWarningColor] = useState("#d97706");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("+5574974008239");
  
  // Order Bump form states
  const [newBumpTitle, setNewBumpTitle] = useState("");
  const [newBumpDescription, setNewBumpDescription] = useState("");
  const [newBumpProductId, setNewBumpProductId] = useState("");
  const [newBumpBumpProductId, setNewBumpBumpProductId] = useState("");
  const [newBumpDiscount, setNewBumpDiscount] = useState(0);
  const [newBumpDeliveryLink, setNewBumpDeliveryLink] = useState("");
  
  // States for creating new settings
  const [newSettingKey, setNewSettingKey] = useState("");
  const [newSettingValue, setNewSettingValue] = useState("");
  const [newSettingDescription, setNewSettingDescription] = useState("");

  useEffect(() => {
    loadSettings();
    loadUsers();
    loadSystemSettings();
    loadOrderBumps();
    loadProducts();

    // Real-time listeners
    const systemSettingsChannel = supabase
      .channel('system-settings-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_settings' },
        () => loadSystemSettings()
      )
      .subscribe();

    const orderBumpChannel = supabase
      .channel('order-bump-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'order_bump_settings' },
        () => loadOrderBumps()
      )
      .subscribe();

    const adminSettingsChannel = supabase
      .channel('admin-settings-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'admin_settings' },
        () => loadSettings()
      )
      .subscribe();

    const usersChannel = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(systemSettingsChannel);
      supabase.removeChannel(orderBumpChannel);
      supabase.removeChannel(adminSettingsChannel);
      supabase.removeChannel(usersChannel);
    };
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
    
    // Load all system configurations
    const systemNameConfig = data?.find(s => s.setting_key === 'SYSTEM_NAME');
    if (systemNameConfig) {
      setSystemName(systemNameConfig.setting_value || "");
    }

    const storeNameConfig = data?.find(s => s.setting_key === 'STORE_NAME');
    if (storeNameConfig) {
      setStoreName(storeNameConfig.setting_value || "");
    }

    const primaryColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_PRIMARY_COLOR');
    if (primaryColorConfig) {
      setCheckoutPrimaryColor(primaryColorConfig.setting_value || "#3b82f6");
    }

    const secondaryColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_SECONDARY_COLOR');
    if (secondaryColorConfig) {
      setCheckoutSecondaryColor(secondaryColorConfig.setting_value || "#f1f5f9");
    }

    const accentColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_ACCENT_COLOR');
    if (accentColorConfig) {
      setCheckoutAccentColor(accentColorConfig.setting_value || "#06b6d4");
    }

    const successColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_SUCCESS_COLOR');
    if (successColorConfig) {
      setCheckoutSuccessColor(successColorConfig.setting_value || "#16a34a");
    }

    const warningColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_WARNING_COLOR');
    if (warningColorConfig) {
      setCheckoutWarningColor(warningColorConfig.setting_value || "#d97706");
    }

    const metaPixelConfig = data?.find(s => s.setting_key === 'META_PIXEL_ID');
    if (metaPixelConfig) {
      setMetaPixelId(metaPixelConfig.setting_value || "");
    }

    const supportConfig = data?.find(s => s.setting_key === 'SUPPORT_WHATSAPP');
    if (supportConfig) {
      setSupportWhatsapp(supportConfig.setting_value || "+5574974008239");
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
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Erro ao salvar token do Mercado Pago:', error);
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
      // Recarregar configurações em tempo real
      await loadSettings();
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
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Erro ao salvar nome do sistema:', error);
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
      // Recarregar configurações do sistema em tempo real
      await loadSystemSettings();
    }
    
    setLoading(false);
  };

  const saveStoreName = async () => {
    if (!storeName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da loja é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'STORE_NAME',
        setting_value: storeName,
        setting_description: 'Nome da loja exibido no cabeçalho e logotipo',
        updated_by: user?.id
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Erro ao salvar nome da loja:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar nome da loja",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Nome da loja salvo com sucesso",
      });
      await loadSystemSettings();
    }
    
    setLoading(false);
  };

  const saveCheckoutColors = async () => {
    setLoading(true);
    
    try {
      const colorSettings = [
        { key: 'CHECKOUT_PRIMARY_COLOR', value: checkoutPrimaryColor, description: 'Cor primária do checkout' },
        { key: 'CHECKOUT_SECONDARY_COLOR', value: checkoutSecondaryColor, description: 'Cor secundária do checkout' },
        { key: 'CHECKOUT_ACCENT_COLOR', value: checkoutAccentColor, description: 'Cor de destaque do checkout' },
        { key: 'CHECKOUT_SUCCESS_COLOR', value: checkoutSuccessColor, description: 'Cor de sucesso do checkout' },
        { key: 'CHECKOUT_WARNING_COLOR', value: checkoutWarningColor, description: 'Cor de aviso do checkout' }
      ];

      for (const setting of colorSettings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: setting.key,
            setting_value: setting.value,
            setting_description: setting.description,
            updated_by: user?.id
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error(`Erro ao salvar ${setting.key}:`, error);
          toast({
            title: "Erro",
            description: `Erro ao salvar ${setting.description}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      toast({
        title: "Sucesso",
        description: "Cores do checkout salvas com sucesso",
      });
      await loadSystemSettings();
    } catch (error) {
      console.error('Erro ao salvar cores do checkout:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar cores do checkout",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const saveMetaPixelId = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'META_PIXEL_ID',
        setting_value: metaPixelId,
        setting_description: 'ID do Pixel do Meta/Facebook para rastreamento',
        updated_by: user?.id
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Erro ao salvar Meta Pixel ID:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar Meta Pixel ID",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Meta Pixel ID salvo com sucesso",
      });
      await loadSystemSettings();
    }
    
    setLoading(false);
  };

  const saveSupportWhatsapp = async () => {
    if (!supportWhatsapp.trim()) {
      toast({
        title: "Erro",
        description: "Número do WhatsApp é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'SUPPORT_WHATSAPP',
        setting_value: supportWhatsapp,
        setting_description: 'Número do WhatsApp para suporte aos clientes',
        updated_by: user?.id
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Erro ao salvar WhatsApp de suporte:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar WhatsApp de suporte",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "WhatsApp de suporte salvo com sucesso",
      });
      await loadSystemSettings();
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

  const createSetting = async () => {
    if (!newSettingKey.trim() || !newSettingValue.trim()) {
      toast({
        title: "Erro",
        description: "Chave e valor da configuração são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('admin_settings')
      .insert({
        setting_key: newSettingKey.toUpperCase().replace(/\s+/g, '_'),
        setting_value: newSettingValue,
        updated_by: user?.id
      });

    if (error) {
      console.error('Erro ao criar configuração:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar configuração",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Configuração criada com sucesso",
      });
      setNewSettingKey("");
      setNewSettingValue("");
      setNewSettingDescription("");
      await loadSettings();
    }
    
    setLoading(false);
  };

  const deleteSetting = async (id: string, table: 'admin_settings' | 'system_settings') => {
    if (!window.confirm('Tem certeza que deseja excluir esta configuração?')) {
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir configuração:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir configuração",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Configuração excluída com sucesso",
      });
      if (table === 'admin_settings') {
        await loadSettings();
      } else {
        await loadSystemSettings();
      }
    }
    
    setLoading(false);
  };

  const deleteOrderBump = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este order bump?')) {
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('order_bump_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir order bump:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir order bump",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Order bump excluído com sucesso",
      });
      await loadOrderBumps();
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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Checkout
            </TabsTrigger>
            <TabsTrigger value="mercadopago" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Mercado Pago
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rastreamento
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

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Loja</CardTitle>
                <CardDescription>
                  Configure informações da loja exibidas publicamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Nome da Loja</Label>
                  <Input
                    id="store-name"
                    placeholder="Ex: Minha Loja"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nome exibido no cabeçalho da página inicial
                  </p>
                </div>
                <Button 
                  onClick={saveStoreName}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Salvando..." : "Salvar Nome da Loja"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkout">
            <Card>
              <CardHeader>
                <CardTitle>Personalização do Checkout</CardTitle>
                <CardDescription>
                  Configure as cores do checkout transparente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Cor Primária</Label>
                    <Input
                      id="primary-color"
                      type="color"
                      value={checkoutPrimaryColor}
                      onChange={(e) => setCheckoutPrimaryColor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Cor Secundária</Label>
                    <Input
                      id="secondary-color"
                      type="color"
                      value={checkoutSecondaryColor}
                      onChange={(e) => setCheckoutSecondaryColor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Cor de Destaque</Label>
                    <Input
                      id="accent-color"
                      type="color"
                      value={checkoutAccentColor}
                      onChange={(e) => setCheckoutAccentColor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="success-color">Cor de Sucesso</Label>
                    <Input
                      id="success-color"
                      type="color"
                      value={checkoutSuccessColor}
                      onChange={(e) => setCheckoutSuccessColor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning-color">Cor de Aviso</Label>
                    <Input
                      id="warning-color"
                      type="color"
                      value={checkoutWarningColor}
                      onChange={(e) => setCheckoutWarningColor(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  onClick={saveCheckoutColors}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Salvando..." : "Salvar Cores do Checkout"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Rastreamento</CardTitle>
                <CardDescription>
                  Configure rastreamento e suporte ao cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-pixel">Meta Pixel ID</Label>
                  <Input
                    id="meta-pixel"
                    placeholder="Digite o ID do Meta Pixel"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    ID do Pixel do Facebook/Meta para rastreamento de conversões
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-whatsapp">WhatsApp de Suporte</Label>
                  <Input
                    id="support-whatsapp"
                    placeholder="+5511999999999"
                    value={supportWhatsapp}
                    onChange={(e) => setSupportWhatsapp(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Número do WhatsApp para suporte aos clientes
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={saveMetaPixelId}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Salvando..." : "Salvar Meta Pixel"}
                  </Button>
                  <Button 
                    onClick={saveSupportWhatsapp}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    {loading ? "Salvando..." : "Salvar WhatsApp"}
                  </Button>
                </div>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={bump.is_active ? "destructive" : "default"}
                            onClick={() => toggleOrderBump(bump.id, bump.is_active)}
                          >
                            {bump.is_active ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteOrderBump(bump.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                     <div className="space-y-4 mb-6">
                       <div className="p-4 bg-muted/50 rounded-lg">
                         <h4 className="font-medium mb-3">Adicionar Nova Configuração</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                             <Label htmlFor="setting-key">Chave da Configuração</Label>
                             <Input
                               id="setting-key"
                               placeholder="Ex: EMAIL_SMTP_HOST"
                               value={newSettingKey}
                               onChange={(e) => setNewSettingKey(e.target.value)}
                             />
                           </div>
                           <div>
                             <Label htmlFor="setting-value">Valor</Label>
                             <Input
                               id="setting-value"
                               placeholder="Valor da configuração"
                               value={newSettingValue}
                               onChange={(e) => setNewSettingValue(e.target.value)}
                             />
                           </div>
                           <div className="flex items-end">
                             <Button 
                               onClick={createSetting}
                               disabled={loading}
                               className="w-full"
                             >
                               {loading ? "Salvando..." : "Adicionar"}
                             </Button>
                           </div>
                         </div>
                       </div>
                     </div>
                     
                     {settings.length === 0 ? (
                       <div className="text-center py-8 text-muted-foreground">
                         Nenhuma configuração encontrada
                       </div>
                     ) : (
                        settings.map((setting) => (
                          <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                            <div>
                              <p className="font-medium">{setting.setting_key}</p>
                              <p className="text-sm text-muted-foreground">
                                Valor: {setting.setting_value ? '***' : 'Não configurado'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Atualizado em: {new Date(setting.updated_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {setting.setting_value ? 'Configurado' : 'Não configurado'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteSetting(setting.id, 'admin_settings')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                     )}
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
                           <p className="text-sm text-muted-foreground">
                             Valor: {setting.setting_value || 'Não configurado'}
                           </p>
                           <p className="text-xs text-muted-foreground">
                             Atualizado em: {new Date(setting.updated_at).toLocaleDateString('pt-BR')}
                           </p>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge variant="outline">
                             Configuração do Sistema
                           </Badge>
                           <Button
                             size="sm"
                             variant="destructive"
                             onClick={() => deleteSetting(setting.id, 'system_settings')}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
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