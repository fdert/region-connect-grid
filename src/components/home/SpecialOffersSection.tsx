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

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
                    
                    {/* Discount Badge */}
                    <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground font-bold">
                      {discountPercent}% خصم
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {product.stores?.name}
                    </p>
                    <h3 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base sm:text-lg font-bold text-destructive">
                        {product.price.toFixed(2)} ر.س
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground line-through">
                        {product.compare_price?.toFixed(2)} ر.س
                      </span>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full gap-2 text-xs sm:text-sm"
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      إضافة للسلة
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
