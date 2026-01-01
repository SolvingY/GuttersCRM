-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create table to track which users have read which announcements
CREATE TABLE public.user_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Add tour_completed column to profiles table
ALTER TABLE public.profiles ADD COLUMN tour_completed BOOLEAN DEFAULT false;

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY "Admins can insert announcements"
ON public.announcements FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view active announcements
CREATE POLICY "Authenticated users can view active announcements"
ON public.announcements FOR SELECT
USING (is_active = true);

-- Enable RLS on user_announcement_reads
ALTER TABLE public.user_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own read records
CREATE POLICY "Users can insert their own read records"
ON public.user_announcement_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can view their own read records
CREATE POLICY "Users can view their own read records"
ON public.user_announcement_reads FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all read records
CREATE POLICY "Admins can view all read records"
ON public.user_announcement_reads FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));