import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Shield,
  Users,
  Save,
  Loader2,
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface StaticPage {
  id: string;
  page_key: string;
  title_ar: string;
  title_en: string | null;
  content_ar: string;
  content_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const pageIcons: Record<string, React.ReactNode> = {
  about: <Users className="w-5 h-5" />,
  privacy: <Shield className="w-5 h-5" />,
  terms: <FileText className="w-5 h-5" />,
};

const pageLabels: Record<string, string> = {
  about: "من نحن",
  privacy: "سياسة الخصوصية",
  terms: "الشروط والأحكام",
};

const pageUrls: Record<string, string> = {
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
};

const StaticPagesPage = () => {
  const queryClient = useQueryClient();
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["static-pages-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .order("page_key");

      if (error) throw error;
      return data as StaticPage[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StaticPage> }) => {
      const { error } = await supabase
        .from("static_pages")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["static-pages-admin"] });
      queryClient.invalidateQueries({ queryKey: ["static-page"] });
      toast.success("تم حفظ التغييرات بنجاح");
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحفظ");
    },
  });

  const toggleVisibility = (page: StaticPage) => {
    updateMutation.mutate({
      id: page.id,
      updates: { is_active: !page.is_active },
    });
  };

  const savePage = () => {
    if (!editingPage) return;
    updateMutation.mutate({
      id: editingPage.id,
      updates: {
        title_ar: editingPage.title_ar,
        title_en: editingPage.title_en,
        content_ar: editingPage.content_ar,
        content_en: editingPage.content_en,
        meta_description_ar: editingPage.meta_description_ar,
        meta_description_en: editingPage.meta_description_en,
      },
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="الصفحات الثابتة">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="الصفحات الثابتة">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">إدارة الصفحات الثابتة</h2>
            <p className="text-muted-foreground">
              تعديل محتوى صفحات من نحن، سياسة الخصوصية، والشروط والأحكام
            </p>
          </div>
        </div>

        {/* Pages Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pages?.map((page) => (
            <Card key={page.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {pageIcons[page.page_key] || <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pageLabels[page.page_key] || page.title_ar}</CardTitle>
                      <CardDescription className="text-xs">
                        {pageUrls[page.page_key]}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={page.is_active}
                    onCheckedChange={() => toggleVisibility(page)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingPage(page);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={pageUrls[page.page_key]} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {page.is_active ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>مرئي للزوار</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>مخفي</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingPage && pageIcons[editingPage.page_key]}
                تعديل {editingPage && pageLabels[editingPage.page_key]}
              </DialogTitle>
            </DialogHeader>

            {editingPage && (
              <Tabs defaultValue="ar" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>

                <TabsContent value="ar" className="space-y-4 mt-4">
                  <div>
                    <Label>العنوان</Label>
                    <Input
                      value={editingPage.title_ar}
                      onChange={(e) => setEditingPage({ ...editingPage, title_ar: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>وصف الميتا (SEO)</Label>
                    <Input
                      value={editingPage.meta_description_ar || ""}
                      onChange={(e) => setEditingPage({ ...editingPage, meta_description_ar: e.target.value })}
                      placeholder="وصف قصير للصفحة يظهر في نتائج البحث"
                    />
                  </div>
                  <div>
                    <Label>المحتوى (يدعم HTML)</Label>
                    <Textarea
                      value={editingPage.content_ar}
                      onChange={(e) => setEditingPage({ ...editingPage, content_ar: e.target.value })}
                      rows={15}
                      className="font-mono text-sm"
                      dir="rtl"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      يمكنك استخدام وسوم HTML مثل &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="en" className="space-y-4 mt-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingPage.title_en || ""}
                      onChange={(e) => setEditingPage({ ...editingPage, title_en: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label>Meta Description (SEO)</Label>
                    <Input
                      value={editingPage.meta_description_en || ""}
                      onChange={(e) => setEditingPage({ ...editingPage, meta_description_en: e.target.value })}
                      placeholder="Short description for search engines"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label>Content (HTML supported)</Label>
                    <Textarea
                      value={editingPage.content_en || ""}
                      onChange={(e) => setEditingPage({ ...editingPage, content_en: e.target.value })}
                      rows={15}
                      className="font-mono text-sm"
                      dir="ltr"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={savePage} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                <Save className="w-4 h-4 ml-2" />
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default StaticPagesPage;
