-- Create special_services table for configuring special delivery services
CREATE TABLE public.special_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  icon TEXT DEFAULT 'Package',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  base_price NUMERIC DEFAULT 0,
  price_per_km NUMERIC DEFAULT 2,
  price_per_100m NUMERIC DEFAULT 0.2,
  min_price NUMERIC DEFAULT 10,
  max_distance_km NUMERIC DEFAULT 50,
  requires_verification BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create special_orders table for tracking special delivery orders
CREATE TABLE public.special_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES public.special_services(id),
  courier_id UUID,
  
  -- Sender information
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_location_lat NUMERIC,
  sender_location_lng NUMERIC,
  sender_location_url TEXT,
  sender_address TEXT,
  
  -- Recipient information
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_location_lat NUMERIC,
  recipient_location_lng NUMERIC,
  recipient_location_url TEXT,
  recipient_address TEXT,
  
  -- Package details
  package_type TEXT NOT NULL,
  package_size TEXT NOT NULL,
  package_description TEXT,
  package_weight NUMERIC,
  
  -- Distance and pricing
  distance_km NUMERIC,
  delivery_fee NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  
  -- Verification
  verification_code TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled')),
  paid BOOLEAN DEFAULT false,
  payment_method TEXT DEFAULT 'cash',
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for special_services
CREATE POLICY "Anyone can view active special services" 
ON public.special_services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage special services" 
ON public.special_services 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for special_orders
CREATE POLICY "Customers can create special orders" 
ON public.special_orders 
FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their special orders" 
ON public.special_orders 
FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update their pending orders" 
ON public.special_orders 
FOR UPDATE 
USING (auth.uid() = customer_id AND status IN ('pending', 'verified'));

CREATE POLICY "Couriers can view available special orders" 
ON public.special_orders 
FOR SELECT 
USING (
  (courier_id IS NULL AND status = 'verified' AND has_role(auth.uid(), 'courier'))
  OR courier_id = auth.uid()
);

CREATE POLICY "Couriers can accept and update special orders" 
ON public.special_orders 
FOR UPDATE 
USING (
  (courier_id IS NULL AND status = 'verified' AND has_role(auth.uid(), 'courier'))
  OR courier_id = auth.uid()
);

CREATE POLICY "Admins can manage all special orders" 
ON public.special_orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for order number generation
CREATE OR REPLACE FUNCTION public.generate_special_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.order_number := 'SPO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_special_order_number_trigger
  BEFORE INSERT ON public.special_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_special_order_number();

-- Create trigger for updated_at
CREATE TRIGGER update_special_services_updated_at
  BEFORE UPDATE ON public.special_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_special_orders_updated_at
  BEFORE UPDATE ON public.special_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default special delivery service
INSERT INTO public.special_services (name, name_ar, description, description_ar, icon, price_per_km, min_price) 
VALUES (
  'Special Delivery',
  'توصيل طلب خاص',
  'Send your packages anywhere with our special delivery service',
  'أرسل طرودك إلى أي مكان مع خدمة التوصيل الخاصة',
  'Package',
  2.5,
  15
);

-- Enable realtime for special_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_orders;