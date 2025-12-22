import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Wallet, Plus, Minus, Gift, TrendingUp } from "lucide-react";

export default function WalletsPage() {
  const [search, setSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .order("balance", { ascending: false });
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

  const addTransactionMutation = useMutation({
    mutationFn: async () => {
      const wallet = wallets?.find((w) => w.id === selectedWallet);
      if (!wallet) throw new Error("Wallet not found");

      const numAmount = parseFloat(amount);
      const newBalance = transactionType === "credit" 
        ? (wallet.balance || 0) + numAmount
        : (wallet.balance || 0) - numAmount;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", selectedWallet);
      if (walletError) throw walletError;

      // Add transaction record
      const { error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: selectedWallet,
          amount: transactionType === "credit" ? numAmount : -numAmount,
          type: transactionType,
          description,
        });
      if (transactionError) throw transactionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      toast({ title: "تمت العملية بنجاح" });
      setIsDialogOpen(false);
      setAmount("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const getProfile = (userId: string) => {
    return profiles?.find((p) => p.user_id === userId);
  };

  const filteredWallets = wallets?.filter((wallet) => {
    const profile = getProfile(wallet.user_id);
    const searchLower = search.toLowerCase();
    return (
      !search ||
      profile?.full_name?.toLowerCase().includes(searchLower) ||
      profile?.phone?.includes(search)
    );
  });

  const totalBalance = wallets?.reduce((acc, w) => acc + (w.balance || 0), 0) || 0;
  const totalPoints = wallets?.reduce((acc, w) => acc + (w.points || 0), 0) || 0;

  return (
    <AdminLayout title="إدارة المحافظ">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المحافظ</h1>
            <p className="text-muted-foreground">عرض وإدارة محافظ العملاء</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{wallets?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المحافظ</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBalance.toFixed(2)} ر.س</p>
                <p className="text-sm text-muted-foreground">إجمالي الأرصدة</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Gift className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPoints}</p>
                <p className="text-sm text-muted-foreground">إجمالي النقاط</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 max-w-md"
          />
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">الرصيد</TableHead>
                <TableHead className="text-right">النقاط</TableHead>
                <TableHead className="text-right">آخر تحديث</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredWallets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    لا يوجد محافظ
                  </TableCell>
                </TableRow>
              ) : (
                filteredWallets?.map((wallet) => {
                  const profile = getProfile(wallet.user_id);
                  return (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{profile?.full_name || "بدون اسم"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{profile?.phone || "-"}</TableCell>
                      <TableCell className="font-medium">
                        {(wallet.balance || 0).toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Gift className="h-4 w-4 text-yellow-500" />
                          {wallet.points || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(wallet.updated_at!).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen && selectedWallet === wallet.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) setSelectedWallet(wallet.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              إضافة/خصم
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>تعديل رصيد المحفظة</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>نوع العملية</Label>
                                <Select value={transactionType} onValueChange={(v) => setTransactionType(v as "credit" | "debit")}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="credit">
                                      <div className="flex items-center gap-2">
                                        <Plus className="h-4 w-4 text-green-500" />
                                        إضافة رصيد
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="debit">
                                      <div className="flex items-center gap-2">
                                        <Minus className="h-4 w-4 text-red-500" />
                                        خصم رصيد
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>المبلغ (ر.س)</Label>
                                <Input
                                  type="number"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>الوصف</Label>
                                <Input
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  placeholder="سبب العملية..."
                                />
                              </div>
                              <Button
                                onClick={() => addTransactionMutation.mutate()}
                                disabled={!amount || addTransactionMutation.isPending}
                                className="w-full"
                              >
                                تأكيد العملية
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
