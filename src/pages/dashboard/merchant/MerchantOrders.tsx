import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantNotifications } from "@/hooks/useMerchantNotifications";
import DashboardLayout from "../DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Package, Clock, CheckCircle, XCircle, Eye, Loader2, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { parseCoordinatesFromUrl } from "@/lib/distance";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  accepted_by_merchant: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز للتسليم",
  assigned_to_courier: "تم تعيين مندوب",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  failed: "فشل",
};

const statusColors: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  accepted_by_merchant: "bg-cyan-100 text-cyan-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  assigned_to_courier: "bg-purple-100 text-purple-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  failed: "bg-gray-100 text-gray-800",
};

const MerchantOrders = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const queryClient = useQueryClient();

  // Get current user's store
  const { data: store } = useQuery({
    queryKey: ["merchant-store"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Setup realtime notifications for new orders
  useMerchantNotifications(store?.id);

  // Get orders for the store
  const { data: orders, isLoading } = useQuery({
    queryKey: ["merchant-orders", store?.id, statusFilter],
    queryFn: async () => {
      if (!store?.id) return [];
      
      let query = supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as OrderStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, oldStatus }: { orderId: string; status: OrderStatus; oldStatus?: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      
      if (error) throw error;
      
      // Send WhatsApp notification for status change
      try {
        const { notifyOrderStatusChange } = await import('@/lib/notifications');
        await notifyOrderStatusChange(orderId, status, oldStatus);
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-orders"] });
      toast.success("تم تحديث حالة الطلب");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تحديث الحالة");
    },
  });

  const filteredOrders = orders?.filter(order =>
    order.order_number.toLowerCase().includes(search.toLowerCase()) ||
    order.customer_phone?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: orders?.length || 0,
    new: orders?.filter(o => o.status === "new").length || 0,
    preparing: orders?.filter(o => o.status === "preparing").length || 0,
    delivered: orders?.filter(o => o.status === "delivered").length || 0,
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
          <p className="text-muted-foreground">عرض وإدارة جميع طلبات المتجر</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-sm text-muted-foreground">طلبات جديدة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.preparing}</p>
                <p className="text-sm text-muted-foreground">قيد التحضير</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-sm text-muted-foreground">تم التوصيل</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب أو رقم الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد طلبات
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الطلب</TableHead>
                      <TableHead className="text-right">هاتف العميل</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الدفع</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customer_phone || "-"}</TableCell>
                        <TableCell>{order.total} ر.س</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status as OrderStatus]}>
                            {statusLabels[order.status as OrderStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.paid ? "default" : "secondary"}>
                            {order.paid ? "مدفوع" : "غير مدفوع"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.created_at!)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Tracking Links */}
                {['assigned_to_courier', 'picked_up', 'on_the_way'].includes(selectedOrder.status) && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-primary" />
                      تتبع الطلب
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {store?.location_lat && store?.location_lng && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(`https://www.google.com/maps?q=${store.location_lat},${store.location_lng}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                          موقع المتجر
                        </Button>
                      )}
                      {selectedOrder.delivery_address && (() => {
                        const coords = parseCoordinatesFromUrl(selectedOrder.delivery_address);
                        if (coords) {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                              موقع العميل
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">هاتف العميل</p>
                    <p className="font-medium">{selectedOrder.customer_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">عنوان التوصيل</p>
                    <p className="font-medium">{selectedOrder.delivery_address || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المجموع الفرعي</p>
                    <p className="font-medium">{selectedOrder.subtotal} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رسوم التوصيل</p>
                    <p className="font-medium">{selectedOrder.delivery_fee} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="font-medium text-lg text-primary">{selectedOrder.total} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                    <p className="font-medium">{selectedOrder.payment_method === "cash" ? "نقدي" : "إلكتروني"}</p>
                  </div>
                </div>

                {selectedOrder.delivery_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">ملاحظات التوصيل</p>
                    <p className="font-medium">{selectedOrder.delivery_notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">تحديث حالة الطلب</p>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(status) => {
                      const oldStatus = selectedOrder.status;
                      updateStatusMutation.mutate({
                        orderId: selectedOrder.id,
                        status: status as OrderStatus,
                        oldStatus: oldStatus,
                      });
                      setSelectedOrder({ ...selectedOrder, status });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">جديد</SelectItem>
                      <SelectItem value="accepted_by_merchant">مقبول</SelectItem>
                      <SelectItem value="preparing">قيد التحضير</SelectItem>
                      <SelectItem value="ready">جاهز للتسليم</SelectItem>
                      <SelectItem value="cancelled">إلغاء</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default MerchantOrders;
