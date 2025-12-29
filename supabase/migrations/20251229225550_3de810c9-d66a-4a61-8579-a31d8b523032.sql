-- Add force_password_change column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false;

-- Add email column to profiles table for admin reference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;