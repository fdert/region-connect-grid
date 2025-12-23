import MainLayout from "@/components/layout/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import BannerSlider from "@/components/home/BannerSlider";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedStores from "@/components/home/FeaturedStores";
import FeaturesSection from "@/components/home/FeaturesSection";
import CTASection from "@/components/home/CTASection";
import SpecialOffersSection from "@/components/home/SpecialOffersSection";
import MostOrderedSection from "@/components/home/MostOrderedSection";
import NewArrivalsSection from "@/components/home/NewArrivalsSection";

const Index = () => {
  return (
    <MainLayout>
      <HeroSection />
      <BannerSlider position="home_top" />
      <CategoriesSection />
      <FeaturedStores />
      <SpecialOffersSection />
      <BannerSlider position="home_middle" />
      <MostOrderedSection />
      <NewArrivalsSection />
      <BannerSlider position="home_bottom" />
      <FeaturesSection />
      <CTASection />
    </MainLayout>
  );
};

export default Index;
