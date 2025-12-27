import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, Truck, ArrowLeft } from "lucide-react";

interface CTASettings {
  merchant_title?: string;
  merchant_description?: string;
  merchant_features?: string[];
  merchant_button?: string;
  courier_title?: string;
  courier_description?: string;
  courier_features?: string[];
  courier_button?: string;
}

const defaultSettings: CTASettings = {
  merchant_title: "هل أنت تاجر؟",
  merchant_description: "انضم إلى منصة سوقنا وابدأ ببيع منتجاتك لآلاف العملاء. نوفر لك كل الأدوات التي تحتاجها لإدارة متجرك بسهولة.",
  merchant_features: ["لوحة تحكم متكاملة", "تقارير وإحصائيات مفصلة", "دعم فني على مدار الساعة"],
  merchant_button: "سجّل كتاجر الآن",
  courier_title: "اعمل كمندوب توصيل",
  courier_description: "انضم لفريق التوصيل واحصل على دخل إضافي بمرونة تامة. اختر أوقات عملك واستمتع بحرية العمل المستقل.",
  courier_features: ["دخل مرن ومجزي", "اختر أوقات عملك", "تطبيق سهل الاستخدام"],
  courier_button: "انضم كمندوب"
};

const CTASection = forwardRef<HTMLElement, object>((_, ref) => {
  const { data: ctaSection } = useQuery({
    queryKey: ["cta-section-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("settings")
        .eq("section_key", "cta")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const settings: CTASettings = {
    ...defaultSettings,
    ...(ctaSection?.settings as CTASettings || {})
  };

  return (
    <section ref={ref} className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Merchant CTA */}
          <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 md:p-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mb-6">
                <Store className="w-8 h-8 text-primary-foreground" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                {settings.merchant_title}
              </h3>
              <p className="text-primary-foreground/80 mb-6 max-w-md">
                {settings.merchant_description}
              </p>
              
              <ul className="space-y-2 mb-8 text-primary-foreground/90">
                {settings.merchant_features?.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/auth/register?role=merchant">
                <Button variant="accent" size="lg" className="gap-2">
                  {settings.merchant_button}
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Courier CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-foreground p-8 md:p-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-6">
                <Truck className="w-8 h-8 text-accent-foreground" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-background mb-4">
                {settings.courier_title}
              </h3>
              <p className="text-background/70 mb-6 max-w-md">
                {settings.courier_description}
              </p>
              
              <ul className="space-y-2 mb-8 text-background/80">
                {settings.courier_features?.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/auth/register?role=courier">
                <Button variant="hero" size="lg" className="gap-2">
                  {settings.courier_button}
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
