import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
}

// Light pastel color palette for category cards
const categoryColorPalette = [
  { bg: "bg-orange-100", iconBg: "bg-orange-400", text: "text-orange-900" },
  { bg: "bg-emerald-100", iconBg: "bg-emerald-400", text: "text-emerald-900" },
  { bg: "bg-sky-100", iconBg: "bg-sky-400", text: "text-sky-900" },
  { bg: "bg-rose-100", iconBg: "bg-rose-400", text: "text-rose-900" },
  { bg: "bg-violet-100", iconBg: "bg-violet-400", text: "text-violet-900" },
  { bg: "bg-amber-100", iconBg: "bg-amber-400", text: "text-amber-900" },
  { bg: "bg-teal-100", iconBg: "bg-teal-400", text: "text-teal-900" },
  { bg: "bg-indigo-100", iconBg: "bg-indigo-400", text: "text-indigo-900" },
  { bg: "bg-pink-100", iconBg: "bg-pink-400", text: "text-pink-900" },
  { bg: "bg-cyan-100", iconBg: "bg-cyan-400", text: "text-cyan-900" },
];

// Default category icons based on common category types
const getDefaultCategoryIcon = (nameAr: string): string => {
  const name = nameAr.toLowerCase();
  
  if (name.includes("إلكترونيات") || name.includes("أجهزة") || name.includes("كمبيوتر")) {
    return "💻";
  }
  if (name.includes("مطاعم") || name.includes("طعام") || name.includes("مأكولات")) {
    return "🍽️";
  }
  if (name.includes("ملابس") || name.includes("أزياء") || name.includes("موضة")) {
    return "👗";
  }
  if (name.includes("ألعاب") || name.includes("ترفيه") || name.includes("لعب")) {
    return "🎮";
  }
  if (name.includes("صحة") || name.includes("جمال") || name.includes("تجميل")) {
    return "💄";
  }
  if (name.includes("أثاث") || name.includes("ديكور") || name.includes("منزل")) {
    return "🛋️";
  }
  if (name.includes("خضار") || name.includes("فاكهة") || name.includes("بقالة")) {
    return "🥬";
  }
  if (name.includes("حلويات") || name.includes("شوكولاتة")) {
    return "🍫";
  }
  if (name.includes("مشروبات") || name.includes("عصير")) {
    return "🧃";
  }
  if (name.includes("ورد") || name.includes("زهور") || name.includes("هدايا")) {
    return "💐";
  }
  if (name.includes("صيدلية") || name.includes("أدوية")) {
    return "💊";
  }
  if (name.includes("رياضة") || name.includes("لياقة")) {
    return "⚽";
  }
  if (name.includes("كتب") || name.includes("مكتبة") || name.includes("قرطاسية")) {
    return "📚";
  }
  if (name.includes("حيوانات") || name.includes("أليفة")) {
    return "🐾";
  }
  if (name.includes("سيارات") || name.includes("قطع غيار")) {
    return "🚗";
  }
  
  return "🛍️";
};

// Default category images based on common category types
const getDefaultCategoryImage = (nameAr: string): string => {
  const name = nameAr.toLowerCase();
  
  if (name.includes("إلكترونيات") || name.includes("أجهزة")) {
    return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop";
  }
  if (name.includes("مطاعم") || name.includes("طعام") || name.includes("مأكولات")) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop";
  }
  if (name.includes("ملابس") || name.includes("أزياء") || name.includes("موضة")) {
    return "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop";
  }
  if (name.includes("ألعاب") || name.includes("ترفيه")) {
    return "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=200&h=200&fit=crop";
  }
  if (name.includes("صحة") || name.includes("جمال")) {
    return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop";
  }
  if (name.includes("أثاث") || name.includes("ديكور")) {
    return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop";
  }
  if (name.includes("خضار") || name.includes("فاكهة") || name.includes("بقالة")) {
    return "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop";
  }
  
  return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop";
};

const CategoryQuickNav = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch all active categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // Fetch store counts per category
      if (categoriesData && categoriesData.length > 0) {
        const categoryIds = categoriesData.map(c => c.id);
        const { data: storesData, error: storesError } = await supabase
          .from("store_categories")
          .select("category_id")
          .in("category_id", categoryIds);

        if (!storesError && storesData) {
          const counts: Record<string, number> = {};
          storesData.forEach(s => {
            if (s.category_id) {
              counts[s.category_id] = (counts[s.category_id] || 0) + 1;
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

  if (isLoading) {
    return (
      <section className="py-6 sm:py-10 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
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
    <section className="py-6 sm:py-10 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              تصفح المتاجر حسب التصنيف
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              تصفح المتاجر حسب التصنيف المناسب لك
            </p>
          </div>
          <Link 
            to="/categories" 
            className="text-primary text-sm font-medium hover:underline"
          >
            عرض الكل
          </Link>
        </div>

        {/* Categories Grid - Reference Design Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const colorScheme = categoryColorPalette[index % categoryColorPalette.length];
            const categoryIcon = category.icon || getDefaultCategoryIcon(category.name_ar);
            const categoryImage = category.image_url;
            const storeCount = storeCounts[category.id] || 0;

            return (
              <Link
                key={category.id}
                to={`/stores?category=${category.id}`}
                className="block group"
              >
                <div className={`${colorScheme.bg} rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-primary/20`}>
                  {/* Icon/Image Container */}
                  <div className="relative pt-6 pb-4 flex items-center justify-center">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 ${colorScheme.iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {categoryImage ? (
                        <img 
                          src={categoryImage} 
                          alt={category.name_ar}
                          className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<span class="text-3xl sm:text-4xl text-white">${categoryIcon}</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-3xl sm:text-4xl text-white">{categoryIcon}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Category Info */}
                  <div className={`px-3 pb-4 text-center ${colorScheme.text}`}>
                    <h3 className="font-bold text-sm sm:text-base leading-tight mb-2">
                      {category.name_ar}
                    </h3>
                    {/* Description - Hidden on mobile */}
                    <p className="text-xs opacity-70 hidden sm:block mb-2 line-clamp-2">
                      {getCategoryDescription(category.name_ar)}
                    </p>
                    {/* Store Count */}
                    <div className="flex items-center justify-center gap-1 text-xs opacity-80">
                      <Store className="w-3 h-3" />
                      <span>{storeCount} متجر</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Helper function for category descriptions
function getCategoryDescription(nameAr: string): string {
  const name = nameAr.toLowerCase();
  
  if (name.includes("إلكترونيات")) return "هواتف، أجهزة كمبيوتر، إلكترونيات منزلية";
  if (name.includes("مطاعم") || name.includes("مأكولات")) return "مطاعم، وجبات سريعة، حلويات، مشروبات";
  if (name.includes("ملابس") || name.includes("أزياء") || name.includes("موضة")) return "ملابس رجالية ونسائية، أحذية، إكسسوارات";
  if (name.includes("ألعاب") || name.includes("ترفيه")) return "ألعاب فيديو، ألعاب أطفال، ترفيه";
  if (name.includes("صحة") || name.includes("جمال")) return "مستحضرات تجميل، عناية شخصية، صيدليات";
  if (name.includes("أثاث") || name.includes("ديكور")) return "أثاث منزلي، ديكورات، مفروشات";
  if (name.includes("خضار") || name.includes("بقالة")) return "خضروات، فواكه، مواد غذائية";
  
  return "تصفح المنتجات والعروض";
}

export default CategoryQuickNav;
