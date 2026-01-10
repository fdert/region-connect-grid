import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  video_url: string | null;
  media_type: string | null;
  link_url: string | null;
  is_active: boolean;
}

const HeroBanner = () => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: banner, isLoading } = useQuery({
    queryKey: ["hero-center-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("position", "hero_center")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Banner | null;
    },
  });

  if (isLoading || !banner) return null;

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const isVideo = banner.media_type === 'video' && banner.video_url;

  const content = (
    <div className="w-full max-w-6xl mx-auto mb-4 sm:mb-6 px-2 sm:px-4 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative group">
      {isVideo ? (
        <>
          <video
            ref={videoRef}
            src={banner.video_url!}
            poster={banner.image_url}
            className="w-full h-auto object-cover aspect-[2.5/1] sm:aspect-[3/1] md:aspect-[4/1] lg:aspect-[4.5/1]"
            muted={isMuted}
            loop
            playsInline
            autoPlay
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </>
      ) : (
        <img
          src={banner.image_url}
          alt={banner.title || "إعلان"}
          className="w-full h-auto object-cover aspect-[2.5/1] sm:aspect-[3/1] md:aspect-[4/1] lg:aspect-[4.5/1] rounded-xl sm:rounded-2xl"
          loading="lazy"
        />
      )}
    </div>
  );

  if (banner.link_url && !isVideo) {
    return (
      <a
        href={banner.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
};

export default HeroBanner;