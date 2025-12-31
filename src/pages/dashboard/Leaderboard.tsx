import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { CommentsSection } from '@/components/dashboard/CommentsSection';
import { Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
  sales: number;
  yearlyGoal: number;
  salesRank: string;
  contestsWon: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Fetch metrics including display_name for test users
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_metrics')
        .select('id, user_id, display_name, points, sales, yearly_goal, sales_rank, metric_date')
        .order('metric_date', { ascending: false });

      if (metricsError) {
        console.error('Error fetching leaderboard:', metricsError);
        setLoading(false);
        return;
      }

      if (!metricsData || metricsData.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Get latest metric per user (use metric id for test users without user_id)
      const latestByUser = new Map<string, {
        metricId: string;
        points: number;
        sales: number;
        yearlyGoal: number;
        salesRank: string;
        displayName: string | null;
      }>();
      
      for (const item of metricsData) {
        // Use user_id if available, otherwise use metric id as key
        const key = item.user_id || `metric_${item.id}`;
        if (!latestByUser.has(key)) {
          latestByUser.set(key, {
            metricId: item.id,
            points: Number(item.points) || 0,
            sales: Number(item.sales) || 0,
            yearlyGoal: Number(item.yearly_goal) || 0,
            salesRank: item.sales_rank || 'SR1',
            displayName: item.display_name,
          });
        }
      }

      // Fetch profiles only for real user_ids (not null)
      const realUserIds = Array.from(latestByUser.keys()).filter(id => !id.startsWith('metric_'));
      const { data: profilesData } = realUserIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name').in('id', realUserIds)
        : { data: [] };

      const profilesMap = new Map<string, string | null>(
        profilesData?.map((p) => [p.id, p.full_name] as [string, string | null]) || []
      );

      // Fetch contest wins
      const { data: contestWinsData } = await supabase
        .from('contests')
        .select('winner_user_id')
        .not('winner_user_id', 'is', null);

      const contestWinsMap = new Map<string, number>();
      contestWinsData?.forEach(c => {
        const current = contestWinsMap.get(c.winner_user_id!) || 0;
        contestWinsMap.set(c.winner_user_id!, current + 1);
      });

      // Convert to array and sort by sales (YTD Revenue)
      const sorted = Array.from(latestByUser.entries())
        .map(([userId, data]) => ({
          userId,
          points: data.points,
          sales: data.sales,
          yearlyGoal: data.yearlyGoal,
          salesRank: data.salesRank,
          name: data.displayName || profilesMap.get(userId) || 'Unknown User',
          contestsWon: contestWinsMap.get(userId) || 0,
        }))
        .sort((a, b) => b.sales - a.sales)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setEntries(sorted);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-heading text-foreground">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">See how you rank against the team</p>
      </div>

      <LeaderboardTable entries={entries} currentUserId={user?.id} />

      <CommentsSection />
    </div>
  );
}
