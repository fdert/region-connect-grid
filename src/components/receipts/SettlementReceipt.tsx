import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SettlementReceiptProps {
  settlement: {
    settlement_number: string;
    recipient_type: string;
    recipient_id: string;
    recipient_name?: string;
    store_name?: string;
    total_amount: number;
    payment_method: string;
    payment_reference?: string;
    notes?: string;
    created_at: string;
    settled_at?: string;
  };
  orders?: Array<{
    order_number: string;
    total: number;
    created_at: string;
  }>;
  onClose: () => void;
}

const SettlementReceipt = ({ settlement, orders, onClose }: SettlementReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch platform info
  const { data: platformBrand } = useQuery({
    queryKey: ['platform-brand'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'footer_brand')
        .single();
      if (error) return null;
      return data?.value as { name: string; description?: string } | null;
    }
  });

  const { data: platformTheme } = useQuery({
    queryKey: ['platform-theme'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'theme')
        .single();
      if (error) return null;
      return data?.value as { logoUrl?: string } | null;
    }
  });

  const { data: platformContact } = useQuery({
    queryKey: ['platform-contact'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'footer_contact')
        .single();
      if (error) return null;
      return data?.value as { address?: string; phone?: string; email?: string } | null;
    }
  });

  // Fetch recipient details
  const { data: recipientDetails } = useQuery({
    queryKey: ['recipient-details', settlement.recipient_id, settlement.recipient_type],
    queryFn: async () => {
      if (settlement.recipient_type === 'merchant') {
        // Get store name for merchant
        const { data: store } = await supabase
          .from('stores')
          .select('name')
          .eq('merchant_id', settlement.recipient_id)
          .single();
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', settlement.recipient_id)
          .single();
        
        return {
          name: profile?.full_name || 'تاجر',
          storeName: store?.name
        };
      } else {
        // Get courier name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', settlement.recipient_id)
          .single();
        
        return {
          name: profile?.full_name || 'مندوب',
          storeName: null
        };
      }
    }
  });

  const platformName = platformBrand?.name || 'سوقنا';
  const logoUrl = platformTheme?.logoUrl;

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>سند قبض - ${settlement.settlement_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, sans-serif; 
            padding: 20px; 
            direction: rtl;
            font-size: 12px;
          }
          .receipt {
            max-width: 300px;
            margin: 0 auto;
            border: 2px solid #063c2a;
            padding: 15px;
          }
          .platform-header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #063c2a;
          }
          .platform-logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
            margin-bottom: 5px;
          }
          .platform-name {
            font-size: 18px;
            font-weight: bold;
            color: #063c2a;
          }
          .platform-contact {
            font-size: 9px;
            color: #666;
            margin-top: 5px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 18px;
            margin-bottom: 5px;
          }
          .header h2 {
            font-size: 14px;
            color: #666;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
          }
          .info-row.bordered {
            border-bottom: 1px dashed #ccc;
          }
          .label { color: #666; }
          .value { font-weight: bold; }
          .section-title {
            font-weight: bold;
            margin: 15px 0 10px;
            padding: 5px;
            background: #f0f0f0;
          }
          .orders-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          .orders-table th, .orders-table td {
            border: 1px solid #ddd;
            padding: 5px;
            text-align: right;
          }
          .orders-table th {
            background: #063c2a;
            color: white;
          }
          .total-row {
            font-size: 16px;
            font-weight: bold;
            background: #f8f8f8;
            padding: 10px;
            margin: 15px 0;
            text-align: center;
            border: 2px solid #063c2a;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px dashed #000;
            color: #666;
            font-size: 10px;
          }
          .signature {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 20px;
          }
          .signature-box {
            text-align: center;
            width: 45%;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });

  const paymentMethodLabel = settlement.payment_method === 'cash' ? 'نقدي' : 
    settlement.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة';

  const recipientTypeLabel = settlement.recipient_type === 'merchant' 
    ? `تاجر${recipientDetails?.storeName ? ` (${recipientDetails.storeName})` : ''}`
    : 'مندوب توصيل';

  const recipientName = settlement.recipient_name || recipientDetails?.name || '-';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">سند قبض</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm">
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div ref={receiptRef} className="p-6 receipt">
          {/* Platform Header */}
          <div className="platform-header">
            {logoUrl && <img src={logoUrl} alt={platformName} className="platform-logo" />}
            <div className="platform-name">{platformName}</div>
            {platformContact && (
              <div className="platform-contact">
                {platformContact.address && <span>{platformContact.address}</span>}
                {platformContact.phone && <span> | هاتف: {platformContact.phone}</span>}
              </div>
            )}
          </div>

          {/* Header */}
          <div className="header">
            <h1>سند قبض</h1>
            <h2>RECEIPT VOUCHER</h2>
          </div>

          {/* Receipt Info */}
          <div className="info-row bordered">
            <span className="label">رقم السند:</span>
            <span className="value">{settlement.settlement_number}</span>
          </div>

          <div className="info-row bordered">
            <span className="label">التاريخ:</span>
            <span className="value">{formatDate(settlement.settled_at || settlement.created_at)}</span>
          </div>

          <div className="info-row bordered">
            <span className="label">نوع المستفيد:</span>
            <span className="value">{recipientTypeLabel}</span>
          </div>

          <div className="info-row bordered">
            <span className="label">اسم المستفيد:</span>
            <span className="value">{recipientName}</span>
          </div>

          <div className="info-row bordered">
            <span className="label">طريقة الدفع:</span>
            <span className="value">{paymentMethodLabel}</span>
          </div>

          {settlement.payment_reference && (
            <div className="info-row bordered">
              <span className="label">رقم المرجع:</span>
              <span className="value">{settlement.payment_reference}</span>
            </div>
          )}

          {/* Orders List */}
          {orders && orders.length > 0 && (
            <>
              <div className="section-title">تفاصيل الطلبات</div>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={index}>
                      <td>{order.order_number}</td>
                      <td>{format(new Date(order.created_at), 'dd/MM')}</td>
                      <td>{Number(order.total).toFixed(2)} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Total */}
          <div className="total-row">
            إجمالي المبلغ: {Number(settlement.total_amount).toFixed(2)} ر.س
          </div>

          {settlement.notes && (
            <div className="info-row">
              <span className="label">ملاحظات:</span>
              <span className="value">{settlement.notes}</span>
            </div>
          )}

          {/* Signatures */}
          <div className="signature">
            <div className="signature-box">
              <div className="signature-line">المستلم</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">المسلّم</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>هذا السند صالح كإثبات للتسوية المالية</p>
            <p>تمت الطباعة: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
            <p style={{ marginTop: '5px' }}>{platformName} - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementReceipt;
