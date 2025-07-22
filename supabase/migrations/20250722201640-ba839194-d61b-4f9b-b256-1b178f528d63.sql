-- Criar tabela para configurações do sistema (nome do sistema, etc)
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Inserir configuração padrão do nome do sistema
INSERT INTO public.system_settings (setting_key, setting_value, setting_description) 
VALUES ('SYSTEM_NAME', 'Sistema de Checkout', 'Nome do sistema exibido na interface');

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_settings
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Criar tabela para order bumps com links entregáveis
CREATE TABLE public.order_bump_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  bump_product_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage NUMERIC DEFAULT 0,
  delivery_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Habilitar RLS
ALTER TABLE public.order_bump_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para order_bump_settings
CREATE POLICY "Admins can manage order bump settings" 
ON public.order_bump_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Order bump settings are viewable by everyone" 
ON public.order_bump_settings 
FOR SELECT 
USING (is_active = true);

-- Adicionar triggers para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_bump_settings_updated_at
BEFORE UPDATE ON public.order_bump_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar tabelas ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_bump_settings;