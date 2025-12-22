import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Stores from "./pages/Stores";
import StoreDetails from "./pages/StoreDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Categories from "./pages/Categories";
import Offers from "./pages/Offers";
import About from "./pages/About";
import AdminDashboard from "./pages/dashboard/admin/AdminDashboard";
import MerchantDashboard from "./pages/dashboard/merchant/MerchantDashboard";
import CourierDashboard from "./pages/dashboard/courier/CourierDashboard";
import CustomerDashboard from "./pages/dashboard/customer/CustomerDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/store/:id" element={<StoreDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/about" element={<About />} />
              
              {/* Auth Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              
              {/* Admin Dashboard */}
              <Route path="/admin" element={<AdminDashboard />} />
              
              {/* Merchant Dashboard */}
              <Route path="/merchant" element={<MerchantDashboard />} />
              
              {/* Courier Dashboard */}
              <Route path="/courier" element={<CourierDashboard />} />
              
              {/* Customer Dashboard */}
              <Route path="/customer" element={<CustomerDashboard />} />
              
              {/* Catch All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
