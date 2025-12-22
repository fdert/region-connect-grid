import { useState, useEffect } from "react";
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
  ArrowLeft,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
}

// Map icon names to Lucide icons
const iconMap: Record<string, any> = {
  "shirt": Shirt,
  "utensils": Utensils,
  "laptop": Laptop,
  "sofa": Sofa,
  "heart": Heart,
  "gamepad2": Gamepad2,
  "car": Car,
  "shopping-bag": ShoppingBag,
};

// Color palette for categories
const colorPalette = [
  { color: "from-pink-500 to-rose-500", bgColor: "bg-pink-50" },
  { color: "from-orange-500 to-amber-500", bgColor: "bg-orange-50" },
  { color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-50" },
  { color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50" },
  { color: "from-red-500 to-pink-500", bgColor: "bg-red-50" },
  { color: "from-purple-500 to-violet-500", bgColor: "bg-purple-50" },
  { color: "from-slate-600 to-slate-800", bgColor: "bg-slate-50" },
  { color: "from-primary to-emerald-600", bgColor: "bg-secondary" },
];

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order")
        .limit(8);

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // Fetch product counts per category
      if (categoriesData && categoriesData.length > 0) {
        const categoryIds = categoriesData.map(c => c.id);
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("category_id")
          .eq("is_active", true)
          .in("category_id", categoryIds);

        if (!productsError && productsData) {
          const counts: Record<string, number> = {};
          productsData.forEach(p => {
            if (p.category_id) {
              counts[p.category_id] = (counts[p.category_id] || 0) + 1;
            }
          });
          setStoreCounts(counts);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Tag;
    return iconMap[iconName.toLowerCase()] || Tag;
  };

  if (isLoading) {
    return (
      <section className="py-10 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

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
          {categories.map((category, index) => {
            const Icon = getIcon(category.icon);
            const palette = colorPalette[index % colorPalette.length];
            const productCount = storeCounts[category.id] || 0;

            return (
              <Link
                key={category.id}
                to={`/categories/${category.id}`}
                className="group opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
              >
                <div className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl ${palette.bgColor} border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
                  {/* Icon or Image */}
                  {category.image_url ? (
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <img 
                        src={category.image_url} 
                        alt={category.name_ar}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${palette.color} flex items-center justify-center mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                    </div>
                  )}

                  {/* Content */}
                  <h3 className="font-bold text-sm sm:text-lg mb-0.5 sm:mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {category.name_ar}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {productCount} منتج
                  </p>

                  {/* Arrow */}
                  <div className="absolute left-3 sm:left-4 bottom-3 sm:bottom-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-foreground/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
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