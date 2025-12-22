import { Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowLeft, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stores = [
  {
    id: 1,
    name: "متجر الأناقة",
    category: "أزياء ومستلزمات",
    rating: 4.9,
    reviews: 256,
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop",
    location: "الرياض، حي العليا",
    isOpen: true,
    isVerified: true,
    deliveryTime: "30-45 دقيقة",
  },
  {
    id: 2,
    name: "مطعم الشرق",
    category: "مطاعم ومأكولات",
    rating: 4.8,
    reviews: 189,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    location: "الرياض، حي النخيل",
    isOpen: true,
    isVerified: true,
    deliveryTime: "20-35 دقيقة",
  },
  {
    id: 3,
    name: "تقنية المستقبل",
    category: "إلكترونيات وأجهزة",
    rating: 4.7,
    reviews: 412,
    image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400&h=300&fit=crop",
    location: "الرياض، حي الملقا",
    isOpen: false,
    isVerified: true,
    deliveryTime: "1-2 يوم",
  },
  {
    id: 4,
    name: "بيت الديكور",
    category: "أثاث وديكور",
    rating: 4.6,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
    location: "الرياض، حي الربيع",
    isOpen: true,
    isVerified: false,
    deliveryTime: "2-3 أيام",
  },
];

const FeaturedStores = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              المتاجر <span className="text-gradient">المميزة</span>
            </h2>
            <p className="text-muted-foreground">
              أفضل المتاجر المختارة بعناية لتجربة تسوق مميزة
            </p>
          </div>
          <Link to="/stores" className="hidden md:block">
            <Button variant="outline" className="gap-2">
              جميع المتاجر
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stores.map((store, index) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
            >
              <div className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={store.image}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant={store.isOpen ? "default" : "secondary"}
                      className={store.isOpen ? "bg-success" : ""}
                    >
                      {store.isOpen ? "مفتوح" : "مغلق"}
                    </Badge>
                  </div>
                  {/* Verified Badge */}
                  {store.isVerified && (
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <BadgeCheck className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Category */}
                  <span className="text-xs text-primary font-medium">{store.category}</span>
                  
                  {/* Name */}
                  <h3 className="font-bold text-lg mt-1 mb-2 group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-accent fill-accent" />
                      <span className="font-semibold text-sm">{store.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">({store.reviews} تقييم)</span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{store.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>التوصيل: {store.deliveryTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-8 text-center md:hidden">
          <Link to="/stores">
            <Button variant="outline" className="gap-2">
              عرض جميع المتاجر
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedStores;
