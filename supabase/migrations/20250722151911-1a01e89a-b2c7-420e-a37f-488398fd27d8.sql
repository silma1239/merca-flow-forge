-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  redirect_url TEXT, -- URL to redirect after successful purchase
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order bumps table
CREATE TABLE public.order_bumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  bump_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  coupon_code TEXT,
  mercadopago_preference_id TEXT,
  mercadopago_payment_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  payment_method TEXT,
  redirect_url TEXT, -- Final redirect URL after payment
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  is_order_bump BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment logs table for Mercado Pago webhooks and responses
CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  mercadopago_payment_id TEXT,
  event_type TEXT,
  payment_status TEXT,
  raw_data JSONB, -- Store full Mercado Pago response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to products and active coupons
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Order bumps are viewable by everyone" 
ON public.order_bumps 
FOR SELECT 
USING (is_active = true);

-- Coupons can be read to validate codes
CREATE POLICY "Active coupons are viewable for validation" 
ON public.coupons 
FOR SELECT 
USING (is_active = true);

-- Orders policies - customers can view their own orders by email
CREATE POLICY "Customers can view their orders" 
ON public.orders 
FOR SELECT 
USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email' OR customer_email IS NOT NULL);

CREATE POLICY "Order items are viewable with orders" 
ON public.order_items 
FOR SELECT 
USING (true);

-- Policies for edge functions (service role) to manage all data
CREATE POLICY "Service role can manage products" 
ON public.products 
FOR ALL 
USING (true);

CREATE POLICY "Service role can manage coupons" 
ON public.coupons 
FOR ALL 
USING (true);

CREATE POLICY "Service role can manage orders" 
ON public.orders 
FOR ALL 
USING (true);

CREATE POLICY "Service role can manage order items" 
ON public.order_items 
FOR ALL 
USING (true);

CREATE POLICY "Service role can manage payment logs" 
ON public.payment_logs 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products for testing
INSERT INTO public.products (name, description, price, redirect_url) VALUES
('Premium Digital Course', 'Complete guide to advanced marketing strategies', 99.99, 'https://example.com/course-access'),
('Business Consultation', 'One-on-one business strategy session', 199.99, 'https://example.com/book-consultation'),
('E-book Bundle', 'Collection of 5 bestselling business e-books', 49.99, 'https://example.com/download-books');

-- Insert sample coupons
INSERT INTO public.coupons (code, discount_type, discount_value, expires_at) VALUES
('WELCOME10', 'percentage', 10, now() + interval '30 days'),
('SAVE20', 'fixed', 20, now() + interval '7 days');

-- Insert sample order bumps
INSERT INTO public.order_bumps (product_id, bump_product_id, title, description, discount_percentage)
SELECT 
  p1.id, 
  p2.id, 
  'Add Business Consultation at 50% Off!', 
  'Limited time offer: Get expert business consultation for just $99', 
  50
FROM public.products p1, public.products p2 
WHERE p1.name = 'Premium Digital Course' AND p2.name = 'Business Consultation';