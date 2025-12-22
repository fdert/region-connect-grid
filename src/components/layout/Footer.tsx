import { Link } from "react-router-dom";
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Twitter,
  Instagram
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">سوقنا</span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed">
              منصة سوقنا هي الوجهة الأولى للتسوق الإلكتروني في المنطقة، 
              نجمع لك أفضل المتاجر والمنتجات في مكان واحد.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              {[
                { label: "الرئيسية", href: "/" },
                { label: "المتاجر", href: "/stores" },
                { label: "التصنيفات", href: "/categories" },
                { label: "العروض", href: "/offers" },
                { label: "عن المنصة", href: "/about" },
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    className="text-background/70 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Merchants */}
          <div>
            <h3 className="font-bold text-lg mb-4">للتجار</h3>
            <ul className="space-y-2">
              {[
                { label: "انضم كتاجر", href: "/auth/register?role=merchant" },
                { label: "لوحة التحكم", href: "/merchant/dashboard" },
                { label: "الأسعار والباقات", href: "/pricing" },
                { label: "الشروط والأحكام", href: "/terms" },
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    className="text-background/70 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">تواصل معنا</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Phone className="w-4 h-4 text-primary" />
                <span dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-center gap-3 text-background/70 text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span>support@souqna.com</span>
              </li>
              <li className="flex items-start gap-3 text-background/70 text-sm">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>المملكة العربية السعودية، الرياض</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/60 text-sm">
            © 2024 سوقنا. جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="/privacy" className="text-background/60 hover:text-primary transition-colors">
              سياسة الخصوصية
            </Link>
            <Link to="/terms" className="text-background/60 hover:text-primary transition-colors">
              الشروط والأحكام
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
