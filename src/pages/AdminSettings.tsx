import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Settings, CreditCard, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [mercadoPagoToken, setMercadoPagoToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadSettings();
    loadUsers();
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configurações Administrativas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie configurações do sistema, usuários e APIs
          </p>
        </div>

        <Tabs defaultValue="mercadopago" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mercadopago" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Mercado Pago
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
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Visualize todas as configurações armazenadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}