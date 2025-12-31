import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock, Flame } from 'lucide-react';
import { differenceInDays, differenceInHours, isPast, isFuture } from 'date-fns';

interface Contest {
  id: string;
  title: string;
  icon: string;
  start_date: string;
  end_date: string;
  metric_type: string;
  is_active: boolean;
}

interface UserRanking {
  contestId: string;
  rank: number;
  value: number;
  gap: number;
  leaderName: string;
  leaderValue: number;
}

export function ActiveContestWidget() {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [rankings, setRankings] = useState<Record<string, UserRanking>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchActiveContests = async () => {
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
        await fetchUserRanking(contest, user.id);
      }

      setLoading(false);
    };

    fetchActiveContests();
  }, [user]);

  const fetchUserRanking = async (contest: Contest, userId: string) => {
    const { data: metricsData } = await supabase
      .from('user_metrics')
      .select('user_id, display_name, sales, leads, closed_deals')
      .order('metric_date', { ascending: false });

    if (!metricsData || metricsData.length === 0) return;

    // Get latest per user
    const latestByUser = new Map<string, { name: string; value: number }>();
    for (const item of metricsData) {
      const key = item.user_id || '';
      if (!latestByUser.has(key) && key) {
        let value = 0;
        if (contest.metric_type === 'sales') {
          value = Number(item.sales) || 0;
        } else if (contest.metric_type === 'leads') {
          value = Number(item.leads) || 0;
        } else {
          value = Number(item.closed_deals) || 0;
        }
        latestByUser.set(key, {
          name: item.display_name || 'Unknown',
          value,
        });
      }
    }

    const sorted = Array.from(latestByUser.entries())
      .map(([id, data]) => ({ userId: id, ...data }))
      .sort((a, b) => b.value - a.value);

    const userIndex = sorted.findIndex(s => s.userId === userId);
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
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}