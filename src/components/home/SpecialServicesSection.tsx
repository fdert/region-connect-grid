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
    <section className="py-10 sm:py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <Badge className="mb-3 bg-primary/10 text-primary border-0">
              <Shield className="w-3 h-3 ml-1" />
              خدمات موثوقة
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
              خدمات <span className="text-gradient">خاصة</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              خدمات توصيل متميزة لتلبية احتياجاتك الخاصة
            </p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon || "Package"] || Package;
            
            return (
              <Link
                key={service.id}
                to={`/special-services/${service.id}`}
                className="group opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
              >
                <div className="relative bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 h-full">
                  {/* Gradient Background */}
                  <div className="relative h-40 bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-10" />
                    <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    
                    {/* Price Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/20 backdrop-blur text-white border-0">
                        يبدأ من {service.min_price || 0} ر.س
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                      {service.name_ar}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {service.description_ar || "خدمة توصيل سريعة وآمنة"}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        توصيل سريع
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3" />
                        مضمون
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <MapPin className="w-3 h-3" />
                        تتبع مباشر
                      </div>
                    </div>

                    {/* CTA */}
                    <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                      اطلب الآن
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
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
