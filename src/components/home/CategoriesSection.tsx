import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
    <section className="py-8 sm:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">
            قسّمناها لك
          </h2>
          <Link to="/categories" className="text-sm text-primary hover:underline flex items-center gap-1">
            عرض المزيد
            <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>

        {/* Carousel */}
        <Carousel
          opts={{
            align: "start",
            direction: "rtl",
          }}
          className="w-full"
        >
          <CarouselContent className="-mr-4">
            {categories.map((category, index) => {
              const bgColor = colorPalette[index % colorPalette.length];
              const productCount = storeCounts[category.id] || 0;

              return (
                <CarouselItem key={category.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pr-4">
                  <Link
                    to={`/categories/${category.id}`}
                    className="block group"
                  >
                    <div className={`relative h-40 sm:h-48 rounded-xl overflow-hidden ${bgColor} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
                      {/* Category Image */}
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name_ar}
                          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tag className="w-16 h-16 text-white/70" />
                        </div>
                      )}
                      
                      {/* Gradient overlay for text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      
                      {/* Category Name */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h4 className="text-white font-bold text-base sm:text-lg text-center line-clamp-1 drop-shadow-lg">
                          {category.name_ar}
                        </h4>
                        {productCount > 0 && (
                          <p className="text-white/80 text-xs text-center mt-1">
                            {productCount} منتج
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-4 bg-background/90 backdrop-blur border shadow-lg hover:bg-background" />
          <CarouselNext className="hidden sm:flex -right-4 bg-background/90 backdrop-blur border shadow-lg hover:bg-background" />
        </Carousel>

        {/* Mobile View All */}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/categories">
            <Button variant="outline" size="sm" className="gap-2">
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
