import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Truck, ArrowLeft, MapPin, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface SpecialService {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  base_price: number | null;
  price_per_km: number | null;
  min_price: number | null;
}

const iconMap: Record<string, React.ElementType> = {
  Package: Package,
  Truck: Truck,
  MapPin: MapPin,
};

const SpecialServicesSection = () => {
  const [services, setServices] = useState<SpecialService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("special_services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching special services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-10 sm:py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="py-6 sm:py-8">
      <div className="container mx-auto px-4">
        {/* Header - Matching other sections */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              خدمات خاصة
            </h2>
          </div>
        </div>

        {/* Services Grid - Compact design matching products */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon || "Package"] || Package;
            
            return (
              <Link
                key={service.id}
                to={`/special-services/${service.id}`}
                className="block group"
              >
                <div className="bg-card rounded-lg border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  {/* Service Icon */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Price Badge */}
                    <div className="absolute top-1 right-1">
                      <span className="bg-white/20 backdrop-blur text-white text-[8px] px-1.5 py-0.5 rounded-full">
                        {service.min_price || 0} ر.س
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-2">
                    <h3 className="font-semibold text-[10px] sm:text-xs text-center line-clamp-1 group-hover:text-primary transition-colors">
                      {service.name_ar}
                    </h3>
                    <p className="text-[8px] text-muted-foreground text-center line-clamp-1 mt-0.5">
                      {service.description_ar || "توصيل سريع وآمن"}
                    </p>
                    
                    {/* Mini Features */}
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <div className="flex items-center gap-0.5 text-[7px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                        <Clock className="w-2 h-2" />
                        سريع
                      </div>
                      <div className="flex items-center gap-0.5 text-[7px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                        <Shield className="w-2 h-2" />
                        آمن
                      </div>
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

export default SpecialServicesSection;
