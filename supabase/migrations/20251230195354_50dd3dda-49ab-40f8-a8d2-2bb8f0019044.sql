-- Add courier location tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS courier_location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS courier_location_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS courier_location_updated_at TIMESTAMP WITH TIME ZONE;