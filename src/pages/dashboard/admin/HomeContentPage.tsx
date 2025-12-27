import { useState, useEffect } from "react";
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
  Check,
  Link as LinkIcon,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Music2
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

interface SiteSetting {
  id: string;
  key: string;
  value: Record<string, any>;
}

interface FooterLink {
  label: string;
  href: string;
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
    merchant_title: "هل أنت تاجر؟",
    merchant_description: "انضم إلى منصة سوقنا وابدأ ببيع منتجاتك لآلاف العملاء. نوفر لك كل الأدوات التي تحتاجها لإدارة متجرك بسهولة.",
    merchant_features: ["لوحة تحكم متكاملة", "تقارير وإحصائيات مفصلة", "دعم فني على مدار الساعة"],
    merchant_button: "سجّل كتاجر الآن",
    courier_title: "اعمل كمندوب توصيل",
    courier_description: "انضم لفريق التوصيل واحصل على دخل إضافي بمرونة تامة. اختر أوقات عملك واستمتع بحرية العمل المستقل.",
    courier_features: ["دخل مرن ومجزي", "اختر أوقات عملك", "تطبيق سهل الاستخدام"],
    courier_button: "انضم كمندوب"
  }
};

const HomeContentPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sections");
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewSectionDialogOpen, setIsNewSectionDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<StoreTemplate | null>(null);
  const [newSection, setNewSection] = useState({
    section_key: "",
    title_ar: "",
    title_en: "",
    subtitle_ar: "",
    sort_order: 0
  });

  // Footer state
  const [footerQuickLinks, setFooterQuickLinks] = useState<FooterLink[]>([]);
  const [footerMerchantLinks, setFooterMerchantLinks] = useState<FooterLink[]>([]);
  const [footerContact, setFooterContact] = useState({ phone: "", email: "", address: "" });
  const [footerSocial, setFooterSocial] = useState({ facebook: "", twitter: "", instagram: "", whatsapp: "", youtube: "", tiktok: "" });
  const [footerBrand, setFooterBrand] = useState({ name: "", description: "", copyright: "" });
  const [footerLegal, setFooterLegal] = useState({ privacy_policy: "", terms: "" });

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

  const { data: siteSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["site-settings-footer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["footer_quick_links", "footer_merchant_links", "footer_contact", "footer_social", "footer_brand", "footer_legal_links"]);

      if (error) throw error;
      return data as SiteSetting[];
    },
  });

  // Initialize footer state from database
  useEffect(() => {
    if (siteSettings) {
      siteSettings.forEach(setting => {
        const value = setting.value as Record<string, any>;
        switch (setting.key) {
          case "footer_quick_links":
            setFooterQuickLinks(value.links || []);
            break;
          case "footer_merchant_links":
            setFooterMerchantLinks(value.links || []);
            break;
          case "footer_contact":
            setFooterContact({ 
              phone: value.phone || "", 
              email: value.email || "", 
              address: value.address || "" 
            });
            break;
          case "footer_social":
            setFooterSocial({
              facebook: value.facebook || "",
              twitter: value.twitter || "",
              instagram: value.instagram || "",
              whatsapp: value.whatsapp || "",
              youtube: value.youtube || "",
              tiktok: value.tiktok || ""
            });
            break;
          case "footer_brand":
            setFooterBrand({
              name: value.name || "",
              description: value.description || "",
              copyright: value.copyright || ""
            });
            break;
          case "footer_legal_links":
            setFooterLegal({
              privacy_policy: value.privacy_policy || "",
              terms: value.terms || ""
            });
            break;
        }
      });
    }
  }, [siteSettings]);

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
      queryClient.invalidateQueries({ queryKey: ["home-sections-public"] });
      queryClient.invalidateQueries({ queryKey: ["hero-section-content"] });
      queryClient.invalidateQueries({ queryKey: ["cta-section-content"] });
      queryClient.invalidateQueries({ queryKey: ["features-section-content"] });
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
      // Update download count
      await supabase
        .from("store_templates")
        .update({ downloads_count: (template.downloads_count || 0) + 1 })
        .eq("id", template.id);

      const templateData = template.template_data || {};
      const templateSections = templateData.sections || [];
      const templateHeroSettings = templateData.hero || {};
      const templateCtaSettings = templateData.cta || {};
      const templateFeaturesSettings = templateData.features || {};
      const templateTheme = templateData.theme || {};
      
      if (sections) {
        for (const section of sections) {
          const currentSettings = section.settings || {};
          let newSettings = { ...currentSettings };
          let newBackgroundColor = section.background_color;
          
          // Apply template-specific settings based on section key
          if (section.section_key === 'hero') {
            newSettings = { 
              ...defaultSectionSettings.hero,
              ...currentSettings, 
              ...templateHeroSettings,
              theme: template.category,
              primary_color: templateHeroSettings.color || templateTheme.primary_color,
              button_color: templateHeroSettings.button_color || templateTheme.primary_color,
            };
            newBackgroundColor = templateHeroSettings.background_color || templateTheme.background_color;
          }
          if (section.section_key === 'cta') {
            newSettings = { 
              ...defaultSectionSettings.cta,
              ...currentSettings, 
              ...templateCtaSettings,
              primary_color: templateCtaSettings.color || templateTheme.primary_color,
              button_color: templateCtaSettings.button_color || templateTheme.primary_color,
            };
            newBackgroundColor = templateCtaSettings.background_color || templateTheme.background_color;
          }
          if (section.section_key === 'features') {
            newSettings = { 
              ...defaultSectionSettings.features,
              ...currentSettings, 
              ...templateFeaturesSettings 
            };
          }
          
          const { error } = await supabase
            .from("home_sections")
            .update({ 
              is_visible: templateSections.length === 0 || templateSections.includes(section.section_key),
              settings: newSettings,
              background_color: newBackgroundColor
            })
            .eq("id", section.id);
            
          if (error) {
            console.error('Error updating section:', section.section_key, error);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      queryClient.invalidateQueries({ queryKey: ["home-sections-public"] });
      queryClient.invalidateQueries({ queryKey: ["hero-section-content"] });
      queryClient.invalidateQueries({ queryKey: ["cta-section-content"] });
      queryClient.invalidateQueries({ queryKey: ["features-section-content"] });
      toast.success("تم تطبيق القالب بنجاح! سيظهر التغيير على الصفحة الرئيسية.");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تطبيق القالب");
    },
  });

  const updateFooterSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, any> }) => {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings-footer"] });
      toast.success("تم حفظ الإعدادات بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحفظ");
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

  const addFooterLink = (type: "quick" | "merchant") => {
    if (type === "quick") {
      setFooterQuickLinks([...footerQuickLinks, { label: "", href: "" }]);
    } else {
      setFooterMerchantLinks([...footerMerchantLinks, { label: "", href: "" }]);
    }
  };

  const updateFooterLink = (type: "quick" | "merchant", index: number, field: "label" | "href", value: string) => {
    if (type === "quick") {
      const updated = [...footerQuickLinks];
      updated[index][field] = value;
      setFooterQuickLinks(updated);
    } else {
      const updated = [...footerMerchantLinks];
      updated[index][field] = value;
      setFooterMerchantLinks(updated);
    }
  };

  const removeFooterLink = (type: "quick" | "merchant", index: number) => {
    if (type === "quick") {
      setFooterQuickLinks(footerQuickLinks.filter((_, i) => i !== index));
    } else {
      setFooterMerchantLinks(footerMerchantLinks.filter((_, i) => i !== index));
    }
  };

  const saveFooterSettings = () => {
    updateFooterSettingMutation.mutate({ key: "footer_quick_links", value: { links: footerQuickLinks } });
    updateFooterSettingMutation.mutate({ key: "footer_merchant_links", value: { links: footerMerchantLinks } });
    updateFooterSettingMutation.mutate({ key: "footer_contact", value: footerContact });
    updateFooterSettingMutation.mutate({ key: "footer_social", value: footerSocial });
    updateFooterSettingMutation.mutate({ key: "footer_brand", value: footerBrand });
    updateFooterSettingMutation.mutate({ key: "footer_legal_links", value: footerLegal });
  };

  const openEditWithDefaults = (section: HomeSection) => {
    // Merge default settings with existing settings
    const defaultSettings = defaultSectionSettings[section.section_key] || {};
    const mergedSettings = { ...defaultSettings, ...section.settings };
    setEditingSection({ ...section, settings: mergedSettings });
    setIsEditDialogOpen(true);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="footer" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              الفوتر
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
                      <TableHead>المحتوى الحالي</TableHead>
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
                          <div className="max-w-xs">
                            {section.section_key === 'hero' && section.settings?.main_title && (
                              <p className="text-xs text-muted-foreground truncate">
                                {section.settings.main_title} {section.settings.highlight_text}
                              </p>
                            )}
                            {section.section_key === 'cta' && section.settings?.title && (
                              <p className="text-xs text-muted-foreground truncate">
                                {section.settings.title}
                              </p>
                            )}
                            {section.section_key === 'features' && section.settings?.items && (
                              <p className="text-xs text-muted-foreground">
                                {section.settings.items.length} عناصر
                              </p>
                            )}
                            {section.subtitle_ar && !['hero', 'cta', 'features'].includes(section.section_key) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {section.subtitle_ar}
                              </p>
                            )}
                          </div>
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
                              onClick={() => openEditWithDefaults(section)}
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

          {/* Footer Tab */}
          <TabsContent value="footer" className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Brand Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      معلومات العلامة التجارية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>اسم المنصة</Label>
                      <Input
                        value={footerBrand.name}
                        onChange={(e) => setFooterBrand({ ...footerBrand, name: e.target.value })}
                        placeholder="سوقنا"
                      />
                    </div>
                    <div>
                      <Label>وصف المنصة</Label>
                      <Textarea
                        value={footerBrand.description}
                        onChange={(e) => setFooterBrand({ ...footerBrand, description: e.target.value })}
                        rows={3}
                        placeholder="منصة سوقنا هي الوجهة الأولى..."
                      />
                    </div>
                    <div>
                      <Label>نص حقوق النشر</Label>
                      <Input
                        value={footerBrand.copyright}
                        onChange={(e) => setFooterBrand({ ...footerBrand, copyright: e.target.value })}
                        placeholder="© 2024 سوقنا. جميع الحقوق محفوظة."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      معلومات الاتصال
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        رقم الهاتف
                      </Label>
                      <Input
                        value={footerContact.phone}
                        onChange={(e) => setFooterContact({ ...footerContact, phone: e.target.value })}
                        placeholder="+966 50 123 4567"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        البريد الإلكتروني
                      </Label>
                      <Input
                        value={footerContact.email}
                        onChange={(e) => setFooterContact({ ...footerContact, email: e.target.value })}
                        placeholder="support@souqna.com"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        العنوان
                      </Label>
                      <Input
                        value={footerContact.address}
                        onChange={(e) => setFooterContact({ ...footerContact, address: e.target.value })}
                        placeholder="المملكة العربية السعودية، الرياض"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Instagram className="w-5 h-5" />
                      وسائل التواصل الاجتماعي
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <Facebook className="w-4 h-4 text-blue-600" />
                          فيسبوك
                        </Label>
                        <Input
                          value={footerSocial.facebook}
                          onChange={(e) => setFooterSocial({ ...footerSocial, facebook: e.target.value })}
                          placeholder="https://facebook.com/..."
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <Twitter className="w-4 h-4 text-sky-500" />
                          تويتر
                        </Label>
                        <Input
                          value={footerSocial.twitter}
                          onChange={(e) => setFooterSocial({ ...footerSocial, twitter: e.target.value })}
                          placeholder="https://twitter.com/..."
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          انستقرام
                        </Label>
                        <Input
                          value={footerSocial.instagram}
                          onChange={(e) => setFooterSocial({ ...footerSocial, instagram: e.target.value })}
                          placeholder="https://instagram.com/..."
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-500" />
                          واتساب
                        </Label>
                        <Input
                          value={footerSocial.whatsapp}
                          onChange={(e) => setFooterSocial({ ...footerSocial, whatsapp: e.target.value })}
                          placeholder="https://wa.me/..."
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-500" />
                          يوتيوب
                        </Label>
                        <Input
                          value={footerSocial.youtube}
                          onChange={(e) => setFooterSocial({ ...footerSocial, youtube: e.target.value })}
                          placeholder="https://youtube.com/..."
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <Music2 className="w-4 h-4" />
                          تيك توك
                        </Label>
                        <Input
                          value={footerSocial.tiktok}
                          onChange={(e) => setFooterSocial({ ...footerSocial, tiktok: e.target.value })}
                          placeholder="https://tiktok.com/..."
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Legal Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="w-5 h-5" />
                      الروابط القانونية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>رابط سياسة الخصوصية</Label>
                      <Input
                        value={footerLegal.privacy_policy}
                        onChange={(e) => setFooterLegal({ ...footerLegal, privacy_policy: e.target.value })}
                        placeholder="/privacy"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label>رابط الشروط والأحكام</Label>
                      <Input
                        value={footerLegal.terms}
                        onChange={(e) => setFooterLegal({ ...footerLegal, terms: e.target.value })}
                        placeholder="/terms"
                        dir="ltr"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="w-5 h-5" />
                      روابط سريعة
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => addFooterLink("quick")}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {footerQuickLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => updateFooterLink("quick", index, "label", e.target.value)}
                          placeholder="العنوان"
                          className="flex-1"
                        />
                        <Input
                          value={link.href}
                          onChange={(e) => updateFooterLink("quick", index, "href", e.target.value)}
                          placeholder="/path"
                          className="flex-1"
                          dir="ltr"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeFooterLink("quick", index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Merchant Links */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      روابط التجار
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => addFooterLink("merchant")}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {footerMerchantLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => updateFooterLink("merchant", index, "label", e.target.value)}
                          placeholder="العنوان"
                          className="flex-1"
                        />
                        <Input
                          value={link.href}
                          onChange={(e) => updateFooterLink("merchant", index, "href", e.target.value)}
                          placeholder="/path"
                          className="flex-1"
                          dir="ltr"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeFooterLink("merchant", index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="lg:col-span-2">
                  <Button 
                    onClick={saveFooterSettings} 
                    className="w-full"
                    disabled={updateFooterSettingMutation.isPending}
                  >
                    {updateFooterSettingMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    حفظ إعدادات الفوتر
                  </Button>
                </div>
              </div>
            )}
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
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {template.downloads_count} تحميل
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setPreviewTemplate(template);
                                  setIsPreviewDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
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

                {/* Style Settings for all sections */}
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <Label>لون الأزرار الرئيسي</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded cursor-pointer"
                        value={editingSection.settings?.button_color || "#3b82f6"}
                        onChange={(e) => updateSectionSetting('button_color', e.target.value)}
                      />
                      <Input 
                        value={editingSection.settings?.button_color || ""}
                        onChange={(e) => updateSectionSetting('button_color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>لون النص الرئيسي</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded cursor-pointer"
                        value={editingSection.settings?.text_color || "#1f2937"}
                        onChange={(e) => updateSectionSetting('text_color', e.target.value)}
                      />
                      <Input 
                        value={editingSection.settings?.text_color || ""}
                        onChange={(e) => updateSectionSetting('text_color', e.target.value)}
                        placeholder="#1f2937"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>نوع الخط</Label>
                    <select 
                      className="w-full p-2 border rounded-md mt-1"
                      value={editingSection.settings?.font_family || "cairo"}
                      onChange={(e) => updateSectionSetting('font_family', e.target.value)}
                    >
                      <option value="cairo">Cairo</option>
                      <option value="tajawal">Tajawal</option>
                      <option value="almarai">Almarai</option>
                      <option value="ibm-plex-sans-arabic">IBM Plex Sans Arabic</option>
                    </select>
                  </div>
                  <div>
                    <Label>لون التمييز (Accent)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded cursor-pointer"
                        value={editingSection.settings?.accent_color || "#10b981"}
                        onChange={(e) => updateSectionSetting('accent_color', e.target.value)}
                      />
                      <Input 
                        value={editingSection.settings?.accent_color || ""}
                        onChange={(e) => updateSectionSetting('accent_color', e.target.value)}
                        placeholder="#10b981"
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
                    <div>
                      <Label>نص البحث</Label>
                      <Input
                        value={editingSection.settings?.search_placeholder || ""}
                        onChange={(e) => updateSectionSetting('search_placeholder', e.target.value)}
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
                    <div className="space-y-2">
                      <Label>الإحصائيات</Label>
                      {(editingSection.settings?.stats || []).map((stat: any, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={stat.value}
                            onChange={(e) => {
                              const stats = [...(editingSection.settings?.stats || [])];
                              stats[idx] = { ...stats[idx], value: e.target.value };
                              updateSectionSetting('stats', stats);
                            }}
                            placeholder="القيمة"
                            className="flex-1"
                          />
                          <Input
                            value={stat.label}
                            onChange={(e) => {
                              const stats = [...(editingSection.settings?.stats || [])];
                              stats[idx] = { ...stats[idx], label: e.target.value };
                              updateSectionSetting('stats', stats);
                            }}
                            placeholder="التسمية"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingSection.section_key === 'cta' && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold">إعدادات قسم الدعوة للعمل</h4>
                    
                    {/* Merchant Section */}
                    <div className="p-4 border rounded-lg space-y-3 bg-primary/5">
                      <h5 className="font-medium text-primary">قسم التاجر</h5>
                      <div>
                        <Label>عنوان التاجر</Label>
                        <Input
                          value={editingSection.settings?.merchant_title || "هل أنت تاجر؟"}
                          onChange={(e) => updateSectionSetting('merchant_title', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>وصف التاجر</Label>
                        <Textarea
                          value={editingSection.settings?.merchant_description || ""}
                          onChange={(e) => updateSectionSetting('merchant_description', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>نص زر التاجر</Label>
                        <Input
                          value={editingSection.settings?.merchant_button || "سجّل كتاجر الآن"}
                          onChange={(e) => updateSectionSetting('merchant_button', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>مميزات التاجر (اكتب كل ميزة في سطر)</Label>
                        <Textarea
                          value={(editingSection.settings?.merchant_features || []).join('\n')}
                          onChange={(e) => updateSectionSetting('merchant_features', e.target.value.split('\n').filter(f => f.trim()))}
                          rows={3}
                          placeholder="لوحة تحكم متكاملة&#10;تقارير وإحصائيات مفصلة&#10;دعم فني على مدار الساعة"
                        />
                      </div>
                    </div>
                    
                    {/* Courier Section */}
                    <div className="p-4 border rounded-lg space-y-3 bg-accent/5">
                      <h5 className="font-medium text-accent">قسم المندوب</h5>
                      <div>
                        <Label>عنوان المندوب</Label>
                        <Input
                          value={editingSection.settings?.courier_title || "اعمل كمندوب توصيل"}
                          onChange={(e) => updateSectionSetting('courier_title', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>وصف المندوب</Label>
                        <Textarea
                          value={editingSection.settings?.courier_description || ""}
                          onChange={(e) => updateSectionSetting('courier_description', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>نص زر المندوب</Label>
                        <Input
                          value={editingSection.settings?.courier_button || "انضم كمندوب"}
                          onChange={(e) => updateSectionSetting('courier_button', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>مميزات المندوب (اكتب كل ميزة في سطر)</Label>
                        <Textarea
                          value={(editingSection.settings?.courier_features || []).join('\n')}
                          onChange={(e) => updateSectionSetting('courier_features', e.target.value.split('\n').filter(f => f.trim()))}
                          rows={3}
                          placeholder="دخل مرن ومجزي&#10;اختر أوقات عملك&#10;تطبيق سهل الاستخدام"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editingSection.section_key === 'features' && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold">إعدادات قسم المميزات</h4>
                    {(editingSection.settings?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>الميزة {idx + 1}</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              const items = [...(editingSection.settings?.items || [])];
                              items.splice(idx, 1);
                              updateSectionSetting('items', items);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">الأيقونة</Label>
                            <Input
                              value={item.icon}
                              onChange={(e) => {
                                const items = [...(editingSection.settings?.items || [])];
                                items[idx] = { ...items[idx], icon: e.target.value };
                                updateSectionSetting('items', items);
                              }}
                              placeholder="Truck, Shield, Headphones..."
                            />
                          </div>
                          <div>
                            <Label className="text-xs">اللون</Label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={item.color}
                              onChange={(e) => {
                                const items = [...(editingSection.settings?.items || [])];
                                items[idx] = { ...items[idx], color: e.target.value };
                                updateSectionSetting('items', items);
                              }}
                            >
                              <option value="blue">أزرق</option>
                              <option value="green">أخضر</option>
                              <option value="purple">بنفسجي</option>
                              <option value="red">أحمر</option>
                              <option value="orange">برتقالي</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">العنوان</Label>
                          <Input
                            value={item.title}
                            onChange={(e) => {
                              const items = [...(editingSection.settings?.items || [])];
                              items[idx] = { ...items[idx], title: e.target.value };
                              updateSectionSetting('items', items);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">الوصف</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              const items = [...(editingSection.settings?.items || [])];
                              items[idx] = { ...items[idx], description: e.target.value };
                              updateSectionSetting('items', items);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const items = [...(editingSection.settings?.items || [])];
                        items.push({ icon: "Star", title: "", description: "", color: "blue" });
                        updateSectionSetting('items', items);
                      }}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة ميزة
                    </Button>
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

        {/* Template Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>معاينة القالب: {previewTemplate?.name_ar}</DialogTitle>
              <DialogDescription>{previewTemplate?.description_ar || previewTemplate?.description}</DialogDescription>
            </DialogHeader>
            
            {previewTemplate && (
              <div className="space-y-4">
                {/* Live Preview */}
                <div className="border rounded-xl overflow-hidden bg-background">
                  <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-muted-foreground mr-2">معاينة حية</span>
                  </div>
                  <div 
                    className="aspect-[16/9] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
                    style={{ 
                      backgroundColor: previewTemplate.template_data?.theme?.background_color || previewTemplate.template_data?.hero?.background_color || '#f0f9ff'
                    }}
                  >
                    {/* Decorative elements */}
                    <div 
                      className="absolute top-4 right-4 w-24 h-24 rounded-full blur-2xl opacity-30"
                      style={{ backgroundColor: previewTemplate.template_data?.theme?.primary_color || '#3b82f6' }}
                    />
                    <div 
                      className="absolute bottom-4 left-4 w-32 h-32 rounded-full blur-2xl opacity-20"
                      style={{ backgroundColor: previewTemplate.template_data?.hero?.accent_color || '#10b981' }}
                    />
                    
                    {/* Preview content */}
                    <div className="relative z-10">
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 text-white"
                        style={{ backgroundColor: previewTemplate.template_data?.theme?.primary_color || '#3b82f6' }}
                      >
                        منصة التسوق الأولى
                      </span>
                      <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#1f2937' }}>
                        اكتشف أفضل المتاجر
                      </h2>
                      <p className="text-sm text-gray-600 mb-4 max-w-md">
                        تسوّق من مئات المتاجر المحلية والعالمية
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button 
                          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                          style={{ backgroundColor: previewTemplate.template_data?.hero?.button_color || previewTemplate.template_data?.theme?.primary_color || '#3b82f6' }}
                        >
                          تصفح المتاجر
                        </button>
                        <button className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700">
                          انضم كتاجر
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground text-xs">الفئة</Label>
                    <p className="font-medium">{previewTemplate.category || "عام"}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground text-xs">مرات التحميل</Label>
                    <p className="font-medium">{previewTemplate.downloads_count}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground text-xs">اللون الرئيسي</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full border"
                        style={{ backgroundColor: previewTemplate.template_data?.theme?.primary_color || '#3b82f6' }}
                      />
                      <span className="text-sm">{previewTemplate.template_data?.theme?.primary_color || '#3b82f6'}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold mb-2">الأقسام المضمنة:</h4>
                  <div className="flex flex-wrap gap-2">
                    {(previewTemplate.template_data?.sections || ['hero', 'categories', 'featured_stores', 'features', 'cta']).map((section: string) => (
                      <span key={section} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        {section}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>ملاحظة:</strong> تطبيق القالب سيؤثر على ألوان وإعدادات الأقسام في الصفحة الرئيسية. هذه القوالب معدة مسبقاً ويمكنك تخصيصها بعد التطبيق.
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                إغلاق
              </Button>
              <Button 
                onClick={() => {
                  if (previewTemplate) {
                    applyTemplateMutation.mutate(previewTemplate);
                    setIsPreviewDialogOpen(false);
                  }
                }}
                disabled={applyTemplateMutation.isPending}
              >
                {applyTemplateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
                تطبيق القالب
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
              <li>استخدم تبويب "الفوتر" لتعديل روابط وبيانات أسفل الموقع</li>
              <li>التغييرات تظهر مباشرة على الصفحة الرئيسية بعد الحفظ</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default HomeContentPage;