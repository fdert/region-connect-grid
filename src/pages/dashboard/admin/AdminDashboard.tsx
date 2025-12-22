import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Store, 
  Users, 
  ShoppingCart, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalStores: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalStores: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: storesCount } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true });

      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { data: orders } = await supabase
        .from("orders")
        .select("total, status");

      const totalRevenue = orders?.reduce((acc, o) => acc + Number(o.total), 0) || 0;
      const pendingOrders = orders?.filter(o => o.status === "new").length || 0;
      const deliveredOrders = orders?.filter(o => o.status === "delivered").length || 0;

      setStats({
        totalStores: storesCount || 0,
        totalUsers: usersCount || 0,
        totalOrders: orders?.length || 0,
        totalRevenue,
        pendingOrders,
        deliveredOrders
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { title: "إجمالي المتاجر", value: stats.totalStores, icon: Store, color: "from-emerald-500 to-teal-500" },
    { title: "المستخدمين", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-cyan-500" },
    { title: "الطلبات", value: stats.totalOrders, icon: ShoppingCart, color: "from-purple-500 to-violet-500" },
    { title: "الإيرادات", value: `${stats.totalRevenue.toFixed(2)} ر.س`, icon: DollarSign, color: "from-amber-500 to-orange-500" }
  ];

  return (
    <AdminLayout title="لوحة التحكم">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12% من الشهر الماضي</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>إحصائيات الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  <p className="text-sm text-muted-foreground">طلبات جديدة</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.deliveredOrders}</p>
                  <p className="text-sm text-muted-foreground">تم التوصيل</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>روابط سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "إضافة بنر جديد", href: "/admin/banners" },
              { label: "تعديل المظهر", href: "/admin/theme" },
              { label: "إعدادات الواتساب", href: "/admin/webhooks" },
              { label: "إدارة المتاجر", href: "/admin/stores" },
            ].map((link, index) => (
              <Link 
                key={index}
                to={link.href}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                {link.label}
                <ArrowLeft className="w-4 h-4" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
