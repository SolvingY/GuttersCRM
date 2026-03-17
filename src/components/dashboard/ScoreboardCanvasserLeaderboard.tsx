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
  cancelledLeads: number;
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
      cancelledLeads: c.cancelledLeads,
      hoursWorked: c.hoursWorked,
      doorsKnocked: c.doorsKnocked,
      pointsEarned: c.points,
    }));

  useEffect(() => {
    if (timeFrame === 'yearly') return;
    const fetchData = async () => {
      setLoading(true);

      let startDate: string;
      let endDate: string;

      if (timeFrame === 'weekly') {
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
      } else {
        startDate = format(monthStart, 'yyyy-MM-dd');
        endDate = format(monthEnd, 'yyyy-MM-dd');
      }

      const entries = await fetchCanvasserLeaderboardByDateRange(startDate, endDate);
      setWeeklyEntries(entries);
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
