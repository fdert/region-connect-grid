import { Link } from "react-router-dom";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  title: string;
  titleHighlight: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "success" | "warning" | "rose" | "violet" | "emerald" | "amber";
  linkTo?: string;
  linkText?: string;
}

const colorClasses = {
  primary: {
    bg: "from-primary/20 via-primary/10 to-transparent",
    iconBg: "bg-gradient-to-br from-primary to-primary/70",
    iconShadow: "shadow-primary/30",
    text: "text-primary",
    border: "border-primary/20",
    glow: "shadow-[0_0_30px_rgba(var(--primary)/0.3)]"
  },
  accent: {
    bg: "from-accent/20 via-accent/10 to-transparent",
    iconBg: "bg-gradient-to-br from-accent to-accent/70",
    iconShadow: "shadow-accent/30",
    text: "text-accent",
    border: "border-accent/20",
    glow: "shadow-[0_0_30px_rgba(255,165,0,0.3)]"
  },
  success: {
    bg: "from-success/20 via-success/10 to-transparent",
    iconBg: "bg-gradient-to-br from-success to-success/70",
    iconShadow: "shadow-success/30",
    text: "text-success",
    border: "border-success/20",
    glow: "shadow-[0_0_30px_rgba(34,197,94,0.3)]"
  },
  warning: {
    bg: "from-warning/20 via-warning/10 to-transparent",
    iconBg: "bg-gradient-to-br from-warning to-warning/70",
    iconShadow: "shadow-warning/30",
    text: "text-warning",
    border: "border-warning/20",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]"
  },
  rose: {
    bg: "from-rose-500/20 via-rose-500/10 to-transparent",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-500",
    iconShadow: "shadow-rose-500/30",
    text: "text-rose-500",
    border: "border-rose-500/20",
    glow: "shadow-[0_0_30px_rgba(244,63,94,0.3)]"
  },
  violet: {
    bg: "from-violet-500/20 via-violet-500/10 to-transparent",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
    iconShadow: "shadow-violet-500/30",
    text: "text-violet-500",
    border: "border-violet-500/20",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.3)]"
  },
  emerald: {
    bg: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    iconShadow: "shadow-emerald-500/30",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]"
  },
  amber: {
    bg: "from-amber-500/20 via-amber-500/10 to-transparent",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    iconShadow: "shadow-amber-500/30",
    text: "text-amber-500",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]"
  }
};

const SectionHeader = ({
  title,
  titleHighlight,
  subtitle,
  icon: Icon,
  iconColor = "primary",
  linkTo,
  linkText = "عرض الكل"
}: SectionHeaderProps) => {
  const colors = colorClasses[iconColor];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
      {/* Title Group */}
      <div className="flex items-center gap-4">
        {/* Animated Icon Container */}
        <div className="relative">
          {/* Glow Effect */}
          <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50 ${colors.iconBg}`} />
          
          {/* Main Icon Box */}
          <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${colors.iconBg} flex items-center justify-center shadow-lg ${colors.iconShadow} transform hover:scale-105 transition-transform duration-300`}>
            {/* Decorative Ring */}
            <div className="absolute inset-1 rounded-xl border-2 border-white/20" />
            
            {/* Icon */}
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10" />
            
            {/* Sparkle Effects */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse shadow-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-white/80 rounded-full animate-pulse delay-300" />
          </div>
        </div>

        {/* Text Content */}
        <div className="relative">
          {/* Background Accent */}
          <div className={`absolute -inset-2 rounded-xl bg-gradient-to-l ${colors.bg} blur-sm opacity-50`} />
          
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">
              {title}{" "}
              <span className={`${colors.text} relative inline-block`}>
                {titleHighlight}
                {/* Underline Decoration */}
                <svg className="absolute -bottom-1 left-0 w-full h-2 opacity-30" viewBox="0 0 100 8" preserveAspectRatio="none">
                  <path d="M0,5 Q25,0 50,5 T100,5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h2>
            {subtitle && (
              <p className="text-muted-foreground text-sm sm:text-base flex items-center gap-2">
                <span className={`w-8 h-0.5 rounded-full ${colors.iconBg}`} />
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Link Button */}
      {linkTo && (
        <Link to={linkTo} className="hidden sm:block">
          <Button 
            variant="outline" 
            className={`gap-2 border-2 ${colors.border} hover:${colors.text} hover:bg-${iconColor}/5 group transition-all duration-300`}
          >
            <span>{linkText}</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          </Button>
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
