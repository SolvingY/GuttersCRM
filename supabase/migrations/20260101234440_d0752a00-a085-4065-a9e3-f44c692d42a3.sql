-- Add thread column to leaderboard_comments for separate sales/canvasser threads
ALTER TABLE public.leaderboard_comments 
ADD COLUMN thread text NOT NULL DEFAULT 'sales';

-- Backfill existing comments to sales thread (already done by default)
UPDATE public.leaderboard_comments SET thread = 'sales' WHERE thread IS NULL;

-- Add index for performance on thread + created_at queries
CREATE INDEX idx_leaderboard_comments_thread ON public.leaderboard_comments(thread, created_at DESC);

-- Add validation trigger to ensure thread is valid
CREATE OR REPLACE FUNCTION public.validate_comment_thread()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread NOT IN ('sales', 'canvasser') THEN
    RAISE EXCEPTION 'Invalid thread type. Must be sales or canvasser';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_comment_thread_trigger
BEFORE INSERT OR UPDATE ON public.leaderboard_comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_comment_thread();