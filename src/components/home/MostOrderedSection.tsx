import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: string;
  name: string;
  price: number;
  compare_price: number | null;
  images: string[];
  store_id: string;
  stores?: {
    name: string;
    rating: number;
  };
}

const MostOrderedSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchMostOrdered();
  }, []);

  const fetchMostOrdered = async () => {
    try {
      // Fetch products - in a real app, you'd order by order count
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          compare_price,
          images,
          store_id,
          stores (name, rating)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: true }) // Older products likely have more orders
        .limit(8);

      if (error) throw error;

      setProducts((data || []).map(p => ({
        ...p,
        price: Number(p.price),
        compare_price: p.compare_price ? Number(p.compare_price) : null,
        images: Array.isArray(p.images) ? p.images as string[] : []
      })));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images[0] || "",
      store_id: product.store_id,
      store_name: product.stores?.name || ""
    });
  };

  if (isLoading) {
    return (
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                الأكثر <span className="text-gradient">طلباً</span>
              </h2>
              <p className="text-muted-foreground text-sm">المنتجات الأكثر شعبية</p>
            </div>
          </div>
          <Link to="/stores" className="hidden sm:block">
            <Button variant="outline" className="gap-2">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product, index) => (
            <Link
              key={product.id}
              to={`/stores/${product.store_id}`}
              className="group opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
            >
              <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Trending Badge */}
                  <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                    <TrendingUp className="w-3 h-3 ml-1" />
                    رائج
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {product.stores?.name}
                    </p>
                    {product.stores?.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        <span className="text-xs font-medium">{Number(product.stores.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base sm:text-lg font-bold text-primary">
                      {product.price.toFixed(2)} ر.س
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        {product.compare_price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full gap-2 text-xs sm:text-sm"
                    onClick={(e) => handleAddToCart(product, e)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    إضافة للسلة
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/stores">
            <Button variant="outline" className="gap-2">
              عرض المزيد
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MostOrderedSection;
