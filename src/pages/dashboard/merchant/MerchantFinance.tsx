import { useState } from "react";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet,
  Download,
  Loader2,
  CheckCircle,
  Clock,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  FileText
} from "lucide-react";

const MerchantFinance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch store
  const { data: store } = useQuery({
    queryKey: ['merchant-store-finance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('merchant_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['merchant-orders-finance', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store?.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id
  });

  // Fetch payment records for the store
  const { data: paymentRecords } = useQuery({
    queryKey: ['merchant-payments', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_records')
        .select(`
          *,
          order:orders(order_number, total)
        `)
        .eq('store_id', store?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id
  });

  // Fetch settlements
  const { data: settlements } = useQuery({
    queryKey: ['merchant-settlements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('recipient_id', user?.id)
        .eq('recipient_type', 'merchant')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch commission settings
  const { data: commissionSettings } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Calculate statistics with new VAT system
  const platformCommission = commissionSettings?.find(c => c.applies_to === 'platform')?.percentage || 10;
  const taxRate = commissionSettings?.find(c => c.applies_to === 'tax')?.percentage || 15;
  
  // Use new VAT fields if available, fallback to old calculation
  const totalSales = orders?.reduce((sum, o) => sum + Number(o.subtotal), 0) || 0;
  const totalSalesExVat = orders?.reduce((sum, o) => sum + Number(o.subtotal_ex_vat || o.subtotal / 1.15), 0) || 0;
  const totalVat = orders?.reduce((sum, o) => sum + Number(o.vat_on_products || 0), 0) || 0;
  const totalCommission = orders?.reduce((sum, o) => sum + Number(o.platform_commission || 0), 0) || 0;
  const totalCommissionExVat = orders?.reduce((sum, o) => sum + Number(o.total_commission_ex_vat || 0), 0) || 0;
  const totalCommissionVat = orders?.reduce((sum, o) => sum + Number(o.total_commission_vat || 0), 0) || 0;
  const netAmount = orders?.reduce((sum, o) => sum + Number(o.total_merchant_payout || (o.subtotal - (o.platform_commission || 0))), 0) || 0;
  const paidAmount = settlements?.filter(s => s.status === 'completed').reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const dueAmount = netAmount - paidAmount;
  
  const cashPayments = paymentRecords?.filter(p => p.payment_type === 'cash').length || 0;
  const cardPayments = paymentRecords?.filter(p => p.payment_type === 'card').length || 0;

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });

  const exportToCSV = () => {
    const headers = ['رقم الطلب', 'المبلغ', 'العمولة', 'الصافي', 'طريقة الدفع', 'التاريخ'];
    const rows = orders?.map(o => [
      o.order_number,
      o.subtotal,
      (Number(o.subtotal) * platformCommission / 100).toFixed(2),
      (Number(o.subtotal) * (1 - platformCommission / 100)).toFixed(2),
      o.payment_method === 'cash' ? 'نقدي' : 'بطاقة',
      formatDate(o.created_at || '')
    ]) || [];

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loadingOrders) {
    return (
      <DashboardLayout role="merchant">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">التقارير المالية</h1>
            <p className="text-muted-foreground">متابعة المبيعات والمستحقات</p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold">{totalSales.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <ArrowDownRight className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عمولة المنصة ({platformCommission}%)</p>
                  <p className="text-2xl font-bold">{totalCommission.toFixed(2)} ر.س</p>
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
                  <p className="text-sm text-muted-foreground">صافي الأرباح</p>
                  <p className="text-2xl font-bold">{netAmount.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المستحقات المتبقية</p>
                  <p className="text-2xl font-bold text-primary">{dueAmount.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VAT Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              تفاصيل الضريبة والعمولة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">المبيعات قبل الضريبة</p>
                <p className="text-xl font-bold">{totalSalesExVat.toFixed(2)} ر.س</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">ضريبة المبيعات ({taxRate}%)</p>
                <p className="text-xl font-bold text-green-600">{totalVat.toFixed(2)} ر.س</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">عمولة المنصة قبل الضريبة</p>
                <p className="text-xl font-bold text-red-600">{totalCommissionExVat.toFixed(2)} ر.س</p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">ضريبة العمولة</p>
                <p className="text-xl font-bold text-purple-600">{totalCommissionVat.toFixed(2)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="orders">الطلبات المكتملة</TabsTrigger>
            <TabsTrigger value="settlements">التسويات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Payment Methods Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>توزيع المدفوعات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="font-medium">الدفع النقدي</span>
                    </div>
                    <span className="font-bold text-lg">{cashPayments} طلب</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-medium">الدفع بالبطاقة</span>
                    </div>
                    <span className="font-bold text-lg">{cardPayments} طلب</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ملخص المستحقات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">إجمالي المستحق</span>
                    <span className="font-bold">{netAmount.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span>تم السداد</span>
                    <span className="font-bold">{paidAmount.toFixed(2)} ر.س</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-medium">المتبقي</span>
                    <span className="font-bold text-xl text-primary">{dueAmount.toFixed(2)} ر.س</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>الطلبات المكتملة</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>العمولة</TableHead>
                      <TableHead>الصافي</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => {
                      const commission = Number(order.subtotal) * platformCommission / 100;
                      const net = Number(order.subtotal) - commission;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{Number(order.subtotal).toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-destructive">{commission.toFixed(2)} ر.س</TableCell>
                          <TableCell className="font-bold text-green-600">{net.toFixed(2)} ر.س</TableCell>
                          <TableCell>
                            <Badge variant={order.payment_method === 'cash' ? 'secondary' : 'default'}>
                              {order.payment_method === 'cash' ? 'نقدي' : 'بطاقة'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.created_at || '')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <CardTitle>سجل التسويات</CardTitle>
              </CardHeader>
              <CardContent>
                {settlements?.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">لا توجد تسويات بعد</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم التسوية</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements?.map((settlement) => (
                        <TableRow key={settlement.id}>
                          <TableCell className="font-medium">{settlement.settlement_number}</TableCell>
                          <TableCell className="font-bold text-green-600">{settlement.total_amount} ر.س</TableCell>
                          <TableCell>
                            {settlement.payment_method === 'cash' ? 'نقدي' : 
                             settlement.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={settlement.status === 'completed' ? 'default' : 'secondary'}>
                              <CheckCircle className="w-3 h-3 ml-1" />
                              {settlement.status === 'completed' ? 'مكتمل' : 'معلق'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(settlement.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MerchantFinance;
