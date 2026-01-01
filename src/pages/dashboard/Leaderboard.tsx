import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { WeeklyLeaderboardTable } from '@/components/dashboard/WeeklyLeaderboardTable';
import { CommentsSection } from '@/components/dashboard/CommentsSection';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { startOfWeek, endOfWeek, format } from 'date-fns';

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

interface WeeklyLeaderboardEntry {
  rank: number;
  name: string;
  userId: string;
  sales: number;
  leads: number;
  closedDeals: number;
  pointsEarned: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  // Get current week range
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // First, get user IDs that are sales reps or admins (not canvassers)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['user', 'admin']);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setLoading(false);
        return;
      }

      // Create a set of eligible user IDs
      const eligibleUserIds = new Set(rolesData?.map(r => r.user_id) || []);

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

      // Get latest metric per user, filtering to only eligible users (sales reps/admins)
      const latestByUser = new Map<string, {
        metricId: string;
        points: number;
        sales: number;
        yearlyGoal: number;
        salesRank: string;
        displayName: string | null;
      }>();
      
      for (const item of metricsData) {
        // Skip if user_id exists but is not eligible (is a canvasser)
        if (item.user_id && !eligibleUserIds.has(item.user_id)) {
          continue;
        }
        
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

  useEffect(() => {
    const fetchWeeklyLeaderboard = async () => {
      // First, get user IDs that are sales reps or admins (not canvassers)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['user', 'admin']);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setWeeklyLoading(false);
        return;
      }

      const eligibleUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      // Fetch weekly metrics for current week
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_user_metrics')
        .select('user_id, sales, leads, closed_deals, points_earned')
        .eq('week_start', weekStartStr);

      if (weeklyError) {
        console.error('Error fetching weekly leaderboard:', weeklyError);
        setWeeklyLoading(false);
        return;
      }

      if (!weeklyData || weeklyData.length === 0) {
        setWeeklyEntries([]);
        setWeeklyLoading(false);
        return;
      }

      // Filter to eligible users only
      const filteredWeekly = weeklyData.filter(w => eligibleUserIds.has(w.user_id));

      // Fetch profiles for names
      const userIds = filteredWeekly.map(w => w.user_id);
      const { data: profilesData } = userIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] };

      // Also fetch display names from user_metrics
      const { data: metricsData } = userIds.length > 0
        ? await supabase.from('user_metrics').select('user_id, display_name').in('user_id', userIds)
        : { data: [] };

      const profilesMap = new Map<string, string | null>(
        profilesData?.map((p) => [p.id, p.full_name] as [string, string | null]) || []
      );

      const displayNameMap = new Map<string, string | null>();
      metricsData?.forEach(m => {
        if (m.display_name && !displayNameMap.has(m.user_id)) {
          displayNameMap.set(m.user_id, m.display_name);
        }
      });

      // Convert to array and sort by weekly sales
      const sorted = filteredWeekly
        .map(w => ({
          userId: w.user_id,
          sales: Number(w.sales) || 0,
          leads: Number(w.leads) || 0,
          closedDeals: Number(w.closed_deals) || 0,
          pointsEarned: Number(w.points_earned) || 0,
          name: displayNameMap.get(w.user_id) || profilesMap.get(w.user_id) || 'Unknown User',
        }))
        .sort((a, b) => b.sales - a.sales)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setWeeklyEntries(sorted);
      setWeeklyLoading(false);
    };

    fetchWeeklyLeaderboard();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-heading text-foreground">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">See how you rank against the team</p>
      </div>

      <Tabs defaultValue="ytd" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ytd">Year to Date</TabsTrigger>
          <TabsTrigger value="weekly">This Week</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ytd" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <LeaderboardTable entries={entries} currentUserId={user?.id} />
          )}
        </TabsContent>
        
        <TabsContent value="weekly" className="mt-4">
          <div className="mb-3 text-sm text-muted-foreground">
            Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>
          {weeklyLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <WeeklyLeaderboardTable entries={weeklyEntries} currentUserId={user?.id} />
          )}
        </TabsContent>
      </Tabs>

      <CommentsSection />
    </div>
  );
}
