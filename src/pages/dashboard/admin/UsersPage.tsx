import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, Shield, Truck, Store, User, Edit, Key, MessageSquare, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleIcons: Record<AppRole, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  merchant: <Store className="h-4 w-4" />,
  courier: <Truck className="h-4 w-4" />,
  customer: <User className="h-4 w-4" />,
};

const roleLabels: Record<AppRole, string> = {
  admin: "مدير",
  merchant: "تاجر",
  courier: "سائق",
  customer: "عميل",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-destructive text-destructive-foreground",
  merchant: "bg-primary text-primary-foreground",
  courier: "bg-accent text-accent-foreground",
  customer: "bg-muted text-muted-foreground",
};

// Generate random password
const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    fullName: string;
    phone: string;
    email: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    email: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter as AppRole);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم تحديث الدور بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editForm }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "تم تحديث بيانات المستخدم بنجاح" });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const sendPasswordMutation = useMutation({
    mutationFn: async ({ userId, password, phone }: { userId: string; password: string; phone: string }) => {
      // First, set force_password_change flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ force_password_change: true })
        .eq("user_id", userId);
      
      if (profileError) throw profileError;

      // Send WhatsApp notification with new password
      const { error: whatsappError } = await supabase.functions.invoke("send-password-whatsapp", {
        body: { phone, password },
      });

      if (whatsappError) throw whatsappError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "تم إرسال كلمة المرور الجديدة عبر واتساب" });
      setPasswordDialogOpen(false);
      setNewPassword("");
    },
    onError: (error: any) => {
      toast({ 
        title: "حدث خطأ", 
        description: error.message || "فشل في إرسال كلمة المرور",
        variant: "destructive" 
      });
    },
  });

  const getProfile = (userId: string) => {
    return profiles?.find((p) => p.user_id === userId);
  };

  const filteredUsers = users?.filter((user) => {
    const profile = getProfile(user.user_id);
    const searchLower = search.toLowerCase();
    return (
      !search ||
      profile?.full_name?.toLowerCase().includes(searchLower) ||
      profile?.phone?.includes(search) ||
      user.user_id.includes(search)
    );
  });

  const openEditDialog = (userId: string) => {
    const profile = getProfile(userId);
    setSelectedUser({
      userId,
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      email: (profile as any)?.email || "",
    });
    setEditForm({
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      email: (profile as any)?.email || "",
    });
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (userId: string) => {
    const profile = getProfile(userId);
    setSelectedUser({
      userId,
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      email: (profile as any)?.email || "",
    });
    setNewPassword(generatePassword());
    setPasswordDialogOpen(true);
  };

  return (
    <AdminLayout title="إدارة المستخدمين">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
            <p className="text-muted-foreground">عرض وإدارة جميع المستخدمين</p>
          </div>
          <Button>
            <UserPlus className="h-4 w-4 ml-2" />
            إضافة مستخدم
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="جميع الأدوار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأدوار</SelectItem>
              <SelectItem value="admin">مدير</SelectItem>
              <SelectItem value="merchant">تاجر</SelectItem>
              <SelectItem value="courier">سائق</SelectItem>
              <SelectItem value="customer">عميل</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    لا يوجد مستخدمين
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => {
                  const profile = getProfile(user.user_id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {roleIcons[user.role]}
                          </div>
                          <div>
                            <p className="font-medium">{profile?.full_name || "بدون اسم"}</p>
                            <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{profile?.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at!).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              updateRoleMutation.mutate({
                                userId: user.user_id,
                                newRole: value as AppRole,
                              })
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">مدير</SelectItem>
                              <SelectItem value="merchant">تاجر</SelectItem>
                              <SelectItem value="courier">سائق</SelectItem>
                              <SelectItem value="customer">عميل</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user.user_id)}
                            title="تعديل البيانات"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordDialog(user.user_id)}
                            title="إرسال كلمة مرور جديدة"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
              <DialogDescription>
                قم بتعديل بيانات المستخدم
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="أدخل الاسم"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => selectedUser && updateProfileMutation.mutate({
                  userId: selectedUser.userId,
                  data: editForm,
                })}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إرسال كلمة مرور جديدة</DialogTitle>
              <DialogDescription>
                سيتم إرسال كلمة المرور الجديدة عبر واتساب للمستخدم وسيُطلب منه تغييرها عند تسجيل الدخول
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input value={selectedUser?.fullName || "بدون اسم"} disabled />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input value={selectedUser?.phone || "-"} disabled dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewPassword(generatePassword())}
                  >
                    توليد
                  </Button>
                </div>
              </div>
              {!selectedUser?.phone && (
                <p className="text-destructive text-sm">
                  ⚠️ لا يوجد رقم هاتف لهذا المستخدم
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => selectedUser && selectedUser.phone && sendPasswordMutation.mutate({
                  userId: selectedUser.userId,
                  password: newPassword,
                  phone: selectedUser.phone,
                })}
                disabled={sendPasswordMutation.isPending || !selectedUser?.phone || !newPassword}
                className="gap-2"
              >
                {sendPasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                إرسال عبر واتساب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
