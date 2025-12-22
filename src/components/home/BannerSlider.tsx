import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
}

const BannerSlider = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .eq("position", "home_top")
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="w-full">
        <div className="container mx-auto px-4 py-4">
          <div className="relative aspect-[3/1] md:aspect-[4/1] rounded-2xl bg-muted animate-pulse" />
        </div>
      </section>
    );
  }

  // No banners - don't render anything
  if (banners.length === 0) {
    return null;
  }

  const handleBannerClick = (linkUrl: string | null) => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="w-full bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="relative group">
          {/* Main Banner Container */}
          <div className="relative aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] rounded-2xl overflow-hidden shadow-lg">
            {/* Slides */}
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={cn(
                  "absolute inset-0 transition-all duration-700 ease-in-out cursor-pointer",
                  index === currentIndex 
                    ? "opacity-100 scale-100 z-10" 
                    : "opacity-0 scale-105 z-0"
                )}
                onClick={() => handleBannerClick(banner.link_url)}
              >
                <img
                  src={banner.image_url}
                  alt={banner.title || "بنر ترويجي"}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Banner Title */}
                {banner.title && (
                  <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8">
                    <h3 className="text-white text-lg md:text-2xl lg:text-3xl font-bold drop-shadow-lg">
                      {banner.title}
                    </h3>
                  </div>
                )}
              </div>
            ))}

            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Dots Indicator */}
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      index === currentIndex 
                        ? "w-8 bg-white" 
                        : "w-2 bg-white/50 hover:bg-white/70"
                    )}
                    aria-label={`الانتقال للبنر ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannerSlider;
