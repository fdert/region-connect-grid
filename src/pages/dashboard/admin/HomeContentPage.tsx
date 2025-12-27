import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Save,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Layout,
  Palette,
  Check
} from "lucide-react";
import { toast } from "sonner";

interface HomeSection {
  id: string;
  section_key: string;
  title_ar: string;
  title_en: string | null;
  subtitle_ar?: string | null;
  subtitle_en?: string | null;
  background_image?: string | null;
  background_color?: string | null;
  is_visible: boolean;
  sort_order: number;
  settings: Record<string, any>;
  content_items?: any[];
}

interface StoreTemplate {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  preview_image: string | null;
  template_data: Record<string, any>;
  category: string;
  is_active: boolean;
  is_premium: boolean;
  downloads_count: number;
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

const defaultSectionSettings: Record<string, any> = {
  hero: {
    badge_text: "منصة التسوق الأولى في المنطقة",
    main_title: "اكتشف أفضل المتاجر",
    highlight_text: "في مكان واحد",
    description: "تسوّق من مئات المتاجر المحلية والعالمية، واستمتع بتجربة تسوق سهلة وآمنة مع خدمة توصيل سريعة لباب منزلك.",
    search_placeholder: "ابحث عن منتج، متجر، أو خدمة...",
    cta_primary: "تصفح المتاجر",
    cta_secondary: "انضم كتاجر",
    stats: [
      { value: "+500", label: "متجر نشط" },
      { value: "+10K", label: "منتج متاح" },
      { value: "+50K", label: "عميل سعيد" }
    ]
  },
  features: {
    items: [
      { icon: "Truck", title: "توصيل سريع", description: "توصيل لباب منزلك في أسرع وقت ممكن", color: "blue" },
      { icon: "Shield", title: "دفع آمن", description: "جميع معاملاتك محمية بأحدث تقنيات التشفير", color: "green" },
      { icon: "Headphones", title: "دعم متواصل", description: "فريق دعم متاح على مدار الساعة", color: "purple" },
    ]
  },
  cta: {
    title: "جاهز للبدء؟",
    description: "انضم إلى آلاف العملاء السعداء وابدأ التسوق الآن",
    button_text: "ابدأ التسوق",
    button_link: "/stores"
  }
};

const HomeContentPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sections");
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewSectionDialogOpen, setIsNewSectionDialogOpen] = useState(false);
  const [newSection, setNewSection] = useState({
    section_key: "",
    title_ar: "",
    title_en: "",
    subtitle_ar: "",
    sort_order: 0
  });

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

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["store-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_templates")
        .select("*")
        .order("downloads_count", { ascending: false });

      if (error) throw error;
      return data as StoreTemplate[];
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

  const createSectionMutation = useMutation({
    mutationFn: async (section: typeof newSection) => {
      const { error } = await supabase
        .from("home_sections")
        .insert({
          section_key: section.section_key,
          title_ar: section.title_ar,
          title_en: section.title_en || null,
          subtitle_ar: section.subtitle_ar || null,
          sort_order: section.sort_order,
          is_visible: true,
          settings: defaultSectionSettings[section.section_key] || {}
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success("تم إنشاء القسم بنجاح");
      setIsNewSectionDialogOpen(false);
      setNewSection({ section_key: "", title_ar: "", title_en: "", subtitle_ar: "", sort_order: 0 });
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الإنشاء");
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("home_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success("تم حذف القسم بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحذف");
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (template: StoreTemplate) => {
      // Update downloads count
      await supabase
        .from("store_templates")
        .update({ downloads_count: (template.downloads_count || 0) + 1 })
        .eq("id", template.id);

      // Apply template sections visibility
      const templateSections = template.template_data?.sections || [];
      
      if (sections) {
        for (const section of sections) {
          await supabase
            .from("home_sections")
            .update({ 
              is_visible: templateSections.includes(section.section_key),
              settings: {
                ...section.settings,
                ...(template.template_data?.hero?.style && section.section_key === 'hero' 
                  ? { theme: template.template_data.hero.style } 
                  : {})
              }
            })
            .eq("id", section.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success("تم تطبيق القالب بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تطبيق القالب");
    },
  });

  const toggleVisibility = (section: HomeSection) => {
    updateMutation.mutate({
      id: section.id,
      updates: { is_visible: !section.is_visible },
    });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (!sections) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const currentSection = sections[index];
    const targetSection = sections[targetIndex];

    updateMutation.mutate({
      id: currentSection.id,
      updates: { sort_order: targetSection.sort_order },
    });
    
    updateMutation.mutate({
      id: targetSection.id,
      updates: { sort_order: currentSection.sort_order },
    });
  };

  const saveEditedSection = () => {
    if (!editingSection) return;
    
    updateMutation.mutate({
      id: editingSection.id,
      updates: {
        title_ar: editingSection.title_ar,
        title_en: editingSection.title_en,
        subtitle_ar: editingSection.subtitle_ar,
        subtitle_en: editingSection.subtitle_en,
        background_image: editingSection.background_image,
        background_color: editingSection.background_color,
        settings: editingSection.settings,
      },
    });
    setIsEditDialogOpen(false);
  };

  const updateSectionSetting = (key: string, value: any) => {
    if (!editingSection) return;
    setEditingSection({
      ...editingSection,
      settings: {
        ...editingSection.settings,
        [key]: value
      }
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Layout className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates?.length || 0}</p>
                  <p className="text-muted-foreground text-sm">قوالب متاحة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              القوالب
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Sections Tab */}
          <TabsContent value="sections" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  أقسام الصفحة الرئيسية
                </CardTitle>
                <Dialog open={isNewSectionDialogOpen} onOpenChange={setIsNewSectionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      إضافة قسم
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة قسم جديد</DialogTitle>
                      <DialogDescription>أنشئ قسمًا جديدًا للصفحة الرئيسية</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>نوع القسم</Label>
                        <select
                          className="w-full p-2 border rounded-md mt-1"
                          value={newSection.section_key}
                          onChange={(e) => setNewSection({ ...newSection, section_key: e.target.value })}
                        >
                          <option value="">اختر نوع القسم</option>
                          <option value="custom_banner">بنر مخصص</option>
                          <option value="custom_text">نص مخصص</option>
                          <option value="custom_products">منتجات مخصصة</option>
                          <option value="custom_stores">متاجر مخصصة</option>
                          <option value="testimonials">آراء العملاء</option>
                          <option value="partners">الشركاء</option>
                        </select>
                      </div>
                      <div>
                        <Label>الاسم بالعربية</Label>
                        <Input
                          value={newSection.title_ar}
                          onChange={(e) => setNewSection({ ...newSection, title_ar: e.target.value })}
                          placeholder="أدخل اسم القسم"
                        />
                      </div>
                      <div>
                        <Label>الاسم بالإنجليزية (اختياري)</Label>
                        <Input
                          value={newSection.title_en}
                          onChange={(e) => setNewSection({ ...newSection, title_en: e.target.value })}
                          placeholder="Enter section name"
                        />
                      </div>
                      <div>
                        <Label>الوصف المختصر</Label>
                        <Input
                          value={newSection.subtitle_ar}
                          onChange={(e) => setNewSection({ ...newSection, subtitle_ar: e.target.value })}
                          placeholder="وصف مختصر للقسم"
                        />
                      </div>
                      <div>
                        <Label>الترتيب</Label>
                        <Input
                          type="number"
                          value={newSection.sort_order}
                          onChange={(e) => setNewSection({ ...newSection, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsNewSectionDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button 
                        onClick={() => createSectionMutation.mutate(newSection)}
                        disabled={!newSection.section_key || !newSection.title_ar || createSectionMutation.isPending}
                      >
                        {createSectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSection(section);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {section.section_key.startsWith('custom_') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
                                    deleteSectionMutation.mutate(section.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  قوالب جاهزة للمتجر
                </CardTitle>
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  رفع قالب
                </Button>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {templates?.map((template) => (
                      <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          {template.preview_image ? (
                            <img 
                              src={template.preview_image} 
                              alt={template.name_ar}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Layout className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold">{template.name_ar}</h3>
                            {template.is_premium && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-xs rounded-full">
                                مميز
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {template.description_ar || template.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {template.downloads_count} تحميل
                            </span>
                            <Button 
                              size="sm" 
                              onClick={() => applyTemplateMutation.mutate(template)}
                              disabled={applyTemplateMutation.isPending}
                            >
                              {applyTemplateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 ml-1" />
                                  تطبيق
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  إعدادات عامة للصفحة الرئيسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">الألوان الرئيسية</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>اللون الأساسي</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" className="w-10 h-10 rounded cursor-pointer" defaultValue="#2563eb" />
                          <Input defaultValue="#2563eb" className="flex-1" />
                        </div>
                      </div>
                      <div>
                        <Label>لون التمييز</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" className="w-10 h-10 rounded cursor-pointer" defaultValue="#10b981" />
                          <Input defaultValue="#10b981" className="flex-1" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">الخط</h3>
                    <div>
                      <Label>نوع الخط</Label>
                      <select className="w-full p-2 border rounded-md mt-1">
                        <option value="cairo">Cairo</option>
                        <option value="tajawal">Tajawal</option>
                        <option value="almarai">Almarai</option>
                        <option value="ibm-plex-sans-arabic">IBM Plex Sans Arabic</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    حفظ الإعدادات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Section Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل قسم: {editingSection?.title_ar}</DialogTitle>
              <DialogDescription>عدّل محتوى وإعدادات هذا القسم</DialogDescription>
            </DialogHeader>
            
            {editingSection && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>العنوان بالعربية</Label>
                    <Input
                      value={editingSection.title_ar}
                      onChange={(e) => setEditingSection({ ...editingSection, title_ar: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>العنوان بالإنجليزية</Label>
                    <Input
                      value={editingSection.title_en || ""}
                      onChange={(e) => setEditingSection({ ...editingSection, title_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الوصف بالعربية</Label>
                    <Input
                      value={editingSection.subtitle_ar || ""}
                      onChange={(e) => setEditingSection({ ...editingSection, subtitle_ar: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الوصف بالإنجليزية</Label>
                    <Input
                      value={editingSection.subtitle_en || ""}
                      onChange={(e) => setEditingSection({ ...editingSection, subtitle_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>صورة الخلفية (رابط)</Label>
                    <Input
                      value={editingSection.background_image || ""}
                      onChange={(e) => setEditingSection({ ...editingSection, background_image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>لون الخلفية</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded cursor-pointer"
                        value={editingSection.background_color || "#ffffff"}
                        onChange={(e) => setEditingSection({ ...editingSection, background_color: e.target.value })}
                      />
                      <Input 
                        value={editingSection.background_color || ""}
                        onChange={(e) => setEditingSection({ ...editingSection, background_color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section-specific settings */}
                {editingSection.section_key === 'hero' && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold">إعدادات قسم الهيرو</h4>
                    <div>
                      <Label>نص الشارة</Label>
                      <Input
                        value={editingSection.settings?.badge_text || ""}
                        onChange={(e) => updateSectionSetting('badge_text', e.target.value)}
                        placeholder="منصة التسوق الأولى..."
                      />
                    </div>
                    <div>
                      <Label>العنوان الرئيسي</Label>
                      <Input
                        value={editingSection.settings?.main_title || ""}
                        onChange={(e) => updateSectionSetting('main_title', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>النص المميز</Label>
                      <Input
                        value={editingSection.settings?.highlight_text || ""}
                        onChange={(e) => updateSectionSetting('highlight_text', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>الوصف</Label>
                      <Textarea
                        value={editingSection.settings?.description || ""}
                        onChange={(e) => updateSectionSetting('description', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>زر رئيسي</Label>
                        <Input
                          value={editingSection.settings?.cta_primary || ""}
                          onChange={(e) => updateSectionSetting('cta_primary', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>زر ثانوي</Label>
                        <Input
                          value={editingSection.settings?.cta_secondary || ""}
                          onChange={(e) => updateSectionSetting('cta_secondary', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editingSection.section_key === 'cta' && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold">إعدادات قسم الدعوة للعمل</h4>
                    <div>
                      <Label>العنوان</Label>
                      <Input
                        value={editingSection.settings?.title || ""}
                        onChange={(e) => updateSectionSetting('title', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>الوصف</Label>
                      <Textarea
                        value={editingSection.settings?.description || ""}
                        onChange={(e) => updateSectionSetting('description', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>نص الزر</Label>
                        <Input
                          value={editingSection.settings?.button_text || ""}
                          onChange={(e) => updateSectionSetting('button_text', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>رابط الزر</Label>
                        <Input
                          value={editingSection.settings?.button_link || ""}
                          onChange={(e) => updateSectionSetting('button_link', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={saveEditedSection} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <li>اضغط على زر التعديل لتغيير محتوى ونصوص وصور كل قسم</li>
              <li>يمكنك تطبيق قالب جاهز لتغيير مظهر الصفحة بالكامل</li>
              <li>الأقسام المخصصة (custom_) يمكن حذفها، أما الأقسام الأساسية فيمكن إخفاؤها فقط</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default HomeContentPage;