import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { LeaderboardTable } from './LeaderboardTable';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { FISCAL_YEAR } from '@/lib/constants';

interface UserDetail {
  metricId: string;
  realUserId: string | null;
  name: string;
  approvedRevenue: number;
  collections: number;
  points: number;
  leads: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  selfGeneratedDeals: number;
  canvassDealsClose: number;
  internetLeadsClosed: number;
}

interface ScoreboardSalesLeaderboardProps {
  ytdUserDetails: UserDetail[];
}

export function ScoreboardSalesLeaderboard({ ytdUserDetails }: ScoreboardSalesLeaderboardProps) {
  const [timeFrame, setTimeFrame] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklyEntries, setWeeklyEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const navigateWeek = (dir: 'prev' | 'next') => setSelectedDate(dir === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
  const navigateMonth = (dir: 'prev' | 'next') => setSelectedDate(dir === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));

  const ytdEntries = ytdUserDetails
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({
      rank: i + 1,
      name: u.name,
      userId: u.realUserId || u.metricId,
      points: u.points,
      approvedRevenue: u.approvedRevenue,
      closedDeals: u.closedDeals,
      yearlyGoal: u.yearlyGoal,
      salesRank: u.salesRank,
      contestsWon: 0,
      collections: u.collections,
      leads: u.leads,
      selfGeneratedDeals: u.selfGeneratedDeals,
    }));

  useEffect(() => {
    if (timeFrame === 'yearly') return;
    const fetchWeeklyMonthly = async () => {
      setLoading(true);
      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('role', ['user', 'admin']);
      const eligibleUserIds = new Set(rolesData?.map(r => r.user_id) || []);
      const { data: profilesForHidden } = await supabase.from('profiles').select('id, hidden_from_leaderboard, is_archived');
      const hiddenUserIds = new Set(profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []);

      let queryStart: string, queryEnd: string | null = null;
      if (timeFrame === 'weekly') {
        queryStart = format(weekStart, 'yyyy-MM-dd');
      } else {
        queryStart = format(monthStart, 'yyyy-MM-dd');
        queryEnd = format(monthEnd, 'yyyy-MM-dd');
      }

      const query = supabase
        .from('weekly_user_metrics')
        .select('user_id, approved_revenue, collections, leads, closed_deals, canvass_deals_closed, canvass_leads, self_generated_deals, internet_leads_closed, points_earned');

      if (timeFrame === 'weekly') {
        query.eq('week_start', queryStart);
      } else {
        query.gte('week_start', queryStart).lte('week_start', queryEnd!);
      }

      const { data: weeklyData } = await query;
      if (!weeklyData || weeklyData.length === 0) { setWeeklyEntries([]); setLoading(false); return; }

      // Aggregate by user
      const aggregated = new Map<string, { approvedRevenue: number; collections: number; leads: number; closedDeals: number; points: number; selfGeneratedDeals: number }>();
      weeklyData.forEach(w => {
        if (!eligibleUserIds.has(w.user_id) || hiddenUserIds.has(w.user_id)) return;
        const e = aggregated.get(w.user_id) || { approvedRevenue: 0, collections: 0, leads: 0, closedDeals: 0, points: 0, selfGeneratedDeals: 0 };
        aggregated.set(w.user_id, {
          approvedRevenue: e.approvedRevenue + (Number(w.approved_revenue) || 0),
          collections: e.collections + (Number(w.collections) || 0),
          leads: e.leads + (Number(w.leads) || 0) + (Number((w as any).canvass_leads) || 0),
          closedDeals: e.closedDeals + (Number(w.closed_deals) || 0) + (Number(w.canvass_deals_closed) || 0) + (Number((w as any).self_generated_deals) || 0),
          points: e.points + (Number(w.points_earned) || 0),
          selfGeneratedDeals: e.selfGeneratedDeals + (Number((w as any).self_generated_deals) || 0),
        });
      });

      const userIds = Array.from(aggregated.keys());
      const [profilesRes, metricsRes, contestWinsRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] },
        userIds.length > 0 ? supabase.from('user_metrics').select('user_id, display_name, sales_rank, yearly_goal').in('user_id', userIds) : { data: [] },
        supabase.from('contests').select('winner_user_id').not('winner_user_id', 'is', null),
      ]);

      const profilesMap = new Map<string, string | null>((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));
      const ytdMap = new Map<string, any>();
      (metricsRes.data || []).forEach((m: any) => { if (!ytdMap.has(m.user_id)) ytdMap.set(m.user_id, m); });
      const contestWinsMap = new Map<string, number>();
      (contestWinsRes.data || []).forEach((c: any) => { contestWinsMap.set(c.winner_user_id!, (contestWinsMap.get(c.winner_user_id!) || 0) + 1); });

      const sorted = Array.from(aggregated.entries())
        .map(([userId, data]) => {
          const ytd = ytdMap.get(userId) || {};
          return {
            userId, ...data,
            name: String(profilesMap.get(userId) || ytd.display_name || 'Unknown User'),
            salesRank: ytd.sales_rank || 'SR1',
            yearlyGoal: Number(ytd.yearly_goal) || 0,
            contestsWon: contestWinsMap.get(userId) || 0,
          };
        })
        .filter(e => e.approvedRevenue > 0 || e.collections > 0 || e.leads > 0 || e.closedDeals > 0 || e.points > 0)
        .sort((a, b) => b.approvedRevenue - a.approvedRevenue)
        .map((e, i) => ({ ...e, rank: i + 1, selfGeneratedDeals: e.selfGeneratedDeals || 0 }));

      setWeeklyEntries(sorted);
      setLoading(false);
    };
    fetchWeeklyMonthly();
  }, [timeFrame, selectedDate]);

  const displayEntries = timeFrame === 'yearly' ? ytdEntries : weeklyEntries;

  return (
    <div className="space-y-4">
      <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as any)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">YTD</TabsTrigger>
          </TabsList>
          {timeFrame !== 'yearly' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => timeFrame === 'weekly' ? navigateWeek('prev') : navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {timeFrame === 'weekly' ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}` : format(monthStart, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => timeFrame === 'weekly' ? navigateWeek('next') : navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <TabsContent value="weekly">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <LeaderboardTable entries={displayEntries} />}
        </TabsContent>
        <TabsContent value="monthly">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <LeaderboardTable entries={displayEntries} />}
        </TabsContent>
        <TabsContent value="yearly">
          <LeaderboardTable entries={displayEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
