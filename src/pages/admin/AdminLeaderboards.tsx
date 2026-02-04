import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { WeeklyLeaderboardTable } from '@/components/dashboard/WeeklyLeaderboardTable';
import { CanvasserLeaderboardTable } from '@/components/dashboard/CanvasserLeaderboardTable';
import { WeeklyCanvasserLeaderboardTable } from '@/components/dashboard/WeeklyCanvasserLeaderboardTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfYear,
  addWeeks, 
  subWeeks,
  addMonths,
  subMonths
} from 'date-fns';

interface SalesRepEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
  approvedRevenue: number;
  closedDeals: number;
  collections: number;
  yearlyGoal: number;
  salesRank: string;
  contestsWon: number;
}

interface WeeklySalesEntry {
  rank: number;
  name: string;
  userId: string;
  approvedRevenue: number;
  collections: number;
  leads: number;
  closedDeals: number;
  pointsEarned: number;
}

interface CanvasserEntry {
  rank: number;
  name: string;
  userId: string;
  yearlyGoal: number;
  leadsClosed: number;
  leadsSet: number;
  leadsWithDamage: number;
  points: number;
  amountUntilGoal: number;
  percentOfGoal: number;
  contestsWon: number;
}

interface WeeklyCanvasserEntry {
  rank: number;
  name: string;
  userId: string;
  canvasserRank?: string;
  leadsSet: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  leadsClosed: number;
  conversationsHad: number;
  notInterested: number;
  hoursWorked: number;
  doorsKnocked: number;
  pointsEarned: number;
}

export default function AdminLeaderboards() {
  const [timeFrame, setTimeFrame] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Sales rep states
  const [salesYtdEntries, setSalesYtdEntries] = useState<SalesRepEntry[]>([]);
  const [salesWeeklyEntries, setSalesWeeklyEntries] = useState<WeeklySalesEntry[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  
  // Canvasser states
  const [canvasserYtdEntries, setCanvasserYtdEntries] = useState<CanvasserEntry[]>([]);
  const [canvasserWeeklyEntries, setCanvasserWeeklyEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [canvasserLoading, setCanvasserLoading] = useState(true);

  // Subscribe to realtime changes on user_metrics and weekly_user_metrics
  useEffect(() => {
    const channel = supabase
      .channel('admin-leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_metrics' }, () => {
        setRefreshKey(prev => prev + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_user_metrics' }, () => {
        setRefreshKey(prev => prev + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canvasser_metrics' }, () => {
        setRefreshKey(prev => prev + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_canvasser_metrics' }, () => {
        setRefreshKey(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
  };

  // Fetch YTD sales rep leaderboard
  useEffect(() => {
    const fetchSalesYtd = async () => {
      setSalesLoading(true);
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['user', 'admin']);

      const eligibleUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      const { data: metricsData } = await supabase
        .from('user_metrics')
        .select('id, user_id, display_name, points, closed_deals, self_generated_deals, canvass_deals_closed, yearly_goal, sales_rank, metric_date, approved_revenue, collections, updated_at')
        .order('metric_date', { ascending: false })
        .order('updated_at', { ascending: false });

      if (!metricsData || metricsData.length === 0) {
        setSalesYtdEntries([]);
        setSalesLoading(false);
        return;
      }

      // Also fetch collections from weekly_user_metrics to aggregate YTD
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const { data: weeklyData } = await supabase
        .from('weekly_user_metrics')
        .select('user_id, collections')
        .gte('week_start', yearStart);

      // Aggregate collections by user
      const collectionsMap = new Map<string, number>();
      weeklyData?.forEach(w => {
        const current = collectionsMap.get(w.user_id) || 0;
        collectionsMap.set(w.user_id, current + (Number(w.collections) || 0));
      });

      const latestByUser = new Map<string, any>();
      for (const item of metricsData) {
        if (item.user_id && !eligibleUserIds.has(item.user_id)) continue;
        const key = item.user_id || `metric_${item.id}`;
        if (!latestByUser.has(key)) {
          latestByUser.set(key, {
            points: Number(item.points) || 0,
            approvedRevenue: Number(item.approved_revenue) || 0,
            closedDeals: (Number(item.self_generated_deals) || 0) + (Number(item.canvass_deals_closed) || 0),
            yearlyGoal: Number(item.yearly_goal) || 0,
            salesRank: item.sales_rank || 'SR1',
            displayName: item.display_name,
            collections: Number(item.collections) || collectionsMap.get(item.user_id) || 0,
          });
        }
      }

      const realUserIds = Array.from(latestByUser.keys()).filter(id => !id.startsWith('metric_'));
      const { data: profilesData } = realUserIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name').in('id', realUserIds)
        : { data: [] };

      const profilesMap = new Map<string, string | null>(profilesData?.map(p => [p.id, p.full_name] as [string, string | null]) || []);

      const { data: contestWinsData } = await supabase
        .from('contests')
        .select('winner_user_id')
        .not('winner_user_id', 'is', null);

      const contestWinsMap = new Map<string, number>();
      contestWinsData?.forEach(c => {
        const current = contestWinsMap.get(c.winner_user_id!) || 0;
        contestWinsMap.set(c.winner_user_id!, current + 1);
      });

      const sorted = Array.from(latestByUser.entries())
        .map(([userId, data]) => ({
          userId,
          points: data.points,
          approvedRevenue: data.approvedRevenue,
          closedDeals: data.closedDeals,
          yearlyGoal: data.yearlyGoal,
          salesRank: data.salesRank,
          collections: data.collections,
          name: data.displayName || profilesMap.get(userId) || 'Unknown User',
          contestsWon: contestWinsMap.get(userId) || 0,
        }))
        .sort((a, b) => b.approvedRevenue - a.approvedRevenue)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setSalesYtdEntries(sorted);
      setSalesLoading(false);
    };

    if (timeFrame === 'yearly') {
      fetchSalesYtd();
    }
  }, [timeFrame, refreshKey]);

  // Fetch weekly/monthly sales rep leaderboard
  useEffect(() => {
    const fetchSalesWeekly = async () => {
      setSalesLoading(true);

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['user', 'admin']);

      const eligibleUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      if (timeFrame === 'weekly') {
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const { data: weeklyData } = await supabase
          .from('weekly_user_metrics')
          .select('user_id, approved_revenue, collections, leads, closed_deals, canvass_deals_closed, points_earned')
          .eq('week_start', weekStartStr);

        if (!weeklyData || weeklyData.length === 0) {
          setSalesWeeklyEntries([]);
          setSalesLoading(false);
          return;
        }

        const filteredWeekly = weeklyData.filter(w => eligibleUserIds.has(w.user_id));
        const userIds = filteredWeekly.map(w => w.user_id);
        
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

        const sorted = filteredWeekly
          .map(w => ({
            userId: w.user_id,
            approvedRevenue: Number(w.approved_revenue) || 0,
            collections: Number(w.collections) || 0,
            leads: Number(w.leads) || 0,
            closedDeals: (Number(w.closed_deals) || 0) + (Number(w.canvass_deals_closed) || 0),
            pointsEarned: Number(w.points_earned) || 0,
            name: String(displayNameMap.get(w.user_id) || profilesMap.get(w.user_id) || 'Unknown User'),
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
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setSalesWeeklyEntries(sorted);
      } else if (timeFrame === 'monthly') {
        // Aggregate weekly data for the month
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

        const { data: weeklyData } = await supabase
          .from('weekly_user_metrics')
          .select('user_id, approved_revenue, collections, leads, closed_deals, canvass_deals_closed, points_earned')
          .gte('week_start', monthStartStr)
          .lte('week_start', monthEndStr);

        if (!weeklyData || weeklyData.length === 0) {
          setSalesWeeklyEntries([]);
          setSalesLoading(false);
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
            closedDeals: existing.closedDeals + (Number(w.closed_deals) || 0) + (Number(w.canvass_deals_closed) || 0),
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

        setSalesWeeklyEntries(sorted);
      }

      setSalesLoading(false);
    };

    if (timeFrame === 'weekly' || timeFrame === 'monthly') {
      fetchSalesWeekly();
    }
  }, [timeFrame, selectedDate, refreshKey]);

  // Fetch YTD canvasser leaderboard
  useEffect(() => {
    const fetchCanvasserYtd = async () => {
      setCanvasserLoading(true);

      const { data } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name, leads_set, leads_closed, leads_with_damage, yearly_goal, points')
        .order('leads_closed', { ascending: false });

      if (!data || data.length === 0) {
        setCanvasserYtdEntries([]);
        setCanvasserLoading(false);
        return;
      }

      // Fetch contests won for canvassers
      const { data: contestsData } = await supabase
        .from('contests')
        .select('winner_user_id, winner_2nd_user_id, winner_3rd_user_id')
        .eq('target_role', 'canvasser');

      const contestWins = new Map<string, number>();
      contestsData?.forEach((contest) => {
        if (contest.winner_user_id) {
          contestWins.set(contest.winner_user_id, (contestWins.get(contest.winner_user_id) || 0) + 1);
        }
        if (contest.winner_2nd_user_id) {
          contestWins.set(contest.winner_2nd_user_id, (contestWins.get(contest.winner_2nd_user_id) || 0) + 1);
        }
        if (contest.winner_3rd_user_id) {
          contestWins.set(contest.winner_3rd_user_id, (contestWins.get(contest.winner_3rd_user_id) || 0) + 1);
        }
      });

      const uniqueUsers = new Map<string, any>();
      data.forEach(entry => {
        if (!uniqueUsers.has(entry.user_id)) {
          uniqueUsers.set(entry.user_id, entry);
        }
      });

      // Sort by points descending (per system requirements for canvasser YTD)
      const sorted = Array.from(uniqueUsers.values())
        .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
        .map((entry, index) => {
          const yearlyGoal = entry.yearly_goal || 0;
          const leadsClosed = entry.leads_closed || 0;
          const percentOfGoal = yearlyGoal > 0 ? (leadsClosed / yearlyGoal) * 100 : 0;
          const amountUntilGoal = Math.max(0, yearlyGoal - leadsClosed);

          return {
            rank: index + 1,
            userId: entry.user_id,
            name: entry.display_name || 'Anonymous',
            yearlyGoal,
            leadsClosed,
            leadsSet: entry.leads_set || 0,
            leadsWithDamage: entry.leads_with_damage || 0,
            points: Number(entry.points) || 0,
            amountUntilGoal,
            percentOfGoal,
            contestsWon: contestWins.get(entry.user_id) || 0,
          };
        });

      setCanvasserYtdEntries(sorted);
      setCanvasserLoading(false);
    };

    if (timeFrame === 'yearly') {
      fetchCanvasserYtd();
    }
  }, [timeFrame, refreshKey]);

  // Fetch weekly/monthly canvasser leaderboard
  useEffect(() => {
    const fetchCanvasserWeekly = async () => {
      setCanvasserLoading(true);

      if (timeFrame === 'weekly') {
        // Fetch active profiles to filter archived users
        const { data: activeProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_archived', false);
        
        const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const { data: weeklyData } = await supabase
          .from('weekly_canvasser_metrics')
          .select('user_id, leads_set, leads_with_damage, leads_without_damage, leads_closed, conversations_had, not_interested, hours_worked, doors_knocked, points_earned')
          .eq('week_start', weekStartStr);

        if (!weeklyData || weeklyData.length === 0) {
          setCanvasserWeeklyEntries([]);
          setCanvasserLoading(false);
          return;
        }

        // Filter for active users only
        const filteredWeeklyData = weeklyData.filter(w => activeUserIds.has(w.user_id));

        const userIds = filteredWeeklyData.map(w => w.user_id);
        const { data: metricsData } = userIds.length > 0
          ? await supabase.from('canvasser_metrics').select('user_id, display_name, canvasser_rank').in('user_id', userIds)
          : { data: [] };

        const displayNameMap = new Map<string, string | null>();
        const rankMap = new Map<string, string | null>();
        metricsData?.forEach(m => {
          if (m.display_name && !displayNameMap.has(m.user_id)) {
            displayNameMap.set(m.user_id, m.display_name);
          }
          if (m.canvasser_rank && !rankMap.has(m.user_id)) {
            rankMap.set(m.user_id, m.canvasser_rank);
          }
        });

        const sorted = filteredWeeklyData
          .map(w => ({
            userId: w.user_id,
            leadsSet: Number(w.leads_set) || 0,
            leadsWithDamage: Number(w.leads_with_damage) || 0,
            leadsWithoutDamage: Number(w.leads_without_damage) || 0,
            leadsClosed: Number(w.leads_closed) || 0,
            conversationsHad: Number(w.conversations_had) || 0,
            notInterested: Number(w.not_interested) || 0,
            hoursWorked: Number(w.hours_worked) || 0,
            doorsKnocked: Number(w.doors_knocked) || 0,
            pointsEarned: Number(w.points_earned) || 0,
            name: displayNameMap.get(w.user_id) || 'Anonymous',
            canvasserRank: rankMap.get(w.user_id) || 'C1',
          }))
          // Filter out canvassers with zero metrics for weekly
          .filter(entry => 
            entry.leadsSet > 0 || 
            entry.leadsClosed > 0 || 
            entry.leadsWithDamage > 0 || 
            entry.doorsKnocked > 0 || 
            entry.pointsEarned > 0
          )
          .sort((a, b) => b.leadsClosed - a.leadsClosed)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setCanvasserWeeklyEntries(sorted);
      } else if (timeFrame === 'monthly') {
        // Fetch active profiles to filter archived users
        const { data: activeProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_archived', false);
        
        const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

        const { data: weeklyData } = await supabase
          .from('weekly_canvasser_metrics')
          .select('user_id, leads_set, leads_with_damage, leads_without_damage, leads_closed, conversations_had, not_interested, hours_worked, doors_knocked, points_earned')
          .gte('week_start', monthStartStr)
          .lte('week_start', monthEndStr);

        if (!weeklyData || weeklyData.length === 0) {
          setCanvasserWeeklyEntries([]);
          setCanvasserLoading(false);
          return;
        }

        // Aggregate by user - only for active users
        const aggregated = new Map<string, any>();
        weeklyData.forEach(w => {
          if (!activeUserIds.has(w.user_id)) return; // Skip archived users
          
          const existing = aggregated.get(w.user_id) || { 
            leadsSet: 0, leadsWithDamage: 0, leadsWithoutDamage: 0, leadsClosed: 0, 
            conversationsHad: 0, notInterested: 0, hoursWorked: 0, doorsKnocked: 0, pointsEarned: 0 
          };
          aggregated.set(w.user_id, {
            leadsSet: existing.leadsSet + (Number(w.leads_set) || 0),
            leadsWithDamage: existing.leadsWithDamage + (Number(w.leads_with_damage) || 0),
            leadsWithoutDamage: existing.leadsWithoutDamage + (Number(w.leads_without_damage) || 0),
            leadsClosed: existing.leadsClosed + (Number(w.leads_closed) || 0),
            conversationsHad: existing.conversationsHad + (Number(w.conversations_had) || 0),
            notInterested: existing.notInterested + (Number(w.not_interested) || 0),
            hoursWorked: existing.hoursWorked + (Number(w.hours_worked) || 0),
            doorsKnocked: existing.doorsKnocked + (Number(w.doors_knocked) || 0),
            pointsEarned: existing.pointsEarned + (Number(w.points_earned) || 0),
          });
        });

        const userIds = Array.from(aggregated.keys());
        const { data: metricsData } = userIds.length > 0
          ? await supabase.from('canvasser_metrics').select('user_id, display_name, canvasser_rank').in('user_id', userIds)
          : { data: [] };

        const displayNameMap = new Map<string, string | null>();
        const rankMap = new Map<string, string | null>();
        metricsData?.forEach(m => {
          if (m.display_name && !displayNameMap.has(m.user_id)) {
            displayNameMap.set(m.user_id, m.display_name);
          }
          if (m.canvasser_rank && !rankMap.has(m.user_id)) {
            rankMap.set(m.user_id, m.canvasser_rank);
          }
        });

        const sorted = Array.from(aggregated.entries())
          .map(([userId, data]) => ({
            userId,
            leadsSet: data.leadsSet,
            leadsWithDamage: data.leadsWithDamage,
            leadsWithoutDamage: data.leadsWithoutDamage,
            leadsClosed: data.leadsClosed,
            conversationsHad: data.conversationsHad,
            notInterested: data.notInterested,
            hoursWorked: data.hoursWorked,
            doorsKnocked: data.doorsKnocked,
            pointsEarned: data.pointsEarned,
            name: displayNameMap.get(userId) || 'Anonymous',
            canvasserRank: rankMap.get(userId) || 'C1',
          }))
          // Filter out canvassers with zero metrics for monthly
          .filter(entry => 
            entry.leadsSet > 0 || 
            entry.leadsClosed > 0 || 
            entry.leadsWithDamage > 0 || 
            entry.doorsKnocked > 0 || 
            entry.pointsEarned > 0
          )
          .sort((a, b) => b.leadsClosed - a.leadsClosed)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setCanvasserWeeklyEntries(sorted);
      }

      setCanvasserLoading(false);
    };

    if (timeFrame === 'weekly' || timeFrame === 'monthly') {
      fetchCanvasserWeekly();
    }
  }, [timeFrame, selectedDate, refreshKey]);

  const renderDateSelector = () => {
    if (timeFrame === 'yearly') return null;

    if (timeFrame === 'weekly') {
      return (
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
      );
    }

    if (timeFrame === 'monthly') {
      return (
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'MMMM yyyy')}
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
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">All Leaderboards</h1>
        <p className="text-muted-foreground mt-1">View sales rep and canvasser performance across all time periods</p>
      </div>

      {/* Time Frame Tabs */}
      <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as 'weekly' | 'monthly' | 'yearly')}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Year to Date</TabsTrigger>
        </TabsList>

        <TabsContent value={timeFrame} className="mt-4">
          {renderDateSelector()}

          {/* Sales Reps / Canvassers Tabs */}
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2 mb-4">
              <TabsTrigger value="sales">Sales Reps</TabsTrigger>
              <TabsTrigger value="canvassers">Canvassers</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              {salesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : timeFrame === 'yearly' ? (
                <LeaderboardTable entries={salesYtdEntries} />
              ) : (
                <WeeklyLeaderboardTable entries={salesWeeklyEntries} />
              )}
            </TabsContent>

            <TabsContent value="canvassers">
              {canvasserLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : timeFrame === 'yearly' ? (
                <CanvasserLeaderboardTable entries={canvasserYtdEntries} />
              ) : (
                <WeeklyCanvasserLeaderboardTable entries={canvasserWeeklyEntries} showHours={true} />
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
