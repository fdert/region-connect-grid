import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  Shield, 
  Headphones, 
  CreditCard,
  Zap,
  Gift,
  LucideIcon
} from "lucide-react";

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface FeaturesSettings {
  title_main?: string;
  title_highlight?: string;
  subtitle?: string;
  items?: FeatureItem[];
}

const iconMap: Record<string, LucideIcon> = {
  Truck,
  Shield,
  Headphones,
  CreditCard,
  Zap,
  Gift
};

const colorMap: Record<string, string> = {
  blue: "from-blue-500 to-cyan-500",
  green: "from-emerald-500 to-teal-500",
  purple: "from-purple-500 to-violet-500",
  orange: "from-orange-500 to-amber-500",
  pink: "from-pink-500 to-rose-500",
  primary: "from-primary to-emerald-600",
};

const defaultItems: FeatureItem[] = [
  {
    icon: "Truck",
    title: "توصيل سريع",
    description: "توصيل لباب منزلك في أسرع وقت ممكن مع تتبع مباشر للطلب",
    color: "blue",
  },
  {
    icon: "Shield",
    title: "دفع آمن",
    description: "جميع معاملاتك محمية بأحدث تقنيات التشفير والأمان",
    color: "green",
  },
  {
    icon: "Headphones",
    title: "دعم متواصل",
    description: "فريق دعم متاح على مدار الساعة للإجابة على استفساراتك",
    color: "purple",
  },
  {
    icon: "CreditCard",
    title: "خيارات دفع متعددة",
    description: "ادفع بالطريقة التي تناسبك: بطاقة، محفظة، أو عند الاستلام",
    color: "orange",
  },
  {
    icon: "Zap",
    title: "تجربة سلسة",
    description: "واجهة سهلة الاستخدام تجعل التسوق ممتعاً وسريعاً",
    color: "pink",
  },
  {
    icon: "Gift",
    title: "عروض حصرية",
    description: "استمتع بخصومات وعروض حصرية لعملاء المنصة",
    color: "primary",
  },
];

const defaultSettings: FeaturesSettings = {
  title_main: "لماذا",
  title_highlight: "سوقنا",
  subtitle: "نقدم لك تجربة تسوق استثنائية مع مميزات متعددة تجعل حياتك أسهل",
  items: defaultItems,
};

const FeaturesSection = forwardRef<HTMLElement, object>((_, ref) => {
  const { data: featuresSection } = useQuery({
    queryKey: ["features-section-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("settings, title_ar, subtitle_ar")
        .eq("section_key", "features")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const settings: FeaturesSettings = {
    ...defaultSettings,
    ...(featuresSection?.settings as FeaturesSettings || {})
  };

  const features = settings.items || defaultItems;

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {settings.title_main} <span className="text-primary">{settings.title_highlight}؟</span>
          </h2>
          <p className="text-muted-foreground">
            {settings.subtitle}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || Gift;
            const colorClass = colorMap[feature.color] || colorMap.primary;
            
            return (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-7 h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = "FeaturesSection";

export default FeaturesSection;
