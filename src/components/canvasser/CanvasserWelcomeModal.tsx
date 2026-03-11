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
import { Trophy, Megaphone, Quote, Sparkles, Rocket, Flame, Clock, TrendingUp, Gift, Zap } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, differenceInHours, isPast } from 'date-fns';

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

interface WagerEvent {
  id: string;
  title: string;
  status: string;
  wagers_close_at: string;
}

interface UserWager {
  id: string;
  event_id: string;
  points_wagered: number;
  potential_payout: number;
  status: string;
  points_won: number;
  created_at: string;
  event_title?: string;
  option_label?: string;
  resolved_at?: string;
}

interface ActiveContest {
  id: string;
  title: string;
  icon: string;
  end_date: string;
  metric_type: string;
  prize_value: number;
  rank?: number;
  value?: number;
  gap?: number;
}

export function CanvasserWelcomeModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [victories, setVictories] = useState<ContestVictory[]>([]);
  const [quote] = useState(getRandomQuote());
  const [loading, setLoading] = useState(true);
  
  // Pit wager states
  const [newWagerEvents, setNewWagerEvents] = useState<WagerEvent[]>([]);
  const [pendingWagers, setPendingWagers] = useState<UserWager[]>([]);
  const [recentResults, setRecentResults] = useState<UserWager[]>([]);
  
  // Active contest states
  const [activeContests, setActiveContests] = useState<ActiveContest[]>([]);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(`welcome_modal_shown_${user.id}`)) return;

    const fetchData = async () => {
      try {
        // Check if this is a first-time user (no yearly goal set)
        const { data: metricsData } = await supabase
          .from('canvasser_metrics')
          .select('display_name, yearly_goal')
          .eq('user_id', user.id)
          .order('metric_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If no yearly goal, the CanvasserGoalModal will show instead
        if (!metricsData || !metricsData.yearly_goal || Number(metricsData.yearly_goal) === 0) {
          setLoading(false);
          return;
        }

        setDisplayName(metricsData.display_name || user.email?.split('@')[0] || 'Canvasser');

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

        // Fetch active/open pit wager events
        const { data: eventsData } = await supabase
          .from('pit_wager_events')
          .select('id, title, status, wagers_close_at')
          .in('status', ['open', 'locked'])
          .order('created_at', { ascending: false })
          .limit(3);
        
        setNewWagerEvents(eventsData || []);

        // Fetch user's pending wagers (canvassers use canvasser_metrics for points)
        const { data: wagersData } = await supabase
          .from('pit_wagers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Enrich pending wagers
        const pending: UserWager[] = [];
        const recent: UserWager[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        for (const wager of wagersData || []) {
          const { data: eventData } = await supabase
            .from('pit_wager_events')
            .select('title')
            .eq('id', wager.event_id)
            .single();
          
          const { data: optionData } = await supabase
            .from('pit_wager_options')
            .select('option_label')
            .eq('id', wager.option_id)
            .single();

          const enrichedWager = {
            ...wager,
            event_title: eventData?.title,
            option_label: optionData?.option_label,
          };

          if (wager.status === 'pending') {
            pending.push(enrichedWager);
          } else if (wager.resolved_at && new Date(wager.resolved_at) > sevenDaysAgo) {
            recent.push(enrichedWager);
          }
        }
        
        setPendingWagers(pending.slice(0, 3));
        setRecentResults(recent.slice(0, 3));

        // Fetch active contests for canvassers
        const { data: contestsData } = await supabase
          .from('contests')
          .select('*')
          .eq('is_active', true)
          .eq('target_role', 'canvasser');

        if (contestsData) {
          const now = new Date();
          const active = contestsData.filter(c => {
            const start = new Date(c.start_date);
            const end = new Date(c.end_date);
            return now >= start && now <= end;
          });

          // Get user rankings for active contests
          const contestsWithRanking: ActiveContest[] = [];
          
          for (const contest of active.slice(0, 2)) {
            const { data: allMetrics } = await supabase
              .from('canvasser_metrics')
              .select('user_id, leads_set, leads_closed, leads_with_damage')
              .order('metric_date', { ascending: false });

            if (allMetrics) {
              const latestByUser = new Map<string, number>();
              for (const m of allMetrics) {
                if (!latestByUser.has(m.user_id)) {
                  let value = 0;
                  if (contest.metric_type === 'leads_set') value = Number(m.leads_set) || 0;
                  else if (contest.metric_type === 'leads_closed') value = Number(m.leads_closed) || 0;
                  else if (contest.metric_type === 'leads_with_damage') value = Number(m.leads_with_damage) || 0;
                  else value = Number(m.leads_closed) || 0;
                  latestByUser.set(m.user_id, value);
                }
              }

              const sorted = Array.from(latestByUser.entries())
                .sort((a, b) => b[1] - a[1]);
              
              const userIndex = sorted.findIndex(([id]) => id === user.id);
              const userValue = latestByUser.get(user.id) || 0;
              const leaderValue = sorted[0]?.[1] || 0;

              contestsWithRanking.push({
                id: contest.id,
                title: contest.title,
                icon: contest.icon || '🏆',
                end_date: contest.end_date,
                metric_type: contest.metric_type,
                prize_value: contest.prize_value || 0,
                rank: userIndex + 1,
                value: userValue,
                gap: leaderValue - userValue,
              });
            }
          }
          
          setActiveContests(contestsWithRanking);
        }

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

  const getTimeRemaining = (closeTime: string) => {
    const close = new Date(closeTime);
    if (isPast(close)) return 'Closed';
    return formatDistanceToNow(close, { addSuffix: true });
  };

  const getContestTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    if (isPast(end)) return 'Ended';
    const days = differenceInDays(end, new Date());
    if (days > 0) return `${days}d left`;
    const hours = differenceInHours(end, new Date());
    return `${hours}h left`;
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'leads_set': return 'Leads Set';
      case 'leads_closed': return 'Leads Closed';
      case 'leads_with_damage': return 'Damage Leads';
      default: return metric.replace('_', ' ');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-accent/10 rounded-full">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h2 className="text-2xl font-heading text-foreground">
              Welcome back, {displayName}!
            </h2>
            <p className="text-sm text-muted-foreground">
              Ready to hit the streets today?
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

          {/* Active Contests */}
          {activeContests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Active Contests</h3>
              </div>
              <div className="space-y-2">
                {activeContests.map((contest) => (
                  <div
                    key={contest.id}
                    className="p-3 bg-gradient-to-br from-accent/10 to-background rounded-lg border border-accent/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{contest.icon}</span>
                        <span className="font-medium text-sm">{contest.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {getContestTimeRemaining(contest.end_date)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={
                        contest.rank === 1 ? 'bg-yellow-500 text-yellow-950' :
                        contest.rank === 2 ? 'bg-gray-400 text-gray-950' :
                        contest.rank === 3 ? 'bg-amber-600 text-amber-950' :
                        'bg-muted text-muted-foreground'
                      }>
                        {contest.rank === 1 ? '1st' : contest.rank === 2 ? '2nd' : contest.rank === 3 ? '3rd' : `${contest.rank}th`} place
                      </Badge>
                      {contest.rank !== 1 && contest.gap !== undefined && contest.gap > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-accent" />
                          {contest.gap} {getMetricLabel(contest.metric_type)} to 1st
                        </span>
                      )}
                    </div>
                    {contest.prize_value > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <Gift className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Prize: ${contest.prize_value.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pit Wagers Section */}
          {(newWagerEvents.length > 0 || pendingWagers.length > 0 || recentResults.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-foreground">The Pit</h3>
              </div>
              
              {/* New Wager Events */}
              {newWagerEvents.length > 0 && (
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                    🔥 {newWagerEvents.length} Active Wager{newWagerEvents.length > 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1">
                    {newWagerEvents.map(event => (
                      <div key={event.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{event.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.status === 'locked' ? 'Locked' : getTimeRemaining(event.wagers_close_at)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Wagers */}
              {pendingWagers.length > 0 && (
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Your Active Wagers
                  </p>
                  <div className="space-y-1">
                    {pendingWagers.map(wager => (
                      <div key={wager.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{wager.event_title}</span>
                        <span className="text-xs text-muted-foreground">
                          {wager.points_wagered} pts → {wager.potential_payout} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Results */}
              {recentResults.length > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Results</p>
                  <div className="space-y-1">
                    {recentResults.map(wager => (
                      <div key={wager.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{wager.event_title}</span>
                        {wager.status === 'won' ? (
                          <Badge className="bg-green-500 text-xs">+{wager.points_won} pts</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">-{wager.points_wagered} pts</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
