import { useState, useEffect, useCallback, forwardRef, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  video_url: string | null;
  media_type: string | null;
  link_url: string | null;
  is_active: boolean;
}

interface BannerSliderProps {
  position?: string;
}

const BannerSlider = forwardRef<HTMLElement, BannerSliderProps>(({ position = "home_top" }, ref) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    fetchBanners();
  }, [position]);

  // Auto-slide every 5 seconds (only for images)
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const currentBanner = banners[currentIndex];
    if (currentBanner?.media_type === 'video') return; // Don't auto-slide for videos
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length, currentIndex, banners]);

  // Handle video playback when slide changes
  useEffect(() => {
    banners.forEach((banner, index) => {
      const videoEl = videoRefs.current[banner.id];
      if (videoEl) {
        if (index === currentIndex) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
          videoEl.currentTime = 0;
        }
      }
    });
  }, [currentIndex, banners]);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .eq("position", position)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      
      // Filter by date on client side for simplicity
      const now = new Date();
      const validBanners = (data || []).filter(banner => {
        const startsAt = banner.starts_at ? new Date(banner.starts_at) : null;
        const endsAt = banner.ends_at ? new Date(banner.ends_at) : null;
        
        const startValid = !startsAt || startsAt <= now;
        const endValid = !endsAt || endsAt >= now;
        
        return startValid && endValid;
      });
      
      setBanners(validBanners);
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Object.values(videoRefs.current).forEach(video => {
      if (video) video.muted = !isMuted;
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="w-full">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="relative aspect-[2.5/1] sm:aspect-[3/1] md:aspect-[4/1] lg:aspect-[4.5/1] rounded-xl sm:rounded-2xl bg-muted animate-pulse" />
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

  const currentBanner = banners[currentIndex];
  const hasVideo = currentBanner?.media_type === 'video';

  return (
    <section ref={ref} className="w-full bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="relative group">
          {/* Main Banner Container - Responsive aspect ratios for mobile & desktop */}
          <div className="relative aspect-[2.5/1] sm:aspect-[3/1] md:aspect-[4/1] lg:aspect-[4.5/1] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
            {/* Slides */}
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={cn(
                  "absolute inset-0 transition-all duration-700 ease-in-out",
                  banner.media_type !== 'video' && banner.link_url && "cursor-pointer",
                  index === currentIndex 
                    ? "opacity-100 scale-100 z-10" 
                    : "opacity-0 scale-105 z-0"
                )}
                onClick={() => banner.media_type !== 'video' && handleBannerClick(banner.link_url)}
              >
                {banner.media_type === 'video' && banner.video_url ? (
                  <video
                    ref={el => { videoRefs.current[banner.id] = el; }}
                    src={banner.video_url}
                    poster={banner.image_url}
                    className="w-full h-full object-cover"
                    muted={isMuted}
                    loop
                    playsInline
                    autoPlay={index === currentIndex}
                  />
                ) : (
                  <img
                    src={banner.image_url}
                    alt={banner.title || "بنر ترويجي"}
                    className="w-full h-full object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                )}
              </div>
            ))}

            {/* Video Controls */}
            {hasVideo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="absolute bottom-3 left-3 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            )}

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
});

BannerSlider.displayName = "BannerSlider";

export default BannerSlider;