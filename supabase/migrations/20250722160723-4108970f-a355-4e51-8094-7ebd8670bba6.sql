-- Criar buckets de storage para imagens
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('product-images', 'product-images', true),
  ('banner-images', 'banner-images', true);

-- Políticas para product-images
CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- Políticas para banner-images
CREATE POLICY "Anyone can view banner images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'banner-images');

CREATE POLICY "Authenticated users can upload banner images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'banner-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their banner images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'banner-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their banner images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'banner-images' AND auth.uid() IS NOT NULL);

-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para criar primeiro usuário como admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Verificar se é o primeiro usuário
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count = 1 THEN
    -- Primeiro usuário é admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Outros usuários são users normais
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após criação de usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Adicionar campos de imagem aos produtos
ALTER TABLE public.products 
ADD COLUMN banner_image_url TEXT,
ADD COLUMN uploaded_image_url TEXT;

-- Atualizar políticas de produtos para permitir apenas admins fazerem mudanças
DROP POLICY IF EXISTS "Service role can manage products" ON public.products;

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas de coupons para permitir apenas admins
DROP POLICY IF EXISTS "Service role can manage coupons" ON public.coupons;

CREATE POLICY "Admins can manage coupons" 
ON public.coupons 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas de orders para permitir apenas admins verem todas
DROP POLICY IF EXISTS "Service role can manage orders" ON public.orders;

CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas de order_items
DROP POLICY IF EXISTS "Service role can manage order items" ON public.order_items;

CREATE POLICY "Admins can manage all order items" 
ON public.order_items 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));