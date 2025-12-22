import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Stores from "./pages/Stores";
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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/stores" element={<Stores />} />
          
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
