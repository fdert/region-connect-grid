import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Package, 
  Wallet, 
  Settings,
  LogOut,
  MapPin,
  User,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: "الرئيسية", href: "/courier" },
  { icon: Package, label: "الطلبات", href: "/courier/orders" },
  { icon: Wallet, label: "الأرباح", href: "/courier/earnings" },
  { icon: Settings, label: "الإعدادات", href: "/courier/settings" },
];

const MobileLayout = ({ children, title, showHeader = true }: MobileLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ['courier-profile-mobile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch active orders count
  const { data: activeOrdersCount } = useQuery({
    queryKey: ['courier-active-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('courier_id', user?.id)
        .in('status', ['assigned_to_courier', 'ready', 'picked_up', 'on_the_way']);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    } else {
      toast.success("تم تسجيل الخروج بنجاح");
      navigate("/auth/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Status bar padding for native apps */}
      <div className="h-[env(safe-area-inset-top)] bg-primary" />

      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm">{profile?.full_name || 'مندوب'}</div>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <MapPin className="w-3 h-3" />
                  <span>{isOnline ? 'متصل' : 'غير متصل'}</span>
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/10 relative"
            >
              <Bell className="w-5 h-5" />
              {(activeOrdersCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {activeOrdersCount}
                </span>
              )}
            </Button>
          </div>
          
          {/* Page Title */}
          {title && (
            <div className="px-4 pb-3">
              <h1 className="text-xl font-bold">{title}</h1>
            </div>
          )}
        </header>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all min-w-[60px]",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
