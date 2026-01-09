import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import BannerSlider from "@/components/home/BannerSlider";
import CategoryQuickNav from "@/components/home/CategoryQuickNav";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedStores from "@/components/home/FeaturedStores";
import FeaturesSection from "@/components/home/FeaturesSection";
import CTASection from "@/components/home/CTASection";
import SpecialOffersSection from "@/components/home/SpecialOffersSection";
import MostOrderedSection from "@/components/home/MostOrderedSection";
import NewArrivalsSection from "@/components/home/NewArrivalsSection";
import SpecialServicesSection from "@/components/home/SpecialServicesSection";

interface HomeSection {
  id: string;
  section_key: string;
  is_visible: boolean;
  sort_order: number;
}

const Index = () => {
  const { data: sections } = useQuery({
    queryKey: ["home-sections-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("id, section_key, is_visible, sort_order")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as HomeSection[];
    },
  });

  // Helper to check if section is visible
  const isVisible = (key: string) => {
    if (!sections) return true; // Show all by default while loading
    const section = sections.find(s => s.section_key === key);
    return section?.is_visible ?? true;
  };

  // Map section keys to components
  const sectionComponents: Record<string, React.ReactNode> = {
    hero: <HeroSection />,
    banner_top: <BannerSlider position="home_top" />,
    category_quick_nav: <CategoryQuickNav />,
    categories: <CategoriesSection />,
    featured_stores: <FeaturedStores />,
    special_services: <SpecialServicesSection />,
    special_offers: <SpecialOffersSection />,
    banner_middle: <BannerSlider position="home_middle" />,
    most_ordered: <MostOrderedSection />,
    new_arrivals: <NewArrivalsSection />,
    banner_bottom: <BannerSlider position="home_bottom" />,
    features: <FeaturesSection />,
    cta: <CTASection />,
  };

  // Render sections in order
  const renderSections = () => {
    if (!sections) {
      // Default order while loading
      return (
        <>
          <HeroSection />
          <BannerSlider position="home_top" />
          <CategoryQuickNav />
          <CategoriesSection />
          <FeaturedStores />
          <SpecialServicesSection />
          <SpecialOffersSection />
          <BannerSlider position="home_middle" />
          <MostOrderedSection />
          <NewArrivalsSection />
          <BannerSlider position="home_bottom" />
          <FeaturesSection />
          <CTASection />
        </>
      );
    }

    return sections
      .filter(section => section.is_visible)
      .map(section => (
        <div key={section.id}>
          {sectionComponents[section.section_key]}
        </div>
      ));
  };

  return (
    <MainLayout>
      {renderSections()}
    </MainLayout>
  );
};

export default Index;
