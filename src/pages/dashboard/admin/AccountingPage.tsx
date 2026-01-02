import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Store, 
  Truck, 
  FileText,
  Download,
  Printer,
  Search,
  Plus,
  Edit,
  Receipt,
  Loader2,
  CheckCircle,
  CreditCard,
  Banknote,
  Calculator,
  Settings,
  Trash2
} from "lucide-react";
import SettlementReceipt from "@/components/receipts/SettlementReceipt";
import { exportReportToPDF, exportTaxReportToPDF, PlatformInfo } from "@/lib/exportPDF";

const AccountingPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [showAddCommissionDialog, setShowAddCommissionDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [taxDateRange, setTaxDateRange] = useState({ start: "", end: "" });
  const queryClient = useQueryClient();

  // Fetch payment records
  const { data: paymentRecords, isLoading: loadingPayments } = useQuery({
    queryKey: ['admin-payment-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_records')
        .select(`
          *,
          order:orders(order_number, total, store:stores(name)),
          special_order:special_orders(order_number, total)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  // Fetch orders with payment info
  const { data: orders } = useQuery({
    queryKey: ['admin-orders-accounting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(id, name, merchant_id)
        `)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch order item details for detailed VAT breakdown
  const { data: orderItemDetails } = useQuery({
    queryKey: ['admin-order-item-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_item_details')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch journal entries
  const { data: journalEntries } = useQuery({
    queryKey: ['admin-journal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          lines:journal_entry_lines(
            *,
            account:chart_of_accounts(code, name, name_ar)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  // Fetch chart of accounts
  const { data: accounts } = useQuery({
    queryKey: ['admin-chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code');
      if (error) throw error;
      return data;
    }
  });

  // Fetch settlements
  const { data: settlements, isLoading: loadingSettlements } = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch commission settings
  const { data: commissionSettings } = useQuery({
    queryKey: ['admin-commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('*')
        .order('applies_to');
      if (error) throw error;
      return data;
    }
  });

  // Fetch stores for merchant settlements
  const { data: stores } = useQuery({
    queryKey: ['admin-stores-accounting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_approved', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch profiles for courier settlements
  const { data: couriers } = useQuery({
    queryKey: ['admin-couriers-accounting'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'courier');
      if (rolesError) throw rolesError;

      if (!roles?.length) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', roles.map(r => r.user_id));
      if (error) throw error;
      return profiles;
    }
  });

  // Settlement mutation
  const createSettlementMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: settlement, error } = await supabase
        .from('settlements')
        .insert([{
          settlement_number: 'STL-' + Date.now(),
          recipient_type: data.recipientType,
          recipient_id: data.recipientId,
          total_amount: data.totalAmount,
          payment_method: data.paymentMethod,
          payment_reference: data.paymentReference,
          notes: data.notes,
          status: 'completed',
          settled_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      return settlement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settlements'] });
      toast.success("تم إنشاء التسوية بنجاح");
      setShowSettlementDialog(false);
    },
    onError: () => {
      toast.error("حدث خطأ");
    }
  });

  // Update commission mutation
  const updateCommissionMutation = useMutation({
    mutationFn: async ({ id, percentage }: { id: string; percentage: number }) => {
      const { error } = await supabase
        .from('commission_settings')
        .update({ percentage, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-settings'] });
      toast.success("تم تحديث النسبة");
    }
  });

  // Add commission mutation
  const addCommissionMutation = useMutation({
    mutationFn: async (data: { name: string; name_ar: string; applies_to: string; percentage: number }) => {
      const { error } = await supabase
        .from('commission_settings')
        .insert([{
          name: data.name,
          name_ar: data.name_ar,
          applies_to: data.applies_to,
          percentage: data.percentage,
          is_active: true
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-settings'] });
      toast.success("تم إضافة العمولة بنجاح");
      setShowAddCommissionDialog(false);
    },
    onError: () => {
      toast.error("حدث خطأ");
    }
  });

  // Delete commission mutation
  const deleteCommissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_settings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-settings'] });
      toast.success("تم حذف العمولة");
    }
  });

  // Fetch platform info for reports
  const { data: platformBrand } = useQuery({
    queryKey: ['platform-brand'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'footer_brand')
        .single();
      if (error) return null;
      return data?.value as { name: string } | null;
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

  const getPlatformInfo = (): PlatformInfo => ({
    name: platformBrand?.name || 'سوقنا',
    logoUrl: platformTheme?.logoUrl,
    address: platformContact?.address,
    phone: platformContact?.phone,
    email: platformContact?.email
  });

  // Calculate statistics with new VAT fields
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const totalSubtotalExVat = orders?.reduce((sum, o) => sum + Number(o.subtotal_ex_vat || 0), 0) || 0;
  const totalVatOnProducts = orders?.reduce((sum, o) => sum + Number(o.vat_on_products || 0), 0) || 0;
  const totalDeliveryFees = orders?.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0) || 0;
  const totalDeliveryExVat = orders?.reduce((sum, o) => sum + Number(o.delivery_fee_ex_vat || 0), 0) || 0;
  const totalVatOnDelivery = orders?.reduce((sum, o) => sum + Number(o.vat_on_delivery || 0), 0) || 0;
  const platformCommission = commissionSettings?.find(c => c.applies_to === 'platform')?.percentage || 10;
  const totalPlatformCommission = orders?.reduce((sum, o) => sum + Number(o.platform_commission || 0), 0) || 0;
  const totalCommissionExVat = orders?.reduce((sum, o) => sum + Number(o.total_commission_ex_vat || 0), 0) || 0;
  const totalCommissionVat = orders?.reduce((sum, o) => sum + Number(o.total_commission_vat || 0), 0) || 0;
  const totalMerchantPayout = orders?.reduce((sum, o) => sum + Number(o.total_merchant_payout || 0), 0) || 0;
  const taxRate = commissionSettings?.find(c => c.applies_to === 'tax')?.percentage || 15;
  const totalTax = totalVatOnProducts + totalVatOnDelivery;
  
  const cashPayments = paymentRecords?.filter(p => p.payment_type === 'cash').length || 0;
  const cardPayments = paymentRecords?.filter(p => p.payment_type === 'card').length || 0;
  const totalCashAmount = paymentRecords?.filter(p => p.payment_type === 'cash').reduce((sum, p) => sum + Number(p.amount_received), 0) || 0;
  const totalCardAmount = paymentRecords?.filter(p => p.payment_type === 'card').reduce((sum, p) => sum + Number(p.amount_received), 0) || 0;

  // Calculate merchant dues with new VAT system
  const merchantDues = stores?.map(store => {
    const storeOrders = orders?.filter(o => o.store_id === store.id && o.status === 'delivered') || [];
    const totalSales = storeOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
    const totalSalesExVat = storeOrders.reduce((sum, o) => sum + Number(o.subtotal_ex_vat || o.subtotal / 1.15), 0);
    const commission = storeOrders.reduce((sum, o) => sum + Number(o.platform_commission || 0), 0);
    const commissionExVat = storeOrders.reduce((sum, o) => sum + Number(o.total_commission_ex_vat || 0), 0);
    const commissionVat = storeOrders.reduce((sum, o) => sum + Number(o.total_commission_vat || 0), 0);
    const merchantPayout = storeOrders.reduce((sum, o) => sum + Number(o.total_merchant_payout || (o.subtotal - (o.platform_commission || 0))), 0);
    const paidSettlements = settlements?.filter(s => 
      s.recipient_id === store.merchant_id && 
      s.recipient_type === 'merchant' && 
      s.status === 'completed'
    ).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    
    return {
      ...store,
      totalSales,
      totalSalesExVat,
      commission,
      commissionExVat,
      commissionVat,
      merchantPayout,
      paidAmount: paidSettlements,
      dueAmount: merchantPayout - paidSettlements,
      ordersCount: storeOrders.length
    };
  }) || [];

  // Calculate courier dues
  const courierDues = couriers?.map(courier => {
    const courierOrders = orders?.filter(o => o.courier_id === courier.user_id && o.status === 'delivered') || [];
    const totalDeliveryFees = courierOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);
    const paidSettlements = settlements?.filter(s => 
      s.recipient_id === courier.user_id && 
      s.recipient_type === 'courier' && 
      s.status === 'completed'
    ).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    
    return {
      ...courier,
      totalEarnings: totalDeliveryFees,
      paidAmount: paidSettlements,
      dueAmount: totalDeliveryFees - paidSettlements,
      ordersCount: courierOrders.length
    };
  }) || [];

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });

  const exportToExcel = () => {
    // Simple CSV export
    const headers = ['رقم الطلب', 'المتجر', 'المبلغ', 'رسوم التوصيل', 'العمولة', 'الضريبة', 'طريقة الدفع', 'التاريخ'];
    const rows = orders?.map(o => [
      o.order_number,
      o.store?.name || '',
      o.total,
      o.delivery_fee || 0,
      o.platform_commission || 0,
      o.tax_amount || 0,
      o.payment_method === 'cash' ? 'نقدي' : 'بطاقة',
      formatDate(o.created_at || '')
    ]) || [];

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `accounting-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("تم تصدير التقرير");
  };

  const exportToPDF = () => {
    exportReportToPDF({
      title: 'تقرير المحاسبة',
      subtitle: 'جميع الطلبات المكتملة',
      summary: [
        { label: 'إجمالي الإيرادات', value: `${totalRevenue.toFixed(2)} ر.س` },
        { label: 'عمولة المنصة', value: `${totalPlatformCommission.toFixed(2)} ر.س` },
        { label: 'رسوم التوصيل', value: `${totalDeliveryFees.toFixed(2)} ر.س` },
        { label: 'الضريبة', value: `${totalTax.toFixed(2)} ر.س` },
      ],
      orders: orders || [],
      platformInfo: getPlatformInfo()
    });
    toast.success("جاري طباعة التقرير");
  };

  const exportTaxToPDF = () => {
    const startDate = taxDateRange.start || format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd');
    const endDate = taxDateRange.end || format(new Date(), 'yyyy-MM-dd');
    
    exportTaxReportToPDF({
      title: 'تقرير ضريبة القيمة المضافة',
      dateRange: { start: startDate, end: endDate },
      summary: [
        { label: 'إجمالي المبيعات', value: `${totalRevenue.toFixed(2)} ر.س` },
        { label: 'نسبة الضريبة', value: `${taxRate}%` },
        { label: 'إجمالي الضريبة المستحقة', value: `${totalTax.toFixed(2)} ر.س` },
      ],
      platformInfo: getPlatformInfo(),
      orders: orders || []
    });
    toast.success("جاري طباعة تقرير الضريبة");
  };

  return (
    <AdminLayout title="المحاسبة والتقارير المالية">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="payments">سجلات الدفع</TabsTrigger>
          <TabsTrigger value="merchants">مستحقات التجار</TabsTrigger>
          <TabsTrigger value="couriers">مستحقات المناديب</TabsTrigger>
          <TabsTrigger value="settlements">التسويات</TabsTrigger>
          <TabsTrigger value="journal">القيود المحاسبية</TabsTrigger>
          <TabsTrigger value="tax">الضريبة</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">عمولة المنصة ({platformCommission}%)</p>
                    <p className="text-2xl font-bold">{totalPlatformCommission.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رسوم التوصيل</p>
                    <p className="text-2xl font-bold">{totalDeliveryFees.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الضريبة ({taxRate}%)</p>
                    <p className="text-2xl font-bold">{totalTax.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-green-500" />
                  الدفع النقدي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">عدد العمليات</span>
                    <span className="font-bold text-lg">{cashPayments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">إجمالي المبالغ</span>
                    <span className="font-bold text-lg text-green-600">{totalCashAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  الدفع بالبطاقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">عدد العمليات</span>
                    <span className="font-bold text-lg">{cardPayments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">إجمالي المبالغ</span>
                    <span className="font-bold text-lg text-blue-600">{totalCardAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline">
              <Download className="w-4 h-4 ml-2" />
              تصدير إلى Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <FileText className="w-4 h-4 ml-2" />
              طباعة PDF
            </Button>
          </div>
        </TabsContent>

        {/* Payment Records Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>سجلات الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>المتجر</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>نوع الدفع</TableHead>
                      <TableHead>رقم العملية</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentRecords?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.order?.order_number || record.special_order?.order_number}
                        </TableCell>
                        <TableCell>{record.order?.store?.name || '-'}</TableCell>
                        <TableCell className="font-bold">{record.amount_received} ر.س</TableCell>
                        <TableCell>
                          <Badge variant={record.payment_type === 'cash' ? 'secondary' : 'default'}>
                            {record.payment_type === 'cash' ? 'نقدي' : 'بطاقة'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.transaction_number || '-'}</TableCell>
                        <TableCell>{formatDate(record.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchant Dues Tab */}
        <TabsContent value="merchants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>مستحقات التجار</CardTitle>
              <Button 
                onClick={() => {
                  setSelectedRecipient({ type: 'merchant' });
                  setShowSettlementDialog(true);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                تسوية جديدة
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المتجر</TableHead>
                    <TableHead>عدد الطلبات</TableHead>
                    <TableHead>إجمالي المبيعات</TableHead>
                    <TableHead>العمولة</TableHead>
                    <TableHead>المستحق</TableHead>
                    <TableHead>المسدد</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantDues.map((merchant) => (
                    <TableRow key={merchant.id}>
                      <TableCell className="font-medium">{merchant.name}</TableCell>
                      <TableCell>{merchant.ordersCount}</TableCell>
                      <TableCell>{merchant.totalSalesExVat.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-destructive">{merchant.commission.toFixed(2)} ر.س</TableCell>
                      <TableCell className="font-bold">{merchant.merchantPayout.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-green-600">{merchant.paidAmount.toFixed(2)} ر.س</TableCell>
                      <TableCell className="font-bold text-primary">{merchant.dueAmount.toFixed(2)} ر.س</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRecipient({ 
                              type: 'merchant', 
                              id: merchant.merchant_id,
                              name: merchant.name,
                              dueAmount: merchant.dueAmount 
                            });
                            setShowSettlementDialog(true);
                          }}
                          disabled={merchant.dueAmount <= 0}
                        >
                          <Receipt className="w-4 h-4 ml-1" />
                          تسوية
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courier Dues Tab */}
        <TabsContent value="couriers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>مستحقات المناديب</CardTitle>
              <Button 
                onClick={() => {
                  setSelectedRecipient({ type: 'courier' });
                  setShowSettlementDialog(true);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                تسوية جديدة
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المندوب</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>عدد الطلبات</TableHead>
                    <TableHead>إجمالي الأرباح</TableHead>
                    <TableHead>المسدد</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courierDues.map((courier) => (
                    <TableRow key={courier.id}>
                      <TableCell className="font-medium">{courier.full_name || 'غير محدد'}</TableCell>
                      <TableCell>{courier.phone || '-'}</TableCell>
                      <TableCell>{courier.ordersCount}</TableCell>
                      <TableCell className="font-bold">{courier.totalEarnings.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-green-600">{courier.paidAmount.toFixed(2)} ر.س</TableCell>
                      <TableCell className="font-bold text-primary">{courier.dueAmount.toFixed(2)} ر.س</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRecipient({ 
                              type: 'courier', 
                              id: courier.user_id,
                              name: courier.full_name,
                              dueAmount: courier.dueAmount 
                            });
                            setShowSettlementDialog(true);
                          }}
                          disabled={courier.dueAmount <= 0}
                        >
                          <Receipt className="w-4 h-4 ml-1" />
                          تسوية
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements">
          <Card>
            <CardHeader>
              <CardTitle>سجل التسويات</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSettlements ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم التسوية</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>المرجع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements?.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium">{settlement.settlement_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {settlement.recipient_type === 'merchant' ? 'تاجر' : 'مندوب'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">{settlement.total_amount} ر.س</TableCell>
                        <TableCell>
                          {settlement.payment_method === 'cash' ? 'نقدي' : 
                           settlement.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة'}
                        </TableCell>
                        <TableCell>{settlement.payment_reference || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={settlement.status === 'completed' ? 'default' : 'secondary'}>
                            {settlement.status === 'completed' ? 'مكتمل' : 'معلق'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(settlement.created_at)}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowReceipt(settlement)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="journal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                القيود المحاسبية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Journal Entries Summary */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-500/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المدين</p>
                  <p className="text-xl font-bold text-green-600">
                    {journalEntries?.reduce((sum, je) => sum + Number(je.total_debit || 0), 0).toFixed(2)} ر.س
                  </p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي الدائن</p>
                  <p className="text-xl font-bold text-red-600">
                    {journalEntries?.reduce((sum, je) => sum + Number(je.total_credit || 0), 0).toFixed(2)} ر.س
                  </p>
                </div>
                <div className="bg-primary/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">عدد القيود</p>
                  <p className="text-xl font-bold">{journalEntries?.length || 0}</p>
                </div>
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">ضريبة العمولات المستحقة</p>
                  <p className="text-xl font-bold text-purple-600">{totalCommissionVat.toFixed(2)} ر.س</p>
                </div>
              </div>

              {/* Accounts Summary */}
              <div className="mb-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  ملخص الحسابات
                </h3>
                <div className="grid md:grid-cols-5 gap-3">
                  {accounts?.map(account => (
                    <div key={account.id} className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{account.code}</p>
                      <p className="font-medium text-sm">{account.name_ar}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.account_type}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Journal Entries Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم القيد</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>المدين</TableHead>
                    <TableHead>الدائن</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد قيود محاسبية بعد. سيتم إنشاء القيود تلقائياً عند استلام المدفوعات.
                      </TableCell>
                    </TableRow>
                  ) : (
                    journalEntries?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.entry_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {entry.reference_type === 'order' ? 'طلب' : 
                             entry.reference_type === 'settlement' ? 'تسوية' : 'مرتجع'}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-green-600">{Number(entry.total_debit).toFixed(2)} ر.س</TableCell>
                        <TableCell className="text-red-600">{Number(entry.total_credit).toFixed(2)} ر.س</TableCell>
                        <TableCell>{formatDate(entry.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Tab */}
        <TabsContent value="tax">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                تقارير الضريبة
              </CardTitle>
              <Button onClick={exportTaxToPDF}>
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tax Summary - Enhanced with VAT breakdown */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المبيعات قبل الضريبة</p>
                  <p className="text-2xl font-bold">{totalSubtotalExVat.toFixed(2)} ر.س</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">ضريبة المنتجات ({taxRate}%)</p>
                  <p className="text-2xl font-bold text-green-600">{totalVatOnProducts.toFixed(2)} ر.س</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">ضريبة التوصيل ({taxRate}%)</p>
                  <p className="text-2xl font-bold text-blue-600">{totalVatOnDelivery.toFixed(2)} ر.س</p>
                </div>
                <div className="bg-primary/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي الضريبة المحصلة</p>
                  <p className="text-2xl font-bold text-primary">{totalTax.toFixed(2)} ر.س</p>
                </div>
              </div>

              {/* Commission VAT Summary */}
              <div className="bg-purple-500/10 rounded-xl p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  ضريبة العمولات (مستحقة للمنصة)
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">عمولة المنصة قبل الضريبة</p>
                    <p className="text-xl font-bold">{totalCommissionExVat.toFixed(2)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ضريبة العمولة ({taxRate}%)</p>
                    <p className="text-xl font-bold text-purple-600">{totalCommissionVat.toFixed(2)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي العمولة شامل الضريبة</p>
                    <p className="text-xl font-bold">{totalPlatformCommission.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </div>

              {/* Merchant Payout Summary */}
              <div className="bg-green-500/10 rounded-xl p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  مستحقات التجار
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المبيعات (شامل الضريبة)</p>
                    <p className="text-xl font-bold">{totalRevenue.toFixed(2)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">صافي مستحقات التجار</p>
                    <p className="text-xl font-bold text-green-600">{totalMerchantPayout.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Input 
                    type="date" 
                    value={taxDateRange.start}
                    onChange={(e) => setTaxDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Input 
                    type="date" 
                    value={taxDateRange.end}
                    onChange={(e) => setTaxDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
                <Button variant="outline">
                  <Search className="w-4 h-4 ml-2" />
                  بحث
                </Button>
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="w-4 h-4 ml-2" />
                  تصدير Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات النسب والعمولات
              </CardTitle>
              <Button onClick={() => setShowAddCommissionDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة عمولة جديدة
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {commissionSettings?.map((setting) => (
                  <div key={setting.id} className="border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold">{setting.name_ar}</h3>
                        <p className="text-sm text-muted-foreground">
                          {setting.applies_to === 'platform' && 'عمولة المنصة من كل طلب'}
                          {setting.applies_to === 'payment_gateway' && 'رسوم بوابة الدفع'}
                          {setting.applies_to === 'tax' && 'ضريبة القيمة المضافة'}
                          {!['platform', 'payment_gateway', 'tax'].includes(setting.applies_to) && setting.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{setting.applies_to}</Badge>
                        {!['platform', 'payment_gateway', 'tax'].includes(setting.applies_to) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteCommissionMutation.mutate(setting.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        defaultValue={setting.percentage}
                        onChange={(e) => {
                          updateCommissionMutation.mutate({
                            id: setting.id,
                            percentage: parseFloat(e.target.value)
                          });
                        }}
                        className="w-24 text-center"
                        step="0.1"
                      />
                      <span className="text-lg font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settlement Dialog */}
      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء تسوية جديدة</DialogTitle>
          </DialogHeader>
          <SettlementForm
            recipient={selectedRecipient}
            stores={stores || []}
            couriers={courierDues}
            onSubmit={(data) => createSettlementMutation.mutate(data)}
            isSubmitting={createSettlementMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Add Commission Dialog */}
      <Dialog open={showAddCommissionDialog} onOpenChange={setShowAddCommissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة عمولة أو رسوم جديدة</DialogTitle>
          </DialogHeader>
          <AddCommissionForm
            onSubmit={(data) => addCommissionMutation.mutate(data)}
            isSubmitting={addCommissionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Settlement Receipt */}
      {showReceipt && (
        <SettlementReceipt
          settlement={showReceipt}
          onClose={() => setShowReceipt(null)}
        />
      )}
    </AdminLayout>
  );
};

// Add Commission Form Component
const AddCommissionForm = ({ 
  onSubmit, 
  isSubmitting 
}: { 
  onSubmit: (data: { name: string; name_ar: string; applies_to: string; percentage: number }) => void;
  isSubmitting: boolean;
}) => {
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [appliesTo, setAppliesTo] = useState("");
  const [percentage, setPercentage] = useState("");

  const handleSubmit = () => {
    if (!nameAr || !appliesTo || !percentage) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة");
      return;
    }

    onSubmit({
      name: name || appliesTo,
      name_ar: nameAr,
      applies_to: appliesTo,
      percentage: parseFloat(percentage)
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>اسم العمولة (عربي) *</Label>
        <Input
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          placeholder="مثال: رسوم التغليف"
        />
      </div>

      <div className="space-y-2">
        <Label>اسم العمولة (إنجليزي)</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: packaging_fee"
        />
      </div>

      <div className="space-y-2">
        <Label>المعرف (applies_to) *</Label>
        <Input
          value={appliesTo}
          onChange={(e) => setAppliesTo(e.target.value)}
          placeholder="مثال: packaging"
        />
      </div>

      <div className="space-y-2">
        <Label>النسبة المئوية *</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="0"
            step="0.1"
            className="w-24"
          />
          <span className="text-lg font-bold">%</span>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 ml-2" />
              إضافة العمولة
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
};

// Settlement Form Component
const SettlementForm = ({ 
  recipient, 
  stores, 
  couriers, 
  onSubmit, 
  isSubmitting 
}: { 
  recipient: any; 
  stores: any[]; 
  couriers: any[];
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) => {
  const [recipientId, setRecipientId] = useState(recipient?.id || "");
  const [amount, setAmount] = useState(recipient?.dueAmount?.toString() || "");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!recipientId || !amount) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة");
      return;
    }

    onSubmit({
      recipientType: recipient?.type,
      recipientId,
      totalAmount: parseFloat(amount),
      paymentMethod,
      paymentReference,
      notes
    });
  };

  return (
    <div className="space-y-4">
      {!recipient?.id && (
        <div className="space-y-2">
          <Label>اختر {recipient?.type === 'merchant' ? 'التاجر' : 'المندوب'}</Label>
          <Select value={recipientId} onValueChange={setRecipientId}>
            <SelectTrigger>
              <SelectValue placeholder="اختر..." />
            </SelectTrigger>
            <SelectContent>
              {recipient?.type === 'merchant' 
                ? stores.map(s => (
                    <SelectItem key={s.id} value={s.merchant_id}>{s.name}</SelectItem>
                  ))
                : couriers.map(c => (
                    <SelectItem key={c.id} value={c.user_id}>{c.full_name}</SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
        </div>
      )}

      {recipient?.name && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">المستفيد</p>
          <p className="font-bold">{recipient.name}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>المبلغ</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="أدخل المبلغ"
        />
      </div>

      <div className="space-y-2">
        <Label>طريقة الدفع</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">نقدي</SelectItem>
            <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
            <SelectItem value="wallet">محفظة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>رقم المرجع (اختياري)</Label>
        <Input
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
          placeholder="رقم التحويل أو المرجع"
        />
      </div>

      <div className="space-y-2">
        <Label>ملاحظات (اختياري)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات إضافية"
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4 ml-2" />
              إنشاء التسوية
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default AccountingPage;
