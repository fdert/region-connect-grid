import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 gradient-hero opacity-95" />
      
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">منصة التسوق الأولى في المنطقة</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-primary-foreground mb-6 leading-tight animate-slide-up">
            اكتشف أفضل المتاجر
            <br />
            <span className="text-accent">في مكان واحد</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-slide-up stagger-1">
            تسوّق من مئات المتاجر المحلية والعالمية، واستمتع بتجربة تسوق سهلة وآمنة مع خدمة توصيل سريعة لباب منزلك.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10 animate-slide-up stagger-2">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن منتج، متجر، أو خدمة..."
                className="w-full h-14 md:h-16 px-6 pr-14 rounded-2xl bg-background/95 backdrop-blur-xl border-2 border-transparent focus:border-accent shadow-xl focus:shadow-2xl outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-primary-foreground" />
              </div>
              <Button 
                variant="accent" 
                size="lg"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl"
              >
                بحث
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-3">
            <Link to="/stores">
              <Button variant="hero" size="xl">
                تصفح المتاجر
              </Button>
            </Link>
            <Link to="/auth/register?role=merchant">
              <Button variant="glass" size="xl" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                انضم كتاجر
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 mt-16 animate-slide-up stagger-4">
            {[
              { value: "+500", label: "متجر نشط" },
              { value: "+10K", label: "منتج متاح" },
              { value: "+50K", label: "عميل سعيد" },
            ].map((stat, i) => (
              <div key={i} className="text-center glass-dark rounded-2xl p-4 md:p-6">
                <div className="text-2xl md:text-4xl font-black text-accent mb-1">{stat.value}</div>
                <div className="text-sm md:text-base text-primary-foreground/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
