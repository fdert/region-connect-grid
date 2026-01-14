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

// Color palette for service backgrounds
const colorPalette = [
  { bg: "bg-gradient-to-br from-emerald-400 to-teal-500", accent: "bg-emerald-500" },
  { bg: "bg-gradient-to-br from-blue-400 to-indigo-500", accent: "bg-blue-500" },
  { bg: "bg-gradient-to-br from-violet-400 to-purple-500", accent: "bg-violet-500" },
  { bg: "bg-gradient-to-br from-amber-400 to-orange-500", accent: "bg-amber-500" },
  { bg: "bg-gradient-to-br from-rose-400 to-pink-500", accent: "bg-rose-500" },
  { bg: "bg-gradient-to-br from-cyan-400 to-sky-500", accent: "bg-cyan-500" },
];

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

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
              خدمات <span className="text-primary">خاصة</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              خدمات توصيل متميزة لتلبية جميع احتياجاتك
            </p>
          </div>
          <Link to="/special-services" className="hidden sm:block">
            <Button variant="outline" className="gap-2">
              جميع الخدمات
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon || "Package"] || Package;
            const palette = colorPalette[index % colorPalette.length];
            
            return (
              <Link
                key={service.id}
                to={`/special-services/${service.id}`}
                className="group opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
              >
                <div className="bg-card rounded-2xl overflow-hidden border-2 border-border shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/30">
                  {/* Colored Background with Icon */}
                  <div className={`relative h-28 sm:h-32 ${palette.bg} flex items-center justify-center p-3`}>
                    {/* Decorative Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 left-2 w-8 h-8 border-2 border-white rounded-full" />
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-2 border-white rounded-full" />
                      <div className="absolute top-4 right-6 w-4 h-4 bg-white rounded-full" />
                    </div>
                    
                    {/* Price Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="bg-white/30 backdrop-blur-sm text-white shadow-lg text-[10px] sm:text-xs px-2 py-0.5 font-medium border-0">
                        {service.min_price || 0} ر.س
                      </Badge>
                    </div>

                    {/* Icon Container */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl shadow-xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300 ring-4 ring-white/30">
                      <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5 bg-gradient-to-b from-card to-muted/20">
                    {/* Name */}
                    <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-3 group-hover:text-primary transition-colors text-center line-clamp-1">
                      {service.name_ar}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                      {service.description_ar || "توصيل سريع وآمن"}
                    </p>

                    {/* Features */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 bg-success/10 rounded-lg px-3 py-2">
                        <div className="w-7 h-7 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-success" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-success">
                          توصيل سريع ✨
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                        <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-primary">
                          آمن ومضمون
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
          <Link to="/special-services">
            <Button variant="outline" className="gap-2">
              عرض جميع الخدمات
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpecialServicesSection;
