import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import { 
  Search, 
  Star, 
  MapPin, 
  Clock,
  BadgeCheck,
  Grid3X3,
  List,
  Store as StoreIcon,
  Tag,
  Apple,
  ShoppingBag,
  Shirt,
  Smartphone,
  Home,
  Utensils,
  Cake,
  Heart,
  Package
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Store {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  city: string | null;
  address: string | null;
  delivery_fee: number | null;
  is_active: boolean | null;
  is_approved: boolean | null;
  category_id?: string | null;
  category_name?: string;
  products_count?: number;
}

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
  image_url: string | null;
}

// Category color palette
const categoryColors = [
  { bg: "bg-emerald-500", gradient: "from-emerald-500 to-emerald-600", text: "text-white" },
  { bg: "bg-blue-500", gradient: "from-blue-500 to-blue-600", text: "text-white" },
  { bg: "bg-purple-500", gradient: "from-purple-500 to-purple-600", text: "text-white" },
  { bg: "bg-orange-500", gradient: "from-orange-500 to-orange-600", text: "text-white" },
  { bg: "bg-rose-500", gradient: "from-rose-500 to-rose-600", text: "text-white" },
  { bg: "bg-cyan-500", gradient: "from-cyan-500 to-cyan-600", text: "text-white" },
  { bg: "bg-amber-500", gradient: "from-amber-500 to-amber-600", text: "text-white" },
  { bg: "bg-teal-500", gradient: "from-teal-500 to-teal-600", text: "text-white" },
  { bg: "bg-indigo-500", gradient: "from-indigo-500 to-indigo-600", text: "text-white" },
  { bg: "bg-pink-500", gradient: "from-pink-500 to-pink-600", text: "text-white" },
];

// Get icon component from string name
const getIconComponent = (iconName: string | null) => {
  if (!iconName) return Package;
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    'Apple': Apple,
    'ShoppingBag': ShoppingBag,
    'Shirt': Shirt,
    'Smartphone': Smartphone,
    'Home': Home,
    'Utensils': Utensils,
    'Cake': Cake,
    'Heart': Heart,
    'Package': Package,
    'Tag': Tag,
  };
  return icons[iconName] || Package;
};

const Stores = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch categories with icon and image
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, name_ar, icon, image_url')
        .eq('is_active', true)
        .is('parent_id', null)
        .order('sort_order');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch stores with product counts
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('rating', { ascending: false });

      if (storesError) {
        console.error('Error fetching stores:', storesError);
      } else if (storesData) {
        // Fetch product counts for each store
        const storesWithCounts = await Promise.all(
          storesData.map(async (store) => {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', store.id)
              .eq('is_active', true);

            // Get primary category for the store based on products
            const { data: productWithCategory } = await supabase
              .from('products')
              .select('category_id')
              .eq('store_id', store.id)
              .eq('is_active', true)
              .limit(1)
              .single();

            let categoryName = '';
            let categoryId = store.category_id || productWithCategory?.category_id || null;
            
            if (categoryId) {
              const { data: categoryData } = await supabase
                .from('categories')
                .select('name_ar')
                .eq('id', categoryId)
                .single();
              categoryName = categoryData?.name_ar || '';
            }

            return {
              ...store,
              products_count: count || 0,
              category_id: categoryId,
              category_name: categoryName
            };
          })
        );
        setStores(storesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (store.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (store.category_name?.includes(searchQuery));
    const matchesCategory = selectedCategory === "الكل" || 
                            store.category_name === selectedCategory ||
                            store.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex gap-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            جميع <span className="text-primary">المتاجر</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            اكتشف مجموعة متنوعة من المتاجر المميزة
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="ابحث عن متجر..."
              className="h-11 sm:h-12 pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>

          {/* Category Filter - Beautiful Icons Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
            {/* All Categories Button */}
            <button
              onClick={() => setSelectedCategory("الكل")}
              className={`flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                selectedCategory === "الكل"
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : "bg-card hover:bg-accent border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                selectedCategory === "الكل" ? "bg-white/20" : "bg-gradient-to-br from-gray-400 to-gray-500"
              }`}>
                <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-center truncate w-full">الكل</span>
            </button>

            {categories.map((category, index) => {
              const colorSet = categoryColors[index % categoryColors.length];
              const IconComponent = getIconComponent(category.icon);
              const isSelected = selectedCategory === category.id || selectedCategory === category.name_ar;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-card hover:bg-accent border border-border/50 hover:border-primary/30 hover:scale-102"
                  }`}
                >
                  <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex items-center justify-center ${
                    isSelected ? "bg-white/20" : `bg-gradient-to-br ${colorSet.gradient}`
                  }`}>
                    {category.image_url ? (
                      <>
                        <img 
                          src={category.image_url} 
                          alt={category.name_ar}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </>
                    ) : (
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center truncate w-full leading-tight">
                    {category.name_ar}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 justify-end">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          عرض {filteredStores.length} متجر
        </p>

        {/* Stores Grid/List */}
        <div className={viewMode === "grid" 
          ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4" 
          : "flex flex-col gap-3 sm:gap-4"
        }>
          {filteredStores.map((store, index) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "forwards" }}
            >
              <div className={`bg-card rounded-lg sm:rounded-xl overflow-hidden border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                viewMode === "list" ? "flex" : ""
              }`}>
                {/* Cover/Logo Image - Smaller */}
                <div className={`relative overflow-hidden ${
                  viewMode === "list" ? "w-24 h-20 sm:w-32 sm:h-24 flex-shrink-0" : "h-24 sm:h-28"
                }`}>
                  {store.cover_url || store.logo_url ? (
                    <img
                      src={store.cover_url || store.logo_url || ''}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <StoreIcon className="w-8 h-8 text-primary/60" />
                    </div>
                  )}
                  
                  {/* Badges overlay */}
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                    <Badge 
                      variant="default"
                      className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-success"
                    >
                      مفتوح
                    </Badge>
                  </div>
                  {store.is_approved && (
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/90 flex items-center justify-center">
                      <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                    </div>
                  )}
                  
                  {/* Logo overlay if has cover */}
                  {store.cover_url && store.logo_url && (
                    <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white shadow-md overflow-hidden border border-border/30">
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="w-full h-full object-contain p-0.5"
                      />
                    </div>
                  )}
                </div>

                {/* Content - Compact */}
                <div className={`p-2 sm:p-3 ${viewMode === "list" ? "flex-1 min-w-0" : ""}`}>
                  {store.category_name && (
                    <span className="text-[10px] sm:text-xs text-primary font-medium">{store.category_name}</span>
                  )}
                  <h3 className="font-bold text-xs sm:text-sm mt-0.5 mb-1 group-hover:text-primary transition-colors truncate">
                    {store.name}
                  </h3>

                  <div className="flex items-center gap-1 mb-1">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      <span className="font-semibold text-[10px] sm:text-xs">{store.rating || 0}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">({store.total_reviews || 0})</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">• {store.products_count || 0} منتج</span>
                  </div>

                  <div className="flex flex-col gap-0.5 text-[10px] sm:text-xs text-muted-foreground">
                    {store.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">{store.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate">توصيل: {store.delivery_fee || 0} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredStores.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              جرب البحث بكلمات مختلفة أو تصفح التصنيفات
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Stores;
