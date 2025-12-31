import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock, Flame, Gift, Star } from 'lucide-react';
import { differenceInDays, differenceInHours, isPast } from 'date-fns';

interface Contest {
  id: string;
  title: string;
  icon: string;
  start_date: string;
  end_date: string;
  metric_type: string;
  is_active: boolean;
  prize_value: number;
  prize_description: string;
}

interface UserRanking {
  contestId: string;
  rank: number;
  value: number;
  gap: number;
  leaderName: string;
  leaderValue: number;
}

// Contest point system
const CONTEST_POINTS = {
  1: 100,
  2: 50,
  3: 25,
};

export function ActiveContestWidget() {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [rankings, setRankings] = useState<Record<string, UserRanking>>({});
  const [loading, setLoading] = useState(true);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  // Fetch user's display name from profile or user_metrics
  const fetchUserDisplayName = async (userId: string) => {
    // First try profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileData?.full_name) {
      setUserDisplayName(profileData.full_name);
      return profileData.full_name;
    }

    // Fallback to user_metrics display_name
    const { data: metricsData } = await supabase
      .from('user_metrics')
      .select('display_name')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (metricsData?.display_name) {
      setUserDisplayName(metricsData.display_name);
      return metricsData.display_name;
    }

    return null;
  };

  const fetchActiveContests = async () => {
    if (!user) return;
    
    // Get user's display name first
    const displayName = await fetchUserDisplayName(user.id);
    
    // Get active contests
    const { data: contestsData } = await supabase
      .from('contests')
      .select('*')
      .eq('is_active', true);

    if (!contestsData) {
      setLoading(false);
      return;
    }

    // Filter to only active (in-progress) contests
    const activeContests = contestsData.filter(c => {
      const now = new Date();
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      return now >= start && now <= end;
    });

    setContests(activeContests);

    // Get user rankings for each contest
    for (const contest of activeContests) {
      await fetchUserRanking(contest, user.id, displayName);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchActiveContests();
  }, [user]);

  // Real-time subscription for contest changes
  useEffect(() => {
    const channel = supabase
      .channel('contests-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contests'
      }, () => {
        fetchActiveContests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserRanking = async (contest: Contest, userId: string, displayName: string | null) => {
    const { data: metricsData } = await supabase
      .from('user_metrics')
      .select('user_id, display_name, sales, leads, closed_deals')
      .order('metric_date', { ascending: false });

    if (!metricsData || metricsData.length === 0) return;

    // Get latest per user - use display_name as unique key for ALL users (not just those with user_id)
    const latestByDisplayName = new Map<string, { userId: string | null; name: string; value: number }>();
    for (const item of metricsData) {
      const key = item.display_name || 'Unknown';
      if (!latestByDisplayName.has(key)) {
        let value = 0;
        if (contest.metric_type === 'sales') {
          value = Number(item.sales) || 0;
        } else if (contest.metric_type === 'leads') {
          value = Number(item.leads) || 0;
        } else {
          value = Number(item.closed_deals) || 0;
        }
        latestByDisplayName.set(key, {
          userId: item.user_id,
          name: item.display_name || 'Unknown',
          value,
        });
      }
    }

    const sorted = Array.from(latestByDisplayName.entries())
      .map(([key, data]) => ({ displayNameKey: key, ...data }))
      .sort((a, b) => b.value - a.value);

    // Find user by display_name first (more reliable), then fallback to user_id
    let userIndex = -1;
    if (displayName) {
      userIndex = sorted.findIndex(s => s.name.toLowerCase() === displayName.toLowerCase());
    }
    if (userIndex === -1) {
      userIndex = sorted.findIndex(s => s.userId === userId);
    }

    const userEntry = sorted[userIndex];
    const leader = sorted[0];

    if (userEntry) {
      setRankings(prev => ({
        ...prev,
        [contest.id]: {
          contestId: contest.id,
          rank: userIndex + 1,
          value: userEntry.value,
          gap: leader ? leader.value - userEntry.value : 0,
          leaderName: leader?.name || '',
          leaderValue: leader?.value || 0,
        }
      }));
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    if (isPast(end)) return 'Ended';
    
    const days = differenceInDays(end, now);
    if (days > 0) return `${days}d left`;
    
    const hours = differenceInHours(end, now);
    return `${hours}h left`;
  };

  const getContestProgress = (contest: Contest) => {
    const start = new Date(contest.start_date);
    const end = new Date(contest.end_date);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return (elapsed / total) * 100;
  };

  const getMotivationalMessage = (rank: number, gap: number, metricType: string) => {
    if (rank === 1) return "You're in the lead! Keep it up! 🔥";
    if (rank === 2) return "So close! Push to take the top spot!";
    if (rank === 3) return "On the podium! One more push!";
    
    const gapText = metricType === 'sales' 
      ? `$${gap.toLocaleString()}` 
      : gap.toLocaleString();
    return `${gapText} behind the leader. Time to make your move!`;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-950';
    if (rank === 2) return 'bg-gray-400 text-gray-950';
    if (rank === 3) return 'bg-amber-600 text-amber-950';
    return 'bg-muted text-muted-foreground';
  };

  const formatValue = (value: number, metricType: string) => {
    if (metricType === 'sales') {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };


  const getContestPoints = (rank: number) => {
    return CONTEST_POINTS[rank as keyof typeof CONTEST_POINTS] || 0;
  };

  if (loading || contests.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-accent/10 via-background to-background border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-accent" />
          Active Contests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contests.map((contest) => {
          const ranking = rankings[contest.id];
          const potentialPoints = ranking ? getContestPoints(ranking.rank) : 0;
          
          return (
            <div key={contest.id} className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{contest.icon || '🏆'}</span>
                  <span className="font-medium text-foreground">{contest.title}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {getTimeRemaining(contest.end_date)}
                </div>
              </div>
              
              {ranking && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getRankBadgeColor(ranking.rank)}>
                        {ranking.rank === 1 ? '1st' : ranking.rank === 2 ? '2nd' : ranking.rank === 3 ? '3rd' : `${ranking.rank}th`} place
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatValue(ranking.value, contest.metric_type)}
                      </span>
                    </div>
                    {ranking.rank !== 1 && ranking.gap > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="h-3.5 w-3.5 text-accent" />
                        <span className="text-muted-foreground">
                          {formatValue(ranking.gap, contest.metric_type)} to 1st
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Progress value={getContestProgress(contest)} className="h-1.5" />
                  
                  <div className="flex items-start gap-2 text-sm bg-accent/10 rounded-lg p-2">
                    <Flame className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {getMotivationalMessage(ranking.rank, ranking.gap, contest.metric_type)}
                    </p>
                  </div>

                  {/* Prize Section */}
                  {contest.prize_value > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          Prize: ${contest.prize_value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Contest Points */}
                  {potentialPoints > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-muted-foreground">
                        {ranking.rank === 1 ? 'Holding' : 'Could earn'} <span className="font-semibold text-yellow-600 dark:text-yellow-400">+{potentialPoints} pts</span> for {ranking.rank === 1 ? '1st' : ranking.rank === 2 ? '2nd' : '3rd'} place!
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}