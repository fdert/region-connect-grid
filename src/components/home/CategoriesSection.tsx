import { Link } from "react-router-dom";
import { 
  ShoppingBag, 
  Utensils, 
  Shirt, 
  Laptop, 
  Sofa, 
  Heart,
  Gamepad2,
  Car,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { 
    id: 1, 
    name: "الأزياء والموضة", 
    icon: Shirt, 
    count: 120, 
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50"
  },
  { 
    id: 2, 
    name: "المطاعم والمأكولات", 
    icon: Utensils, 
    count: 85, 
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50"
  },
  { 
    id: 3, 
    name: "الإلكترونيات", 
    icon: Laptop, 
    count: 200, 
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50"
  },
  { 
    id: 4, 
    name: "الأثاث والديكور", 
    icon: Sofa, 
    count: 65, 
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50"
  },
  { 
    id: 5, 
    name: "الصحة والجمال", 
    icon: Heart, 
    count: 95, 
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-50"
  },
  { 
    id: 6, 
    name: "الألعاب والترفيه", 
    icon: Gamepad2, 
    count: 45, 
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50"
  },
  { 
    id: 7, 
    name: "السيارات وقطع الغيار", 
    icon: Car, 
    count: 35, 
    color: "from-slate-600 to-slate-800",
    bgColor: "bg-slate-50"
  },
  { 
    id: 8, 
    name: "التسوق العام", 
    icon: ShoppingBag, 
    count: 150, 
    color: "from-primary to-emerald-600",
    bgColor: "bg-secondary"
  },
];

const CategoriesSection = () => {
  return (
    <section className="py-10 sm:py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
              تصفح حسب <span className="text-gradient">التصنيف</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              اكتشف مجموعة واسعة من التصنيفات المتنوعة
            </p>
          </div>
          <Link to="/categories" className="hidden sm:block">
            <Button variant="outline" className="gap-2">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/categories/${category.id}`}
              className="group opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
            >
              <div className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl ${category.bgColor} border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
                {/* Icon */}
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="font-bold text-sm sm:text-lg mb-0.5 sm:mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  {category.name}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {category.count} متجر
                </p>

                {/* Arrow */}
                <div className="absolute left-3 sm:left-4 bottom-3 sm:bottom-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-foreground/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 sm:mt-8 text-center sm:hidden">
          <Link to="/categories">
            <Button variant="outline" className="gap-2">
              عرض جميع التصنيفات
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
