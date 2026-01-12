import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ForcePasswordChange from "@/components/auth/ForcePasswordChange";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Stores from "./pages/Stores";
import StoreDetails from "./pages/StoreDetails";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Categories from "./pages/Categories";
import CategoryDetails from "./pages/CategoryDetails";
import Offers from "./pages/Offers";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";

// Admin Dashboard Pages
import AdminDashboard from "./pages/dashboard/admin/AdminDashboard";
import BannersPage from "./pages/dashboard/admin/BannersPage";
import ThemePage from "./pages/dashboard/admin/ThemePage";
import WebhooksPage from "./pages/dashboard/admin/WebhooksPage";
import WhatsAppTemplatesPage from "./pages/dashboard/admin/WhatsAppTemplatesPage";
import SupportPage from "./pages/dashboard/admin/SupportPage";
import RewardsPage from "./pages/dashboard/admin/RewardsPage";
import UsersPage from "./pages/dashboard/admin/UsersPage";
import StoresManagementPage from "./pages/dashboard/admin/StoresManagementPage";
import OrdersManagementPage from "./pages/dashboard/admin/OrdersManagementPage";
import WalletsPage from "./pages/dashboard/admin/WalletsPage";
import CategoriesPage from "./pages/dashboard/admin/CategoriesPage";
import SpecialServicesPage from "./pages/dashboard/admin/SpecialServicesPage";
import SpecialOrdersPage from "./pages/dashboard/admin/SpecialOrdersPage";
import HomeContentPage from "./pages/dashboard/admin/HomeContentPage";
import StaticPagesPage from "./pages/dashboard/admin/StaticPagesPage";
import DeliverySettingsPage from "./pages/dashboard/admin/DeliverySettingsPage";
import AccountingPage from "./pages/dashboard/admin/AccountingPage";
import ReviewsPage from "./pages/dashboard/admin/ReviewsPage";
import PaymentSettingsPage from "./pages/dashboard/admin/PaymentSettingsPage";
import SpecialServiceOrder from "./pages/SpecialServiceOrder";

// Merchant Dashboard Pages
import MerchantDashboard from "./pages/dashboard/merchant/MerchantDashboard";
import MerchantOrders from "./pages/dashboard/merchant/MerchantOrders";
import MerchantProducts from "./pages/dashboard/merchant/MerchantProducts";
import MerchantReports from "./pages/dashboard/merchant/MerchantReports";
import MerchantFinance from "./pages/dashboard/merchant/MerchantFinance";
import MerchantSettings from "./pages/dashboard/merchant/MerchantSettings";
import MerchantSupport from "./pages/dashboard/merchant/MerchantSupport";
import CreateStore from "./pages/dashboard/merchant/CreateStore";

// Courier Dashboard Pages - Mobile Optimized
import MobileDashboard from "./pages/courier/MobileDashboard";
import MobileOrders from "./pages/courier/MobileOrders";
import MobileEarnings from "./pages/courier/MobileEarnings";
import MobileSettings from "./pages/courier/MobileSettings";

// Customer Dashboard Pages
import CustomerDashboard from "./pages/dashboard/customer/CustomerDashboard";
import CustomerOrders from "./pages/dashboard/customer/CustomerOrders";
import CustomerOrderDetails from "./pages/dashboard/customer/CustomerOrderDetails";
import CustomerWallet from "./pages/dashboard/customer/CustomerWallet";
import CustomerSupport from "./pages/dashboard/customer/CustomerSupport";
import CustomerSettings from "./pages/dashboard/customer/CustomerSettings";

// Review Page
import ReviewOrder from "./pages/ReviewOrder";
const queryClient = new QueryClient();

// Wrapper component to handle force password change
const AppContent = () => {
  const { user, forcePasswordChange, clearForcePasswordChange } = useAuth();

  if (user && forcePasswordChange) {
    return (
      <ForcePasswordChange 
        userId={user.id} 
        onSuccess={clearForcePasswordChange} 
      />
    );
  }

  return (
    <CartProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/stores/:id" element={<StoreDetails />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:id" element={<CategoryDetails />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/review/:orderId" element={<ReviewOrder />} />
        
        {/* Auth Routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        
        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/banners" element={<BannersPage />} />
        <Route path="/admin/theme" element={<ThemePage />} />
        <Route path="/admin/webhooks" element={<WebhooksPage />} />
        <Route path="/admin/whatsapp" element={<WhatsAppTemplatesPage />} />
        <Route path="/admin/support" element={<SupportPage />} />
        <Route path="/admin/rewards" element={<RewardsPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/stores" element={<StoresManagementPage />} />
        <Route path="/admin/orders" element={<OrdersManagementPage />} />
        <Route path="/admin/wallets" element={<WalletsPage />} />
        <Route path="/admin/categories" element={<CategoriesPage />} />
        <Route path="/admin/special-services" element={<SpecialServicesPage />} />
        <Route path="/admin/special-orders" element={<SpecialOrdersPage />} />
        <Route path="/admin/home-content" element={<HomeContentPage />} />
        <Route path="/admin/static-pages" element={<StaticPagesPage />} />
        <Route path="/admin/delivery-settings" element={<DeliverySettingsPage />} />
        <Route path="/admin/payment-settings" element={<PaymentSettingsPage />} />
        <Route path="/admin/accounting" element={<AccountingPage />} />
        <Route path="/admin/reviews" element={<ReviewsPage />} />
        
        {/* Special Services */}
        <Route path="/special-services/:id" element={<SpecialServiceOrder />} />
        
        {/* Merchant Dashboard */}
        <Route path="/merchant" element={<MerchantDashboard />} />
        <Route path="/merchant/create-store" element={<CreateStore />} />
        <Route path="/merchant/orders" element={<MerchantOrders />} />
        <Route path="/merchant/products" element={<MerchantProducts />} />
        <Route path="/merchant/reports" element={<MerchantReports />} />
        <Route path="/merchant/finance" element={<MerchantFinance />} />
        <Route path="/merchant/settings" element={<MerchantSettings />} />
        <Route path="/merchant/support" element={<MerchantSupport />} />
        
        {/* Courier Dashboard - Mobile Optimized */}
        <Route path="/courier" element={<MobileDashboard />} />
        <Route path="/courier/orders" element={<MobileOrders />} />
        <Route path="/courier/earnings" element={<MobileEarnings />} />
        <Route path="/courier/settings" element={<MobileSettings />} />
        
        {/* Customer Dashboard */}
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/customer/orders/:id" element={<CustomerOrderDetails />} />
        <Route path="/customer/wallet" element={<CustomerWallet />} />
        <Route path="/customer/support" element={<CustomerSupport />} />
        <Route path="/customer/settings" element={<CustomerSettings />} />
        
        {/* Catch All */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </CartProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
