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
              المتاجر <span className="text-gradient">المميزة</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stores.map((store, index) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
            >
              <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                {/* Image */}
                <div className="relative h-40 sm:h-48 overflow-hidden bg-muted">
                  {store.cover_url ? (
                    <img
                      src={store.cover_url}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : store.logo_url ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <span className="text-4xl font-bold text-primary/40">
                        {store.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="default" className="bg-success">
                      مفتوح
                    </Badge>
                  </div>
                  {/* Verified Badge */}
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <BadgeCheck className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                  {/* Name */}
                  <h3 className="font-bold text-lg mt-1 mb-2 group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="font-semibold text-sm">
                        {store.rating ? Number(store.rating).toFixed(1) : "0.0"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ({store.total_reviews || 0} تقييم)
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {(store.city || store.address) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {store.city}{store.address ? `, ${store.address}` : ""}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        التوصيل: {store.delivery_fee ? `${store.delivery_fee} ر.س` : "مجاني"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
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