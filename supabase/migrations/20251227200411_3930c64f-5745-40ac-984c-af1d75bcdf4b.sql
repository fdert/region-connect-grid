-- Create home sections settings table
CREATE TABLE public.home_sections (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    section_key text NOT NULL UNIQUE,
    title_ar text NOT NULL,
    title_en text,
    is_visible boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    settings jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage home sections"
ON public.home_sections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view
CREATE POLICY "Anyone can view home sections"
ON public.home_sections FOR SELECT
USING (true);

-- Insert default sections
INSERT INTO public.home_sections (section_key, title_ar, title_en, is_visible, sort_order) VALUES
('hero', 'القسم الرئيسي', 'Hero Section', true, 1),
('banner_top', 'بنر علوي', 'Top Banner', true, 2),
('categories', 'التصنيفات', 'Categories', true, 3),
('featured_stores', 'المتاجر المميزة', 'Featured Stores', true, 4),
('special_services', 'الخدمات الخاصة', 'Special Services', true, 5),
('special_offers', 'العروض الخاصة', 'Special Offers', true, 6),
('banner_middle', 'بنر وسطي', 'Middle Banner', true, 7),
('most_ordered', 'الأكثر طلباً', 'Most Ordered', true, 8),
('new_arrivals', 'وصل حديثاً', 'New Arrivals', true, 9),
('banner_bottom', 'بنر سفلي', 'Bottom Banner', true, 10),
('features', 'المميزات', 'Features', true, 11),
('cta', 'دعوة للعمل', 'Call to Action', true, 12);

-- Add updated_at trigger
CREATE TRIGGER update_home_sections_updated_at
    BEFORE UPDATE ON public.home_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();