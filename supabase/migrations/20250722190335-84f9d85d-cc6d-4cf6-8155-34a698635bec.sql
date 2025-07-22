-- Make silmarlon797@gmail.com an admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'silmarlon797@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add payment method options to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '["pix", "credit_card", "boleto"]'::jsonb;

-- Add real-time notifications table for payment status updates
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  payment_id text,
  event_type text NOT NULL,
  status text NOT NULL,
  data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage notifications
CREATE POLICY "Service role can manage payment notifications" 
ON public.payment_notifications 
FOR ALL 
USING (true);

-- Add real-time support
ALTER TABLE public.payment_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_notifications;

-- Add real-time support for orders table to track status changes
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;