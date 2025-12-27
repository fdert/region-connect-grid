-- Add category_id column to stores table
ALTER TABLE public.stores 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_stores_category_id ON public.stores(category_id);