import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getRandomQuote } from '@/lib/motivationalQuotes';
import { Trophy, Megaphone, Quote, Sparkles, Rocket } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  created_at: string | null;
}

interface ContestVictory {
  id: string;
  place: number;
  points_awarded: number;
  contest: {
    title: string;
    prize_description: string;
  } | null;
}

export function WelcomeModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [victories, setVictories] = useState<ContestVictory[]>([]);
  const [quote] = useState(getRandomQuote());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Show modal every login (removed session check)

    const fetchData = async () => {
      try {
        // Check if this is a first-time user (no yearly goal set)
        const { data: metricsData } = await supabase
          .from('user_metrics')
          .select('display_name, yearly_goal')
          .eq('user_id', user.id)
          .order('metric_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If no yearly goal, the GoalSettingModal will show instead
        if (!metricsData || !metricsData.yearly_goal || Number(metricsData.yearly_goal) === 0) {
          setLoading(false);
          return;
        }

        setDisplayName(metricsData.display_name || user.email?.split('@')[0] || 'Closer');

        // Fetch unread announcements
        const { data: allAnnouncements } = await supabase
          .from('announcements')
          .select('id, title, content, priority, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const { data: readAnnouncements } = await supabase
          .from('user_announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        const readIds = new Set(readAnnouncements?.map(r => r.announcement_id) || []);
        const unreadAnnouncements = allAnnouncements?.filter(a => !readIds.has(a.id)) || [];
        setAnnouncements(unreadAnnouncements);

        // Fetch recent contest victories (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: victoriesData } = await supabase
          .from('contest_victories')
          .select(`
            id,
            place,
            points_awarded,
            contest:contests(title, prize_description)
          `)
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(3);

        setVictories((victoriesData as any) || []);

        // Show modal if returning user
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to let the dashboard load
    const timer = setTimeout(fetchData, 600);
    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = async () => {
    if (!user) return;

    // Mark announcements as read
    if (announcements.length > 0) {
      const reads = announcements.map(a => ({
        user_id: user.id,
        announcement_id: a.id,
      }));
      
      await supabase.from('user_announcement_reads').insert(reads);
    }

    // Mark as shown for this session
    sessionStorage.setItem(`welcome_modal_shown_${user.id}`, 'true');
    setIsOpen(false);
  };

  if (loading) return null;

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">Important</Badge>;
      default:
        return null;
    }
  };

  const getPlaceLabel = (place: number) => {
    switch (place) {
      case 1: return '🥇 1st Place';
      case 2: return '🥈 2nd Place';
      case 3: return '🥉 3rd Place';
      default: return `#${place}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-accent/10 rounded-full">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h2 className="text-2xl font-heading text-foreground">
              Welcome back closer, {displayName}!
            </h2>
            <p className="text-sm text-muted-foreground">
              Ready to dominate today?
            </p>
          </div>

          {/* Motivational Quote */}
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <div className="flex gap-3">
              <Quote className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm italic text-foreground">"{quote.quote}"</p>
                <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
              </div>
            </div>
          </div>

          {/* Contest Victories */}
          {victories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Recent Victories</h3>
              </div>
              <div className="space-y-2">
                {victories.map((victory) => (
                  <div
                    key={victory.id}
                    className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {victory.contest?.title || 'Contest'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPlaceLabel(victory.place)}
                      </p>
                    </div>
                    <Badge variant="secondary">+{victory.points_awarded} pts</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">
                  Announcements ({announcements.length} new)
                </h3>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-secondary/50 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                      {getPriorityBadge(announcement.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <Button
            onClick={handleClose}
            size="lg"
            className="w-full text-lg font-heading gap-2"
          >
            <Rocket className="h-5 w-5" />
            Let's Get It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
