import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  Store,
  ShoppingBag
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
  image_url: string | null;
  is_active: boolean | null;
}

// Color palette for categories
const categoryColorPalette = [
  { bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-pink-500" },
  { bg: "bg-amber-50", text: "text-amber-600", gradient: "from-amber-500 to-orange-500" },
  { bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-teal-500" },
  { bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-cyan-500" },
  { bg: "bg-violet-50", text: "text-violet-600", gradient: "from-violet-500 to-purple-500" },
  { bg: "bg-cyan-50", text: "text-cyan-600", gradient: "from-cyan-500 to-sky-500" },
  { bg: "bg-orange-50", text: "text-orange-600", gradient: "from-orange-500 to-red-500" },
  { bg: "bg-teal-50", text: "text-teal-600", gradient: "from-teal-500 to-green-500" },
  { bg: "bg-pink-50", text: "text-pink-600", gradient: "from-pink-500 to-rose-500" },
  { bg: "bg-indigo-50", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-500" },
];

// Default images based on category names
const getDefaultCategoryImage = (nameAr: string): string => {
  const name = nameAr.toLowerCase();
  
  if (name.includes('سوبرماركت') || name.includes('بقالة')) {
    return 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop';
  }
  if (name.includes('فواكه') || name.includes('خضروات')) {
    return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=300&fit=crop';
  }
  if (name.includes('لحوم') || name.includes('دواجن') || name.includes('أسماك')) {
    return 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop';
  }
  if (name.includes('ألبان') || name.includes('بيض')) {
    return 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop';
  }
  if (name.includes('مخبوزات') || name.includes('حلويات') || name.includes('معجنات')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop';
  }
  if (name.includes('مشروبات')) {
    return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop';
  }
  if (name.includes('معلبات') || name.includes('أغذية جافة')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop';
  }
  if (name.includes('مجمدة')) {
    return 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop';
  }
  if (name.includes('وجبات خفيفة') || name.includes('سناكس')) {
    return 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=300&fit=crop';
  }
  if (name.includes('إفطار') || name.includes('حبوب')) {
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop';
  }
  if (name.includes('تنظيف') || name.includes('منزل')) {
    return 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=300&fit=crop';
  }
  if (name.includes('أطعمة')) {
    return 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&h=300&fit=crop';
  }
  if (name.includes('ألعاب') || name.includes('هوايات')) {
    return 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=300&fit=crop';
  }
  if (name.includes('حديقة')) {
    return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop';
  }

  return 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop';
};

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch active categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, name_ar, icon, image_url, is_active")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch store counts for each category
      const { data: storeCountsData, error: storeCountsError } = await supabase
        .from("store_categories")
        .select("category_id, store_id");

      if (storeCountsError) throw storeCountsError;

      // Count stores per category
      const counts: Record<string, number> = {};
      storeCountsData?.forEach((sc) => {
        counts[sc.category_id] = (counts[sc.category_id] || 0) + 1;
      });

      setCategories(categoriesData || []);
      setStoreCounts(counts);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

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
          {categories.map((category, index) => {
            const colorScheme = categoryColorPalette[index % categoryColorPalette.length];
            const imageUrl = category.image_url || getDefaultCategoryImage(category.name_ar);
            const storeCount = storeCounts[category.id] || 0;

            return (
              <Link
                key={category.id}
                to={`/stores?category=${category.id}`}
                className="group"
              >
                <div className={`relative p-6 rounded-2xl ${colorScheme.bg} border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full`}>
                  {/* Image */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorScheme.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={category.name_ar}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-white" />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                    {category.name_ar}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="font-medium">{storeCount} متجر</span>
                  </div>

                  {/* Arrow */}
                  <div className="absolute left-4 bottom-4 w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد تصنيفات</h3>
            <p className="text-muted-foreground">لم يتم إضافة أي تصنيفات بعد</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
