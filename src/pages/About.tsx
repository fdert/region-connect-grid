import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Store, 
  Users, 
  Truck, 
  Shield, 
  Headphones,
  CheckCircle2,
  ArrowLeft,
  Star,
  Package,
  CreditCard
} from "lucide-react";

const stats = [
  { label: "متجر نشط", value: "500+", icon: Store },
  { label: "عميل سعيد", value: "50,000+", icon: Users },
  { label: "طلب مكتمل", value: "100,000+", icon: Package },
  { label: "مندوب توصيل", value: "200+", icon: Truck },
];

const features = [
  {
    icon: Shield,
    title: "أمان وموثوقية",
    description: "جميع المتاجر موثقة ومعتمدة لضمان تجربة تسوق آمنة"
  },
  {
    icon: Truck,
    title: "توصيل سريع",
    description: "خدمة توصيل سريعة ومتابعة مباشرة لطلبك"
  },
  {
    icon: Headphones,
    title: "دعم على مدار الساعة",
    description: "فريق دعم فني متخصص لمساعدتك في أي وقت"
  },
  {
    icon: CreditCard,
    title: "دفع آمن",
    description: "خيارات دفع متعددة ومؤمنة بالكامل"
  },
];

const About = () => {
  const { data: page, isLoading } = useQuery({
    queryKey: ["static-page", "about"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .eq("page_key", "about")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-20 gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mx-auto mb-6">
              <Store className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isLoading ? <Skeleton className="h-12 w-64 mx-auto bg-primary-foreground/20" /> : page?.title_ar || "مرحباً بك في سوقنا"}
            </h1>
            <p className="text-xl text-primary-foreground/80 mb-8">
              منصة التسوق الإلكتروني الأولى في المنطقة التي تجمع بين المتاجر والعملاء في مكان واحد
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/stores">
                <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2">
                  تصفح المتاجر
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth/register?role=merchant">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  انضم كتاجر
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-6 text-center border shadow-sm"
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : page?.content_ar ? (
              <div 
                className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: page.content_ar }}
              />
            ) : (
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-4">من نحن؟</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    سوقنا هي منصة تسوق إلكتروني متكاملة تهدف إلى ربط العملاء بأفضل المتاجر المحلية. 
                    نؤمن بأن التسوق يجب أن يكون تجربة ممتعة وسهلة، ولذلك نعمل على توفير منصة تجمع 
                    بين سهولة الاستخدام وتنوع الخيارات وضمان جودة الخدمة.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "متاجر موثقة ومعتمدة",
                      "أسعار تنافسية وعروض حصرية",
                      "توصيل سريع وآمن",
                      "دعم فني على مدار الساعة"
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/40 p-8 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-4">
                      {[Store, Users, Truck, Star].map((Icon, index) => (
                        <div 
                          key={index}
                          className="w-24 h-24 rounded-2xl bg-card shadow-lg flex items-center justify-center"
                        >
                          <Icon className="w-12 h-12 text-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">لماذا سوقنا؟</h2>
            <p className="text-muted-foreground">نقدم لك أفضل تجربة تسوق إلكتروني</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-8 md:p-12 text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              هل أنت تاجر؟
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              انضم إلى آلاف التجار الناجحين على منصتنا وابدأ في بيع منتجاتك لعملاء أكثر
            </p>
            <Link to="/auth/register?role=merchant">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2">
                سجّل متجرك الآن
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default About;
