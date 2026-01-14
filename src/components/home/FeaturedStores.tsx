import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowLeft, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  is_active: boolean;
  delivery_fee: number | null;
}

// Color palette for store backgrounds
const colorPalette = [
  { bg: "bg-gradient-to-br from-rose-400 to-pink-500", accent: "bg-rose-500" },
  { bg: "bg-gradient-to-br from-violet-400 to-purple-500", accent: "bg-violet-500" },
  { bg: "bg-gradient-to-br from-blue-400 to-indigo-500", accent: "bg-blue-500" },
  { bg: "bg-gradient-to-br from-emerald-400 to-teal-500", accent: "bg-emerald-500" },
  { bg: "bg-gradient-to-br from-amber-400 to-orange-500", accent: "bg-amber-500" },
  { bg: "bg-gradient-to-br from-cyan-400 to-sky-500", accent: "bg-cyan-500" },
];

const FeaturedStores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("rating", { ascending: false })
        .limit(4);

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-10 sm:py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
              المتاجر <span className="text-primary">المميزة</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              أفضل المتاجر المختارة بعناية لتجربة تسوق مميزة
            </p>
          </div>
          <Link to="/stores" className="hidden sm:block">
            <Button variant="outline" className="gap-2">
              جميع المتاجر
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {stores.map((store, index) => {
            const palette = colorPalette[index % colorPalette.length];
            
            return (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="group opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
              >
                <div className="bg-card rounded-2xl overflow-hidden border-2 border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/30">
                  {/* Colored Background with Logo */}
                  <div className={`relative h-28 sm:h-32 ${palette.bg} flex items-center justify-center p-3`}>
                    {/* Decorative Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 left-2 w-8 h-8 border-2 border-white rounded-full" />
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-2 border-white rounded-full" />
                      <div className="absolute top-4 right-6 w-4 h-4 bg-white rounded-full" />
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="bg-success text-white shadow-lg text-[10px] sm:text-xs px-2 py-0.5 font-medium">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block mr-1" />
                        مفتوح
                      </Badge>
                    </div>
                    
                    {/* Verified Badge */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <BadgeCheck className="w-4 h-4 text-white" />
                    </div>

                    {/* White Logo Container */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl shadow-xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300 ring-4 ring-white/30">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl font-bold text-primary">
                          {store.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5 bg-gradient-to-b from-card to-muted/20">
                    {/* Name */}
                    <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-3 group-hover:text-primary transition-colors text-center line-clamp-1">
                      {store.name}
                    </h3>

                    {/* Rating - Enhanced */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-sm sm:text-base text-amber-700 dark:text-amber-400">
                          {store.rating ? Number(store.rating).toFixed(1) : "0.0"}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        ({store.total_reviews || 0} تقييم)
                      </span>
                    </div>

                    {/* Info Cards */}
                    <div className="flex flex-col gap-2">
                      {(store.city || store.address) && (
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs sm:text-sm text-foreground/80 truncate">
                            {store.city}{store.address ? ` - ${store.address}` : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-success/10 rounded-lg px-3 py-2">
                        <div className="w-7 h-7 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-success" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-success">
                          التوصيل: {store.delivery_fee ? `${store.delivery_fee} ر.س` : "مجاني ✨"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 sm:mt-8 text-center sm:hidden">
          <Link to="/stores">
            <Button variant="outline" className="gap-2">
              عرض جميع المتاجر
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedStores;