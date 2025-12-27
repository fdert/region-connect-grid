import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  ShoppingCart,
  Plus,
  Minus,
  ChevronLeft,
  Heart,
  Truck
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import StoreCategoriesSlider from "@/components/store/StoreCategoriesSlider";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import { ProtectedImage } from "@/components/ui/ProtectedImage";

interface Store {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
  phone: string;
  address: string;
  city: string;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  min_order_amount: number;
  working_hours: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_price: number | null;
  stock: number;
  is_service: boolean;
  images: string[];
  category_id: string;
}

const StoreDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem } = useCart();
  
  // حماية من تصوير الشاشة
  useScreenshotProtection();

  useEffect(() => {
    if (id) {
      fetchStoreData();
    }
  }, [id]);

  const fetchStoreData = async () => {
    setIsLoading(true);
    try {
      // Fetch store
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (storeError) throw storeError;
      
      if (storeData) {
        setStore({
          ...storeData,
          rating: Number(storeData.rating) || 0,
          delivery_fee: Number(storeData.delivery_fee) || 0,
          min_order_amount: Number(storeData.min_order_amount) || 0,
          working_hours: (storeData.working_hours as Record<string, string>) || {}
        });
      }

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", id)
        .eq("is_active", true);

      if (productsError) throw productsError;
      
      setProducts((productsData || []).map(p => ({
        ...p,
        price: Number(p.price),
        compare_price: p.compare_price ? Number(p.compare_price) : null,
        images: Array.isArray(p.images) ? p.images as string[] : []
      })));
    } catch (error) {
      console.error("Error fetching store:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    const quantity = quantities[product.id] || 1;
    await addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images[0] || "",
      store_id: store?.id || "",
      store_name: store?.name || ""
    });
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-2xl mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!store) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">المتجر غير موجود</h1>
          <Link to="/stores">
            <Button>العودة للمتاجر</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Cover Image */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20">
        {store.cover_url ? (
          <img 
            src={store.cover_url} 
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Breadcrumb */}
        <div className="absolute top-4 right-4">
          <Link 
            to="/stores" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur rounded-full text-sm hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            العودة للمتاجر
          </Link>
        </div>
      </div>

      {/* Store Info */}
      <div className="container mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-card rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-lg -mt-16 md:-mt-20">
              {store.logo_url ? (
                <img 
                  src={store.logo_url} 
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground">
                  {store.name.charAt(0)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">{store.name}</h1>
                  <p className="text-muted-foreground mb-4">{store.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{store.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({store.total_reviews} تقييم)</span>
                    </div>
                    
                    {store.address && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{store.address}</span>
                      </div>
                    )}
                    
                    {store.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span dir="ltr">{store.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
                <Badge variant="secondary" className="gap-1">
                  <Truck className="w-3 h-3" />
                  رسوم التوصيل: {store.delivery_fee} ر.س
                </Badge>
                <Badge variant="outline">
                  الحد الأدنى للطلب: {store.min_order_amount} ر.س
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Slider */}
      <div className="container mx-auto px-4 pt-6">
        <StoreCategoriesSlider storeId={store.id} />
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-6">المنتجات ({products.length})</h2>
        
        {products.length === 0 ? (
          <div className="text-center py-16 bg-muted/50 rounded-2xl">
            <p className="text-muted-foreground">لا توجد منتجات متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((product) => (
              <div 
                key={product.id}
                className="bg-card rounded-lg sm:rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow group"
              >
                {/* Image - Smaller */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.images[0] ? (
                    <ProtectedImage 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      watermarkText={store.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {product.compare_price && product.compare_price > product.price && (
                    <Badge className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-destructive text-[10px] sm:text-xs px-1.5 py-0.5">
                      خصم {Math.round((1 - product.price / product.compare_price) * 100)}%
                    </Badge>
                  )}
                  
                  {product.is_service && (
                    <Badge className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 text-[10px] sm:text-xs px-1.5 py-0.5" variant="secondary">خدمة</Badge>
                  )}
                </div>

                {/* Content - Compact */}
                <div className="p-2 sm:p-3">
                  <h3 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2 leading-tight">{product.name}</h3>
                  
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      {product.price.toFixed(0)} ر.س
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                        {product.compare_price.toFixed(0)}
                      </span>
                    )}
                  </div>

                  {/* Quantity & Add to Cart - Compact */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="flex items-center border rounded-md">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-1 sm:p-1.5 hover:bg-muted transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">
                        {quantities[product.id] || 1}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-1 sm:p-1.5 hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <Button 
                      size="sm"
                      className="flex-1 gap-1 text-xs px-2 h-7 sm:h-8"
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.is_service && product.stock < 1}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span className="hidden sm:inline">إضافة</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  </div>

                  {!product.is_service && product.stock < 5 && product.stock > 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      متبقي {product.stock} فقط
                    </p>
                  )}
                  
                  {!product.is_service && product.stock < 1 && (
                    <p className="text-[10px] text-destructive mt-1">نفذت الكمية</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default StoreDetails;
