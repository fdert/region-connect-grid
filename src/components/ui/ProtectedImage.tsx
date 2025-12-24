import { useState, useEffect } from "react";

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  watermarkText?: string;
}

export const ProtectedImage = ({ 
  src, 
  alt, 
  className = "",
  watermarkText = "محمي"
}: ProtectedImageProps) => {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    // Detect visibility change (switching apps on mobile)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        // Keep blurred for a moment after returning
        setTimeout(() => setIsBlurred(false), 1500);
      }
    };

    // Detect window blur (switching tabs/apps)
    const handleBlur = () => {
      setIsBlurred(true);
      setTimeout(() => setIsBlurred(false), 1500);
    };

    // Detect touch events that might indicate screenshot gestures
    const handleTouchStart = (e: TouchEvent) => {
      // Multiple fingers might indicate screenshot attempt
      if (e.touches.length >= 2) {
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("touchstart", handleTouchStart);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return (
    <div className="relative overflow-hidden select-none">
      {/* Main Image */}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-all duration-300 ${isBlurred ? "blur-xl scale-105" : ""}`}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{ 
          pointerEvents: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none"
        }}
      />
      
      {/* Watermark Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ zIndex: 10 }}
      >
        {/* Diagonal watermarks pattern */}
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-8 rotate-[-25deg] scale-150 opacity-20">
          {Array.from({ length: 12 }).map((_, i) => (
            <span 
              key={i}
              className="text-gray-500 dark:text-gray-400 font-bold text-lg whitespace-nowrap"
              style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
            >
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      {/* Blur overlay when screenshot detected */}
      {isBlurred && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center z-20">
          <span className="text-muted-foreground text-sm">المحتوى محمي</span>
        </div>
      )}
    </div>
  );
};

