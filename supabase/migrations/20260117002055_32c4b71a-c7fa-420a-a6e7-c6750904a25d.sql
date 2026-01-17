-- Create table for WhatsApp messages (both sent and received)
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  template_name TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  special_order_id UUID REFERENCES public.special_orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'received')),
  external_message_id TEXT,
  reply_to_message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to read all messages
CREATE POLICY "Admins can view all whatsapp messages" 
ON public.whatsapp_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for admins to insert messages
CREATE POLICY "Admins can insert whatsapp messages" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for admins to update messages
CREATE POLICY "Admins can update whatsapp messages" 
ON public.whatsapp_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policy for service role (edge functions)
CREATE POLICY "Service role can manage whatsapp messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages(phone);
CREATE INDEX idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_order_id ON public.whatsapp_messages(order_id);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();