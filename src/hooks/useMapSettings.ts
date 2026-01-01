import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MapSettings {
  provider: "openstreetmap" | "mapbox";
  mapbox_api_key: string;
  usage_warning_shown: boolean;
  last_usage_check: string | null;
}

const defaultMapSettings: MapSettings = {
  provider: "openstreetmap",
  mapbox_api_key: "",
  usage_warning_shown: false,
  last_usage_check: null,
};

export function useMapSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["map-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "map_settings")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        return data.value as unknown as MapSettings;
      }
      return null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mapSettings = settings || defaultMapSettings;

  return {
    settings: mapSettings,
    isLoading,
    error,
    isMapbox: mapSettings.provider === "mapbox" && !!mapSettings.mapbox_api_key,
    mapboxApiKey: mapSettings.mapbox_api_key,
  };
}
