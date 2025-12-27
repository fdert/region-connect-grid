-- Insert footer settings if not exists
INSERT INTO public.site_settings (key, value)
VALUES 
  ('footer_quick_links', '{"links": [{"label": "الرئيسية", "href": "/"}, {"label": "المتاجر", "href": "/stores"}, {"label": "التصنيفات", "href": "/categories"}, {"label": "العروض", "href": "/offers"}, {"label": "عن المنصة", "href": "/about"}]}'::jsonb),
  ('footer_merchant_links', '{"links": [{"label": "انضم كتاجر", "href": "/auth/register?role=merchant"}, {"label": "لوحة التحكم", "href": "/merchant/dashboard"}, {"label": "الأسعار والباقات", "href": "/pricing"}, {"label": "الشروط والأحكام", "href": "/terms"}]}'::jsonb),
  ('footer_contact', '{"phone": "+966 50 123 4567", "email": "support@souqna.com", "address": "المملكة العربية السعودية، الرياض"}'::jsonb),
  ('footer_social', '{"facebook": "#", "twitter": "#", "instagram": "#", "whatsapp": "", "youtube": "", "tiktok": ""}'::jsonb),
  ('footer_brand', '{"name": "سوقنا", "description": "منصة سوقنا هي الوجهة الأولى للتسوق الإلكتروني في المنطقة، نجمع لك أفضل المتاجر والمنتجات في مكان واحد.", "copyright": "© 2024 سوقنا. جميع الحقوق محفوظة."}'::jsonb),
  ('footer_legal_links', '{"privacy_policy": "/privacy", "terms": "/terms"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add more home sections for features editing
INSERT INTO public.home_sections (section_key, title_ar, title_en, is_visible, sort_order, settings)
VALUES
  ('features', 'مميزاتنا', 'Our Features', true, 11, '{"items": [{"icon": "Truck", "title": "توصيل سريع", "description": "توصيل لباب منزلك في أسرع وقت ممكن", "color": "blue"}, {"icon": "Shield", "title": "دفع آمن", "description": "جميع معاملاتك محمية بأحدث تقنيات التشفير", "color": "green"}, {"icon": "Headphones", "title": "دعم متواصل", "description": "فريق دعم متاح على مدار الساعة", "color": "purple"}]}'::jsonb)
ON CONFLICT DO NOTHING;