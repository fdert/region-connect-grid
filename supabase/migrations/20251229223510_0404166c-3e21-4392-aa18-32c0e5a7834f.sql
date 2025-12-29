-- Add location columns to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS location_lat numeric,
ADD COLUMN IF NOT EXISTS location_lng numeric,
ADD COLUMN IF NOT EXISTS location_url text,
ADD COLUMN IF NOT EXISTS price_per_km numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS base_delivery_fee numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS free_delivery_radius_km numeric DEFAULT 0;