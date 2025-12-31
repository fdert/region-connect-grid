import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, CreditCard, Banknote, Printer, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirm: () => void;
}

const PaymentConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  order,
  onConfirm
}: PaymentConfirmationDialogProps) => {
  const [paymentType, setPaymentType] = useState<"cash" | "card">("cash");
  const [amountReceived, setAmountReceived] = useState(order?.total?.toString() || "0");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [receiptKept, setReceiptKept] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (paymentType === "card" && !transactionNumber) {
      toast.error("يرجى إدخال رقم العملية");
      return;
    }

    if (paymentType === "card" && !receiptKept) {
      toast.error("يرجى تأكيد طباعة والاحتفاظ بإيصال الشبكة");
      return;
    }

    if (!amountReceived || parseFloat(amountReceived) <= 0) {
      toast.error("يرجى إدخال المبلغ المستلم");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل الدخول");

      // Update order with payment confirmation
      const updateData: any = {
        status: 'delivered',
        payment_confirmed: true,
        payment_confirmed_at: new Date().toISOString(),
        payment_confirmed_by: user.id,
        amount_received: parseFloat(amountReceived),
        payment_method: paymentType,
        paid: true,
      };

      if (paymentType === "card") {
        updateData.card_transaction_number = transactionNumber;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payment_records')
        .insert({
          order_id: order.id,
          courier_id: user.id,
          store_id: order.store_id,
          payment_type: paymentType,
          amount_received: parseFloat(amountReceived),
          transaction_number: paymentType === "card" ? transactionNumber : null,
          receipt_kept: paymentType === "card" ? receiptKept : null,
          customer_phone: order.customer_phone,
        });

      if (paymentError) throw paymentError;

      // Send WhatsApp confirmation
      try {
        const siteUrl = window.location.origin;
        const reviewUrl = `${siteUrl}/review/${order.id}`;
        
        await supabase.functions.invoke('whatsapp-notification', {
          body: {
            phone: order.customer_phone,
            templateName: 'payment_confirmation',
            variables: {
              order_number: order.order_number,
              amount: amountReceived,
              payment_type: paymentType === "cash" ? "نقداً" : "بالبطاقة",
              review_url: reviewUrl,
            }
          }
        });
      } catch (err) {
        console.error('WhatsApp notification failed:', err);
      }

      toast.success("تم تأكيد التسليم والدفع بنجاح");
      onConfirm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "حدث خطأ أثناء التأكيد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountDifference = parseFloat(amountReceived || "0") - (order?.total || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            تأكيد التسليم والدفع
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">رقم الطلب</span>
              <span className="font-bold">{order?.order_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">المبلغ المطلوب</span>
              <span className="font-bold text-lg text-primary">{order?.total?.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Payment Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">طريقة الدفع</Label>
            <RadioGroup 
              value={paymentType} 
              onValueChange={(v: "cash" | "card") => setPaymentType(v)}
              className="grid grid-cols-2 gap-3"
            >
              <div className={`flex items-center space-x-2 space-x-reverse border rounded-xl p-4 cursor-pointer transition-colors ${paymentType === 'cash' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="w-5 h-5 text-green-500" />
                  نقداً
                </Label>
              </div>
              <div className={`flex items-center space-x-2 space-x-reverse border rounded-xl p-4 cursor-pointer transition-colors ${paymentType === 'card' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  شبكة
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Received - for cash */}
          {paymentType === "cash" && (
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-semibold">المبلغ المستلم</Label>
              <Input
                id="amount"
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="أدخل المبلغ المستلم"
                className="h-12 text-lg text-center"
                step="0.01"
              />
              {amountDifference !== 0 && (
                <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${amountDifference > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  <AlertTriangle className="w-4 h-4" />
                  {amountDifference > 0 
                    ? `الباقي للعميل: ${amountDifference.toFixed(2)} ر.س`
                    : `نقص في المبلغ: ${Math.abs(amountDifference).toFixed(2)} ر.س`
                  }
                </div>
              )}
            </div>
          )}

          {/* Card Transaction Details */}
          {paymentType === "card" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transaction" className="text-base font-semibold">رقم العملية</Label>
                <Input
                  id="transaction"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="أدخل رقم العملية من الإيصال"
                  className="h-12 text-center tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardAmount" className="text-base font-semibold">المبلغ</Label>
                <Input
                  id="cardAmount"
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="h-12 text-lg text-center"
                  step="0.01"
                />
              </div>

              <div className="flex items-start space-x-3 space-x-reverse bg-amber-500/10 p-4 rounded-xl">
                <Checkbox
                  id="receipt"
                  checked={receiptKept}
                  onCheckedChange={(checked) => setReceiptKept(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="receipt" className="cursor-pointer font-medium text-amber-700 dark:text-amber-400">
                    <Printer className="w-4 h-4 inline ml-1" />
                    تأكيد طباعة والاحتفاظ بإيصال الشبكة
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    يجب الاحتفاظ بالإيصال للمراجعة المحاسبية
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full h-12 text-lg bg-green-500 hover:bg-green-600"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5 ml-2" />
                تأكيد التسليم والدفع
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentConfirmationDialog;
