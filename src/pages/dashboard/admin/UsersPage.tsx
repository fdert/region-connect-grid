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
import { Search, UserPlus, Shield, Truck, Store, User, Edit, Key, MessageSquare, Loader2, Mail, Phone, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserData {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  role_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  force_password_change: boolean;
}

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
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const queryClient = useQueryClient();

  // Fetch users using edge function
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users-full", roleFilter],
    queryFn: async () => {
      // Ensure we have a session before calling the function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("admin-get-users");

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }
      if (data?.error) throw new Error(data.error);
      return data.users as UserData[];
    },
    retry: 1,
  });

  const users = usersData?.filter(u => roleFilter === "all" || u.role === roleFilter);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "تم تحديث الدور بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editForm }) => {
      const updatePayload: any = {
        userId,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
      };

      // Only include password if it's provided
      if (data.password && data.password.length > 0) {
        updatePayload.password = data.password;
      }

      const { data: result, error } = await supabase.functions.invoke("admin-update-user", {
        body: updatePayload,
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "تم تحديث بيانات المستخدم بنجاح" });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "حدث خطأ", 
        description: error.message || "فشل في تحديث البيانات",
        variant: "destructive" 
      });
    },
  });

  const sendPasswordMutation = useMutation({
    mutationFn: async ({ userId, password, phone }: { userId: string; password: string; phone: string }) => {
      // First, update the password using admin function
      const { error: updateError, data: updateResult } = await supabase.functions.invoke("admin-update-user", {
        body: {
          userId,
          password,
        },
      });

      if (updateError) throw updateError;
      if (updateResult.error) throw new Error(updateResult.error);

      // Set force_password_change flag
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
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
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

  const filteredUsers = users?.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(search) ||
      user.id.includes(search)
    );
  });

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.full_name || "",
      phone: user.phone || "",
      email: user.email || "",
      password: "",
    });
    setShowPassword(false);
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (user: UserData) => {
    setSelectedUser(user);
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
              placeholder="بحث بالاسم أو الإيميل أو رقم الهاتف..."
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

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">آخر دخول</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري التحميل...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    لا يوجد مستخدمين
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {roleIcons[user.role]}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || "بدون اسم"}</p>
                          <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm" dir="ltr">{user.email || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm" dir="ltr">{user.phone || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString("ar-SA")
                          : "لم يسجل دخول"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            updateRoleMutation.mutate({
                              userId: user.id,
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
                          onClick={() => openEditDialog(user)}
                          title="تعديل البيانات"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPasswordDialog(user)}
                          title="إرسال كلمة مرور جديدة"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
              <DialogDescription>
                قم بتعديل بيانات المستخدم. اترك كلمة المرور فارغة إذا لم ترد تغييرها.
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
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                  dir="ltr"
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
                <Label>كلمة المرور الجديدة (اختياري)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="اترك فارغة إذا لم ترد التغيير"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => selectedUser && updateUserMutation.mutate({
                  userId: selectedUser.id,
                  data: editForm,
                })}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
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
                سيتم تحديث كلمة المرور وإرسالها عبر واتساب للمستخدم وسيُطلب منه تغييرها عند تسجيل الدخول
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input value={selectedUser?.full_name || "بدون اسم"} disabled />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input value={selectedUser?.email || "-"} disabled dir="ltr" />
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
                  userId: selectedUser.id,
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
