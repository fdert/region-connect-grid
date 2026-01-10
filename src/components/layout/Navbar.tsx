import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  ShoppingCart, 
  User, 
  Store, 
  Search,
  ChevronDown,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useCart } from "@/contexts/CartContext";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const { user, role } = useAuth();
  const { logoUrl } = useThemeSettings();
  const { itemCount } = useCart();

  const getDashboardLink = () => {
    switch (role) {
      case "admin":
        return "/admin";
      case "merchant":
        return "/merchant";
      case "courier":
        return "/courier";
      case "customer":
      default:
        return "/customer";
    }
  };

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/stores", label: "المتاجر" },
    { href: "/categories", label: "التصنيفات" },
    { href: "/offers", label: "العروض" },
    { href: "/about", label: "عن المنصة" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logoUrl || logo} alt="سوقنا" className="h-12 md:h-14 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "relative py-2 text-sm font-medium transition-colors duration-300",
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 gradient-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hidden md:flex"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full gradient-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <Link to={getDashboardLink()}>
                  <Button variant="default" size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    لوحة التحكم
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth/login">
                    <Button variant="ghost" size="sm">
                      تسجيل الدخول
                    </Button>
                  </Link>
                  <Link to="/auth/register">
                    <Button variant="default" size="sm">
                      حساب جديد
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="hidden md:block pb-4 animate-slide-up">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="ابحث عن منتجات، متاجر، أو خدمات..."
                className="w-full h-12 px-5 pr-12 rounded-xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 animate-slide-up">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg transition-colors",
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex gap-2 mt-4">
                {user ? (
                  <Link to={getDashboardLink()} className="flex-1">
                    <Button variant="default" className="w-full gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      لوحة التحكم
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth/login" className="flex-1">
                      <Button variant="outline" className="w-full">
                        تسجيل الدخول
                      </Button>
                    </Link>
                    <Link to="/auth/register" className="flex-1">
                      <Button variant="default" className="w-full">
                        حساب جديد
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
