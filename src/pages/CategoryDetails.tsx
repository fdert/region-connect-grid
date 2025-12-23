import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft,
  ShoppingCart,
  Plus,
  Minus,
  Tag,
  Store
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
  image_url: string | null;
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
  store_id: string;
  store_name?: string;
}

const CategoryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { addItem } = useCart();
  
  // حماية من تصوير الشاشة
  useScreenshotProtection();

  useEffect(() => {
    if (id) {
      fetchCategoryData();
    }
  }, [id]);

  const fetchCategoryData = async () => {
    setIsLoading(true);
    try {
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Fetch products in this category with store info
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          stores (name)
        `)
        .eq("category_id", id)
        .eq("is_active", true);

      if (productsError) throw productsError;
      
      setProducts((productsData || []).map(p => ({
        ...p,
        price: Number(p.price),
        compare_price: p.compare_price ? Number(p.compare_price) : null,
        images: Array.isArray(p.images) ? p.images as string[] : [],
        store_name: p.stores?.name || ""
      })));
    } catch (error) {
      console.error("Error fetching category:", error);
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
      store_id: product.store_id,
      store_name: product.store_name || ""
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
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!category) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Tag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">التصنيف غير موجود</h1>
          <Link to="/categories">
            <Button>العودة للتصنيفات</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12">
        <div className="container mx-auto px-4">
          <Link 
            to="/categories" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            العودة للتصنيفات
          </Link>
          
          <div className="flex items-center gap-4">
            {category.image_url ? (
              <img 
                src={category.image_url} 
                alt={category.name_ar}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                <Tag className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{category.name_ar}</h1>
              <p className="text-muted-foreground">{products.length} منتج</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16 bg-muted/50 rounded-2xl">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-4">لا توجد منتجات في هذا التصنيف حالياً</p>
            <Link to="/stores">
              <Button>تصفح المتاجر</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div 
                key={product.id}
                className="bg-card rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow group"
              >
                {/* Image */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.images[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {product.compare_price && product.compare_price > product.price && (
                    <Badge className="absolute top-3 right-3 bg-destructive">
                      خصم {Math.round((1 - product.price / product.compare_price) * 100)}%
                    </Badge>
                  )}
                  
                  {product.is_service && (
                    <Badge className="absolute top-3 left-3" variant="secondary">خدمة</Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {product.store_name && (
                    <Link 
                      to={`/stores/${product.store_id}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-2"
                    >
                      <Store className="w-3 h-3" />
                      {product.store_name}
                    </Link>
                  )}
                  
                  <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-primary">
                      {product.price.toFixed(2)} ر.س
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.compare_price.toFixed(2)} ر.س
                      </span>
                    )}
                  </div>

                  {/* Quantity & Add to Cart */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-2 hover:bg-muted transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-medium">
                        {quantities[product.id] || 1}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-2 hover:bg-muted transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <Button 
                      className="flex-1 gap-2"
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.is_service && product.stock < 1}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      إضافة
                    </Button>
                  </div>

                  {!product.is_service && product.stock < 5 && product.stock > 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      متبقي {product.stock} فقط
                    </p>
                  )}
                  
                  {!product.is_service && product.stock < 1 && (
                    <p className="text-xs text-destructive mt-2">نفذت الكمية</p>
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

export default CategoryDetails;
