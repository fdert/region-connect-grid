import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const defaultSettings: ThemeSettings = {
  primaryColor: "#10b981",
  secondaryColor: "#fbbf24",
  accentColor: "#f97316",
  fontFamily: "Tajawal",
  logoUrl: null,
  faviconUrl: null
};

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function useThemeSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["theme-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "theme")
        .maybeSingle();

      if (error) throw error;
      return data?.value as unknown as ThemeSettings | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const themeSettings = settings || defaultSettings;

  // Apply theme settings
  useEffect(() => {
    if (!themeSettings) return;

    const root = document.documentElement;

    // Apply colors as CSS variables
    if (themeSettings.primaryColor) {
      const primaryHsl = hexToHsl(themeSettings.primaryColor);
      root.style.setProperty("--primary", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    }

    if (themeSettings.secondaryColor) {
      const secondaryHsl = hexToHsl(themeSettings.secondaryColor);
      root.style.setProperty("--secondary", `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
    }

    if (themeSettings.accentColor) {
      const accentHsl = hexToHsl(themeSettings.accentColor);
      root.style.setProperty("--accent", `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
    }

    // Apply font family
    if (themeSettings.fontFamily) {
      root.style.setProperty("--font-family", themeSettings.fontFamily);
      document.body.style.fontFamily = `${themeSettings.fontFamily}, sans-serif`;
    }

    // Apply favicon
    if (themeSettings.faviconUrl) {
      let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = themeSettings.faviconUrl;
    }

  }, [themeSettings]);

  return {
    settings: themeSettings,
    isLoading,
    logoUrl: themeSettings?.logoUrl,
    faviconUrl: themeSettings?.faviconUrl,
  };
}
