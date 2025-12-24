import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Package,
  MapPin,
  User,
  Phone,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Truck,
  Calculator,
  Shield,
  Clock,
  Navigation,
} from "lucide-react";

interface SpecialService {
  id: string;
  name: string;
  name_ar: string;
  description_ar: string | null;
  base_price: number | null;
  price_per_km: number | null;
  min_price: number | null;
  max_distance_km: number | null;
  requires_verification: boolean | null;
}

const packageTypes = [
  { value: "documents", label: "مستندات وأوراق" },
  { value: "small_package", label: "طرد صغير" },
  { value: "medium_package", label: "طرد متوسط" },
  { value: "large_package", label: "طرد كبير" },
  { value: "food", label: "طعام" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "other", label: "أخرى" },
];

const packageSizes = [
  { value: "small", label: "صغير (حتى 5 كجم)" },
  { value: "medium", label: "متوسط (5-15 كجم)" },
  { value: "large", label: "كبير (15-30 كجم)" },
  { value: "extra_large", label: "كبير جداً (أكثر من 30 كجم)" },
];

const SpecialServiceOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  const [formData, setFormData] = useState({
    // Sender info
    sender_name: "",
    sender_phone: "",
    sender_location_url: "",
    sender_address: "",
    // Recipient info
    recipient_name: "",
    recipient_phone: "",
    recipient_location_url: "",
    recipient_address: "",
    // Package info
    package_type: "",
    package_size: "",
    package_description: "",
    package_weight: "",
    // Notes
    notes: "",
  });

  const { data: service, isLoading } = useQuery({
    queryKey: ["special-service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_services")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as SpecialService;
    },
    enabled: !!id,
  });

  // Extract coordinates from Google Maps URL or direct coordinates
  const extractCoordinates = (input: string): { lat: number; lng: number } | null => {
    try {
      if (!input) return null;
      
      const trimmedInput = input.trim();
      
      // Check if it's direct coordinates format: "lat,lng" or "lat, lng"
      const directCoordsMatch = trimmedInput.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (directCoordsMatch) {
        const lat = parseFloat(directCoordsMatch[1]);
        const lng = parseFloat(directCoordsMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
      
      // Decode URL first
      const decodedUrl = decodeURIComponent(trimmedInput);
      
      // Match various Google Maps URL formats
      const patterns = [
        // Standard format: @lat,lng
        /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Data format: !3dlat!4dlng
        /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
        // Query format: q=lat,lng
        /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Place format: place/lat,lng
        /place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Short link format: maps?q=lat,lng
        /maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Another format: /maps/place/.../@lat,lng
        /\/maps\/.*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Mobile format: goo.gl or maps.app.goo.gl with coordinates
        /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Apple Maps format
        /[?&]sll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        // Coordinate pairs with high precision anywhere in URL
        /(-?\d{1,3}\.\d{5,}),\s*(-?\d{1,3}\.\d{5,})/,
        // Less precise coordinates (at least 4 decimal places)
        /(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/,
      ];

      for (const pattern of patterns) {
        const match = decodedUrl.match(pattern);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          // Validate coordinates - Saudi Arabia roughly: lat 16-32, lng 34-56
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error extracting coordinates:", error);
      return null;
    }
  };

  // Calculate road distance using OSRM (Open Source Routing Machine) - FREE API
  const calculateRoadDistance = async (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number> => {
    try {
      // OSRM expects coordinates as lng,lat (not lat,lng)
      const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        // OSRM returns distance in meters, convert to km
        return data.routes[0].distance / 1000;
      }
      
      // Fallback to Haversine with road factor if OSRM fails
      return calculateHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
    } catch (error) {
      console.error("OSRM API error:", error);
      // Fallback to Haversine formula with road factor (1.3x)
      return calculateHaversineDistance(lat1, lng1, lat2, lng2) * 1.3;
    }
  };

  // Fallback Haversine formula for straight-line distance
  const calculateHaversineDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate price based on distance
  useEffect(() => {
    const calculateDistanceAndPrice = async () => {
      if (formData.sender_location_url && formData.recipient_location_url && service) {
        const senderCoords = extractCoordinates(formData.sender_location_url);
        const recipientCoords = extractCoordinates(formData.recipient_location_url);

        console.log("Sender URL:", formData.sender_location_url);
        console.log("Recipient URL:", formData.recipient_location_url);
        console.log("Sender Coords:", senderCoords);
        console.log("Recipient Coords:", recipientCoords);

        if (senderCoords && recipientCoords) {
          setIsCalculatingDistance(true);
          
          try {
            const distance = await calculateRoadDistance(
              senderCoords.lat,
              senderCoords.lng,
              recipientCoords.lat,
              recipientCoords.lng
            );
            console.log("Calculated Distance:", distance);
            setCalculatedDistance(distance);

            // Calculate price
            const basePrice = service.base_price || 0;
            const pricePerKm = service.price_per_km || 2.5;
            const minPrice = service.min_price || 15;

            let price = basePrice + distance * pricePerKm;
            price = Math.max(price, minPrice);
            console.log("Calculated Price:", price);
            setCalculatedPrice(Math.round(price * 100) / 100);
          } catch (error) {
            console.error("Error calculating distance:", error);
          } finally {
            setIsCalculatingDistance(false);
          }
        } else {
          console.log("Could not extract coordinates from URLs");
          // Reset values if coordinates cannot be extracted
          setCalculatedDistance(null);
          setCalculatedPrice(null);
        }
      }
    };

    calculateDistanceAndPrice();
  }, [formData.sender_location_url, formData.recipient_location_url, service]);

  // Generate and send verification code
  const sendVerificationCode = async () => {
    if (!formData.sender_phone) {
      toast.error("يرجى إدخال رقم الجوال أولاً");
      return;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(code);
    setIsVerifying(true);

    // Format phone number properly
    let phoneNumber = formData.sender_phone.trim();
    if (phoneNumber.startsWith("05")) {
      phoneNumber = "+966" + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith("5")) {
      phoneNumber = "+966" + phoneNumber;
    } else if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }

    console.log("Sending verification code to:", phoneNumber, "Code:", code);

    try {
      // Send WhatsApp notification with verification code
      const { data, error } = await supabase.functions.invoke("whatsapp-notification", {
        body: {
          phone: phoneNumber,
          template_name: "verification_code",
          variables: { 
            code: code,
            customer_name: formData.sender_name || "عميلنا العزيز"
          },
        },
      });

      console.log("WhatsApp response:", data, error);

      if (error) {
        console.error("WhatsApp error:", error);
        toast.error("حدث خطأ في إرسال الكود");
        toast.info(`كود التحقق (للاختبار): ${code}`);
      } else if (data?.success) {
        toast.success("تم إرسال كود التحقق إلى الواتساب بنجاح");
      } else {
        console.error("WhatsApp failed:", data?.error);
        toast.error(data?.error || "فشل في إرسال الكود");
        toast.info(`كود التحقق (للاختبار): ${code}`);
      }
    } catch (error) {
      console.error("Error sending verification:", error);
      toast.error("حدث خطأ في الاتصال");
      toast.info(`كود التحقق (للاختبار): ${code}`);
    }
  };

  const verifyCode = () => {
    if (enteredCode === verificationCode) {
      toast.success("تم التحقق بنجاح");
      setStep(3);
    } else {
      toast.error("كود التحقق غير صحيح");
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user || !service || calculatedPrice === null) {
        throw new Error("Missing required data");
      }

      const senderCoords = extractCoordinates(formData.sender_location_url);
      const recipientCoords = extractCoordinates(formData.recipient_location_url);

      const { data, error } = await supabase
        .from("special_orders")
        .insert({
          customer_id: user.id,
          service_id: service.id,
          sender_name: formData.sender_name,
          sender_phone: formData.sender_phone,
          sender_location_lat: senderCoords?.lat,
          sender_location_lng: senderCoords?.lng,
          sender_location_url: formData.sender_location_url,
          sender_address: formData.sender_address,
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          recipient_location_lat: recipientCoords?.lat,
          recipient_location_lng: recipientCoords?.lng,
          recipient_location_url: formData.recipient_location_url,
          recipient_address: formData.recipient_address,
          package_type: formData.package_type,
          package_size: formData.package_size,
          package_description: formData.package_description,
          package_weight: formData.package_weight ? parseFloat(formData.package_weight) : null,
          distance_km: calculatedDistance,
          delivery_fee: calculatedPrice,
          total: calculatedPrice,
          verification_code: verificationCode,
          is_verified: true,
          verified_at: new Date().toISOString(),
          status: "verified",
          notes: formData.notes,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("تم إنشاء الطلب بنجاح");
      navigate(`/customer/orders`);
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء إنشاء الطلب");
      console.error(error);
    },
  });

  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h1>
          <p className="text-muted-foreground mb-6">
            يجب عليك تسجيل الدخول لطلب خدمة التوصيل الخاص
          </p>
          <Button onClick={() => navigate("/auth/login")}>تسجيل الدخول</Button>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      </MainLayout>
    );
  }

  if (!service) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">الخدمة غير موجودة</h1>
          <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{service.name_ar}</h1>
          <p className="text-muted-foreground">{service.description_ar}</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 4 && <div className={`w-8 h-1 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Step 1: Sender Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  بيانات المرسل
                </CardTitle>
                <CardDescription>أدخل بيانات الموقع الذي سيتم الاستلام منه</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المرسل *</Label>
                    <Input
                      value={formData.sender_name}
                      onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                      placeholder="أدخل اسم المرسل"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم جوال المرسل *</Label>
                    <Input
                      type="tel"
                      value={formData.sender_phone}
                      onChange={(e) => setFormData({ ...formData, sender_phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    موقع الاستلام *
                  </Label>
                  <Input
                    value={formData.sender_location_url}
                    onChange={(e) => setFormData({ ...formData, sender_location_url: e.target.value })}
                    placeholder="رابط خرائط جوجل أو إحداثيات (مثال: 24.7136, 46.6753)"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك إدخال رابط خرائط جوجل أو الإحداثيات مباشرة (خط العرض, خط الطول)
                  </p>
                  {formData.sender_location_url && extractCoordinates(formData.sender_location_url) && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ تم التعرف على الموقع
                    </Badge>
                  )}
                  {formData.sender_location_url && !extractCoordinates(formData.sender_location_url) && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      ✗ لم يتم التعرف على الإحداثيات - جرب إدخالها مباشرة
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>العنوان التفصيلي</Label>
                  <Textarea
                    value={formData.sender_address}
                    onChange={(e) => setFormData({ ...formData, sender_address: e.target.value })}
                    placeholder="مثال: شارع الملك فهد، بناية 5، الدور الثاني"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!formData.sender_name || !formData.sender_phone || !formData.sender_location_url}
                >
                  التالي
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Verification */}
          {step === 2 && service.requires_verification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  التحقق من رقم الجوال
                </CardTitle>
                <CardDescription>
                  سيتم إرسال كود تحقق إلى رقم الواتساب {formData.sender_phone}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isVerifying ? (
                  <Button className="w-full" onClick={sendVerificationCode}>
                    <MessageSquare className="w-4 h-4 ml-2" />
                    إرسال كود التحقق عبر الواتساب
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>أدخل كود التحقق</Label>
                      <Input
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value)}
                        placeholder="0000"
                        maxLength={4}
                        className="text-center text-2xl tracking-widest"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button className="flex-1" onClick={verifyCode}>
                        تأكيد الكود
                      </Button>
                      <Button variant="outline" onClick={sendVerificationCode}>
                        إعادة إرسال
                      </Button>
                    </div>
                  </>
                )}

                <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  رجوع
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2 without verification OR Step 3 */}
          {(step === 2 && !service.requires_verification) || step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  بيانات المستلم والطرد
                </CardTitle>
                <CardDescription>أدخل بيانات المستلم وتفاصيل الطرد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recipient Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    بيانات المستلم
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المستلم *</Label>
                      <Input
                        value={formData.recipient_name}
                        onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                        placeholder="أدخل اسم المستلم"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم جوال المستلم *</Label>
                      <Input
                        type="tel"
                        value={formData.recipient_phone}
                        onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      موقع التسليم *
                    </Label>
                    <Input
                      value={formData.recipient_location_url}
                      onChange={(e) => setFormData({ ...formData, recipient_location_url: e.target.value })}
                      placeholder="رابط خرائط جوجل أو إحداثيات (مثال: 24.7136, 46.6753)"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      يمكنك إدخال رابط خرائط جوجل أو الإحداثيات مباشرة
                    </p>
                    {formData.recipient_location_url && extractCoordinates(formData.recipient_location_url) && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ✓ تم التعرف على الموقع
                      </Badge>
                    )}
                    {formData.recipient_location_url && !extractCoordinates(formData.recipient_location_url) && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        ✗ لم يتم التعرف على الإحداثيات - جرب إدخالها مباشرة
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>عنوان التسليم التفصيلي</Label>
                    <Textarea
                      value={formData.recipient_address}
                      onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                      placeholder="مثال: شارع العليا، مجمع الرياض، الدور الأول"
                    />
                  </div>
                </div>

                {/* Package Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    تفاصيل الطرد
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نوع الطرد *</Label>
                      <Select
                        value={formData.package_type}
                        onValueChange={(value) => setFormData({ ...formData, package_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الطرد" />
                        </SelectTrigger>
                        <SelectContent>
                          {packageTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>حجم الطرد *</Label>
                      <Select
                        value={formData.package_size}
                        onValueChange={(value) => setFormData({ ...formData, package_size: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحجم" />
                        </SelectTrigger>
                        <SelectContent>
                          {packageSizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>وصف الطرد</Label>
                    <Textarea
                      value={formData.package_description}
                      onChange={(e) => setFormData({ ...formData, package_description: e.target.value })}
                      placeholder="صف محتويات الطرد..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ملاحظات إضافية</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="أي تعليمات خاصة للتوصيل..."
                    />
                  </div>
                </div>

                {/* Price Calculation */}
                {calculatedDistance !== null && calculatedPrice !== null && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          المسافة المحسوبة
                        </span>
                        <Badge variant="outline">{calculatedDistance.toFixed(2)} كم</Badge>
                      </div>
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>إجمالي التكلفة</span>
                        <span className="text-primary">{calculatedPrice} ر.س</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => setStep(4)}
                    disabled={
                      !formData.recipient_name ||
                      !formData.recipient_phone ||
                      !formData.recipient_location_url ||
                      !formData.package_type ||
                      !formData.package_size
                    }
                  >
                    مراجعة الطلب
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                  <Button variant="outline" onClick={() => setStep(service.requires_verification ? 2 : 1)}>
                    رجوع
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  مراجعة وتأكيد الطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        نقطة الاستلام
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">{formData.sender_name}</p>
                      <p className="text-muted-foreground">{formData.sender_phone}</p>
                      <p className="text-muted-foreground">{formData.sender_address}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-success" />
                        نقطة التسليم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">{formData.recipient_name}</p>
                      <p className="text-muted-foreground">{formData.recipient_phone}</p>
                      <p className="text-muted-foreground">{formData.recipient_address}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      تفاصيل الطرد
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>النوع: {packageTypes.find((t) => t.value === formData.package_type)?.label}</p>
                    <p>الحجم: {packageSizes.find((s) => s.value === formData.package_size)?.label}</p>
                    {formData.package_description && <p>الوصف: {formData.package_description}</p>}
                  </CardContent>
                </Card>

                {/* Total */}
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="pt-4">
                    {isCalculatingDistance ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full ml-2" />
                        <span>جاري حساب المسافة...</span>
                      </div>
                    ) : calculatedDistance !== null && calculatedPrice !== null ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span>المسافة</span>
                          <span>{calculatedDistance.toFixed(2)} كم</span>
                        </div>
                        <div className="flex items-center justify-between text-xl font-bold">
                          <span>الإجمالي</span>
                          <span>{calculatedPrice} ر.س</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-primary-foreground/80">لم يتم حساب المسافة</p>
                        <p className="text-sm text-primary-foreground/60">تأكد من إدخال روابط الموقع بشكل صحيح</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={() => createOrderMutation.mutate()}
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Truck className="w-5 h-5 ml-2" />
                        تأكيد الطلب
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setStep(3)}>
                    تعديل
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SpecialServiceOrder;
