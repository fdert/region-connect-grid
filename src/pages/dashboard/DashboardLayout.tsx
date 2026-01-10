import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Store, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronLeft,
  Wallet,
  FileText,
  MessageSquare,
  Truck,
  BarChart3,
  Image,
  Palette,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "admin" | "merchant" | "courier" | "customer";
}

const menuItems = {
  admin: [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/admin" },
    { icon: Users, label: "المستخدمين", href: "/admin/users" },
    { icon: Store, label: "المتاجر", href: "/admin/stores" },
    { icon: Package, label: "الطلبات", href: "/admin/orders" },
    { icon: Truck, label: "المناديب", href: "/admin/couriers" },
    { icon: BarChart3, label: "التقارير المالية", href: "/admin/reports" },
    { icon: MessageSquare, label: "الدعم الفني", href: "/admin/support" },
    { icon: Image, label: "البنرات الإعلانية", href: "/admin/banners" },
    { icon: Palette, label: "تخصيص المتجر", href: "/admin/customize" },
    { icon: Settings, label: "الإعدادات", href: "/admin/settings" },
  ],
  merchant: [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/merchant" },
    { icon: ShoppingBag, label: "المنتجات", href: "/merchant/products" },
    { icon: Package, label: "الطلبات", href: "/merchant/orders" },
    { icon: BarChart3, label: "التقارير", href: "/merchant/reports" },
    { icon: Calculator, label: "المالية", href: "/merchant/finance" },
    { icon: MessageSquare, label: "الدعم", href: "/merchant/support" },
    { icon: Settings, label: "إعدادات المتجر", href: "/merchant/settings" },
  ],
  courier: [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/courier" },
    { icon: Package, label: "الطلبات", href: "/courier/orders" },
    { icon: Wallet, label: "الأرباح", href: "/courier/earnings" },
    { icon: Settings, label: "الإعدادات", href: "/courier/settings" },
  ],
  customer: [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/customer" },
    { icon: Package, label: "طلباتي", href: "/customer/orders" },
    { icon: Wallet, label: "المحفظة", href: "/customer/wallet" },
    { icon: MessageSquare, label: "الدعم", href: "/customer/support" },
    { icon: Settings, label: "الإعدادات", href: "/customer/settings" },
  ],
};

const roleLabels = {
  admin: "مدير النظام",
  merchant: "لوحة التاجر",
  courier: "لوحة المندوب",
  customer: "حسابي",
};

const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const items = menuItems[role];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-64 bg-card border-l border-border transform transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-bold text-primary block">سوقنا</span>
                <span className="text-xs text-muted-foreground">{roleLabels[role]}</span>
              </div>
            </Link>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) {
                  toast.error("حدث خطأ أثناء تسجيل الخروج");
                } else {
                  toast.success("تم تسجيل الخروج بنجاح");
                  navigate("/auth/login");
                }
              }}
            >
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:mr-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                الرئيسية
              </Link>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{roleLabels[role]}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-destructive" />
              </Button>
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                م
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
