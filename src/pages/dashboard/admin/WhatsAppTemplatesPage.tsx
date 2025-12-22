import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, MessageSquare, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  is_active: boolean;
}

const WhatsAppTemplatesPage = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    template: "",
    variables: "",
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const variables = formData.variables.split(",").map(v => v.trim()).filter(Boolean);
      
      const payload = {
        name: formData.name,
        template: formData.template,
        variables,
        is_active: formData.is_active
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("whatsapp_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast({ title: "تم تحديث القالب بنجاح" });
      } else {
        const { error } = await supabase
          .from("whatsapp_templates")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "تم إضافة القالب بنجاح" });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      if (error.code === "23505") {
        toast({ title: "اسم القالب موجود مسبقاً", variant: "destructive" });
      } else {
        toast({ title: "خطأ في حفظ القالب", variant: "destructive" });
      }
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ name: "", template: "", variables: "", is_active: true });
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template: template.template,
      variables: template.variables?.join(", ") || "",
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    
    try {
      const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف القالب" });
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const copyTemplate = (template: string) => {
    navigator.clipboard.writeText(template);
    toast({ title: "تم نسخ القالب" });
  };

  return (
    <AdminLayout title="قوالب رسائل واتساب">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          إدارة قوالب الرسائل المرسلة عبر واتساب
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus className="w-4 h-4" />
              إضافة قالب
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "تعديل القالب" : "إضافة قالب جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم القالب *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="order_created"
                  dir="ltr"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  يستخدم لتحديد القالب برمجياً (بدون مسافات)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>نص الرسالة *</Label>
                <Textarea
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder="مرحباً {{customer_name}}!&#10;&#10;تم استلام طلبك رقم {{order_number}}"
                  className="min-h-[150px]"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  استخدم {"{{variable}}"} للمتغيرات
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>المتغيرات</Label>
                <Input
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  placeholder="customer_name, order_number, total"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  افصل بين المتغيرات بفاصلة
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <Label>تفعيل القالب</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
              
              <Button type="submit" className="w-full">
                {editingTemplate ? "حفظ التعديلات" : "إضافة القالب"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </div>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "مفعل" : "معطل"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap mb-3 max-h-32 overflow-y-auto">
                {template.template}
              </pre>
              
              {template.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.variables.map(v => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => copyTemplate(template.template)} className="gap-1">
                  <Copy className="w-3 h-3" />
                  نسخ
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(template)} className="gap-1">
                  <Edit2 className="w-3 h-3" />
                  تعديل
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-3 h-3" />
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {templates.length === 0 && !isLoading && (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد قوالب</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default WhatsAppTemplatesPage;
