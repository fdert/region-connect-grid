import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Percent, 
  Clock, 
  Store, 
  ShoppingCart,
  ArrowLeft,
  Flame,
  Star
} from "lucide-react";

// Mock offers data
const offers = [
  {
    id: 1,
    title: "خصم 50% على جميع الملابس الرجالية",
    store: "متجر الأناقة",
    storeId: "store-1",
    discount: 50,
    originalPrice: 200,
    salePrice: 100,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400",
    category: "أزياء",
    endsAt: "2024-12-31",
    isHot: true
  },
  {
    id: 2,
    title: "وجبة عائلية بنصف السعر",
    store: "مطعم الشرق",
    storeId: "store-2",
    discount: 50,
    originalPrice: 150,
    salePrice: 75,
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    category: "مطاعم",
    endsAt: "2024-12-25",
    isHot: true
  },
  {
    id: 3,
    title: "خصم 30% على الإلكترونيات",
    store: "تك ستور",
    storeId: "store-3",
    discount: 30,
    originalPrice: 1500,
    salePrice: 1050,
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400",
    category: "إلكترونيات",
    endsAt: "2024-12-28",
    isHot: false
  },
  {
    id: 4,
    title: "اشترِ قطعتين والثالثة مجاناً",
    store: "متجر الجمال",
    storeId: "store-4",
    discount: 33,
    originalPrice: 300,
    salePrice: 200,
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
    category: "صحة وجمال",
    endsAt: "2024-12-30",
    isHot: false
  },
  {
    id: 5,
    title: "خصم 40% على الأثاث المنزلي",
    store: "بيت الديكور",
    storeId: "store-5",
    discount: 40,
    originalPrice: 2000,
    salePrice: 1200,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400",
    category: "أثاث",
    endsAt: "2024-12-27",
    isHot: true
  },
  {
    id: 6,
    title: "خصم 25% على ألعاب الفيديو",
    store: "جيم زون",
    storeId: "store-6",
    discount: 25,
    originalPrice: 400,
    salePrice: 300,
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400",
    category: "ألعاب",
    endsAt: "2024-12-29",
    isHot: false
  },
];

const Offers = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", "أزياء", "مطاعم", "إلكترونيات", "صحة وجمال", "أثاث", "ألعاب"];
  
  const filteredOffers = selectedCategory === "all" 
    ? offers 
    : offers.filter(o => o.category === selectedCategory);

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">العروض والخصومات</h1>
              <p className="text-muted-foreground">اكتشف أفضل العروض من متاجرنا</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "الكل" : cat}
            </Button>
          ))}
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => (
            <div 
              key={offer.id}
              className="bg-card rounded-2xl border overflow-hidden group hover:shadow-lg transition-all duration-300"
            >
              {/* Image */}
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={offer.image} 
                  alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Discount Badge */}
                <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-lg px-3 py-1">
                  {offer.discount}% خصم
                </Badge>

                {/* Hot Badge */}
                {offer.isHot && (
                  <Badge className="absolute top-3 left-3 bg-orange-500 text-white gap-1">
                    <Flame className="w-3 h-3" />
                    عرض حار
                  </Badge>
                )}

                {/* Time Left */}
                <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>متبقي {calculateDaysLeft(offer.endsAt)} يوم</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <Link 
                    to={`/store/${offer.storeId}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {offer.store}
                  </Link>
                </div>
                
                <h3 className="font-bold text-lg mb-3 line-clamp-2">{offer.title}</h3>
                
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {offer.salePrice} ر.س
                  </span>
                  <span className="text-lg text-muted-foreground line-through">
                    {offer.originalPrice} ر.س
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    أضف للسلة
                  </Button>
                  <Link to={`/store/${offer.storeId}`}>
                    <Button variant="outline" size="icon">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOffers.length === 0 && (
          <div className="text-center py-16 bg-muted/50 rounded-2xl">
            <Percent className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد عروض في هذا التصنيف حالياً</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Offers;
