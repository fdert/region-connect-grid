import DashboardLayout from "../DashboardLayout";
import { 
  User,
  Phone,
  Mail,
  Loader2,
  Save,
  Camera,
  MapPin,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

const CustomerSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ['customer-profile-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-profile-settings'] });
      toast({
        title: "تم الحفظ",
        description: "تم تحديث معلوماتك بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate();
  };

  const handleAddAddress = () => {
    if (newAddress.trim()) {
      setAddresses([...addresses, newAddress.trim()]);
      setNewAddress("");
    }
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة معلومات حسابك</p>
        </div>

        {/* Profile Section */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h2 className="font-bold text-lg mb-6">الملف الشخصي</h2>
          
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {fullName?.charAt(0) || "ع"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" className="gap-2">
                <Camera className="w-4 h-4" />
                تغيير الصورة
              </Button>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG بحد أقصى 2MB</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                الاسم الكامل
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                رقم الهاتف
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <Button 
              onClick={handleSave} 
              disabled={updateProfileMutation.isPending}
              className="gap-2"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            عناوين التوصيل
          </h2>

          {addresses.length > 0 && (
            <div className="space-y-3 mb-4">
              {addresses.map((address, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <span className="flex-1 text-sm">{address}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveAddress(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>إضافة عنوان جديد</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="أدخل العنوان الكامل..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="flex-1"
                rows={2}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={handleAddAddress}
              disabled={!newAddress.trim()}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة العنوان
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h2 className="font-bold text-lg mb-4">معلومات الحساب</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">تاريخ الانضمام</span>
              <span className="font-medium">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString('ar-SA')
                  : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">نوع الحساب</span>
              <span className="font-medium px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                عميل
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerSettings;
