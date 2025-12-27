import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle
} from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSettings {
  quick_links?: FooterLink[];
  merchant_links?: FooterLink[];
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    whatsapp?: string;
    youtube?: string;
    tiktok?: string;
  };
  brand?: {
    name?: string;
    description?: string;
    copyright?: string;
  };
  legal?: {
    privacy_policy?: string;
    terms?: string;
  };
}

const defaultSettings: FooterSettings = {
  quick_links: [
    { label: "الرئيسية", href: "/" },
    { label: "المتاجر", href: "/stores" },
    { label: "التصنيفات", href: "/categories" },
    { label: "العروض", href: "/offers" },
    { label: "عن المنصة", href: "/about" },
  ],
  merchant_links: [
    { label: "انضم كتاجر", href: "/auth/register?role=merchant" },
    { label: "لوحة التحكم", href: "/merchant/dashboard" },
    { label: "الأسعار والباقات", href: "/pricing" },
    { label: "الشروط والأحكام", href: "/terms" },
  ],
  contact: {
    phone: "+966 50 123 4567",
    email: "support@souqna.com",
    address: "المملكة العربية السعودية، الرياض"
  },
  social: {
    facebook: "#",
    twitter: "#",
    instagram: "#"
  },
  brand: {
    name: "سوقنا",
    description: "منصة سوقنا هي الوجهة الأولى للتسوق الإلكتروني في المنطقة، نجمع لك أفضل المتاجر والمنتجات في مكان واحد.",
    copyright: "© 2024 سوقنا. جميع الحقوق محفوظة."
  },
  legal: {
    privacy_policy: "/privacy",
    terms: "/terms"
  }
};

const Footer = () => {
  const { data: footerSettings } = useQuery({
    queryKey: ["footer-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["footer_quick_links", "footer_merchant_links", "footer_contact", "footer_social", "footer_brand", "footer_legal_links"]);

      if (error) throw error;
      
      const settings: FooterSettings = { ...defaultSettings };
      
      data?.forEach(item => {
        const value = item.value as Record<string, any>;
        switch (item.key) {
          case "footer_quick_links":
            settings.quick_links = value.links || defaultSettings.quick_links;
            break;
          case "footer_merchant_links":
            settings.merchant_links = value.links || defaultSettings.merchant_links;
            break;
          case "footer_contact":
            settings.contact = { ...defaultSettings.contact, ...value };
            break;
          case "footer_social":
            settings.social = { ...defaultSettings.social, ...value };
            break;
          case "footer_brand":
            settings.brand = { ...defaultSettings.brand, ...value };
            break;
          case "footer_legal_links":
            settings.legal = { ...defaultSettings.legal, ...value };
            break;
        }
      });
      
      return settings;
    },
  });

  const settings = footerSettings || defaultSettings;

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
              <span className="text-xl font-bold">{settings.brand?.name}</span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed">
              {settings.brand?.description}
            </p>
            <div className="flex gap-3">
              {settings.social?.facebook && (
                <a 
                  href={settings.social.facebook} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings.social?.twitter && (
                <a 
                  href={settings.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {settings.social?.instagram && (
                <a 
                  href={settings.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings.social?.youtube && (
                <a 
                  href={settings.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {settings.social?.whatsapp && (
                <a 
                  href={`https://wa.me/${settings.social.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              {settings.quick_links?.map((link, index) => (
                <li key={index}>
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
              {settings.merchant_links?.map((link, index) => (
                <li key={index}>
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
              {settings.contact?.phone && (
                <li className="flex items-center gap-3 text-background/70 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span dir="ltr">{settings.contact.phone}</span>
                </li>
              )}
              {settings.contact?.email && (
                <li className="flex items-center gap-3 text-background/70 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{settings.contact.email}</span>
                </li>
              )}
              {settings.contact?.address && (
                <li className="flex items-start gap-3 text-background/70 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <span>{settings.contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/60 text-sm">
            {settings.brand?.copyright}
          </p>
          <div className="flex gap-6 text-sm">
            {settings.legal?.privacy_policy && (
              <Link to={settings.legal.privacy_policy} className="text-background/60 hover:text-primary transition-colors">
                سياسة الخصوصية
              </Link>
            )}
            {settings.legal?.terms && (
              <Link to={settings.legal.terms} className="text-background/60 hover:text-primary transition-colors">
                الشروط والأحكام
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
