import MobileLayout from "@/components/courier/MobileLayout";
import { 
  User,
  Phone,
  Mail,
  Camera,
  LogOut,
  Shield,
  Bell,
  Moon,
  Globe,
  ChevronLeft,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

const MobileSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['courier-profile-settings-mobile', user?.id],
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
      queryClient.invalidateQueries({ queryKey: ['courier-profile-settings-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['courier-profile-mobile'] });
      toast.success("تم حفظ التغييرات");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    } else {
      toast.success("تم تسجيل الخروج بنجاح");
      navigate("/auth/login");
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title="الإعدادات">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="الإعدادات">
      <div className="p-4 space-y-4">
        {/* Profile Section */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {fullName?.charAt(0) || "م"}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <h2 className="font-bold text-lg">{fullName || 'مندوب'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pr-10 h-12 rounded-xl"
                  placeholder="أدخل اسمك"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pr-10 h-12 rounded-xl"
                  placeholder="05xxxxxxxx"
                  type="tel"
                  dir="ltr"
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 rounded-xl"
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              حفظ التغييرات
            </Button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">الإشعارات</p>
                <p className="text-xs text-muted-foreground">استلم إشعارات الطلبات الجديدة</p>
              </div>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="font-medium">الوضع الليلي</p>
                <p className="text-xs text-muted-foreground">تفعيل المظهر الداكن</p>
              </div>
            </div>
            <Switch />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">اللغة</p>
                <p className="text-xs text-muted-foreground">العربية</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-card rounded-2xl border border-border/50">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">تغيير كلمة المرور</p>
                <p className="text-xs text-muted-foreground">حافظ على أمان حسابك</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Logout */}
        <Button 
          variant="destructive" 
          className="w-full h-14 rounded-xl text-lg"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 ml-2" />
          تسجيل الخروج
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          الإصدار 1.0.0
        </p>
      </div>
    </MobileLayout>
  );
};

export default MobileSettings;
