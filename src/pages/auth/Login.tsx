import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في سوقنا!",
      });
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient">سوقنا</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">تسجيل الدخول</h1>
            <p className="text-muted-foreground">
              مرحباً بعودتك! سجّل دخولك للمتابعة
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  className="h-12 pr-12"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  dir="ltr"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 pr-12 pl-12"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  dir="ltr"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              variant="hero" 
              size="xl" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-12">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 ml-2" />
              تسجيل الدخول بحساب جوجل
            </Button>
          </div>

          {/* Register Link */}
          <p className="text-center mt-8 text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link to="/auth/register" className="text-primary font-medium hover:underline">
              سجّل الآن
            </Link>
          </p>

          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 mt-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="max-w-lg text-center text-primary-foreground">
          <div className="w-24 h-24 rounded-3xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
            <Store className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">مرحباً بك في سوقنا</h2>
          <p className="text-primary-foreground/80 text-lg">
            منصتك المفضلة للتسوق الإلكتروني. اكتشف أفضل المتاجر والمنتجات في مكان واحد.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
