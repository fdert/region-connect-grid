import MobileLayout from "@/components/courier/MobileLayout";
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  DollarSign,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ar } from "date-fns/locale";

const MobileEarnings = () => {
  const [period, setPeriod] = useState("today");
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['courier-earnings-mobile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('courier_id', user?.id)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: wallet } = useQuery({
    queryKey: ['courier-wallet-mobile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const today = new Date();
  
  const getFilteredOrders = () => {
    if (!orders) return [];
    
    switch (period) {
      case "today":
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfDay(today) && date <= endOfDay(today);
        });
      case "week":
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfWeek(today, { locale: ar }) && date <= endOfWeek(today, { locale: ar });
        });
      case "month":
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfMonth(today) && date <= endOfMonth(today);
        });
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();
  const totalEarnings = filteredOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const totalDeliveries = filteredOrders.length;

  // Calculate previous period
  const getPreviousPeriodOrders = () => {
    if (!orders) return [];
    
    switch (period) {
      case "today":
        const yesterday = subDays(today, 1);
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfDay(yesterday) && date <= endOfDay(yesterday);
        });
      case "week":
        const lastWeekStart = subDays(startOfWeek(today, { locale: ar }), 7);
        const lastWeekEnd = subDays(endOfWeek(today, { locale: ar }), 7);
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= lastWeekStart && date <= lastWeekEnd;
        });
      case "month":
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= lastMonthStart && date <= lastMonthEnd;
        });
      default:
        return [];
    }
  };

  const previousOrders = getPreviousPeriodOrders();
  const previousEarnings = previousOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const earningsChange = previousEarnings > 0 ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 : 0;
  const isPositive = earningsChange >= 0;

  const periodLabels: Record<string, string> = {
    today: "اليوم",
    week: "هذا الأسبوع",
    month: "هذا الشهر",
    all: "الكل"
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM - hh:mm a', { locale: ar });
  };

  if (isLoading) {
    return (
      <MobileLayout title="الأرباح">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="الأرباح">
      <div className="p-4 space-y-4">
        {/* Period Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(periodLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={period === key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(key)}
              className="rounded-full whitespace-nowrap"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Wallet className="w-5 h-5" />
            <span className="text-sm">{periodLabels[period]}</span>
          </div>
          <div className="text-4xl font-bold mb-2">{totalEarnings.toLocaleString()} ر.س</div>
          
          {period !== 'all' && (
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{isPositive ? '+' : ''}{earningsChange.toFixed(1)}% عن الفترة السابقة</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Package className="w-4 h-4" />
              <span className="text-sm">توصيلات</span>
            </div>
            <div className="text-2xl font-bold">{totalDeliveries}</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">رصيد المحفظة</span>
            </div>
            <div className="text-2xl font-bold">{wallet?.balance?.toLocaleString() || 0} ر.س</div>
          </div>
        </div>

        {/* Recent Earnings */}
        <div>
          <h2 className="font-bold text-lg mb-3">آخر الأرباح</h2>
          {filteredOrders.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد أرباح في هذه الفترة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.slice(0, 10).map((order) => (
                <div 
                  key={order.id} 
                  className="bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm">{order.order_number}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(order.updated_at || order.created_at || '')}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-green-500">+{order.delivery_fee || 0} ر.س</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileEarnings;
