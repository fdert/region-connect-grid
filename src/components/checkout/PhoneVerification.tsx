import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { 
  Phone, 
  Loader2, 
  MapPin, 
  CheckCircle2,
  MessageCircle,
  Navigation
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LocationInfo {
  lat: number;
  lng: number;
  address: string;
}

interface PhoneVerificationProps {
  onVerified: (phone: string, address: string, location?: LocationInfo) => void;
  onBack: () => void;
}

type Step = "phone" | "otp" | "location";

const PhoneVerification = ({ onVerified, onBack }: PhoneVerificationProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [address, setAddress] = useState("");
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [waitingForWhatsAppLocation, setWaitingForWhatsAppLocation] = useState(false);
  const [locationRequestSent, setLocationRequestSent] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Poll for WhatsApp location after step changes to location
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let pollCount = 0;
    const maxPolls = 60; // Poll for max 3 minutes
    
    // Start polling when we reach location step (even without explicit waiting flag)
    if (step === "location" && phone) {
      console.log("Starting location polling for phone:", phone);
      
      const checkLocation = async () => {
        pollCount++;
        console.log(`Polling for location (attempt ${pollCount}/${maxPolls})...`);
        
        try {
          const { data, error } = await supabase.functions.invoke("send-otp", {
            body: { phone, action: "check_location" }
          });
          
          console.log("Location check response:", data, error);
          
          if (data?.has_location && data?.location) {
            const loc = data.location;
            const locationAddress = loc.address || `${loc.lat}, ${loc.lng}`;
            const fullAddress = `${locationAddress}\n\n📍 رابط الموقع: ${loc.url}`;
            setAddress(fullAddress);
            
            // Store location info with coordinates
            setLocationInfo({
              lat: loc.lat,
              lng: loc.lng,
              address: locationAddress
            });
            
            setWaitingForWhatsAppLocation(false);
            
            toast({
              title: "تم استلام الموقع ✅",
              description: "تم استلام موقعك من الواتساب بنجاح"
            });
            
            if (interval) clearInterval(interval);
          } else if (pollCount >= maxPolls) {
            console.log("Max polls reached, stopping");
            if (interval) clearInterval(interval);
          }
        } catch (error) {
          console.error("Error checking location:", error);
        }
      };
      
      // Check immediately
      checkLocation();
      
      // Then check every 3 seconds
      interval = setInterval(checkLocation, 3000);
    }
    
    return () => {
      if (interval) {
        console.log("Clearing location polling interval");
        clearInterval(interval);
      }
    };
  }, [step, phone, toast]);

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رقم جوال صحيح",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone, action: "send" }
      });

      if (error) throw error;

      toast({
        title: "تم الإرسال",
        description: "تم إرسال رمز التحقق إلى واتساب"
      });

      setStep("otp");
      setCountdown(60);
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال رمز التحقق",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رمز التحقق كاملاً",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone, action: "verify", code: otpCode }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "تم التحقق",
          description: "تم التحقق من رقمك بنجاح، الآن سيتم طلب موقعك عبر الواتساب"
        });
        
        // Send location request via WhatsApp
        try {
          const { data: locData, error: locError } = await supabase.functions.invoke("request-location", {
            body: { phone }
          });
          
          if (!locError && locData?.success) {
            setLocationRequestSent(true);
            setWaitingForWhatsAppLocation(true);
            toast({
              title: "تم إرسال طلب الموقع 📍",
              description: "تم إرسال رسالة لطلب موقعك عبر الواتساب"
            });
          }
        } catch (error) {
          console.error("Error requesting location:", error);
        }
        
        setStep("location");
      } else {
        throw new Error(data?.error || "فشل التحقق");
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "خطأ",
        description: error.message || "رمز التحقق غير صحيح",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "خطأ",
        description: "المتصفح لا يدعم تحديد الموقع",
        variant: "destructive"
      });
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Create Google Maps link
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        
        // Try to get address from coordinates using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`
          );
          const data = await response.json();
          
          const addressText = data.display_name || `الموقع: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setAddress(`${addressText}\n\n📍 رابط الموقع: ${mapsUrl}`);
          
          // Store location info
          setLocationInfo({
            lat: latitude,
            lng: longitude,
            address: addressText
          });
        } catch {
          const addressText = `الموقع: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setAddress(`${addressText}\n\n📍 رابط الموقع: ${mapsUrl}`);
          
          setLocationInfo({
            lat: latitude,
            lng: longitude,
            address: addressText
          });
        }
        
        setLocationLoading(false);
        toast({
          title: "تم تحديد الموقع",
          description: "تم الحصول على موقعك بنجاح"
        });
      },
      (error) => {
        setLocationLoading(false);
        console.error("Geolocation error:", error);
        toast({
          title: "خطأ",
          description: "فشل في تحديد الموقع. يمكنك إدخال العنوان يدوياً",
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleComplete = () => {
    if (!address.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال عنوان التوصيل",
        variant: "destructive"
      });
      return;
    }
    onVerified(phone, address, locationInfo || undefined);
  };

  return (
    <div className="bg-card rounded-2xl border p-6 space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step === "phone" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
        }`}>
          {step !== "phone" ? <CheckCircle2 className="w-5 h-5" /> : "1"}
        </div>
        <div className={`w-16 h-1 ${step !== "phone" ? "bg-primary" : "bg-muted"}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step === "otp" ? "bg-primary text-primary-foreground" : 
          step === "location" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {step === "location" ? <CheckCircle2 className="w-5 h-5" /> : "2"}
        </div>
        <div className={`w-16 h-1 ${step === "location" ? "bg-primary" : "bg-muted"}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step === "location" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>
          3
        </div>
      </div>

      {/* Step 1: Phone */}
      {step === "phone" && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">التحقق من رقم الواتساب</h2>
            <p className="text-muted-foreground text-sm mt-1">
              سيتم إرسال رمز تحقق إلى رقم الواتساب الخاص بك
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الجوال (واتساب)</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="05xxxxxxxx"
                className="h-14 text-lg pr-12"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
              />
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              رجوع
            </Button>
            <Button 
              variant="hero" 
              onClick={handleSendOTP} 
              disabled={isLoading || phone.length < 10}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 ml-2" />
                  إرسال الرمز
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: OTP */}
      {step === "otp" && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">أدخل رمز التحقق</h2>
            <p className="text-muted-foreground text-sm mt-1">
              تم إرسال رمز مكون من 6 أرقام إلى
            </p>
            <p className="font-medium text-primary" dir="ltr">{phone}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center text-sm">
            <span className="text-muted-foreground">تحقق من الواتساب لمعرفة رمز التحقق</span>
          </div>

          <div className="flex justify-center py-4" dir="ltr">
            <InputOTP 
              maxLength={6} 
              value={otpCode} 
              onChange={setOtpCode}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                إعادة الإرسال خلال {countdown} ثانية
              </p>
            ) : (
              <Button 
                variant="link" 
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                إعادة إرسال الرمز
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep("phone")} className="flex-1">
              تغيير الرقم
            </Button>
            <Button 
              variant="hero" 
              onClick={handleVerifyOTP} 
              disabled={isLoading || otpCode.length !== 6}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "تأكيد الرمز"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {step === "location" && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold">تحديد موقع التوصيل</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {locationRequestSent 
                ? "تم إرسال رسالة واتساب لطلب موقعك، يرجى إرسال موقعك من الواتساب"
                : "شارك موقعك لتسهيل عملية التوصيل"
              }
            </p>
          </div>

          {/* WhatsApp Location Status */}
          {waitingForWhatsAppLocation && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400">في انتظار موقعك من الواتساب</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    افتح الواتساب وأرسل موقعك الحالي
                  </p>
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-green-500 mr-auto" />
              </div>
            </div>
          )}

          {/* Location received indicator */}
          {address && !waitingForWhatsAppLocation && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400">تم استلام الموقع ✅</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    يمكنك المتابعة أو تعديل الموقع أدناه
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 gap-3 border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
            onClick={handleGetLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <Navigation className="w-6 h-6 text-primary" />
            )}
            <span className="text-lg">تحديد موقعي من المتصفح</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-sm text-muted-foreground">أو أدخل العنوان يدوياً</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">عنوان التوصيل</Label>
            <textarea
              id="address"
              placeholder="أدخل عنوان التوصيل بالتفصيل (الحي، الشارع، رقم المبنى)"
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                // Clear location info if user manually edits the address
                if (locationInfo) {
                  setLocationInfo(null);
                }
              }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep("otp")} className="flex-1">
              رجوع
            </Button>
            <Button 
              variant="hero" 
              onClick={handleComplete} 
              disabled={!address.trim()}
              className="flex-1"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />
              متابعة للدفع
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;
