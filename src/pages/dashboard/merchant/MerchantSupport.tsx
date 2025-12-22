import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "../DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

const MerchantSupport = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [form, setForm] = useState({
    subject: "",
    message: "",
    priority: "normal",
  });
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get user's tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["merchant-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get replies for selected ticket
  const { data: replies } = useQuery({
    queryKey: ["ticket-replies", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      
      const { data, error } = await supabase
        .from("support_replies")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedTicket?.id,
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Generate ticket number
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: data.subject,
          message: data.message,
          priority: data.priority,
          ticket_number: ticketNumber,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-tickets"] });
      toast.success("تم إنشاء التذكرة بنجاح");
      setIsCreateOpen(false);
      setForm({ subject: "", message: "", priority: "normal" });
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إنشاء التذكرة");
    },
  });

  // Send reply mutation
  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.id || !selectedTicket?.id) throw new Error("Invalid data");
      
      const { error } = await supabase
        .from("support_replies")
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message,
          is_admin: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies"] });
      toast.success("تم إرسال الرد");
      setNewMessage("");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إرسال الرد");
    },
  });

  const handleCreateTicket = () => {
    if (!form.subject || !form.message) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    createMutation.mutate(form);
  };

  const handleSendReply = () => {
    if (!newMessage.trim()) return;
    replyMutation.mutate(newMessage);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">الدعم الفني</h1>
            <p className="text-muted-foreground">تواصل معنا لأي استفسار أو مشكلة</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            تذكرة جديدة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي التذاكر</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tickets?.filter(t => t.status === "open" || t.status === "in_progress").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">قيد المعالجة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tickets?.filter(t => t.status === "resolved").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">تم الحل</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>تذاكر الدعم</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !tickets || tickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد تذاكر دعم</p>
                <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="mt-4">
                  إنشاء تذكرة جديدة
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">
                            {ticket.ticket_number}
                          </span>
                          <Badge className={statusColors[ticket.status || "open"]}>
                            {statusLabels[ticket.status || "open"]}
                          </Badge>
                        </div>
                        <h3 className="font-medium">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {ticket.message}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(ticket.created_at!)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Ticket Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء تذكرة دعم جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الموضوع *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="موضوع التذكرة"
                />
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm({ ...form, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="normal">عادية</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الرسالة *</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="اكتب رسالتك هنا..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateTicket} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                إرسال
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket Details Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedTicket?.ticket_number}</span>
                <Badge className={statusColors[selectedTicket?.status || "open"]}>
                  {statusLabels[selectedTicket?.status || "open"]}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg">{selectedTicket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedTicket.created_at)}
                  </p>
                </div>

                {/* Original Message */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>

                {/* Replies */}
                {replies && replies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">الردود</h4>
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-lg ${
                          reply.is_admin ? "bg-primary/10 mr-8" : "bg-muted ml-8"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={reply.is_admin ? "default" : "secondary"}>
                            {reply.is_admin ? "الدعم" : "أنت"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.created_at!)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="اكتب ردك..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                    />
                    <Button onClick={handleSendReply} disabled={replyMutation.isPending}>
                      {replyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default MerchantSupport;
