import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const stats = [
  {
    label: "طلبات اليوم",
    value: "12",
    icon: Package,
    color: "from-primary to-emerald-600",
  },
  {
    label: "أرباح اليوم",
    value: "180 ر.س",
    icon: DollarSign,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "إجمالي الأرباح",
    value: "4,250 ر.س",
    icon: TrendingUp,
    color: "from-orange-500 to-amber-500",
  },
  {
    label: "التقييم",
    value: "4.9",
    icon: CheckCircle,
    color: "from-purple-500 to-violet-500",
  },
];

const activeOrders = [
  { 
    id: "ORD-156", 
    store: "متجر الأناقة",
    storeLocation: "حي العليا",
    customer: "أحمد محمد",
    customerLocation: "حي النخيل",
    status: "جاهز للاستلام",
    amount: "15 ر.س",
    time: "منذ 10 دقائق"
  },
  { 
    id: "ORD-157", 
    store: "مطعم الشرق",
    storeLocation: "حي الملقا",
    customer: "سارة علي",
    customerLocation: "حي الربيع",
    status: "في الطريق",
    amount: "12 ر.س",
    time: "منذ 25 دقيقة"
  },
];

const completedOrders = [
  { id: "ORD-150", customer: "محمد خالد", amount: "15 ر.س", time: "12:30 م" },
  { id: "ORD-148", customer: "نورة سعد", amount: "18 ر.س", time: "11:15 ص" },
  { id: "ORD-145", customer: "عبدالله أحمد", amount: "12 ر.س", time: "10:00 ص" },
];

const statusColors: Record<string, string> = {
  "جاهز للاستلام": "bg-warning",
  "في الطريق": "bg-primary",
  "تم التسليم": "bg-success",
};

const CourierDashboard = () => {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <DashboardLayout role="courier">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، محمد</h1>
            <p className="text-muted-foreground">لديك {activeOrders.length} طلبات نشطة</p>
          </div>
          <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50">
            <span className="text-sm font-medium">حالة التوفر</span>
            <Switch 
              checked={isAvailable} 
              onCheckedChange={setIsAvailable}
            />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isAvailable ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {isAvailable ? "متاح" : "غير متاح"}
            </span>
          </div>
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

        {/* Active Orders */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-bold text-lg">الطلبات النشطة</h2>
          </div>
          <div className="divide-y divide-border">
            {activeOrders.map((order) => (
              <div key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg">{order.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {order.time}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-primary">{order.amount}</div>
                    <div className="text-xs text-muted-foreground">رسوم التوصيل</div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">الاستلام من</div>
                      <div className="font-medium">{order.store}</div>
                      <div className="text-sm text-muted-foreground">{order.storeLocation}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <Navigation className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">التوصيل إلى</div>
                      <div className="font-medium">{order.customer}</div>
                      <div className="text-sm text-muted-foreground">{order.customerLocation}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {order.status === "جاهز للاستلام" && (
                    <Button className="flex-1">تم الاستلام</Button>
                  )}
                  {order.status === "في الطريق" && (
                    <Button className="flex-1" variant="accent">تم التسليم</Button>
                  )}
                  <Button variant="outline" size="icon">
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-bold text-lg">الطلبات المكتملة اليوم</h2>
          </div>
          <div className="divide-y divide-border">
            {completedOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-sm text-muted-foreground">{order.customer}</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-semibold">{order.amount}</div>
                  <div className="text-xs text-muted-foreground">{order.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourierDashboard;
