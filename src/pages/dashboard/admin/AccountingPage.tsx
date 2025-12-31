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
  Settings
} from "lucide-react";

const AccountingPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
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

  // Calculate statistics
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const totalDeliveryFees = orders?.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0) || 0;
  const platformCommission = commissionSettings?.find(c => c.applies_to === 'platform')?.percentage || 10;
  const totalPlatformCommission = orders?.reduce((sum, o) => sum + Number(o.platform_commission || 0), 0) || 0;
  const taxRate = commissionSettings?.find(c => c.applies_to === 'tax')?.percentage || 15;
  const totalTax = totalRevenue * (taxRate / 100);
  
  const cashPayments = paymentRecords?.filter(p => p.payment_type === 'cash').length || 0;
  const cardPayments = paymentRecords?.filter(p => p.payment_type === 'card').length || 0;
  const totalCashAmount = paymentRecords?.filter(p => p.payment_type === 'cash').reduce((sum, p) => sum + Number(p.amount_received), 0) || 0;
  const totalCardAmount = paymentRecords?.filter(p => p.payment_type === 'card').reduce((sum, p) => sum + Number(p.amount_received), 0) || 0;

  // Calculate merchant dues
  const merchantDues = stores?.map(store => {
    const storeOrders = orders?.filter(o => o.store_id === store.id && o.status === 'delivered') || [];
    const totalSales = storeOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const commission = totalSales * (platformCommission / 100);
    const netAmount = totalSales - commission;
    const paidSettlements = settlements?.filter(s => 
      s.recipient_id === store.merchant_id && 
      s.recipient_type === 'merchant' && 
      s.status === 'completed'
    ).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    
    return {
      ...store,
      totalSales,
      commission,
      netAmount,
      paidAmount: paidSettlements,
      dueAmount: netAmount - paidSettlements,
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

  return (
    <AdminLayout title="المحاسبة والتقارير المالية">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="payments">سجلات الدفع</TabsTrigger>
          <TabsTrigger value="merchants">مستحقات التجار</TabsTrigger>
          <TabsTrigger value="couriers">مستحقات المناديب</TabsTrigger>
          <TabsTrigger value="settlements">التسويات</TabsTrigger>
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
                      <TableCell>{merchant.totalSales.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-destructive">{merchant.commission.toFixed(2)} ر.س</TableCell>
                      <TableCell className="font-bold">{merchant.netAmount.toFixed(2)} ر.س</TableCell>
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
                          <Button size="sm" variant="outline">
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

        {/* Tax Tab */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                تقارير الضريبة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tax Summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} ر.س</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">نسبة الضريبة</p>
                  <p className="text-2xl font-bold">{taxRate}%</p>
                </div>
                <div className="bg-primary/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي الضريبة</p>
                  <p className="text-2xl font-bold text-primary">{totalTax.toFixed(2)} ر.س</p>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
                <Button variant="outline">
                  <Search className="w-4 h-4 ml-2" />
                  بحث
                </Button>
                <Button onClick={exportToExcel}>
                  <Download className="w-4 h-4 ml-2" />
                  تصدير
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات النسب والعمولات
              </CardTitle>
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
                        </p>
                      </div>
                      <Badge variant="outline">{setting.applies_to}</Badge>
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
    </AdminLayout>
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
