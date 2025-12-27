import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Percent, Timer, ShoppingCart } from "lucide-react";
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
  };
}

const SpecialOffersSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          compare_price,
          images,
          store_id,
          stores (name)
        `)
        .eq("is_active", true)
        .not("compare_price", "is", null)
        .gt("compare_price", 0)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      // Filter products where compare_price > price (actual discounts)
      const discountedProducts = (data || [])
        .filter(p => p.compare_price && p.compare_price > p.price)
        .map(p => ({
          ...p,
          price: Number(p.price),
          compare_price: p.compare_price ? Number(p.compare_price) : null,
          images: Array.isArray(p.images) ? p.images as string[] : []
        }));

      setProducts(discountedProducts);
    } catch (error) {
      console.error("Error fetching offers:", error);
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
      <section className="py-10 sm:py-16 bg-gradient-to-br from-destructive/5 to-accent/5">
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
    <section className="py-10 sm:py-16 bg-gradient-to-br from-destructive/5 to-accent/5">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Percent className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                العروض <span className="text-destructive">الخاصة</span>
              </h2>
              <p className="text-muted-foreground text-sm">خصومات حصرية لفترة محدودة</p>
            </div>
          </div>
          <Link to="/offers" className="hidden sm:block">
            <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Products Grid - Compact */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {products.map((product, index) => {
            const discountPercent = product.compare_price 
              ? Math.round((1 - product.price / product.compare_price) * 100)
              : 0;

            return (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="group opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
              >
                <div className="bg-card rounded-lg overflow-hidden border border-border/40 shadow-sm hover:shadow-lg hover:border-destructive/30 transition-all duration-300">
                  {/* Image - Compact */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-destructive/10 to-destructive/5">
                        <ShoppingCart className="w-6 h-6 text-destructive/40" />
                      </div>
                    )}
                    
                    {/* Discount Badge */}
                    <div className="absolute top-1 right-1 bg-destructive text-white text-[8px] sm:text-[10px] px-1 py-0.5 rounded font-bold">
                      -{discountPercent}%
                    </div>
                  </div>

                  {/* Content - Ultra Compact */}
                  <div className="p-1.5 sm:p-2">
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground truncate mb-0.5">
                      {product.stores?.name}
                    </p>
                    <h3 className="font-medium text-[10px] sm:text-xs mb-1 line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-baseline gap-1 mb-1.5">
                      <span className="text-xs sm:text-sm font-bold text-destructive">
                        {product.price.toFixed(0)}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground">ر.س</span>
                      <span className="text-[8px] text-muted-foreground line-through">
                        {product.compare_price?.toFixed(0)}
                      </span>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full gap-1 text-[10px] sm:text-xs h-6 sm:h-7 rounded bg-destructive hover:bg-destructive/90"
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      إضافة
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/offers">
            <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
              عرض جميع العروض
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffersSection;
