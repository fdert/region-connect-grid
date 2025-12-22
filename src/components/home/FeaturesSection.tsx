import { 
  Truck, 
  Shield, 
  Headphones, 
  CreditCard,
  Zap,
  Gift
} from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "توصيل سريع",
    description: "توصيل لباب منزلك في أسرع وقت ممكن مع تتبع مباشر للطلب",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "دفع آمن",
    description: "جميع معاملاتك محمية بأحدث تقنيات التشفير والأمان",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Headphones,
    title: "دعم متواصل",
    description: "فريق دعم متاح على مدار الساعة للإجابة على استفساراتك",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: CreditCard,
    title: "خيارات دفع متعددة",
    description: "ادفع بالطريقة التي تناسبك: بطاقة، محفظة، أو عند الاستلام",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Zap,
    title: "تجربة سلسة",
    description: "واجهة سهلة الاستخدام تجعل التسوق ممتعاً وسريعاً",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Gift,
    title: "عروض حصرية",
    description: "استمتع بخصومات وعروض حصرية لعملاء المنصة",
    color: "from-primary to-emerald-600",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            لماذا <span className="text-gradient">سوقنا</span>؟
          </h2>
          <p className="text-muted-foreground">
            نقدم لك تجربة تسوق استثنائية مع مميزات متعددة تجعل حياتك أسهل
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
