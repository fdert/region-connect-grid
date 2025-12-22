import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  ShoppingBag,
  Star,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  {
    label: "طلبات اليوم",
    value: "24",
    change: "+5",
    trend: "up",
    icon: Package,
    color: "from-primary to-emerald-600",
  },
  {
    label: "إجمالي المبيعات",
    value: "8,450 ر.س",
    change: "+12%",
    trend: "up",
    icon: DollarSign,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "المنتجات",
    value: "156",
    change: "+3",
    trend: "up",
    icon: ShoppingBag,
    color: "from-orange-500 to-amber-500",
  },
  {
    label: "التقييم",
    value: "4.8",
    change: "+0.1",
    trend: "up",
    icon: Star,
    color: "from-purple-500 to-violet-500",
  },
];

const recentOrders = [
  { id: "ORD-001", customer: "أحمد محمد", items: 3, status: "جديد", amount: "250 ر.س", time: "منذ 5 دقائق" },
  { id: "ORD-002", customer: "سارة علي", items: 1, status: "قيد التحضير", amount: "85 ر.س", time: "منذ 15 دقيقة" },
  { id: "ORD-003", customer: "محمد خالد", items: 5, status: "جاهز للتوصيل", amount: "1,500 ر.س", time: "منذ 30 دقيقة" },
  { id: "ORD-004", customer: "نورة سعد", items: 2, status: "تم التوصيل", amount: "320 ر.س", time: "منذ ساعة" },
];

const topProducts = [
  { name: "قميص رجالي كلاسيك", sales: 45, revenue: "2,250 ر.س" },
  { name: "فستان سهرة أنيق", sales: 32, revenue: "4,800 ر.س" },
  { name: "حذاء رياضي", sales: 28, revenue: "2,800 ر.س" },
];

const statusColors: Record<string, string> = {
  "جديد": "bg-info",
  "قيد التحضير": "bg-warning",
  "جاهز للتوصيل": "bg-primary",
  "تم التوصيل": "bg-success",
};

const MerchantDashboard = () => {
  return (
    <DashboardLayout role="merchant">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، متجر الأناقة</h1>
            <p className="text-muted-foreground">إليك نظرة عامة على أداء متجرك اليوم</p>
          </div>
          <Link to="/stores/1">
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              معاينة المتجر
            </Button>
          </Link>
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
              <Link to="/merchant/orders">
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
                        {order.customer} • {order.items} منتجات • {order.time}
                      </div>
                    </div>
                    <div className="text-left font-semibold">{order.amount}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">الأكثر مبيعاً</h2>
            </div>
            <div className="divide-y divide-border">
              {topProducts.map((product, index) => (
                <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{product.sales} مبيعات</span>
                    <span className="font-semibold text-foreground">{product.revenue}</span>
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

export default MerchantDashboard;
