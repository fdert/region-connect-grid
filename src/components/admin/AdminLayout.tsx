import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingCart,
  Image,
  Palette,
  MessageSquare,
  Webhook,
  Gift,
  Wallet,
  Star,
  Headphones,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  FileText,
  Truck,
  Calculator,
  CreditCard
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", href: "/admin" },
  { icon: Store, label: "المتاجر", href: "/admin/stores" },
  { icon: Users, label: "المستخدمين", href: "/admin/users" },
  { icon: ShoppingCart, label: "الطلبات", href: "/admin/orders" },
  { icon: Gift, label: "الخدمات الخاصة", href: "/admin/special-services" },
  { icon: ShoppingCart, label: "طلبات خاصة", href: "/admin/special-orders" },
  { icon: Truck, label: "إعدادات التوصيل", href: "/admin/delivery-settings" },
  { icon: CreditCard, label: "إعدادات الدفع", href: "/admin/payment-settings" },
  { icon: LayoutDashboard, label: "محتوى الرئيسية", href: "/admin/home-content" },
  { icon: FileText, label: "الصفحات الثابتة", href: "/admin/static-pages" },
  { icon: Image, label: "البنرات", href: "/admin/banners" },
  { icon: Palette, label: "المظهر والألوان", href: "/admin/theme" },
  { icon: Webhook, label: "Webhooks", href: "/admin/webhooks" },
  { icon: MessageSquare, label: "قوالب الواتساب", href: "/admin/whatsapp" },
  { icon: Star, label: "التقييمات", href: "/admin/reviews" },
  { icon: Headphones, label: "الدعم الفني", href: "/admin/support" },
  { icon: Wallet, label: "المحافظ", href: "/admin/wallets" },
  { icon: Calculator, label: "المحاسبة والتقارير", href: "/admin/accounting" },
  { icon: Settings, label: "التصنيفات", href: "/admin/categories" },
];

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || role !== "admin")) {
      navigate("/auth/login");
    }
  }, [user, role, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 z-50 h-screen bg-card border-l transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg">لوحة الإدارة</span>}
          </Link>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 right-0 left-0 p-3 border-t bg-card">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300",
        sidebarOpen ? "lg:mr-64" : "lg:mr-20"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur border-b flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block p-2 hover:bg-muted rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
                3
              </span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                م
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
