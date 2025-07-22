import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useEffect } from "react";
import Index from "./pages/Index";
import CheckoutPage from "./components/CheckoutPage";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentFailure from "./components/PaymentFailure";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Coupons from "./pages/Coupons";
import Auth from "./pages/Auth";
import ProductManagement from "./pages/ProductManagement";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

const queryClient = new QueryClient();

const AppContent = () => {
  const { systemName, loadSettings } = useSystemSettings();
  
  useEffect(() => {
    document.title = systemName;
    loadSettings();
  }, [systemName, loadSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/dashboard" element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} />
        <Route path="/orders" element={<AdminProtectedRoute><Orders /></AdminProtectedRoute>} />
        <Route path="/coupons" element={<AdminProtectedRoute><Coupons /></AdminProtectedRoute>} />
        <Route path="/products" element={<AdminProtectedRoute><ProductManagement /></AdminProtectedRoute>} />
        <Route path="/product-management" element={<AdminProtectedRoute><ProductManagement /></AdminProtectedRoute>} />
        <Route path="/admin-settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
