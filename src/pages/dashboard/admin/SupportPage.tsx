import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageSquare, Clock, User, Store, ShoppingCart, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  order_id: string | null;
  store_id: string | null;
}

interface Reply {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-info",
  in_progress: "bg-warning",
  resolved: "bg-success",
  closed: "bg-muted"
};

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلقة"
};

const priorityColors: Record<string, string> = {
  low: "bg-muted",
  normal: "bg-info",
  high: "bg-warning",
  urgent: "bg-destructive"
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة"
};

const SupportPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_replies")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at");

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error("Error fetching replies:", error);
    }
  };

  const handleOpenTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !selectedTicket || !user) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase
        .from("support_replies")
        .insert([{
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newReply,
          is_admin: true
        }]);

      if (error) throw error;
      
      setNewReply("");
      await fetchReplies(selectedTicket.id);
      toast({ title: "تم إرسال الرد" });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({ title: "خطأ في إرسال الرد", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) throw error;
      
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
      toast({ title: "تم تحديث الحالة" });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <AdminLayout title="الدعم الفني">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم التذكرة أو الموضوع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="open">مفتوحة</SelectItem>
            <SelectItem value="in_progress">قيد المعالجة</SelectItem>
            <SelectItem value="resolved">تم الحل</SelectItem>
            <SelectItem value="closed">مغلقة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "مفتوحة", value: tickets.filter(t => t.status === "open").length, color: "text-info" },
          { label: "قيد المعالجة", value: tickets.filter(t => t.status === "in_progress").length, color: "text-warning" },
          { label: "تم الحل", value: tickets.filter(t => t.status === "resolved").length, color: "text-success" },
          { label: "الإجمالي", value: tickets.length, color: "text-foreground" },
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tickets List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleOpenTicket(ticket)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-primary">{ticket.ticket_number}</span>
                      <Badge className={`${statusColors[ticket.status]} text-white`}>
                        {statusLabels[ticket.status]}
                      </Badge>
                      <Badge variant="outline" className={priorityColors[ticket.priority]}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.message}</p>
                  </div>
                  <div className="text-left text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(ticket.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTickets.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد تذاكر</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary">{selectedTicket?.ticket_number}</span>
              <Badge className={`${statusColors[selectedTicket?.status || "open"]} text-white`}>
                {statusLabels[selectedTicket?.status || "open"]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Original Message */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">{selectedTicket.subject}</h3>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(selectedTicket.created_at)}</p>
              </div>

              {/* Replies */}
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div 
                    key={reply.id}
                    className={`rounded-lg p-3 ${reply.is_admin ? "bg-primary/10 mr-8" : "bg-muted/50 ml-8"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {reply.is_admin ? "الدعم الفني" : "العميل"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
                    </div>
                    <p className="text-sm">{reply.message}</p>
                  </div>
                ))}
              </div>

              {/* Status Update */}
              <div className="flex items-center gap-2">
                <span className="text-sm">تغيير الحالة:</span>
                <Select value={selectedTicket.status} onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">مفتوحة</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">تم الحل</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reply Form */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب ردك..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSendReply} disabled={isSending || !newReply.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SupportPage;
