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

// Color palette for category cards - vibrant and distinct (same as CategoriesSection)
const categoryColorPalette = [
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
];

// Default category images based on common category types (same as CategoriesSection)
const getDefaultCategoryImage = (nameAr: string): string => {
  const name = nameAr.toLowerCase();
  
  if (name.includes("خضار") || name.includes("فاكهة") || name.includes("طازج")) {
    return "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=300&fit=crop";
  }
  if (name.includes("حلويات") || name.includes("شوكولاتة") || name.includes("حلوى")) {
    return "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=300&fit=crop";
  }
  if (name.includes("عروض") || name.includes("تخفيضات") || name.includes("خصم")) {
    return "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop";
  }
  if (name.includes("جملة") || name.includes("بالجملة")) {
    return "https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400&h=300&fit=crop";
  }
  if (name.includes("مشروبات") || name.includes("عصير") || name.includes("ماء")) {
    return "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop";
  }
  if (name.includes("مخبوزات") || name.includes("خبز") || name.includes("معجنات")) {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop";
  }
  if (name.includes("لحوم") || name.includes("دجاج") || name.includes("بروتين")) {
    return "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=300&fit=crop";
  }
  if (name.includes("ألبان") || name.includes("حليب") || name.includes("أجبان")) {
    return "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop";
  }
  if (name.includes("مجمدات") || name.includes("مثلجات")) {
    return "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=300&fit=crop";
  }
  if (name.includes("تنظيف") || name.includes("منظفات")) {
    return "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=300&fit=crop";
  }
  if (name.includes("إلكترونيات") || name.includes("أجهزة")) {
    return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop";
  }
  if (name.includes("ملابس") || name.includes("أزياء") || name.includes("موضة")) {
    return "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop";
  }
  if (name.includes("مطاعم") || name.includes("طعام") || name.includes("وجبات") || name.includes("مأكولات")) {
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop";
  }
  if (name.includes("صيدلية") || name.includes("أدوية") || name.includes("صحة") || name.includes("جمال")) {
    return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop";
  }
  if (name.includes("ورد") || name.includes("زهور") || name.includes("هدايا")) {
    return "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=300&fit=crop";
  }
  if (name.includes("ألعاب") || name.includes("ترفيه")) {
    return "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=400&h=300&fit=crop";
  }
  if (name.includes("أثاث") || name.includes("ديكور")) {
    return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop";
  }
  
  // Default grocery/supermarket image
  return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop";
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
      <section className="py-6 sm:py-10">
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
    <section className="py-6 sm:py-10">
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

        {/* Categories Grid - Same Design as CategoriesSection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const colorScheme = categoryColorPalette[index % categoryColorPalette.length];
            const categoryImage = category.image_url || getDefaultCategoryImage(category.name_ar);
            const storeCount = storeCounts[category.id] || 0;

            return (
              <Link
                key={category.id}
                to={`/stores?category=${category.id}`}
                className="block group"
              >
                <div className={`${colorScheme.bg} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                  {/* Image Container */}
                  <div className="relative aspect-square p-4 flex items-center justify-center">
                    <div className="w-full h-full relative">
                      <img 
                        src={categoryImage} 
                        alt={category.name_ar}
                        className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getDefaultCategoryImage(category.name_ar);
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Category Name */}
                  <div className={`px-3 pb-4 text-center ${colorScheme.text}`}>
                    <h3 className="font-bold text-base sm:text-lg leading-tight">
                      {category.name_ar}
                    </h3>
                    <div className="flex items-center justify-center gap-1 text-xs opacity-80 mt-1">
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

export default CategoryQuickNav;
