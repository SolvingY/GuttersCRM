import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  userName: string;
}

export function CommentsSection() {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchComments = async () => {
    // Fetch comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('leaderboard_comments')
      .select('id, user_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      setLoading(false);
      return;
    }

    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map((p) => [p.id, p.full_name]) || []);

    const commentsWithNames = commentsData.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      userName: profilesMap.get(c.user_id) || 'Anonymous',
    }));

    setComments(commentsWithNames);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    const { error } = await supabase.from('leaderboard_comments').insert({
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({
        title: 'Error posting comment',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      fetchComments();
      toast({
        title: 'Comment posted!',
        description: 'Your comment has been added.',
      });
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('leaderboard_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({
        title: 'Error deleting comment',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchComments();
      toast({
        title: 'Comment deleted',
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-heading text-foreground">Team Comments</h3>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <Textarea
          placeholder="Share encouragement or notes with the team..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mb-3 resize-none"
          rows={3}
        />
        <Button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Post Comment
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          No comments yet. Be the first to share!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {comment.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1">{comment.content}</p>
                </div>
                {(user?.id === comment.user_id || isAdmin) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
