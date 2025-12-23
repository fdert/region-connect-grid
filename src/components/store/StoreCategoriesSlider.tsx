import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tag, ArrowLeft, ArrowRight } from "lucide-react";
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

interface StoreCategoriesSliderProps {
  storeId: string;
}

const StoreCategoriesSlider = ({ storeId }: StoreCategoriesSliderProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, [storeId]);

  const fetchCategories = async () => {
    try {
      // Get unique category IDs from store products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("category_id")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .not("category_id", "is", null);

      if (productsError) throw productsError;

      const categoryIds = [...new Set(productsData?.map(p => p.category_id).filter(Boolean))];

      if (categoryIds.length === 0) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .in("id", categoryIds)
        .eq("is_active", true)
        .order("sort_order");

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 w-40 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">التصنيفات</h3>
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
        <CarouselContent className="-mr-3">
          {categories.map((category, index) => {
            const bgColor = colorPalette[index % colorPalette.length];

            return (
              <CarouselItem key={category.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pr-3">
                <Link
                  to={`/categories/${category.id}`}
                  className="block group"
                >
                  <div className={`relative h-32 sm:h-36 rounded-xl overflow-hidden ${bgColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
                    {/* Category Image */}
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name_ar}
                        className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tag className="w-12 h-12 text-white/70" />
                      </div>
                    )}
                    
                    {/* Gradient overlay for text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Category Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="text-white font-bold text-sm sm:text-base text-center line-clamp-1 drop-shadow-md">
                        {category.name_ar}
                      </h4>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-4 bg-background/80 backdrop-blur border-0 shadow-lg" />
        <CarouselNext className="hidden sm:flex -right-4 bg-background/80 backdrop-blur border-0 shadow-lg" />
      </Carousel>
    </div>
  );
};

export default StoreCategoriesSlider;
