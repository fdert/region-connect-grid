import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Home, 
  Image as ImageIcon,
  Star,
  ShoppingBag,
  Gift,
  Percent,
  TrendingUp,
  Sparkles,
  Award,
  Settings,
  Loader2,
  Save
} from "lucide-react";
import { toast } from "sonner";

interface HomeSection {
  id: string;
  section_key: string;
  title_ar: string;
  title_en: string | null;
  is_visible: boolean;
  sort_order: number;
  settings: Record<string, any>;
}

const sectionIcons: Record<string, React.ReactNode> = {
  hero: <Home className="w-5 h-5" />,
  banner_top: <ImageIcon className="w-5 h-5" />,
  categories: <Settings className="w-5 h-5" />,
  featured_stores: <Star className="w-5 h-5" />,
  special_services: <Gift className="w-5 h-5" />,
  special_offers: <Percent className="w-5 h-5" />,
  banner_middle: <ImageIcon className="w-5 h-5" />,
  most_ordered: <TrendingUp className="w-5 h-5" />,
  new_arrivals: <Sparkles className="w-5 h-5" />,
  banner_bottom: <ImageIcon className="w-5 h-5" />,
  features: <Award className="w-5 h-5" />,
  cta: <ShoppingBag className="w-5 h-5" />,
};

const HomeContentPage = () => {
  const queryClient = useQueryClient();

  const { data: sections, isLoading } = useQuery({
    queryKey: ["home-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_sections")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as HomeSection[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HomeSection> }) => {
      const { error } = await supabase
        .from("home_sections")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success("تم تحديث القسم بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء التحديث");
    },
  });

  const toggleVisibility = (section: HomeSection) => {
    updateMutation.mutate({
      id: section.id,
      updates: { is_visible: !section.is_visible },
    });
  };

  const updateSortOrder = (sectionId: string, newOrder: number) => {
    updateMutation.mutate({
      id: sectionId,
      updates: { sort_order: newOrder },
    });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (!sections) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const currentSection = sections[index];
    const targetSection = sections[targetIndex];

    // Swap sort orders
    updateMutation.mutate({
      id: currentSection.id,
      updates: { sort_order: targetSection.sort_order },
    });
    
    updateMutation.mutate({
      id: targetSection.id,
      updates: { sort_order: currentSection.sort_order },
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="إدارة محتوى الصفحة الرئيسية">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="إدارة محتوى الصفحة الرئيسية">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sections?.length || 0}</p>
                  <p className="text-muted-foreground text-sm">إجمالي الأقسام</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sections?.filter(s => s.is_visible).length || 0}
                  </p>
                  <p className="text-muted-foreground text-sm">أقسام مرئية</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <EyeOff className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sections?.filter(s => !s.is_visible).length || 0}
                  </p>
                  <p className="text-muted-foreground text-sm">أقسام مخفية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sections Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              أقسام الصفحة الرئيسية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">الترتيب</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الاسم بالعربية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections?.map((section, index) => (
                  <TableRow key={section.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{section.sort_order}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          {sectionIcons[section.section_key] || <Settings className="w-5 h-5" />}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {section.section_key}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{section.title_ar}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.is_visible}
                          onCheckedChange={() => toggleVisibility(section)}
                          disabled={updateMutation.isPending}
                        />
                        <span className={section.is_visible ? "text-green-600" : "text-muted-foreground"}>
                          {section.is_visible ? "مرئي" : "مخفي"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveSection(index, "up")}
                          disabled={index === 0 || updateMutation.isPending}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveSection(index, "down")}
                          disabled={index === sections.length - 1 || updateMutation.isPending}
                        >
                          ↓
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              نصائح مفيدة
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>يمكنك إخفاء أي قسم من الصفحة الرئيسية بتعطيل مفتاح "مرئي"</li>
              <li>استخدم أزرار الترتيب لتغيير موضع الأقسام في الصفحة</li>
              <li>قسم العروض الخاصة يعرض المنتجات التي لها سعر خصم (السعر قبل الخصم أكبر من السعر الحالي)</li>
              <li>لإضافة بنرات، اذهب إلى صفحة إدارة البنرات</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default HomeContentPage;
