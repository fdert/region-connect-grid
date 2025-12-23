import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Percent, 
  Store, 
  ShoppingCart,
  ArrowLeft,
  Flame,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Json } from "@/integrations/supabase/types";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  images: Json;
  store_id: string;
  category_id: string | null;
  stores: {
    id: string;
    name: string;
  } | null;
  categories: {
    id: string;
    name_ar: string;
  } | null;
}

interface Category {
  id: string;
  name_ar: string;
}

const Offers = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  
  // حماية من تصوير الشاشة
  useScreenshotProtection();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch products with discounts (compare_price > price)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          compare_price,
          images,
          store_id,
          category_id,
          stores (id, name),
          categories (id, name_ar)
        `)
        .eq('is_active', true)
        .not('compare_price', 'is', null)
        .gt('compare_price', 0)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
      } else {
        // Filter products where compare_price > price (actual discounts)
        const discountedProducts = (productsData || []).filter(
          (product: any) => product.compare_price && product.compare_price > product.price
        ) as Product[];
        setProducts(discountedProducts);

        // Extract unique categories from discounted products
        const uniqueCategories = discountedProducts
          .filter((p) => p.categories)
          .reduce((acc: Category[], product) => {
            if (product.categories && !acc.find(c => c.id === product.categories!.id)) {
              acc.push({
                id: product.categories.id,
                name_ar: product.categories.name_ar
              });
            }
            return acc;
          }, []);
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOffers = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.categories?.id === selectedCategory);

  const calculateDiscount = (price: number, comparePrice: number) => {
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  const getProductImage = (images: Json): string | null => {
    if (Array.isArray(images) && images.length > 0) {
      return images[0] as string;
    }
    return null;
  };

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    await addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: getProductImage(product.images) || '',
      store_id: product.store_id,
      store_name: product.stores?.name || ''
    });
    
    toast.success('تمت إضافة المنتج للسلة');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

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
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            الكل
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name_ar}
            </Button>
          ))}
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((product) => {
            const discount = calculateDiscount(product.price, product.compare_price!);
            const productImage = getProductImage(product.images);
            
            return (
              <Link 
                key={product.id}
                to={`/products/${product.id}`}
                className="bg-card rounded-2xl border overflow-hidden group hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  {productImage ? (
                    <img 
                      src={productImage} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-lg px-3 py-1">
                    {discount}% خصم
                  </Badge>

                  {/* Hot Badge for big discounts */}
                  {discount >= 30 && (
                    <Badge className="absolute top-3 left-3 bg-orange-500 text-white gap-1">
                      <Flame className="w-3 h-3" />
                      عرض حار
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {product.stores && (
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground hover:text-primary">
                        {product.stores.name}
                      </span>
                    </div>
                  )}
                  
                  <h3 className="font-bold text-lg mb-3 line-clamp-2">{product.name}</h3>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl font-bold text-primary">
                      {product.price} ر.س
                    </span>
                    <span className="text-lg text-muted-foreground line-through">
                      {product.compare_price} ر.س
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 gap-2"
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      أضف للسلة
                    </Button>
                    <Button variant="outline" size="icon">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
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
