import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
}

const HeroBanner = () => {
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

  const content = (
    <div className="w-full max-w-3xl mx-auto mb-8 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
      <img
        src={banner.image_url}
        alt={banner.title || "إعلان"}
        className="w-full h-auto object-cover aspect-[3/1]"
        loading="lazy"
      />
    </div>
  );

  if (banner.link_url) {
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
