import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  store_id: string;
  store_name: string;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "id">) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load cart from localStorage for guests, or from DB for logged-in users
  useEffect(() => {
    if (user) {
      loadCartFromDB();
    } else {
      loadCartFromLocalStorage();
    }
  }, [user]);

  const loadCartFromLocalStorage = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  };

  const saveCartToLocalStorage = (cartItems: CartItem[]) => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  };

  const loadCartFromDB = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          quantity,
          products (
            id,
            name,
            price,
            images,
            store_id,
            stores (name)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const cartItems: CartItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        name: item.products?.name || "",
        price: Number(item.products?.price) || 0,
        quantity: item.quantity,
        image: item.products?.images?.[0] || "",
        store_id: item.products?.store_id || "",
        store_name: item.products?.stores?.name || ""
      }));

      setItems(cartItems);
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, "id">) => {
    const existingItem = items.find(i => i.product_id === item.product_id);
    
    if (user) {
      try {
        if (existingItem) {
          await supabase
            .from("cart_items")
            .update({ quantity: existingItem.quantity + item.quantity })
            .eq("user_id", user.id)
            .eq("product_id", item.product_id);
        } else {
          await supabase
            .from("cart_items")
            .insert({
              user_id: user.id,
              product_id: item.product_id,
              quantity: item.quantity
            });
        }
        await loadCartFromDB();
      } catch (error) {
        console.error("Error adding to cart:", error);
        toast({
          title: "خطأ",
          description: "فشل في إضافة المنتج إلى السلة",
          variant: "destructive"
        });
      }
    } else {
      // Guest cart
      let newItems: CartItem[];
      if (existingItem) {
        newItems = items.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        newItems = [...items, { ...item, id: crypto.randomUUID() }];
      }
      setItems(newItems);
      saveCartToLocalStorage(newItems);
    }

    toast({
      title: "تمت الإضافة",
      description: "تمت إضافة المنتج إلى السلة"
    });
  };

  const removeItem = async (productId: string) => {
    if (user) {
      try {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        await loadCartFromDB();
      } catch (error) {
        console.error("Error removing from cart:", error);
      }
    } else {
      const newItems = items.filter(i => i.product_id !== productId);
      setItems(newItems);
      saveCartToLocalStorage(newItems);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(productId);
      return;
    }

    if (user) {
      try {
        await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("user_id", user.id)
          .eq("product_id", productId);
        await loadCartFromDB();
      } catch (error) {
        console.error("Error updating cart:", error);
      }
    } else {
      const newItems = items.map(i =>
        i.product_id === productId ? { ...i, quantity } : i
      );
      setItems(newItems);
      saveCartToLocalStorage(newItems);
    }
  };

  const clearCart = async () => {
    if (user) {
      try {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id);
        setItems([]);
      } catch (error) {
        console.error("Error clearing cart:", error);
      }
    } else {
      setItems([]);
      localStorage.removeItem("cart");
    }
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      isLoading,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
