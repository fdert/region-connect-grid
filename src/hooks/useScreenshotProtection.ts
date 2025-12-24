import { useEffect, useState } from "react";

export const useScreenshotProtection = () => {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for screenshots and dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 2000);
        return false;
      }
      
      // Prevent Ctrl+P (Print)
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+S (Save)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+S (Save As)
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+I (Dev Tools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }
      
      // Prevent F12 (Dev Tools)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }
    };

    // Prevent drag and drop of images
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect visibility change (app switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 1500);
      }
    };

    // Detect window blur
    const handleBlur = () => {
      setIsBlurred(true);
      setTimeout(() => setIsBlurred(false), 1500);
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Add CSS to prevent selection and copying
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  return { isBlurred };
};
