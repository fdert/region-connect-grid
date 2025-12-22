import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  Utensils, 
  Shirt, 
  Laptop, 
  Sofa, 
  Heart,
  Gamepad2,
  Car,
  ArrowLeft,
  Store
} from "lucide-react";

const categories = [
  { 
    id: "fashion", 
    name: "الأزياء والموضة", 
    icon: Shirt, 
    count: 120, 
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    description: "ملابس رجالية ونسائية، أحذية، إكسسوارات"
  },
  { 
    id: "restaurants", 
    name: "المطاعم والمأكولات", 
    icon: Utensils, 
    count: 85, 
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50",
    description: "مطاعم، وجبات سريعة، حلويات، مشروبات"
  },
  { 
    id: "electronics", 
    name: "الإلكترونيات", 
    icon: Laptop, 
    count: 200, 
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    description: "هواتف، أجهزة كمبيوتر، إلكترونيات منزلية"
  },
  { 
    id: "furniture", 
    name: "الأثاث والديكور", 
    icon: Sofa, 
    count: 65, 
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
    description: "أثاث منزلي، ديكورات، مفروشات"
  },
  { 
    id: "health", 
    name: "الصحة والجمال", 
    icon: Heart, 
    count: 95, 
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-50",
    description: "مستحضرات تجميل، عناية شخصية، صيدليات"
  },
  { 
    id: "gaming", 
    name: "الألعاب والترفيه", 
    icon: Gamepad2, 
    count: 45, 
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50",
    description: "ألعاب فيديو، ألعاب أطفال، ترفيه"
  },
  { 
    id: "automotive", 
    name: "السيارات وقطع الغيار", 
    icon: Car, 
    count: 35, 
    color: "from-slate-600 to-slate-800",
    bgColor: "bg-slate-50",
    description: "قطع غيار، إكسسوارات سيارات، خدمات صيانة"
  },
  { 
    id: "general", 
    name: "التسوق العام", 
    icon: ShoppingBag, 
    count: 150, 
    color: "from-primary to-emerald-600",
    bgColor: "bg-secondary",
    description: "متاجر متنوعة، منتجات عامة"
  },
];

const Categories = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">التصنيفات</h1>
          <p className="text-muted-foreground">تصفح المتاجر حسب التصنيف المناسب لك</p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/stores?category=${category.id}`}
              className="group"
            >
              <div className={`relative p-6 rounded-2xl ${category.bgColor} border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full`}>
                {/* Icon */}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4 text-primary" />
                  <span className="font-medium">{category.count} متجر</span>
                </div>

                {/* Arrow */}
                <div className="absolute left-4 bottom-4 w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Categories;
