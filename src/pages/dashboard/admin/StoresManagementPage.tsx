import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Search, Store, Star, MapPin, CheckCircle, XCircle } from "lucide-react";

export default function StoresManagementPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ storeId, isApproved }: { storeId: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_approved: isApproved })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast({ title: "تم تحديث حالة المتجر" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_active: isActive })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      toast({ title: "تم تحديث حالة التفعيل" });
    },
  });

  const filteredStores = stores?.filter((store) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      store.name.toLowerCase().includes(searchLower) ||
      store.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout title="إدارة المتاجر">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
            <p className="text-muted-foreground">عرض والموافقة على المتاجر</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stores?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المتاجر</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stores?.filter((s) => s.is_approved).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">متاجر معتمدة</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <XCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stores?.filter((s) => !s.is_approved).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">بانتظار الموافقة</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Star className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stores?.length
                    ? (stores.reduce((acc, s) => acc + (s.rating || 0), 0) / stores.length).toFixed(1)
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground">متوسط التقييم</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو المدينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 max-w-md"
          />
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المتجر</TableHead>
                <TableHead className="text-right">المدينة</TableHead>
                <TableHead className="text-right">التقييم</TableHead>
                <TableHead className="text-right">رسوم التوصيل</TableHead>
                <TableHead className="text-right">معتمد</TableHead>
                <TableHead className="text-right">مفعل</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredStores?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    لا يوجد متاجر
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {store.logo_url ? (
                          <img
                            src={store.logo_url}
                            alt={store.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {store.city || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {store.rating?.toFixed(1) || "0.0"}
                        <span className="text-xs text-muted-foreground">
                          ({store.total_reviews})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{store.delivery_fee} ر.س</TableCell>
                    <TableCell>
                      <Switch
                        checked={store.is_approved || false}
                        onCheckedChange={(checked) =>
                          toggleApprovalMutation.mutate({
                            storeId: store.id,
                            isApproved: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={store.is_active || false}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            storeId: store.id,
                            isActive: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        عرض التفاصيل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
