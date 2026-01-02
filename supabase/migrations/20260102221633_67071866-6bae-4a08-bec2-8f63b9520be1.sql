
-- إنشاء جدول دليل الحسابات
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  account_type TEXT NOT NULL, -- asset, liability, equity, revenue, expense
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إدراج الحسابات الأساسية
INSERT INTO public.chart_of_accounts (code, name, name_ar, account_type) VALUES
('1000', 'Cash', 'النقدية', 'asset'),
('2000', 'Merchant Payable', 'مستحقات التجار', 'liability'),
('2100', 'VAT Payable', 'ضريبة القيمة المضافة المستحقة', 'liability'),
('4000', 'Commission Revenue', 'إيرادات العمولات', 'revenue'),
('4100', 'Delivery Revenue', 'إيرادات التوصيل', 'revenue');

-- إنشاء جدول القيود المحاسبية
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  reference_type TEXT, -- order, settlement, refund
  reference_id UUID,
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول بنود القيود
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول تفاصيل بنود الطلبات مع snapshot الضريبي
CREATE TABLE public.order_item_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_ex_vat NUMERIC NOT NULL, -- السعر قبل الضريبة
  vat_rate NUMERIC NOT NULL DEFAULT 15, -- نسبة الضريبة
  line_subtotal_ex_vat NUMERIC NOT NULL, -- إجمالي البند قبل الضريبة
  line_vat_amount NUMERIC NOT NULL, -- مبلغ الضريبة للبند
  line_total NUMERIC NOT NULL, -- إجمالي البند شامل الضريبة
  commission_rate NUMERIC NOT NULL DEFAULT 10, -- نسبة عمولة المنصة
  commission_ex_vat NUMERIC NOT NULL, -- العمولة قبل الضريبة
  commission_vat NUMERIC NOT NULL, -- ضريبة العمولة
  commission_total NUMERIC NOT NULL, -- إجمالي العمولة شامل الضريبة
  merchant_payout NUMERIC NOT NULL, -- صافي مستحقات التاجر
  is_refunded BOOLEAN DEFAULT false,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول المرتجعات
CREATE TABLE public.order_refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refund_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL,
  order_item_detail_id UUID REFERENCES public.order_item_details(id),
  refund_type TEXT NOT NULL, -- full, partial
  reason TEXT,
  -- Snapshot من القيم الأصلية للعكس
  original_line_subtotal_ex_vat NUMERIC NOT NULL,
  original_line_vat_amount NUMERIC NOT NULL,
  original_line_total NUMERIC NOT NULL,
  original_commission_ex_vat NUMERIC NOT NULL,
  original_commission_vat NUMERIC NOT NULL,
  original_commission_total NUMERIC NOT NULL,
  original_merchant_payout NUMERIC NOT NULL,
  -- حالة المرتجع
  status TEXT DEFAULT 'pending', -- pending, approved, processed
  settlement_adjustment_id UUID, -- إذا كان بعد التسوية
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إضافة أعمدة إضافية لجدول الطلبات
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal_ex_vat NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_on_products NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_ex_vat NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_on_delivery NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commission_ex_vat NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commission_vat NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_merchant_payout NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id);

-- إضافة أعمدة للتسويات
ALTER TABLE public.settlements
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS total_commission_collected NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_vat_on_commission NUMERIC DEFAULT 0;

-- إضافة علاقة بين settlement_items و order_item_details
ALTER TABLE public.settlement_items
ADD COLUMN IF NOT EXISTS order_item_detail_id UUID REFERENCES public.order_item_details(id);

-- دالة توليد رقم القيد المحاسبي
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_journal_entry_number_trigger
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_journal_entry_number();

-- دالة توليد رقم المرتجع
CREATE OR REPLACE FUNCTION public.generate_refund_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.refund_number := 'REF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_refund_number_trigger
  BEFORE INSERT ON public.order_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_refund_number();

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

-- سياسات chart_of_accounts
CREATE POLICY "Admins can manage chart of accounts" ON public.chart_of_accounts
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view chart of accounts" ON public.chart_of_accounts
FOR SELECT USING (true);

-- سياسات journal_entries
CREATE POLICY "Admins can manage journal entries" ON public.journal_entries
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their order entries" ON public.journal_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.journal_entry_id = journal_entries.id
    AND s.merchant_id = auth.uid()
  )
);

-- سياسات journal_entry_lines
CREATE POLICY "Admins can manage entry lines" ON public.journal_entry_lines
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their entry lines" ON public.journal_entry_lines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON o.store_id = s.id
        WHERE o.journal_entry_id = je.id
        AND s.merchant_id = auth.uid()
      )
    )
  )
);

-- سياسات order_item_details
CREATE POLICY "Admins can manage order item details" ON public.order_item_details
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their order item details" ON public.order_item_details
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.id = order_item_details.order_id
    AND s.merchant_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their order item details" ON public.order_item_details
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_item_details.order_id
    AND o.customer_id = auth.uid()
  )
);

-- سياسات order_refunds
CREATE POLICY "Admins can manage refunds" ON public.order_refunds
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their refunds" ON public.order_refunds
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.id = order_refunds.order_id
    AND s.merchant_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their refunds" ON public.order_refunds
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_refunds.order_id
    AND o.customer_id = auth.uid()
  )
);

-- سياسة للنظام لإضافة تفاصيل البنود
CREATE POLICY "System can insert order item details" ON public.order_item_details
FOR INSERT WITH CHECK (true);

-- سياسة للنظام لإضافة قيود محاسبية
CREATE POLICY "System can insert journal entries" ON public.journal_entries
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert entry lines" ON public.journal_entry_lines
FOR INSERT WITH CHECK (true);
