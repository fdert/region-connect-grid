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

// Color palette for categories
const colorPalette = [
  "bg-sky-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-cyan-500",
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
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order")
        .limit(10);

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
          <Link to="/categories" className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1">
            عرض المزيد
            <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>

        {/* Categories Grid - Compact design matching products */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {categories.map((category, index) => {
            const bgColor = colorPalette[index % colorPalette.length];
            const productCount = storeCounts[category.id] || 0;
            const IconComponent = getIconComponent(category.icon);

            return (
              <Link
                key={category.id}
                to={`/categories/${category.id}`}
                className="block group"
              >
                <div className="bg-card rounded-lg border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  {/* Category Image */}
                  <div className={`relative aspect-square ${bgColor} flex items-center justify-center`}>
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name_ar}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Category Name */}
                  <div className="p-1.5 bg-background">
                    <h4 className="font-medium text-[10px] sm:text-xs text-center line-clamp-1 text-foreground">
                      {category.name_ar}
                    </h4>
                    {productCount > 0 && (
                      <p className="text-[8px] text-muted-foreground text-center">
                        {productCount} منتج
                      </p>
                    )}
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

export default CategoriesSection;
