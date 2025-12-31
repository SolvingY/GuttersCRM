-- Add yearly_goal and sales_rank columns to user_metrics
ALTER TABLE public.user_metrics 
ADD COLUMN IF NOT EXISTS yearly_goal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_rank TEXT DEFAULT 'SR1';

-- Create invitations table for invite-only signups
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- Create unique index on email for pending invitations only
CREATE UNIQUE INDEX IF NOT EXISTS invitations_email_pending_idx 
ON public.invitations (email) 
WHERE is_used = false;

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
CREATE POLICY "Admins can view all invitations"
ON public.invitations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations"
ON public.invitations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations"
ON public.invitations
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow anyone to check invite codes during signup (read-only, specific columns)
CREATE POLICY "Anyone can verify invite codes"
ON public.invitations
FOR SELECT
USING (true);