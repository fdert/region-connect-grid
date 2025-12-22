import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
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
import { Search, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  accepted_by_merchant: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز",
  assigned_to_courier: "تم تعيين سائق",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  failed: "فشل",
};

const statusColors: Record<OrderStatus, string> = {
  new: "bg-blue-500/10 text-blue-500",
  accepted_by_merchant: "bg-indigo-500/10 text-indigo-500",
  preparing: "bg-yellow-500/10 text-yellow-500",
  ready: "bg-green-500/10 text-green-500",
  assigned_to_courier: "bg-purple-500/10 text-purple-500",
  picked_up: "bg-cyan-500/10 text-cyan-500",
  on_the_way: "bg-orange-500/10 text-orange-500",
  delivered: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-red-500/10 text-red-500",
  failed: "bg-gray-500/10 text-gray-500",
};

export default function OrdersManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, stores(name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as OrderStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = orders?.filter((order) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      order.order_number.toLowerCase().includes(searchLower) ||
      order.customer_phone?.includes(search)
    );
  });

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o) => ["new", "accepted_by_merchant", "preparing"].includes(o.status || "")).length || 0,
    inProgress: orders?.filter((o) => ["ready", "assigned_to_courier", "picked_up", "on_the_way"].includes(o.status || "")).length || 0,
    completed: orders?.filter((o) => o.status === "delivered").length || 0,
  };

  return (
    <AdminLayout title="إدارة الطلبات">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
          <p className="text-muted-foreground">عرض ومتابعة جميع الطلبات</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">بانتظار التحضير</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">قيد التوصيل</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">تم التوصيل</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="accepted_by_merchant">مقبول</SelectItem>
              <SelectItem value="preparing">قيد التحضير</SelectItem>
              <SelectItem value="ready">جاهز</SelectItem>
              <SelectItem value="on_the_way">في الطريق</SelectItem>
              <SelectItem value="delivered">تم التوصيل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">المتجر</TableHead>
                <TableHead className="text-right">رقم العميل</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الدفع</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    لا يوجد طلبات
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>{(order.stores as any)?.name || "-"}</TableCell>
                    <TableCell dir="ltr">{order.customer_phone || "-"}</TableCell>
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
                    <TableCell>
                      {new Date(order.created_at!).toLocaleDateString("ar-SA")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
