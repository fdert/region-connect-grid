import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  Wallet,
  Gift,
  Star,
  ArrowLeft,
  Clock,
  MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const stats = [
  {
    label: "طلباتي",
    value: "24",
    icon: Package,
    color: "from-primary to-emerald-600",
  },
  {
    label: "رصيد المحفظة",
    value: "350 ر.س",
    icon: Wallet,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "نقاطي",
    value: "1,250",
    icon: Gift,
    color: "from-orange-500 to-amber-500",
  },
  {
    label: "تقييماتي",
    value: "12",
    icon: Star,
    color: "from-purple-500 to-violet-500",
  },
];

const activeOrders = [
  { 
    id: "ORD-156", 
    store: "متجر الأناقة",
    items: 3,
    status: "قيد التحضير",
    amount: "250 ر.س",
    time: "منذ 30 دقيقة",
    progress: 40
  },
  { 
    id: "ORD-155", 
    store: "مطعم الشرق",
    items: 2,
    status: "في الطريق",
    amount: "85 ر.س",
    time: "منذ ساعة",
    progress: 80
  },
];

const previousOrders = [
  { id: "ORD-150", store: "تقنية المستقبل", amount: "1,500 ر.س", date: "15 ديسمبر 2024" },
  { id: "ORD-148", store: "بيت الديكور", amount: "3,200 ر.س", date: "10 ديسمبر 2024" },
  { id: "ORD-145", store: "متجر الأناقة", amount: "450 ر.س", date: "5 ديسمبر 2024" },
];

const statusColors: Record<string, string> = {
  "جديد": "bg-info",
  "قيد التحضير": "bg-warning",
  "في الطريق": "bg-primary",
  "تم التسليم": "bg-success",
};

const CustomerDashboard = () => {
  return (
    <DashboardLayout role="customer">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، أحمد</h1>
          <p className="text-muted-foreground">مرحباً بعودتك! إليك آخر المستجدات</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Points Progress */}
        <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg mb-1">برنامج المكافآت</h3>
              <p className="text-primary-foreground/80 text-sm">اجمع النقاط واستبدلها بهدايا رائعة</p>
            </div>
            <Gift className="w-10 h-10 opacity-50" />
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>1,250 نقطة</span>
              <span>2,000 نقطة</span>
            </div>
            <Progress value={62.5} className="h-2 bg-primary-foreground/20" />
          </div>
          <p className="text-sm text-primary-foreground/80">
            تحتاج 750 نقطة إضافية للحصول على قسيمة خصم 50 ر.س
          </p>
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">الطلبات النشطة</h2>
            </div>
            <div className="divide-y divide-border">
              {activeOrders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold">{order.id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.store} • {order.items} منتجات
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{order.amount}</div>
                      <div className="text-xs text-muted-foreground">{order.time}</div>
                    </div>
                  </div>
                  <Progress value={order.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>تم الطلب</span>
                    <span>قيد التحضير</span>
                    <span>في الطريق</span>
                    <span>تم التسليم</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Orders */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-bold text-lg">الطلبات السابقة</h2>
            <Link to="/customer/orders">
              <Button variant="ghost" size="sm" className="gap-2">
                عرض الكل
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {previousOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div>
                  <div className="font-medium mb-1">{order.id}</div>
                  <div className="text-sm text-muted-foreground">{order.store}</div>
                </div>
                <div className="text-left">
                  <div className="font-semibold">{order.amount}</div>
                  <div className="text-xs text-muted-foreground">{order.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
