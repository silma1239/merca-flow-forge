-- Corrigir função com search_path mutável
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
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