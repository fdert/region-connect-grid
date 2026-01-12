-- Create payment_settings table for storing payment gateway configurations
CREATE TABLE public.payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_name VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  mode VARCHAR(10) DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  test_public_key TEXT,
  test_secret_key TEXT,
  live_public_key TEXT,
  live_secret_key TEXT,
  webhook_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage payment settings
CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default Tap payment gateway record
INSERT INTO public.payment_settings (gateway_name, is_active, mode, settings)
VALUES ('tap', false, 'test', '{"currency": "SAR", "language": "ar"}');