-- Create store_categories junction table for many-to-many relationship
CREATE TABLE public.store_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view store categories" 
ON public.store_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage store categories" 
ON public.store_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can manage their store categories" 
ON public.store_categories 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM stores 
  WHERE stores.id = store_categories.store_id 
  AND stores.merchant_id = auth.uid()
));

-- Add index for better performance
CREATE INDEX idx_store_categories_store_id ON public.store_categories(store_id);
CREATE INDEX idx_store_categories_category_id ON public.store_categories(category_id);