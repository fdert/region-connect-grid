import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  ShoppingCart,
  Plus,
  Minus,
  ChevronLeft,
  Heart,
  Truck,
  Store,
  ArrowRight
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import { ProtectedImage } from "@/components/ui/ProtectedImage";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_price: number | null;
  stock: number;
  is_service: boolean;
  images: string[];
  store_id: string;
  stores?: {
    id: string;
    name: string;
    logo_url: string;
    rating: number;
    delivery_fee: number;
  };
}

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem } = useCart();
  
  // حماية من تصوير الشاشة
  useScreenshotProtection();

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          stores (id, name, logo_url, rating, delivery_fee)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProduct({
          ...data,
          price: Number(data.price),
          compare_price: data.compare_price ? Number(data.compare_price) : null,
          images: Array.isArray(data.images) ? data.images as string[] : [],
          stores: data.stores ? {
            ...data.stores,
            rating: Number(data.stores.rating),
            delivery_fee: Number(data.stores.delivery_fee)
          } : undefined
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    await addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images[0] || "",
      store_id: product.store_id,
      store_name: product.stores?.name || ""
    });
    setQuantity(1);
  };

  const updateQuantity = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">المنتج غير موجود</h1>
          <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
        </div>
      </MainLayout>
    );
  }

  const discountPercent = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <ChevronLeft className="w-4 h-4" />
          {product.stores && (
            <>
              <Link to={`/stores/${product.stores.id}`} className="hover:text-primary">
                {product.stores.name}
              </Link>
              <ChevronLeft className="w-4 h-4" />
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-2xl overflow-hidden relative">
              {product.images[selectedImage] ? (
                <ProtectedImage 
                  src={product.images[selectedImage]} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  watermarkText={product.stores?.name || "محمي"}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-20 h-20 text-muted-foreground/30" />
                </div>
              )}
              
              {discountPercent > 0 && (
                <Badge className="absolute top-4 right-4 bg-destructive text-lg py-1 px-3 z-30">
                  خصم {discountPercent}%
                </Badge>
              )}
              
              {product.is_service && (
                <Badge className="absolute top-4 left-4 z-30" variant="secondary">خدمة</Badge>
              )}
            </div>
            
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === idx ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
              
              {/* Store Info */}
              {product.stores && (
                <Link 
                  to={`/stores/${product.stores.id}`}
                  className="inline-flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center overflow-hidden">
                    {product.stores.logo_url ? (
                      <img src={product.stores.logo_url} alt={product.stores.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.stores.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{product.stores.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground mr-auto" />
                </Link>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {product.price.toFixed(2)} ر.س
              </span>
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-lg text-muted-foreground line-through">
                  {product.compare_price.toFixed(2)} ر.س
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">الوصف</h3>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Delivery Info */}
            {product.stores && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-4 h-4" />
                <span>رسوم التوصيل: {product.stores.delivery_fee} ر.س</span>
              </div>
            )}

            {/* Stock Status */}
            {!product.is_service && (
              <div>
                {product.stock > 0 ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    متوفر ({product.stock} قطعة)
                  </Badge>
                ) : (
                  <Badge variant="destructive">نفذت الكمية</Badge>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center border rounded-xl">
                <button
                  onClick={() => updateQuantity(-1)}
                  className="p-3 hover:bg-muted transition-colors rounded-r-xl"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-16 text-center font-medium text-lg">{quantity}</span>
                <button
                  onClick={() => updateQuantity(1)}
                  className="p-3 hover:bg-muted transition-colors rounded-l-xl"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <Button 
                className="flex-1 gap-2 h-12 text-lg"
                onClick={handleAddToCart}
                disabled={!product.is_service && product.stock < 1}
              >
                <ShoppingCart className="w-5 h-5" />
                إضافة للسلة
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="h-12 w-12">
                <Heart className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductDetails;
