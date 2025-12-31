-- جدول سجلات الدفع
CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  special_order_id UUID REFERENCES public.special_orders(id) ON DELETE CASCADE,
  courier_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'card')),
  amount_received NUMERIC NOT NULL,
  transaction_number TEXT,
  receipt_kept BOOLEAN DEFAULT false,
  customer_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT order_check CHECK (order_id IS NOT NULL OR special_order_id IS NOT NULL)
);

-- جدول إعدادات العمولات والنسب
CREATE TABLE public.commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  fixed_amount NUMERIC DEFAULT 0,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('platform', 'merchant', 'courier', 'payment_gateway', 'tax')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول التسويات المالية
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number TEXT NOT NULL UNIQUE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('merchant', 'courier')),
  recipient_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'wallet')),
  payment_reference TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  settled_by UUID,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول تفاصيل التسوية
CREATE TABLE public.settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES public.settlements(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  special_order_id UUID REFERENCES public.special_orders(id),
  order_total NUMERIC NOT NULL,
  platform_commission NUMERIC DEFAULT 0,
  payment_gateway_fee NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول تقييمات المندوب
CREATE TABLE public.courier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  special_order_id UUID REFERENCES public.special_orders(id),
  courier_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT order_review_check CHECK (order_id IS NOT NULL OR special_order_id IS NOT NULL)
);

-- جدول إعدادات الضريبة
CREATE TABLE public.tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  applies_to_delivery BOOLEAN DEFAULT true,
  applies_to_products BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول التقارير الضريبية
CREATE TABLE public.tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sales NUMERIC DEFAULT 0,
  total_tax_collected NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- تفعيل RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- سياسات payment_records
CREATE POLICY "Admins can manage payment records" ON public.payment_records
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Couriers can create payment records" ON public.payment_records
  FOR INSERT WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "Couriers can view their payment records" ON public.payment_records
  FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "Merchants can view their store payment records" ON public.payment_records
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = payment_records.store_id AND stores.merchant_id = auth.uid()
  ));

-- سياسات commission_settings
CREATE POLICY "Admins can manage commission settings" ON public.commission_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active commission settings" ON public.commission_settings
  FOR SELECT USING (is_active = true);

-- سياسات settlements
CREATE POLICY "Admins can manage settlements" ON public.settlements
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Recipients can view their settlements" ON public.settlements
  FOR SELECT USING (auth.uid() = recipient_id);

-- سياسات settlement_items
CREATE POLICY "Admins can manage settlement items" ON public.settlement_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their settlement items" ON public.settlement_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM settlements WHERE settlements.id = settlement_items.settlement_id AND settlements.recipient_id = auth.uid()
  ));

-- سياسات courier_reviews
CREATE POLICY "Anyone can view courier reviews" ON public.courier_reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create courier reviews" ON public.courier_reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- سياسات tax_settings
CREATE POLICY "Admins can manage tax settings" ON public.tax_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active tax settings" ON public.tax_settings
  FOR SELECT USING (is_active = true);

-- سياسات tax_reports
CREATE POLICY "Admins can manage tax reports" ON public.tax_reports
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- إضافة حقول للطلبات
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_received NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS card_transaction_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

-- إضافة حقول للطلبات الخاصة
ALTER TABLE public.special_orders ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.special_orders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.special_orders ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID;
ALTER TABLE public.special_orders ADD COLUMN IF NOT EXISTS amount_received NUMERIC;
ALTER TABLE public.special_orders ADD COLUMN IF NOT EXISTS card_transaction_number TEXT;
ALTER TABLE public.special_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

-- إدراج إعدادات العمولات الافتراضية
INSERT INTO public.commission_settings (name, name_ar, percentage, applies_to) VALUES
('Platform Commission', 'عمولة المنصة', 10, 'platform'),
('Card Payment Fee', 'رسوم الدفع بالبطاقة', 2.5, 'payment_gateway'),
('VAT', 'ضريبة القيمة المضافة', 15, 'tax');

-- إدراج إعدادات الضريبة الافتراضية
INSERT INTO public.tax_settings (name, name_ar, percentage) VALUES
('VAT', 'ضريبة القيمة المضافة', 15);

-- دالة لتوليد رقم التسوية
CREATE OR REPLACE FUNCTION public.generate_settlement_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.settlement_number := 'STL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_settlement_number_trigger
  BEFORE INSERT ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_settlement_number();

-- دالة لتوليد رقم التقرير الضريبي
CREATE OR REPLACE FUNCTION public.generate_tax_report_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.report_number := 'TAX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_tax_report_number_trigger
  BEFORE INSERT ON public.tax_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tax_report_number();