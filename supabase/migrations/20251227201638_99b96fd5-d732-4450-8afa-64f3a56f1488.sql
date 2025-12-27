-- Create store_templates table for ready-made templates
CREATE TABLE public.store_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  preview_image TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage templates" ON public.store_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active templates" ON public.store_templates
  FOR SELECT USING (is_active = true);

-- Add more fields to home_sections for content management
ALTER TABLE public.home_sections 
  ADD COLUMN IF NOT EXISTS subtitle_ar TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_en TEXT,
  ADD COLUMN IF NOT EXISTS background_image TEXT,
  ADD COLUMN IF NOT EXISTS background_color TEXT,
  ADD COLUMN IF NOT EXISTS content_items JSONB DEFAULT '[]'::jsonb;

-- Insert some default templates
INSERT INTO public.store_templates (name, name_ar, description, description_ar, category, template_data) VALUES
('Modern Minimal', 'حديث بسيط', 'Clean and minimal design for modern stores', 'تصميم نظيف وبسيط للمتاجر الحديثة', 'modern', '{"hero": {"style": "minimal", "color": "#3b82f6"}, "sections": ["hero", "categories", "featured_stores", "special_offers"]}'),
('Luxury Gold', 'ذهبي فاخر', 'Elegant gold theme for luxury stores', 'ثيم ذهبي أنيق للمتاجر الفاخرة', 'luxury', '{"hero": {"style": "luxury", "color": "#d4af37"}, "sections": ["hero", "banner_top", "categories", "featured_stores"]}'),
('Fresh Green', 'أخضر منعش', 'Natural green theme for organic stores', 'ثيم أخضر طبيعي للمتاجر العضوية', 'nature', '{"hero": {"style": "nature", "color": "#22c55e"}, "sections": ["hero", "features", "categories", "new_arrivals"]}'),
('Bold Red', 'أحمر جريء', 'Vibrant red theme for dynamic stores', 'ثيم أحمر نابض للمتاجر الديناميكية', 'bold', '{"hero": {"style": "bold", "color": "#ef4444"}, "sections": ["hero", "special_offers", "most_ordered", "cta"]}')
ON CONFLICT DO NOTHING;