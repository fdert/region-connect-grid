import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, Truck, ArrowLeft } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
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
                هل أنت تاجر؟
              </h3>
              <p className="text-primary-foreground/80 mb-6 max-w-md">
                انضم إلى منصة سوقنا وابدأ ببيع منتجاتك لآلاف العملاء. 
                نوفر لك كل الأدوات التي تحتاجها لإدارة متجرك بسهولة.
              </p>
              
              <ul className="space-y-2 mb-8 text-primary-foreground/90">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  لوحة تحكم متكاملة
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  تقارير وإحصائيات مفصلة
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  دعم فني على مدار الساعة
                </li>
              </ul>

              <Link to="/auth/register?role=merchant">
                <Button variant="accent" size="lg" className="gap-2">
                  سجّل كتاجر الآن
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
                اعمل كمندوب توصيل
              </h3>
              <p className="text-background/70 mb-6 max-w-md">
                انضم لفريق التوصيل واحصل على دخل إضافي بمرونة تامة. 
                اختر أوقات عملك واستمتع بحرية العمل المستقل.
              </p>
              
              <ul className="space-y-2 mb-8 text-background/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  دخل مرن ومجزي
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  اختر أوقات عملك
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  تطبيق سهل الاستخدام
                </li>
              </ul>

              <Link to="/auth/register?role=courier">
                <Button variant="hero" size="lg" className="gap-2">
                  انضم كمندوب
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
