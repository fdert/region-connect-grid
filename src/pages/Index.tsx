import MainLayout from "@/components/layout/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedStores from "@/components/home/FeaturedStores";
import FeaturesSection from "@/components/home/FeaturesSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <MainLayout>
      <HeroSection />
      <CategoriesSection />
      <FeaturedStores />
      <FeaturesSection />
      <CTASection />
    </MainLayout>
  );
};

export default Index;
