import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { Tag, ArrowLeft } from "lucide-react";
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

// Color palette for category icons
const iconColorPalette = [
  "text-emerald-500",
  "text-rose-500",
  "text-amber-500",
  "text-violet-500",
  "text-sky-500",
  "text-teal-500",
  "text-indigo-500",
  "text-cyan-500",
  "text-pink-500",
  "text-orange-500",
];

// Helper to get Lucide icon by name
const getIconComponent = (iconName: string | null): React.ComponentType<{ className?: string }> => {
  if (!iconName) return Tag;
  
  // Capitalize first letter to match Lucide icon names
  const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[formattedName];
  
  return IconComponent || Tag;
};

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch all active categories (no limit)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");

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

  if (isLoading) {
    return (
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-44 w-48 flex-shrink-0 rounded-xl" />
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
    <section className="py-6 sm:py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold">
            قسّمناها لك
          </h2>
        </div>

        {/* Categories Grid - Design matching reference image */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3 sm:gap-4">
          {/* "All" Category First */}
          <Link
            to="/categories"
            className="block group"
          >
            <div className="bg-primary rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 aspect-square">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <span className="text-white font-semibold text-xs sm:text-sm">الكل</span>
            </div>
          </Link>
          
          {categories.map((category, index) => {
            const iconColor = iconColorPalette[index % iconColorPalette.length];
            const IconComponent = getIconComponent(category.icon);

            return (
              <Link
                key={category.id}
                to={`/categories/${category.id}`}
                className="block group"
              >
                <div className="bg-card rounded-xl border border-border/50 p-3 sm:p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 aspect-square">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center ${iconColor}`}>
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name_ar}
                        className="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-110 transition-transform duration-200"
                      />
                    ) : (
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                  <span className="text-foreground font-medium text-[10px] sm:text-xs text-center line-clamp-2 leading-tight">
                    {category.name_ar}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
