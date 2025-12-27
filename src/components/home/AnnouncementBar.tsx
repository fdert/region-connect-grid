import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AnnouncementBarData {
  id: string;
  text: string;
  background_color: string;
  text_color: string;
  font_size: number;
  is_active: boolean;
  link_url: string | null;
  speed: number;
}

const AnnouncementBar = () => {
  const { data: announcement } = useQuery({
    queryKey: ["announcement-bar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_bar")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AnnouncementBarData | null;
    },
  });

  if (!announcement) return null;

  const animationDuration = Math.max(10, 100 - announcement.speed);

  return (
    <div
      className="w-full overflow-hidden py-2"
      style={{
        backgroundColor: announcement.background_color || "#dc2626",
      }}
    >
      <div
        className="whitespace-nowrap animate-marquee"
        style={{
          color: announcement.text_color || "#ffffff",
          fontSize: `${announcement.font_size || 14}px`,
          animationDuration: `${animationDuration}s`,
        }}
      >
        {announcement.link_url ? (
          <a
            href={announcement.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
          </a>
        ) : (
          <span>
            {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
          </span>
        )}
      </div>
    </div>
  );
};

export default AnnouncementBar;
