import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { WeeklyCanvasserLeaderboardTable, type WeeklyCanvasserEntry } from './WeeklyCanvasserLeaderboardTable';
import { fetchCanvasserLeaderboardByDateRange } from '@/lib/fetchCanvasserLeaderboardData';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';

interface CanvasserDetail {
  metricId: string;
  realUserId: string | null;
  name: string;
  leadsSet: number;
  leadsClosed: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  conversationsHad: number;
  notInterested: number;
  hoursWorked: number;
  doorsKnocked: number;
  points: number;
}

interface ScoreboardCanvasserLeaderboardProps {
  ytdCanvasserDetails: CanvasserDetail[];
}

export function ScoreboardCanvasserLeaderboard({ ytdCanvasserDetails }: ScoreboardCanvasserLeaderboardProps) {
  const [timeFrame, setTimeFrame] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const navigateWeek = (dir: 'prev' | 'next') => setSelectedDate(dir === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
  const navigateMonth = (dir: 'prev' | 'next') => setSelectedDate(dir === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));

  const ytdEntries: WeeklyCanvasserEntry[] = ytdCanvasserDetails
    .sort((a, b) => b.points - a.points)
    .map((c, i) => ({
      rank: i + 1,
      name: c.name,
      userId: c.realUserId || c.metricId,
      leadsSet: c.leadsSet,
      leadsWithDamage: c.leadsWithDamage,
      leadsWithoutDamage: c.leadsWithoutDamage,
      leadsClosed: c.leadsClosed,
      conversationsHad: c.conversationsHad,
      notInterested: c.notInterested,
      hoursWorked: c.hoursWorked,
      doorsKnocked: c.doorsKnocked,
      pointsEarned: c.points,
    }));

  useEffect(() => {
    if (timeFrame === 'yearly') return;
    const fetchData = async () => {
      setLoading(true);

      const { data: activeProfiles } = await supabase.from('profiles').select('id, hidden_from_leaderboard').eq('is_archived', false);
      const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);
      const hiddenUserIds = new Set(activeProfiles?.filter(p => (p as any).hidden_from_leaderboard).map(p => p.id) || []);

      let queryStart: string, queryEnd: string | null = null;
      if (timeFrame === 'weekly') {
        queryStart = format(weekStart, 'yyyy-MM-dd');
      } else {
        queryStart = format(monthStart, 'yyyy-MM-dd');
        queryEnd = format(monthEnd, 'yyyy-MM-dd');
      }

      const query = supabase
        .from('weekly_canvasser_metrics')
        .select('user_id, leads_set, leads_with_damage, leads_without_damage, leads_closed, conversations_had, not_interested, cancelled_leads, hours_worked, doors_knocked, points_earned');

      if (timeFrame === 'weekly') {
        query.eq('week_start', queryStart);
      } else {
        query.gte('week_start', queryStart).lte('week_start', queryEnd!);
      }

      const { data: weeklyData } = await query;
      if (!weeklyData || weeklyData.length === 0) { setWeeklyEntries([]); setLoading(false); return; }

      // Aggregate by user
      const aggregated = new Map<string, { leadsSet: number; leadsWithDamage: number; leadsWithoutDamage: number; leadsClosed: number; conversationsHad: number; notInterested: number; cancelledLeads: number; hoursWorked: number; doorsKnocked: number; pointsEarned: number }>();
      weeklyData.forEach(w => {
        if (!activeUserIds.has(w.user_id) || hiddenUserIds.has(w.user_id)) return;
        const e = aggregated.get(w.user_id) || { leadsSet: 0, leadsWithDamage: 0, leadsWithoutDamage: 0, leadsClosed: 0, conversationsHad: 0, notInterested: 0, cancelledLeads: 0, hoursWorked: 0, doorsKnocked: 0, pointsEarned: 0 };
        aggregated.set(w.user_id, {
          leadsSet: e.leadsSet + (w.leads_set || 0),
          leadsWithDamage: e.leadsWithDamage + (w.leads_with_damage || 0),
          leadsWithoutDamage: e.leadsWithoutDamage + (w.leads_without_damage || 0),
          leadsClosed: e.leadsClosed + (w.leads_closed || 0),
          conversationsHad: e.conversationsHad + (w.conversations_had || 0),
          notInterested: e.notInterested + (w.not_interested || 0),
          cancelledLeads: e.cancelledLeads + (w.cancelled_leads || 0),
          hoursWorked: e.hoursWorked + (Number(w.hours_worked) || 0),
          doorsKnocked: e.doorsKnocked + (w.doors_knocked || 0),
          pointsEarned: e.pointsEarned + (Number(w.points_earned) || 0),
        });
      });

      const userIds = Array.from(aggregated.keys());
      const { data: metricsData } = userIds.length > 0
        ? await supabase.from('canvasser_metrics').select('user_id, display_name, canvasser_rank').in('user_id', userIds)
        : { data: [] };

      const displayNameMap = new Map<string, string>();
      const rankMap = new Map<string, string>();
      metricsData?.forEach(m => {
        if (m.display_name && !displayNameMap.has(m.user_id)) displayNameMap.set(m.user_id, m.display_name);
        if ((m as any).canvasser_rank && !rankMap.has(m.user_id)) rankMap.set(m.user_id, (m as any).canvasser_rank);
      });

      const sorted = Array.from(aggregated.entries())
        .filter(([_, d]) => d.pointsEarned > 0 || d.leadsSet > 0 || d.leadsClosed > 0)
        .sort((a, b) => b[1].pointsEarned - a[1].pointsEarned)
        .map(([userId, d], i) => ({
          rank: i + 1,
          userId,
          name: displayNameMap.get(userId) || 'Unknown',
          canvasserRank: rankMap.get(userId),
          ...d,
        }));

      setWeeklyEntries(sorted);
      setLoading(false);
    };
    fetchData();
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
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <WeeklyCanvasserLeaderboardTable entries={displayEntries} showHours />}
        </TabsContent>
        <TabsContent value="monthly">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <WeeklyCanvasserLeaderboardTable entries={displayEntries} showHours />}
        </TabsContent>
        <TabsContent value="yearly">
          <WeeklyCanvasserLeaderboardTable entries={displayEntries} showHours />
        </TabsContent>
      </Tabs>
    </div>
  );
}
