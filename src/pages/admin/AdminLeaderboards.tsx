import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { WeeklyCanvasserLeaderboardTable, type WeeklyCanvasserEntry } from '@/components/dashboard/WeeklyCanvasserLeaderboardTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { fetchCanvasserLeaderboardByDateRange } from '@/lib/fetchCanvasserLeaderboardData';
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
import { FISCAL_YEAR } from '@/lib/constants';

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
  contestPoints?: number;
  wagerPoints?: number;
  leads?: number;
}


export default function AdminLeaderboards() {
  const [timeFrame, setTimeFrame] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Sales rep states
  const [salesYtdEntries, setSalesYtdEntries] = useState<SalesRepEntry[]>([]);
  const [salesWeeklyEntries, setSalesWeeklyEntries] = useState<SalesRepEntry[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  
  // Canvasser states
  const [canvasserYtdEntries, setCanvasserYtdEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [canvasserWeeklyEntries, setCanvasserWeeklyEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [canvasserLoading, setCanvasserLoading] = useState(true);

  // Supplementer states
  interface SupplementerLeaderboardEntry {
    rank: number;
    name: string;
    userId: string;
    points: number;
    rcvIncreased: number;
    moneyCollected: number;
    collectionRate: number;
    avgCocDays: number;
  }
  const [supplementerYtdEntries, setSupplementerYtdEntries] = useState<SupplementerLeaderboardEntry[]>([]);
  const [supplementerWeeklyEntries, setSupplementerWeeklyEntries] = useState<SupplementerLeaderboardEntry[]>([]);
  const [supplementerLoading, setSupplementerLoading] = useState(true);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplementer_metrics' }, () => {
        setRefreshKey(prev => prev + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_supplementer_metrics' }, () => {
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

      // Fetch profiles to check hidden_from_leaderboard and is_archived status
      const { data: profilesForHidden } = await supabase
        .from('profiles')
        .select('id, hidden_from_leaderboard, is_archived');
      
      const hiddenUserIds = new Set(
        profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []
      );

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

      // Also fetch collections from weekly_user_metrics to aggregate fiscal-YTD
      const fiscalYearStart = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');
      const { data: weeklyData } = await supabase
        .from('weekly_user_metrics')
        .select('user_id, collections')
        .gte('week_start', fiscalYearStart);

      // Aggregate collections by user
      const collectionsMap = new Map<string, number>();
      weeklyData?.forEach(w => {
        const current = collectionsMap.get(w.user_id) || 0;
        collectionsMap.set(w.user_id, current + (Number(w.collections) || 0));
      });

      const latestByUser = new Map<string, any>();
      for (const item of metricsData) {
        // Skip ineligible users and hidden users
        if (item.user_id && (!eligibleUserIds.has(item.user_id) || hiddenUserIds.has(item.user_id))) continue;
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

      // Fetch profiles to check hidden_from_leaderboard and is_archived status
      const { data: profilesForHidden } = await supabase
        .from('profiles')
        .select('id, hidden_from_leaderboard, is_archived');
      
      const hiddenUserIds = new Set(
        profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []
      );

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

        const filteredWeekly = weeklyData.filter(w => eligibleUserIds.has(w.user_id) && !hiddenUserIds.has(w.user_id));
        const userIds = filteredWeekly.map(w => w.user_id);
        
        // Fetch profiles, YTD enrichment, and contest wins in parallel
        const [profilesRes, metricsRes, contestWinsRes] = await Promise.all([
          userIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] },
          userIds.length > 0 ? supabase.from('user_metrics').select('user_id, display_name, sales_rank, yearly_goal, contest_points, wager_points').in('user_id', userIds) : { data: [] },
          supabase.from('contests').select('winner_user_id').not('winner_user_id', 'is', null),
        ]);

        const profilesMap = new Map<string, string | null>(
          (profilesRes.data || []).map((p: any) => [p.id, p.full_name] as [string, string | null])
        );
        const ytdMap = new Map<string, { displayName: string | null; salesRank: string; yearlyGoal: number; contestPoints: number; wagerPoints: number }>();
        (metricsRes.data || []).forEach((m: any) => {
          if (!ytdMap.has(m.user_id)) {
            ytdMap.set(m.user_id, {
              displayName: m.display_name,
              salesRank: m.sales_rank || 'SR1',
              yearlyGoal: Number(m.yearly_goal) || 0,
              contestPoints: Number(m.contest_points) || 0,
              wagerPoints: Number(m.wager_points) || 0,
            });
          }
        });
        const contestWinsMap = new Map<string, number>();
        (contestWinsRes.data || []).forEach((c: any) => {
          const current = contestWinsMap.get(c.winner_user_id!) || 0;
          contestWinsMap.set(c.winner_user_id!, current + 1);
        });

        const sorted = filteredWeekly
          .map(w => {
            const ytd = ytdMap.get(w.user_id) || { displayName: null, salesRank: 'SR1', yearlyGoal: 0, contestPoints: 0, wagerPoints: 0 };
            return {
              userId: w.user_id,
              approvedRevenue: Number(w.approved_revenue) || 0,
              collections: Number(w.collections) || 0,
              leads: Number(w.leads) || 0,
              closedDeals: (Number(w.closed_deals) || 0) + (Number(w.canvass_deals_closed) || 0),
              points: Number(w.points_earned) || 0,
              name: String(ytd.displayName || profilesMap.get(w.user_id) || 'Unknown User'),
              salesRank: ytd.salesRank,
              yearlyGoal: ytd.yearlyGoal,
              contestsWon: contestWinsMap.get(w.user_id) || 0,
              contestPoints: ytd.contestPoints,
              wagerPoints: ytd.wagerPoints,
            };
          })
          .filter(entry => 
            entry.approvedRevenue > 0 || entry.collections > 0 || entry.leads > 0 || 
            entry.closedDeals > 0 || entry.points > 0
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

        // Aggregate by user (excluding hidden users)
        const aggregated = new Map<string, { approvedRevenue: number; collections: number; leads: number; closedDeals: number; pointsEarned: number }>();
        weeklyData.forEach(w => {
          if (!eligibleUserIds.has(w.user_id) || hiddenUserIds.has(w.user_id)) return;
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

        // Fetch YTD enrichment data
        const [profilesRes, metricsRes, contestWinsRes] = await Promise.all([
          userIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] },
          userIds.length > 0 ? supabase.from('user_metrics').select('user_id, display_name, sales_rank, yearly_goal, contest_points, wager_points').in('user_id', userIds) : { data: [] },
          supabase.from('contests').select('winner_user_id').not('winner_user_id', 'is', null),
        ]);

        const profilesMap = new Map<string, string | null>(
          (profilesRes.data || []).map((p: any) => [p.id, p.full_name] as [string, string | null])
        );
        const ytdMap = new Map<string, { displayName: string | null; salesRank: string; yearlyGoal: number; contestPoints: number; wagerPoints: number }>();
        (metricsRes.data || []).forEach((m: any) => {
          if (!ytdMap.has(m.user_id)) {
            ytdMap.set(m.user_id, {
              displayName: m.display_name,
              salesRank: m.sales_rank || 'SR1',
              yearlyGoal: Number(m.yearly_goal) || 0,
              contestPoints: Number(m.contest_points) || 0,
              wagerPoints: Number(m.wager_points) || 0,
            });
          }
        });
        const contestWinsMap = new Map<string, number>();
        (contestWinsRes.data || []).forEach((c: any) => {
          const current = contestWinsMap.get(c.winner_user_id!) || 0;
          contestWinsMap.set(c.winner_user_id!, current + 1);
        });

        const sorted = Array.from(aggregated.entries())
          .map(([userId, data]) => {
            const ytd = ytdMap.get(userId) || { displayName: null, salesRank: 'SR1', yearlyGoal: 0, contestPoints: 0, wagerPoints: 0 };
            return {
              userId,
              approvedRevenue: data.approvedRevenue,
              collections: data.collections,
              leads: data.leads,
              closedDeals: data.closedDeals,
              points: data.pointsEarned,
              name: String(ytd.displayName || profilesMap.get(userId) || 'Unknown User'),
              salesRank: ytd.salesRank,
              yearlyGoal: ytd.yearlyGoal,
              contestsWon: contestWinsMap.get(userId) || 0,
              contestPoints: ytd.contestPoints,
              wagerPoints: ytd.wagerPoints,
            };
          })
          .filter(entry => 
            entry.approvedRevenue > 0 || entry.collections > 0 || entry.leads > 0 || 
            entry.closedDeals > 0 || entry.points > 0
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

      // Fetch profiles to check hidden_from_leaderboard and is_archived status
      const { data: profilesForHidden } = await supabase
        .from('profiles')
        .select('id, hidden_from_leaderboard, is_archived');
      
      const hiddenUserIds = new Set(
        profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []
      );

      // Fetch current canvasser role holders to exclude deleted users
      const { data: canvasserRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'canvasser');

      const currentCanvasserRoleIds = new Set(
        canvasserRoles?.map(r => r.user_id) || []
      );

      const { data } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name, leads_set, leads_closed, leads_with_damage, leads_without_damage, conversations_had, not_interested, cancelled_leads, doors_knocked, hours_worked, canvasser_rank, yearly_goal, points, contest_points, wager_points')
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

      // Filter out hidden users
      const uniqueUsers = new Map<string, any>();
      data.forEach(entry => {
        if (!uniqueUsers.has(entry.user_id) && !hiddenUserIds.has(entry.user_id) && currentCanvasserRoleIds.has(entry.user_id)) {
          uniqueUsers.set(entry.user_id, entry);
        }
      });

      // Sort by points descending (per system requirements for canvasser YTD)
      const sorted = Array.from(uniqueUsers.values())
        .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
        .map((entry, index) => {
          const leadsClosed = entry.leads_closed || 0;

          return {
            rank: index + 1,
            userId: entry.user_id,
            name: entry.display_name || 'Anonymous',
            leadsClosed,
            leadsSet: entry.leads_set || 0,
            leadsWithDamage: entry.leads_with_damage || 0,
            leadsWithoutDamage: (entry as any).leads_without_damage || 0,
            conversationsHad: (entry as any).conversations_had || 0,
            notInterested: (entry as any).not_interested || 0,
            cancelledLeads: (entry as any).cancelled_leads || 0,
            doorsKnocked: (entry as any).doors_knocked || 0,
            hoursWorked: Number((entry as any).hours_worked) || 0,
            canvasserRank: (entry as any).canvasser_rank || undefined,
            pointsEarned: Number(entry.points) || 0,
            contestPoints: Number((entry as any).contest_points) || 0,
            wagerPoints: Number((entry as any).wager_points) || 0,
          };
        });

      setCanvasserYtdEntries(sorted);
      setCanvasserLoading(false);
    };

    if (timeFrame === 'yearly') {
      fetchCanvasserYtd();
    }
  }, [timeFrame, refreshKey]);

  // Fetch YTD supplementer leaderboard
  useEffect(() => {
    const fetchSupplementerYtd = async () => {
      setSupplementerLoading(true);

      const { data: profilesForHidden } = await supabase
        .from('profiles')
        .select('id, hidden_from_leaderboard, is_archived');
      const hiddenUserIds = new Set(
        profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []
      );

      const { data: suppRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supplementer');
      const suppRoleIds = new Set(suppRoles?.map(r => r.user_id) || []);

      const { data } = await supabase
        .from('supplementer_metrics')
        .select('user_id, display_name, points, total_rcv_increased, total_money_collected, collection_rate, avg_coc_completion_days')
        .order('points', { ascending: false });

      if (!data || data.length === 0) {
        setSupplementerYtdEntries([]);
        setSupplementerLoading(false);
        return;
      }

      const sorted = data
        .filter(e => suppRoleIds.has(e.user_id) && !hiddenUserIds.has(e.user_id))
        .map((e, i) => ({
          rank: i + 1,
          userId: e.user_id,
          name: e.display_name || 'Unknown',
          points: Number(e.points) || 0,
          rcvIncreased: Number(e.total_rcv_increased) || 0,
          moneyCollected: Number(e.total_money_collected) || 0,
          collectionRate: Number(e.collection_rate) || 0,
          avgCocDays: Number(e.avg_coc_completion_days) || 0,
        }));

      setSupplementerYtdEntries(sorted);
      setSupplementerLoading(false);
    };

    if (timeFrame === 'yearly') {
      fetchSupplementerYtd();
    }
  }, [timeFrame, refreshKey]);

  // Fetch weekly/monthly supplementer leaderboard
  useEffect(() => {
    const fetchSupplementerWeekly = async () => {
      setSupplementerLoading(true);

      const { data: profilesForHidden } = await supabase
        .from('profiles')
        .select('id, hidden_from_leaderboard, is_archived');
      const hiddenUserIds = new Set(
        profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []
      );

      if (timeFrame === 'weekly') {
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const { data } = await supabase
          .from('weekly_supplementer_metrics')
          .select('user_id, display_name, points_earned, rcv_increased, money_collected, avg_coc_days')
          .eq('week_start', weekStartStr);

        if (!data || data.length === 0) {
          setSupplementerWeeklyEntries([]);
          setSupplementerLoading(false);
          return;
        }

        const sorted = data
          .filter(e => !hiddenUserIds.has(e.user_id))
          .filter(e => (Number(e.points_earned) || 0) > 0 || (Number(e.rcv_increased) || 0) > 0)
          .sort((a, b) => (Number(b.points_earned) || 0) - (Number(a.points_earned) || 0))
          .map((e, i) => {
            const rcv = Number(e.rcv_increased) || 0;
            const collected = Number(e.money_collected) || 0;
            return {
              rank: i + 1,
              userId: e.user_id,
              name: e.display_name || 'Unknown',
              points: Number(e.points_earned) || 0,
              rcvIncreased: rcv,
              moneyCollected: collected,
              collectionRate: rcv > 0 ? (collected / rcv) * 100 : 0,
              avgCocDays: Number(e.avg_coc_days) || 0,
            };
          });

        setSupplementerWeeklyEntries(sorted);
      } else if (timeFrame === 'monthly') {
        const monthStartStr = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        const monthEndStr = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

        const { data } = await supabase
          .from('weekly_supplementer_metrics')
          .select('user_id, display_name, points_earned, rcv_increased, money_collected, avg_coc_days')
          .gte('week_start', monthStartStr)
          .lte('week_start', monthEndStr);

        if (!data || data.length === 0) {
          setSupplementerWeeklyEntries([]);
          setSupplementerLoading(false);
          return;
        }

        const aggregated = new Map<string, { name: string; points: number; rcv: number; collected: number; cocDaysSum: number; cocDaysCount: number }>();
        data.forEach(w => {
          if (hiddenUserIds.has(w.user_id)) return;
          const existing = aggregated.get(w.user_id) || { name: w.display_name || 'Unknown', points: 0, rcv: 0, collected: 0, cocDaysSum: 0, cocDaysCount: 0 };
          const cocDays = Number(w.avg_coc_days) || 0;
          aggregated.set(w.user_id, {
            name: existing.name,
            points: existing.points + (Number(w.points_earned) || 0),
            rcv: existing.rcv + (Number(w.rcv_increased) || 0),
            collected: existing.collected + (Number(w.money_collected) || 0),
            cocDaysSum: existing.cocDaysSum + (cocDays > 0 ? cocDays : 0),
            cocDaysCount: existing.cocDaysCount + (cocDays > 0 ? 1 : 0),
          });
        });

        const sorted = Array.from(aggregated.entries())
          .filter(([_, d]) => d.points > 0 || d.rcv > 0)
          .sort((a, b) => b[1].points - a[1].points)
          .map(([userId, d], i) => ({
            rank: i + 1,
            userId,
            name: d.name,
            points: d.points,
            rcvIncreased: d.rcv,
            moneyCollected: d.collected,
            collectionRate: d.rcv > 0 ? (d.collected / d.rcv) * 100 : 0,
            avgCocDays: d.cocDaysCount > 0 ? d.cocDaysSum / d.cocDaysCount : 0,
          }));

        setSupplementerWeeklyEntries(sorted);
      }

      setSupplementerLoading(false);
    };

    if (timeFrame === 'weekly' || timeFrame === 'monthly') {
      fetchSupplementerWeekly();
    }
  }, [timeFrame, selectedDate, refreshKey]);

  // Fetch weekly/monthly canvasser leaderboard from daily_canvasser_metric_entries
  useEffect(() => {
    const fetchCanvasserWeekly = async () => {
      setCanvasserLoading(true);

      let startDate: string;
      let endDate: string;

      if (timeFrame === 'weekly') {
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
      } else if (timeFrame === 'monthly') {
        startDate = format(monthStart, 'yyyy-MM-dd');
        endDate = format(monthEnd, 'yyyy-MM-dd');
      } else {
        return;
      }

      const entries = await fetchCanvasserLeaderboardByDateRange(startDate, endDate);
      setCanvasserWeeklyEntries(entries);
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

          {/* Sales Reps / Canvassers / Supplementers Tabs */}
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
              <TabsTrigger value="sales">Sales Reps</TabsTrigger>
              <TabsTrigger value="canvassers">Canvassers</TabsTrigger>
              <TabsTrigger value="supplementers">Supplementers</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              {salesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : timeFrame === 'yearly' ? (
                <LeaderboardTable entries={salesYtdEntries} />
              ) : (
                <LeaderboardTable entries={salesWeeklyEntries} />
              )}
            </TabsContent>

            <TabsContent value="canvassers">
              {canvasserLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : timeFrame === 'yearly' ? (
                <WeeklyCanvasserLeaderboardTable entries={canvasserYtdEntries} showHours={true} />
              ) : (
                <WeeklyCanvasserLeaderboardTable entries={canvasserWeeklyEntries} showHours={true} />
              )}
            </TabsContent>

            <TabsContent value="supplementers">
              {supplementerLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rank</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground font-bold">Points</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">RCV Increased</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Collected</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Collection %</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Avg COC Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(timeFrame === 'yearly' ? supplementerYtdEntries : supplementerWeeklyEntries).length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No supplementer data available</td></tr>
                        ) : (
                          <>
                            {(timeFrame === 'yearly' ? supplementerYtdEntries : supplementerWeeklyEntries).map((entry) => (
                              <tr key={entry.userId} className="border-t border-border hover:bg-muted/30">
                                <td className="py-3 px-4 text-foreground">{entry.rank}</td>
                                <td className="py-3 px-4 text-foreground font-medium">{entry.name}</td>
                                <td className="py-3 px-4 text-right text-foreground font-bold">{entry.points}</td>
                                <td className="py-3 px-4 text-right text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(entry.rcvIncreased)}</td>
                                <td className="py-3 px-4 text-right text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(entry.moneyCollected)}</td>
                                <td className="py-3 px-4 text-right text-foreground">{entry.collectionRate.toFixed(1)}%</td>
                                <td className="py-3 px-4 text-right text-foreground">{entry.avgCocDays.toFixed(1)}</td>
                              </tr>
                            ))}
                            {/* Team Totals */}
                            {(() => {
                              const entries = timeFrame === 'yearly' ? supplementerYtdEntries : supplementerWeeklyEntries;
                              if (entries.length === 0) return null;
                              const totals = entries.reduce((acc, e) => ({
                                points: acc.points + e.points,
                                rcv: acc.rcv + e.rcvIncreased,
                                collected: acc.collected + e.moneyCollected,
                              }), { points: 0, rcv: 0, collected: 0 });
                              const avgRate = totals.rcv > 0 ? (totals.collected / totals.rcv) * 100 : 0;
                              const avgCoc = entries.reduce((s, e) => s + e.avgCocDays, 0) / entries.length;
                              return (
                                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                                  <td className="py-3 px-4" colSpan={2}>Team Totals</td>
                                  <td className="py-3 px-4 text-right font-bold">{totals.points}</td>
                                  <td className="py-3 px-4 text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(totals.rcv)}</td>
                                  <td className="py-3 px-4 text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(totals.collected)}</td>
                                  <td className="py-3 px-4 text-right">{avgRate.toFixed(1)}%</td>
                                  <td className="py-3 px-4 text-right">{avgCoc.toFixed(1)}</td>
                                </tr>
                              );
                            })()}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
