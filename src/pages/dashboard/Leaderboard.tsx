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
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Fetch metrics including the new columns
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_metrics')
        .select('user_id, points, sales, yearly_goal, sales_rank, metric_date')
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

      // Get latest metric per user
      const latestByUser = new Map<string, {
        points: number;
        sales: number;
        yearlyGoal: number;
        salesRank: string;
      }>();
      
      for (const item of metricsData) {
        if (!latestByUser.has(item.user_id)) {
          latestByUser.set(item.user_id, {
            points: Number(item.points) || 0,
            sales: Number(item.sales) || 0,
            yearlyGoal: Number(item.yearly_goal) || 0,
            salesRank: item.sales_rank || 'SR1',
          });
        }
      }

      // Fetch profiles for all user_ids
      const userIds = Array.from(latestByUser.keys());
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p.full_name]) || []);

      // Convert to array and sort by sales (YTD Revenue)
      const sorted = Array.from(latestByUser.entries())
        .map(([userId, data]) => ({
          userId,
          ...data,
          name: profilesMap.get(userId) || 'Unknown User',
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading text-foreground">Leaderboard</h2>
        <p className="text-muted-foreground">See how you rank against the team</p>
      </div>

      <LeaderboardTable entries={entries} currentUserId={user?.id} />

      <CommentsSection />
    </div>
  );
}
