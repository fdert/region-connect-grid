import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  User,
  Eye,
  Navigation,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SpecialOrder {
  id: string;
  order_number: string;
  customer_id: string;
  service_id: string;
  courier_id: string | null;
  sender_name: string;
  sender_phone: string;
  sender_address: string | null;
  sender_location_url: string | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string | null;
  recipient_location_url: string | null;
  package_type: string;
  package_size: string;
  package_description: string | null;
  distance_km: number | null;
  delivery_fee: number;
  total: number;
  status: string;
  is_verified: boolean;
  paid: boolean;
  created_at: string;
  special_services?: {
    name_ar: string;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  verified: "bg-blue-500",
  accepted: "bg-purple-500",
  picked_up: "bg-indigo-500",
  on_the_way: "bg-cyan-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "في الانتظار",
  verified: "تم التحقق",
  accepted: "تم القبول",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const SpecialOrdersPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<SpecialOrder | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["special-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_orders")
        .select(`*, special_services(name_ar)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SpecialOrder[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, oldStatus }: { id: string; status: string; oldStatus?: string }) => {
      const { error } = await supabase
        .from("special_orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      
      // Send WhatsApp notification for special order status change
      try {
        const { notifySpecialOrderStatusChange } = await import('@/lib/notifications');
        await notifySpecialOrderStatusChange(id, status, oldStatus);
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-orders"] });
      toast.success("تم تحديث حالة الطلب");
    },
  });

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o) => o.status === "pending" || o.status === "verified").length || 0,
    inProgress: orders?.filter((o) => ["accepted", "picked_up", "on_the_way"].includes(o.status)).length || 0,
    delivered: orders?.filter((o) => o.status === "delivered").length || 0,
  };

  return (
    <AdminLayout title="طلبات التوصيل الخاصة">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">قيد التوصيل</CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">تم التسليم</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.delivered}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب أو اسم المرسل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>المرسل</TableHead>
                  <TableHead>المستلم</TableHead>
                  <TableHead>المسافة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.sender_name}</div>
                          <div className="text-xs text-muted-foreground">{order.sender_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.recipient_name}</div>
                          <div className="text-xs text-muted-foreground">{order.recipient_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.distance_km?.toFixed(2)} كم</TableCell>
                      <TableCell className="font-bold">{order.total} ر.س</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[order.status]} text-white`}>
                          {statusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب #{selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge className={`${statusColors[selectedOrder.status]} text-white`}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: selectedOrder.id, status: value })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sender & Recipient */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        المرسل
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {selectedOrder.sender_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {selectedOrder.sender_phone}
                      </div>
                      {selectedOrder.sender_address && (
                        <p className="text-muted-foreground">{selectedOrder.sender_address}</p>
                      )}
                      {selectedOrder.sender_location_url && (
                        <a
                          href={selectedOrder.sender_location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline"
                        >
                          عرض الموقع على الخريطة
                        </a>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-success" />
                        المستلم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {selectedOrder.recipient_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {selectedOrder.recipient_phone}
                      </div>
                      {selectedOrder.recipient_address && (
                        <p className="text-muted-foreground">{selectedOrder.recipient_address}</p>
                      )}
                      {selectedOrder.recipient_location_url && (
                        <a
                          href={selectedOrder.recipient_location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs hover:underline"
                        >
                          عرض الموقع على الخريطة
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Package Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      تفاصيل الطرد
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">النوع:</span> {selectedOrder.package_type}
                      </div>
                      <div>
                        <span className="text-muted-foreground">الحجم:</span> {selectedOrder.package_size}
                      </div>
                    </div>
                    {selectedOrder.package_description && (
                      <p>
                        <span className="text-muted-foreground">الوصف:</span> {selectedOrder.package_description}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card className="bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span>المسافة</span>
                      <span>{selectedOrder.distance_km?.toFixed(2)} كم</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span>رسوم التوصيل</span>
                      <span>{selectedOrder.delivery_fee} ر.س</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
                      <span>الإجمالي</span>
                      <span className="text-primary">{selectedOrder.total} ر.س</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default SpecialOrdersPage;
