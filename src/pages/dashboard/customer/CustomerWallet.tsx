import DashboardLayout from "../DashboardLayout";
import { 
  Wallet,
  Gift,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CustomerWallet = () => {
  const { user } = useAuth();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['customer-wallet-details', user?.id],
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

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['customer-wallet-transactions', user?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          order:orders(order_number)
        `)
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id
  });

  const { data: pointsTransactions } = useQuery({
    queryKey: ['customer-points-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_transactions')
        .select(`
          *,
          order:orders(order_number)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: rewards } = useQuery({
    queryKey: ['available-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const balance = wallet?.balance || 0;
  const points = wallet?.points || 0;
  const targetPoints = 2000;
  const pointsProgress = Math.min((points / targetPoints) * 100, 100);

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar });
  };

  if (walletLoading) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">المحفظة</h1>
          <p className="text-muted-foreground">رصيدك ونقاطك ومعاملاتك</p>
        </div>

        {/* Balance and Points Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-6 text-primary-foreground">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-primary-foreground/20">
                رصيد المحفظة
              </span>
            </div>
            <div className="text-4xl font-bold mb-2">{balance.toLocaleString()} ر.س</div>
            <p className="text-primary-foreground/80 text-sm">متاح للاستخدام في طلباتك</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 text-primary-foreground">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-primary-foreground/20">
                نقاط المكافآت
              </span>
            </div>
            <div className="text-4xl font-bold mb-2">{points.toLocaleString()}</div>
            <div className="mb-2">
              <Progress value={pointsProgress} className="h-2 bg-primary-foreground/20" />
            </div>
            <p className="text-primary-foreground/80 text-sm">
              {targetPoints - points > 0 
                ? `${(targetPoints - points).toLocaleString()} نقطة للهدف التالي`
                : 'وصلت للهدف! استبدل نقاطك بمكافآت'}
            </p>
          </div>
        </div>

        {/* Available Rewards */}
        {rewards && rewards.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-bold text-lg">المكافآت المتاحة</h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.slice(0, 6).map((reward) => (
                <div key={reward.id} className="border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    {reward.image_url ? (
                      <img src={reward.image_url} alt={reward.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{reward.name}</h3>
                      <p className="text-xs text-muted-foreground">{reward.points_required.toLocaleString()} نقطة</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant={points >= reward.points_required ? "default" : "outline"}
                    className="w-full"
                    disabled={points < reward.points_required}
                  >
                    {points >= reward.points_required ? 'استبدال' : 'نقاط غير كافية'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Tabs */}
        <Tabs defaultValue="wallet">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="wallet">معاملات المحفظة</TabsTrigger>
            <TabsTrigger value="points">معاملات النقاط</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="mt-6">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-bold text-lg">سجل المعاملات</h2>
              </div>

              {transactionsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'credit' || tx.amount > 0
                            ? 'bg-success/10' 
                            : 'bg-destructive/10'
                        }`}>
                          {tx.type === 'credit' || tx.amount > 0 ? (
                            <ArrowUpRight className="w-5 h-5 text-success" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{tx.description || tx.type}</div>
                          {tx.order?.order_number && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" />
                              {tx.order.order_number}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${
                          tx.type === 'credit' || tx.amount > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {tx.type === 'credit' || tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()} ر.س
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tx.created_at || '')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Wallet className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-bold text-lg mb-2">لا توجد معاملات</h3>
                  <p className="text-muted-foreground">ستظهر معاملاتك هنا</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="points" className="mt-6">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-bold text-lg">سجل النقاط</h2>
              </div>

              {pointsTransactions && pointsTransactions.length > 0 ? (
                <div className="divide-y divide-border">
                  {pointsTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.points > 0 ? 'bg-success/10' : 'bg-destructive/10'
                        }`}>
                          {tx.points > 0 ? (
                            <TrendingUp className="w-5 h-5 text-success" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{tx.description || tx.type}</div>
                          {tx.order?.order_number && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" />
                              {tx.order.order_number}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${tx.points > 0 ? 'text-success' : 'text-destructive'}`}>
                          {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()} نقطة
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tx.created_at || '')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Gift className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-bold text-lg mb-2">لا توجد معاملات نقاط</h3>
                  <p className="text-muted-foreground">اكسب نقاط من طلباتك</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CustomerWallet;
