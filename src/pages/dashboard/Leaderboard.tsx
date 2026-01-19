import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { WeeklyLeaderboardTable } from '@/components/dashboard/WeeklyLeaderboardTable';
import { CommentsSection } from '@/components/dashboard/CommentsSection';
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  format, 
  addWeeks, 
  subWeeks,
  addMonths,
  subMonths
} from 'date-fns';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
  approvedRevenue: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  contestsWon: number;
  contestPoints: number;
  wagerPoints: number;
  collections: number;
}

interface WeeklyLeaderboardEntry {
  rank: number;
  name: string;
  userId: string;
  approvedRevenue: number;
  collections: number;
  leads: number;
  closedDeals: number;
  pointsEarned: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // Get selected week range
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday
  
  // Get selected month range
  const monthStart = startOfMonth(selectedMonthDate);
  const monthEnd = endOfMonth(selectedMonthDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonthDate(direction === 'prev' ? subMonths(selectedMonthDate, 1) : addMonths(selectedMonthDate, 1));
  };

  // Subscribe to realtime changes on user_metrics to auto-refresh when data changes
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_metrics',
        },
        () => {
          // Trigger a refresh when user_metrics changes
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      // Fetch metrics from the leaderboard view (bypasses RLS for all users visibility)
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_metrics_leaderboard')
        .select('id, user_id, display_name, points, approved_revenue, closed_deals, sales_rank, metric_date, self_generated_deals')
        .order('metric_date', { ascending: false });

      // Also fetch canvass deals, canvass leads, self-gen leads, and approved_revenue from user_metrics for calculation
      // Order by metric_date and updated_at for deterministic "latest" selection
      const { data: extendedMetricsData } = await supabase
        .from('user_metrics')
        .select('user_id, canvass_deals_closed, canvass_leads, self_generated_leads, contest_points, wager_points, approved_revenue, metric_date, updated_at')
        .order('metric_date', { ascending: false })
        .order('updated_at', { ascending: false });
      // Fetch collections aggregated from weekly_user_metrics
      const { data: collectionsData } = await supabase
        .from('weekly_user_metrics')
        .select('user_id, collections');

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

      // Create extended metrics map (latest per user) - includes points breakdown and canvass data
      const extendedMetricsMap = new Map<string, { 
        contestPoints: number; 
        wagerPoints: number; 
        approvedRevenue: number;
        canvassDealsClose: number; 
        canvassLeads: number;
        selfGeneratedLeads: number;
      }>();
      extendedMetricsData?.forEach(p => {
        if (p.user_id && !extendedMetricsMap.has(p.user_id)) {
          extendedMetricsMap.set(p.user_id, {
            contestPoints: Number(p.contest_points) || 0,
            wagerPoints: Number(p.wager_points) || 0,
            approvedRevenue: Number(p.approved_revenue) || 0,
            canvassDealsClose: Number(p.canvass_deals_closed) || 0,
            canvassLeads: Number(p.canvass_leads) || 0,
            selfGeneratedLeads: Number(p.self_generated_leads) || 0,
          });
        }
      });

      // Aggregate collections per user from weekly data
      const collectionsMap = new Map<string, number>();
      collectionsData?.forEach(c => {
        if (c.user_id) {
          const current = collectionsMap.get(c.user_id) || 0;
          collectionsMap.set(c.user_id, current + (Number(c.collections) || 0));
        }
      });

      // Fetch yearly goals from user_metrics separately
      // Order by metric_date and updated_at for deterministic "latest" selection
      const { data: goalsData } = await supabase
        .from('user_metrics')
        .select('user_id, yearly_goal, metric_date, updated_at')
        .order('metric_date', { ascending: false })
        .order('updated_at', { ascending: false });
      // Create goals map (latest goal per user)
      const goalsMap = new Map<string, number>();
      goalsData?.forEach(g => {
        if (g.user_id && !goalsMap.has(g.user_id)) {
          goalsMap.set(g.user_id, Number(g.yearly_goal) || 0);
        }
      });


      // Get latest metric per user, filtering to only eligible users (sales reps/admins)
      const latestByUser = new Map<string, {
        metricId: string;
        points: number;
        approvedRevenue: number;
        salesRank: string;
        displayName: string | null;
        selfGeneratedDeals: number;
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
            approvedRevenue: Number(item.approved_revenue) || 0,
            salesRank: item.sales_rank || 'SR1',
            displayName: item.display_name,
            selfGeneratedDeals: Number(item.self_generated_deals) || 0,
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

      // Fetch contest points from contest_victories
      const { data: victoriesData } = await supabase
        .from('contest_victories')
        .select('user_id, points_awarded');

      const contestPointsFromVictoriesMap = new Map<string, number>();
      victoriesData?.forEach(v => {
        const current = contestPointsFromVictoriesMap.get(v.user_id) || 0;
        contestPointsFromVictoriesMap.set(v.user_id, current + v.points_awarded);
      });

      // Convert to array and sort by approved revenue (YTD Revenue)
      const sorted = Array.from(latestByUser.entries())
        .map(([userId, data]) => {
          const extendedMetrics = extendedMetricsMap.get(userId) || { 
            contestPoints: 0, 
            wagerPoints: 0, 
            approvedRevenue: 0,
            canvassDealsClose: 0,
            canvassLeads: 0,
            selfGeneratedLeads: 0,
          };
          // Use approvedRevenue from the view (which now has correct value)
          // Fall back to extended metrics if available, then to the view data
          const approvedRevenue = data.approvedRevenue || extendedMetrics.approvedRevenue;
          
          // Calculate Total Contracts = Self-Gen Deals + Canvass Deals
          const calculatedClosedDeals = data.selfGeneratedDeals + extendedMetrics.canvassDealsClose;
          
          return {
            userId,
            points: data.points,
            approvedRevenue: approvedRevenue,
            closedDeals: calculatedClosedDeals,
            yearlyGoal: goalsMap.get(userId) || 0,
            salesRank: data.salesRank,
            name: data.displayName || profilesMap.get(userId) || 'Unknown User',
            contestsWon: contestWinsMap.get(userId) || 0,
            contestPoints: contestPointsFromVictoriesMap.get(userId) || extendedMetrics.contestPoints,
            wagerPoints: extendedMetrics.wagerPoints,
            collections: collectionsMap.get(userId) || 0,
          };
        })
        .sort((a, b) => b.approvedRevenue - a.approvedRevenue)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setEntries(sorted);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [refreshKey]);

  useEffect(() => {
    const fetchWeeklyLeaderboard = async () => {
      setWeeklyLoading(true);
      
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

      // Fetch weekly metrics for selected week
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');

      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_user_metrics')
        .select('user_id, approved_revenue, collections, leads, closed_deals, points_earned')
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

      // Convert to array and sort by weekly approved revenue
      const sorted = filteredWeekly
        .map(w => ({
          userId: w.user_id,
          approvedRevenue: Number(w.approved_revenue) || 0,
          collections: Number(w.collections) || 0,
          leads: Number(w.leads) || 0,
          closedDeals: Number(w.closed_deals) || 0,
          pointsEarned: Number(w.points_earned) || 0,
          name: displayNameMap.get(w.user_id) || profilesMap.get(w.user_id) || 'Unknown User',
        }))
        // Filter out users with zero metrics for weekly
        .filter(entry => 
          entry.approvedRevenue > 0 || 
          entry.collections > 0 || 
          entry.leads > 0 || 
          entry.closedDeals > 0 || 
          entry.pointsEarned > 0
        )
        .sort((a, b) => b.approvedRevenue - a.approvedRevenue)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setWeeklyEntries(sorted);
      setWeeklyLoading(false);
    };

    fetchWeeklyLeaderboard();
  }, [selectedDate]);

  // Fetch monthly leaderboard
  useEffect(() => {
    const fetchMonthlyLeaderboard = async () => {
      setMonthlyLoading(true);

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['user', 'admin']);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setMonthlyLoading(false);
        return;
      }

      const eligibleUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Filter weeks where week_start falls within this month
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_user_metrics')
        .select('user_id, approved_revenue, collections, leads, closed_deals, points_earned')
        .gte('week_start', monthStartStr)
        .lte('week_start', monthEndStr);

      if (weeklyError) {
        console.error('Error fetching monthly leaderboard:', weeklyError);
        setMonthlyLoading(false);
        return;
      }

      if (!weeklyData || weeklyData.length === 0) {
        setMonthlyEntries([]);
        setMonthlyLoading(false);
        return;
      }

      // Aggregate by user
      const aggregated = new Map<string, { approvedRevenue: number; collections: number; leads: number; closedDeals: number; pointsEarned: number }>();
      weeklyData.forEach(w => {
        if (!eligibleUserIds.has(w.user_id)) return;
        const existing = aggregated.get(w.user_id) || { approvedRevenue: 0, collections: 0, leads: 0, closedDeals: 0, pointsEarned: 0 };
        aggregated.set(w.user_id, {
          approvedRevenue: existing.approvedRevenue + (Number(w.approved_revenue) || 0),
          collections: existing.collections + (Number(w.collections) || 0),
          leads: existing.leads + (Number(w.leads) || 0),
          closedDeals: existing.closedDeals + (Number(w.closed_deals) || 0),
          pointsEarned: existing.pointsEarned + (Number(w.points_earned) || 0),
        });
      });

      const userIds = Array.from(aggregated.keys());
      const { data: profilesData } = userIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] };
      const { data: metricsData } = userIds.length > 0
        ? await supabase.from('user_metrics').select('user_id, display_name').in('user_id', userIds)
        : { data: [] };

      const profilesMap = new Map<string, string | null>(profilesData?.map(p => [p.id, p.full_name] as [string, string | null]) || []);
      const displayNameMap = new Map<string, string | null>();
      metricsData?.forEach(m => {
        if (m.display_name && !displayNameMap.has(m.user_id)) {
          displayNameMap.set(m.user_id, m.display_name);
        }
      });

      const sorted = Array.from(aggregated.entries())
        .map(([userId, data]) => ({
          userId,
          ...data,
          name: String(displayNameMap.get(userId) || profilesMap.get(userId) || 'Unknown User'),
        }))
        // Filter out users with zero metrics for monthly
        .filter(entry => 
          entry.approvedRevenue > 0 || 
          entry.collections > 0 || 
          entry.leads > 0 || 
          entry.closedDeals > 0 || 
          entry.pointsEarned > 0
        )
        .sort((a, b) => b.approvedRevenue - a.approvedRevenue)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setMonthlyEntries(sorted);
      setMonthlyLoading(false);
    };

    fetchMonthlyLeaderboard();
  }, [selectedMonthDate]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-heading text-foreground">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">See how you rank against the team</p>
      </div>

      <Tabs defaultValue="ytd" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="ytd">Year to Date</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
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

        <TabsContent value="monthly" className="mt-4">
          {/* Month Selector */}
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedMonthDate, 'MMMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedMonthDate}
                  onSelect={(date) => date && setSelectedMonthDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {monthlyLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <WeeklyLeaderboardTable entries={monthlyEntries} currentUserId={user?.id} />
          )}
        </TabsContent>
        
        <TabsContent value="weekly" className="mt-4">
          {/* Week Selector */}
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
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
