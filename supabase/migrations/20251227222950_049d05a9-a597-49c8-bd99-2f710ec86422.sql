-- Create announcement bar settings table
CREATE TABLE public.announcement_bar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  background_color TEXT DEFAULT '#dc2626',
  text_color TEXT DEFAULT '#ffffff',
  font_size INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  link_url TEXT,
  speed INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcement_bar ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcement bar
CREATE POLICY "Admins can manage announcement bar"
ON public.announcement_bar
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active announcement bar
CREATE POLICY "Anyone can view active announcement bar"
ON public.announcement_bar
FOR SELECT
USING (is_active = true);

-- Insert default announcement
INSERT INTO public.announcement_bar (text, is_active) 
VALUES ('🔥 مرحباً بكم في منصتنا - تسوقوا الآن واستمتعوا بأفضل العروض! 🔥', false);