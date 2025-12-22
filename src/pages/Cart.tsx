import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft,
  ShoppingBag,
  Store
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";

const Cart = () => {
  const { items, removeItem, updateQuantity, clearCart, subtotal, itemCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);

  const deliveryFee = subtotal > 0 ? 15 : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (!user) {
      navigate("/auth/login?redirect=/checkout");
      return;
    }
    navigate("/checkout");
  };

  const handleClearCart = async () => {
    setIsClearing(true);
    await clearCart();
    setIsClearing(false);
  };

  // Group items by store
  const itemsByStore = items.reduce((acc, item) => {
    const storeId = item.store_id;
    if (!acc[storeId]) {
      acc[storeId] = {
        store_name: item.store_name,
        items: []
      };
    }
    acc[storeId].items.push(item);
    return acc;
  }, {} as Record<string, { store_name: string; items: typeof items }>);

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">سلة التسوق فارغة</h1>
            <p className="text-muted-foreground mb-8">
              لم تقم بإضافة أي منتجات إلى السلة بعد
            </p>
            <Link to="/stores">
              <Button variant="hero" size="lg" className="gap-2">
                <ShoppingBag className="w-5 h-5" />
                تصفح المتاجر
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">سلة التسوق</h1>
            <p className="text-muted-foreground">{itemCount} منتج</p>
          </div>
          <Button 
            variant="ghost" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleClearCart}
            disabled={isClearing}
          >
            <Trash2 className="w-4 h-4 ml-2" />
            تفريغ السلة
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(itemsByStore).map(([storeId, { store_name, items: storeItems }]) => (
              <div key={storeId} className="bg-card rounded-2xl border overflow-hidden">
                {/* Store Header */}
                <div className="px-6 py-4 border-b bg-muted/50 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{store_name}</span>
                </div>

                {/* Items */}
                <div className="divide-y">
                  {storeItems.map((item) => (
                    <div key={item.product_id} className="p-4 md:p-6 flex gap-4">
                      {/* Image */}
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 line-clamp-2">{item.name}</h3>
                        <p className="text-primary font-bold">
                          {item.price.toFixed(2)} ر.س
                        </p>
                      </div>

                      {/* Quantity & Actions */}
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-sm font-medium">
                          {(item.price * item.quantity).toFixed(2)} ر.س
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>رسوم التوصيل</span>
                  <span>{deliveryFee.toFixed(2)} ر.س</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary">{total.toFixed(2)} ر.س</span>
                </div>
              </div>

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full gap-2"
                onClick={handleCheckout}
              >
                إتمام الطلب
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <Link 
                to="/stores" 
                className="block text-center text-sm text-muted-foreground hover:text-primary mt-4 transition-colors"
              >
                متابعة التسوق
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Cart;
