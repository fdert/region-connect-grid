import { ReactNode } from "react";
import { useThemeSettings } from "@/hooks/useThemeSettings";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // This hook applies theme settings to the document
  useThemeSettings();
  
  return <>{children}</>;
}
