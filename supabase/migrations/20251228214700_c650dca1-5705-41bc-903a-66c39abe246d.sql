-- Create OTP sessions table to store verification and location data
CREATE TABLE public.otp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_address TEXT,
  location_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for phone lookup
CREATE INDEX idx_otp_sessions_phone ON public.otp_sessions(phone);

-- Enable RLS
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public insert for OTP creation
CREATE POLICY "Allow public OTP creation"
ON public.otp_sessions
FOR INSERT
WITH CHECK (true);

-- Allow public select for OTP verification
CREATE POLICY "Allow public OTP lookup"
ON public.otp_sessions
FOR SELECT
USING (true);

-- Allow public update for location and verification
CREATE POLICY "Allow public OTP update"
ON public.otp_sessions
FOR UPDATE
USING (true);

-- Auto-delete expired sessions (cleanup trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_sessions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.otp_sessions WHERE expires_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_cleanup_otp_sessions
AFTER INSERT ON public.otp_sessions
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otp_sessions();