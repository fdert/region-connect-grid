-- Create table for managing static pages content (About, Privacy Policy, Terms)
CREATE TABLE public.static_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  content_ar TEXT NOT NULL,
  content_en TEXT,
  meta_description_ar TEXT,
  meta_description_en TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active pages
CREATE POLICY "Anyone can view active static pages"
  ON public.static_pages
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all pages
CREATE POLICY "Admins can manage static pages"
  ON public.static_pages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_static_pages_updated_at
  BEFORE UPDATE ON public.static_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default pages
INSERT INTO public.static_pages (page_key, title_ar, title_en, content_ar, content_en) VALUES
('about', 'من نحن', 'About Us', 
'<h2>مرحباً بك في سوقنا</h2>
<p>سوقنا هي منصة تسوق إلكتروني متكاملة تهدف إلى ربط العملاء بأفضل المتاجر المحلية. نؤمن بأن التسوق يجب أن يكون تجربة ممتعة وسهلة، ولذلك نعمل على توفير منصة تجمع بين سهولة الاستخدام وتنوع الخيارات وضمان جودة الخدمة.</p>
<h3>رؤيتنا</h3>
<p>أن نكون المنصة الرائدة في التسوق الإلكتروني المحلي، ونساهم في دعم التجار وتطوير تجربة التسوق للعملاء.</p>
<h3>مهمتنا</h3>
<p>توفير منصة سهلة وآمنة تربط بين المتاجر والعملاء مع ضمان أفضل تجربة تسوق.</p>',
'<h2>Welcome to Our Marketplace</h2>
<p>We are a comprehensive e-commerce platform that aims to connect customers with the best local stores.</p>'),

('privacy', 'سياسة الخصوصية', 'Privacy Policy',
'<h2>سياسة الخصوصية</h2>
<p>نحن في سوقنا نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.</p>
<h3>جمع المعلومات</h3>
<p>نجمع المعلومات التي تقدمها لنا طوعاً عند التسجيل أو إجراء عملية شراء.</p>
<h3>استخدام المعلومات</h3>
<p>نستخدم معلوماتك لتحسين خدماتنا وتوفير تجربة تسوق أفضل.</p>
<h3>حماية المعلومات</h3>
<p>نتخذ إجراءات أمنية مناسبة لحماية معلوماتك من الوصول غير المصرح به.</p>',
'<h2>Privacy Policy</h2>
<p>We respect your privacy and are committed to protecting your personal data.</p>'),

('terms', 'الشروط والأحكام', 'Terms & Conditions',
'<h2>الشروط والأحكام</h2>
<p>باستخدامك لمنصة سوقنا، فإنك توافق على الشروط والأحكام التالية:</p>
<h3>الاستخدام</h3>
<p>يجب استخدام المنصة لأغراض مشروعة فقط.</p>
<h3>الحسابات</h3>
<p>أنت مسؤول عن الحفاظ على سرية معلومات حسابك.</p>
<h3>المشتريات</h3>
<p>جميع المشتريات خاضعة لشروط البائع والمنصة.</p>',
'<h2>Terms & Conditions</h2>
<p>By using our platform, you agree to the following terms and conditions.</p>');