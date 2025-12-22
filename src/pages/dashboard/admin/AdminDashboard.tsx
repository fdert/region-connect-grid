import DashboardLayout from "../DashboardLayout";
import { 
  Store, 
  Users, 
  Package, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Clock,
  Truck
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  {
    label: "إجمالي المتاجر",
    value: "524",
    change: "+12%",
    trend: "up",
    icon: Store,
    color: "from-primary to-emerald-600",
  },
  {
    label: "إجمالي المستخدمين",
    value: "12,547",
    change: "+8%",
    trend: "up",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "الطلبات اليوم",
    value: "856",
    change: "-3%",
    trend: "down",
    icon: Package,
    color: "from-orange-500 to-amber-500",
  },
  {
    label: "الإيرادات",
    value: "45,230 ر.س",
    change: "+15%",
    trend: "up",
    icon: DollarSign,
    color: "from-purple-500 to-violet-500",
  },
];

const recentOrders = [
  { id: "ORD-001", store: "متجر الأناقة", customer: "أحمد محمد", status: "جديد", amount: "250 ر.س" },
  { id: "ORD-002", store: "مطعم الشرق", customer: "سارة علي", status: "قيد التحضير", amount: "85 ر.س" },
  { id: "ORD-003", store: "تقنية المستقبل", customer: "محمد خالد", status: "جاهز للتوصيل", amount: "1,500 ر.س" },
  { id: "ORD-004", store: "بيت الديكور", customer: "نورة سعد", status: "تم التوصيل", amount: "3,200 ر.س" },
];

const pendingMerchants = [
  { id: 1, name: "متجر الزهور", owner: "فاطمة أحمد", date: "منذ ساعتين" },
  { id: 2, name: "مطعم البيت", owner: "علي سعيد", date: "منذ 5 ساعات" },
  { id: 3, name: "متجر الرياضة", owner: "خالد عمر", date: "منذ يوم" },
];

const statusColors: Record<string, string> = {
  "جديد": "bg-info",
  "قيد التحضير": "bg-warning",
  "جاهز للتوصيل": "bg-primary",
  "تم التوصيل": "bg-success",
};

const AdminDashboard = () => {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، مدير النظام</h1>
          <p className="text-muted-foreground">إليك نظرة عامة على أداء المنصة اليوم</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === "up" ? "text-success" : "text-destructive"
                }`}>
                  {stat.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">أحدث الطلبات</h2>
              <Link to="/admin/orders">
                <Button variant="ghost" size="sm" className="gap-2">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{order.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs text-primary-foreground ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.store} • {order.customer}
                      </div>
                    </div>
                    <div className="text-left font-semibold">{order.amount}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Merchants */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">متاجر بانتظار الموافقة</h2>
              <span className="w-6 h-6 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center font-bold">
                {pendingMerchants.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {pendingMerchants.map((merchant) => (
                <div key={merchant.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{merchant.name}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {merchant.date}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">{merchant.owner}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="flex-1">
                      موافقة
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
