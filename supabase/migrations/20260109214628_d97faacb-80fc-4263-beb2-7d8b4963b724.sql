-- Add media_type column to banners table for video support
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Add video_url column for video banners
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.banners.media_type IS 'Type of media: image or video';
COMMENT ON COLUMN public.banners.video_url IS 'URL for video content when media_type is video';