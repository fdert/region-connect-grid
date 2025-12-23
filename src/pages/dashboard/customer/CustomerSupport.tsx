import DashboardLayout from "../DashboardLayout";
import { 
  MessageSquare,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const statusLabels: Record<string, string> = {
  "open": "مفتوحة",
  "in_progress": "قيد المعالجة",
  "resolved": "تم الحل",
  "closed": "مغلقة"
};

const statusColors: Record<string, string> = {
  "open": "bg-info",
  "in_progress": "bg-warning",
  "resolved": "bg-success",
  "closed": "bg-muted"
};

const CustomerSupport = () => {
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['customer-tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          order:orders(order_number),
          store:stores(name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: replies } = useQuery({
    queryKey: ['ticket-replies', selectedTicket?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_replies')
        .select('*')
        .eq('ticket_id', selectedTicket?.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTicket?.id
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const ticketNumber = `TKT-${Date.now()}`;
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          subject: newSubject,
          message: newMessage,
          ticket_number: ticketNumber,
          status: 'open',
          priority: 'normal'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      setIsNewTicketOpen(false);
      setNewSubject("");
      setNewMessage("");
      toast({
        title: "تم إرسال التذكرة",
        description: "سيتم الرد عليك في أقرب وقت",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال التذكرة",
        variant: "destructive",
      });
    }
  });

  const addReplyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('support_replies')
        .insert({
          ticket_id: selectedTicket?.id,
          user_id: user?.id,
          message: replyMessage,
          is_admin: false
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-replies'] });
      setReplyMessage("");
      toast({
        title: "تم الإرسال",
        description: "تم إرسال ردك بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الرد",
        variant: "destructive",
      });
    }
  });

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar });
  };

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (selectedTicket) {
    return (
      <DashboardLayout role="customer">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{selectedTicket.subject}</h1>
              <p className="text-sm text-muted-foreground">{selectedTicket.ticket_number}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${statusColors[selectedTicket.status || 'open']}`}>
              {statusLabels[selectedTicket.status || 'open']}
            </span>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            {/* Original Message */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">أنت</span>
                    <span className="text-xs text-muted-foreground">{formatDate(selectedTicket.created_at)}</span>
                  </div>
                  <p className="text-sm">{selectedTicket.message}</p>
                </div>
              </div>
            </div>

            {/* Replies */}
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {replies?.map((reply) => (
                <div key={reply.id} className={`p-4 ${reply.is_admin ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      reply.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{reply.is_admin ? 'الدعم الفني' : 'أنت'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(reply.created_at || '')}</span>
                      </div>
                      <p className="text-sm">{reply.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="اكتب ردك..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => addReplyMutation.mutate()}
                    disabled={!replyMessage.trim() || addReplyMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">الدعم الفني</h1>
            <p className="text-muted-foreground">تواصل معنا لأي استفسار</p>
          </div>
          <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                تذكرة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تذكرة دعم جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>الموضوع</Label>
                  <Input
                    placeholder="موضوع التذكرة"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الرسالة</Label>
                  <Textarea
                    placeholder="اكتب رسالتك..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => createTicketMutation.mutate()}
                  disabled={!newSubject.trim() || !newMessage.trim() || createTicketMutation.isPending}
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'إرسال التذكرة'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tickets List */}
        {tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      ticket.status === 'open' ? 'bg-info/10' :
                      ticket.status === 'in_progress' ? 'bg-warning/10' :
                      ticket.status === 'resolved' ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      {ticket.status === 'resolved' ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : ticket.status === 'open' ? (
                        <AlertCircle className="w-5 h-5 text-info" />
                      ) : (
                        <Clock className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{ticket.subject}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground ${statusColors[ticket.status || 'open']}`}>
                          {statusLabels[ticket.status || 'open']}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.message}</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ticket.ticket_number} • {formatTimeAgo(ticket.created_at || '')}
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-lg mb-2">لا توجد تذاكر دعم</h3>
            <p className="text-muted-foreground mb-4">لديك استفسار؟ أنشئ تذكرة جديدة</p>
            <Button onClick={() => setIsNewTicketOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              تذكرة جديدة
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerSupport;
