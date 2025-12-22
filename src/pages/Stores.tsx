import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Star, 
  MapPin, 
  Clock,
  BadgeCheck,
  Grid3X3,
  List
} from "lucide-react";
import { Link } from "react-router-dom";

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
    products: 150,
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
    products: 85,
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
    products: 320,
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
    products: 210,
  },
  {
    id: 5,
    name: "عطور الخليج",
    category: "عطور ومستحضرات",
    rating: 4.9,
    reviews: 567,
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop",
    location: "الرياض، حي السليمانية",
    isOpen: true,
    isVerified: true,
    deliveryTime: "1-2 يوم",
    products: 180,
  },
  {
    id: 6,
    name: "مكتبة المعرفة",
    category: "كتب ومستلزمات",
    rating: 4.5,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
    location: "الرياض، حي الروضة",
    isOpen: true,
    isVerified: true,
    deliveryTime: "2-3 أيام",
    products: 450,
  },
];

const categories = [
  "الكل",
  "أزياء ومستلزمات",
  "مطاعم ومأكولات",
  "إلكترونيات وأجهزة",
  "أثاث وديكور",
  "عطور ومستحضرات",
  "كتب ومستلزمات",
];

const Stores = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name.includes(searchQuery) || store.category.includes(searchQuery);
    const matchesCategory = selectedCategory === "الكل" || store.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            جميع <span className="text-gradient">المتاجر</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            اكتشف مجموعة متنوعة من المتاجر المميزة
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="ابحث عن متجر..."
              className="h-11 sm:h-12 pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 self-end sm:self-auto">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          عرض {filteredStores.length} متجر
        </p>

        {/* Stores Grid/List */}
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" 
          : "flex flex-col gap-3 sm:gap-4"
        }>
          {filteredStores.map((store, index) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "forwards" }}
            >
              <div className={`bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                viewMode === "list" ? "flex" : ""
              }`}>
                {/* Image */}
                <div className={`relative overflow-hidden ${
                  viewMode === "list" ? "w-32 h-28 sm:w-48 sm:h-36 flex-shrink-0" : "h-40 sm:h-48"
                }`}>
                  <img
                    src={store.image}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                    <Badge 
                      variant={store.isOpen ? "default" : "secondary"}
                      className={`text-xs ${store.isOpen ? "bg-success" : ""}`}
                    >
                      {store.isOpen ? "مفتوح" : "مغلق"}
                    </Badge>
                  </div>
                  {store.isVerified && (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`p-3 sm:p-4 md:p-5 ${viewMode === "list" ? "flex-1 min-w-0" : ""}`}>
                  <span className="text-xs text-primary font-medium">{store.category}</span>
                  <h3 className="font-bold text-base sm:text-lg mt-1 mb-2 group-hover:text-primary transition-colors truncate">
                    {store.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent" />
                      <span className="font-semibold text-xs sm:text-sm">{store.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">({store.reviews})</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">• {store.products} منتج</span>
                  </div>

                  <div className="flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{store.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">التوصيل: {store.deliveryTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredStores.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              جرب البحث بكلمات مختلفة أو تصفح التصنيفات
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Stores;
