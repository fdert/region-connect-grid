import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit2, Gift, Star, Settings, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  reward_type: string;
  reward_value: number;
  image_url: string | null;
  is_active: boolean;
  stock: number | null;
}

interface PointsConfig {
  pointsPerSAR: number;
  minimumRedemption: number;
  welcomeBonus: number;
}

const rewardTypes = [
  { value: "discount_percentage", label: "خصم بنسبة %" },
  { value: "discount_fixed", label: "خصم مبلغ ثابت" },
  { value: "free_delivery", label: "توصيل مجاني" },
  { value: "gift", label: "هدية" },
];

const RewardsPage = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>({
    pointsPerSAR: 1,
    minimumRedemption: 100,
    welcomeBonus: 50
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_required: 100,
    reward_type: "discount_percentage",
    reward_value: 10,
    image_url: "",
    is_active: true,
    stock: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch rewards
      const { data: rewardsData } = await supabase
        .from("rewards")
        .select("*")
        .order("points_required");
      
      setRewards(rewardsData || []);

      const { data: configData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "points_config")
        .maybeSingle();
      
      if (configData?.value) {
        setPointsConfig(configData.value as unknown as PointsConfig);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        points_required: formData.points_required,
        reward_type: formData.reward_type,
        reward_value: formData.reward_value,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        stock: formData.stock ? parseInt(formData.stock) : null
      };

      if (editingReward) {
        const { error } = await supabase
          .from("rewards")
          .update(payload)
          .eq("id", editingReward.id);
        if (error) throw error;
        toast({ title: "تم تحديث المكافأة" });
      } else {
        const { error } = await supabase
          .from("rewards")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "تم إضافة المكافأة" });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving reward:", error);
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingReward(null);
    setFormData({
      name: "",
      description: "",
      points_required: 100,
      reward_type: "discount_percentage",
      reward_value: 10,
      image_url: "",
      is_active: true,
      stock: ""
    });
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      points_required: reward.points_required,
      reward_type: reward.reward_type,
      reward_value: Number(reward.reward_value),
      image_url: reward.image_url || "",
      is_active: reward.is_active,
      stock: reward.stock?.toString() || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المكافأة؟")) return;
    
    try {
      const { error } = await supabase.from("rewards").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف المكافأة" });
      fetchData();
    } catch (error) {
      console.error("Error deleting reward:", error);
    }
  };

  const savePointsConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          key: "points_config",
          value: pointsConfig as any,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (error) throw error;
      toast({ title: "تم حفظ إعدادات النقاط" });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="النقاط والهدايا">
      <Tabs defaultValue="rewards">
        <TabsList className="mb-6">
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="w-4 h-4" />
            المكافآت
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            إعدادات النقاط
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">إدارة المكافآت التي يمكن للعملاء استبدال نقاطهم بها</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  إضافة مكافأة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingReward ? "تعديل المكافأة" : "إضافة مكافأة جديدة"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitReward} className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم المكافأة *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="خصم 10%"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="وصف المكافأة"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>النقاط المطلوبة *</Label>
                      <Input
                        type="number"
                        value={formData.points_required}
                        onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) })}
                        min={1}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع المكافأة</Label>
                      <Select value={formData.reward_type} onValueChange={(v) => setFormData({ ...formData, reward_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rewardTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>قيمة المكافأة</Label>
                      <Input
                        type="number"
                        value={formData.reward_value}
                        onChange={(e) => setFormData({ ...formData, reward_value: parseFloat(e.target.value) })}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الكمية المتاحة</Label>
                      <Input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="غير محدود"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>تفعيل المكافأة</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    {editingReward ? "حفظ التعديلات" : "إضافة المكافأة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className={!reward.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant={reward.is_active ? "default" : "secondary"}>
                      {reward.is_active ? "مفعلة" : "معطلة"}
                    </Badge>
                  </div>
                  
                  <h3 className="font-bold mb-1">{reward.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{reward.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-amber-600">{reward.points_required} نقطة</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(reward)} className="flex-1">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive flex-1" onClick={() => handleDelete(reward.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات نظام النقاط</CardTitle>
              <CardDescription>تخصيص كيفية كسب واستبدال النقاط</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>النقاط لكل ريال</Label>
                  <Input
                    type="number"
                    value={pointsConfig.pointsPerSAR}
                    onChange={(e) => setPointsConfig({ ...pointsConfig, pointsPerSAR: parseInt(e.target.value) })}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">عدد النقاط المكتسبة لكل ريال</p>
                </div>
                
                <div className="space-y-2">
                  <Label>الحد الأدنى للاستبدال</Label>
                  <Input
                    type="number"
                    value={pointsConfig.minimumRedemption}
                    onChange={(e) => setPointsConfig({ ...pointsConfig, minimumRedemption: parseInt(e.target.value) })}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">الحد الأدنى من النقاط للاستبدال</p>
                </div>
                
                <div className="space-y-2">
                  <Label>مكافأة الترحيب</Label>
                  <Input
                    type="number"
                    value={pointsConfig.welcomeBonus}
                    onChange={(e) => setPointsConfig({ ...pointsConfig, welcomeBonus: parseInt(e.target.value) })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">نقاط ترحيبية للمستخدمين الجدد</p>
                </div>
              </div>
              
              <Button onClick={savePointsConfig} disabled={isSaving}>
                {isSaving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default RewardsPage;
