import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CanvasserLeaderboardTable } from "@/components/dashboard/CanvasserLeaderboardTable";
import { WeeklyCanvasserLeaderboardTable } from "@/components/dashboard/WeeklyCanvasserLeaderboardTable";
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
} from "date-fns";

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
  leadsSet: number;
  leadsWithDamage: number;
  leadsClosed: number;
  shiftsWorked: number;
  pointsEarned: number;
}

export default function CanvasserLeaderboard() {
  const { user } = useAuth();
  const [ytdEntries, setYtdEntries] = useState<CanvasserEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  // Get selected week range
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  
  // Get selected month range
  const monthStart = startOfMonth(selectedMonthDate);
  const monthEnd = endOfMonth(selectedMonthDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonthDate(direction === 'prev' ? subMonths(selectedMonthDate, 1) : addMonths(selectedMonthDate, 1));
  };

  // Fetch YTD leaderboard
  useEffect(() => {
    const fetchYtdLeaderboard = async () => {
      setLoading(true);
      
      // Fetch canvasser metrics
      const { data: metricsData, error } = await supabase
        .from("canvasser_metrics")
        .select("user_id, display_name, leads_set, leads_closed, leads_with_damage, yearly_goal, points")
        .order("leads_closed", { ascending: false });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        setLoading(false);
        return;
      }

      // Fetch contests won for canvassers
      const { data: contestsData } = await supabase
        .from("contests")
        .select("winner_user_id, winner_2nd_user_id, winner_3rd_user_id")
        .eq("target_role", "canvasser");

      // Count contest wins per user
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

      // Get unique entries per user (latest)
      const uniqueUsers = new Map<string, any>();
      metricsData?.forEach((entry) => {
        if (!uniqueUsers.has(entry.user_id)) {
          uniqueUsers.set(entry.user_id, entry);
        }
      });

      const sorted = Array.from(uniqueUsers.values())
        .sort((a, b) => {
          // Sort by % of goal first, then by leads closed
          const aPercent = a.yearly_goal > 0 ? (a.leads_closed || 0) / a.yearly_goal : 0;
          const bPercent = b.yearly_goal > 0 ? (b.leads_closed || 0) / b.yearly_goal : 0;
          if (bPercent !== aPercent) return bPercent - aPercent;
          return (b.leads_closed || 0) - (a.leads_closed || 0);
        })
        .map((entry, index) => {
          const yearlyGoal = entry.yearly_goal || 0;
          const leadsClosed = entry.leads_closed || 0;
          const percentOfGoal = yearlyGoal > 0 ? (leadsClosed / yearlyGoal) * 100 : 0;
          const amountUntilGoal = Math.max(0, yearlyGoal - leadsClosed);
          
          return {
            rank: index + 1,
            userId: entry.user_id,
            name: entry.display_name || "Anonymous",
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

      setYtdEntries(sorted);
      setLoading(false);
    };

    fetchYtdLeaderboard();
  }, []);

  // Fetch weekly leaderboard
  useEffect(() => {
    const fetchWeeklyLeaderboard = async () => {
      setWeeklyLoading(true);
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');

      const { data: weeklyData, error } = await supabase
        .from("weekly_canvasser_metrics")
        .select("user_id, leads_set, leads_with_damage, leads_closed, shifts_worked, points_earned")
        .eq("week_start", weekStartStr);

      if (error) {
        console.error("Error fetching weekly leaderboard:", error);
        setWeeklyLoading(false);
        return;
      }

      if (!weeklyData || weeklyData.length === 0) {
        setWeeklyEntries([]);
        setWeeklyLoading(false);
        return;
      }

      // Fetch display names
      const userIds = weeklyData.map(w => w.user_id);
      const { data: metricsData } = userIds.length > 0
        ? await supabase.from("canvasser_metrics").select("user_id, display_name").in("user_id", userIds)
        : { data: [] };

      const displayNameMap = new Map<string, string | null>();
      metricsData?.forEach(m => {
        if (m.display_name && !displayNameMap.has(m.user_id)) {
          displayNameMap.set(m.user_id, m.display_name);
        }
      });

      const sorted = weeklyData
        .map(w => ({
          userId: w.user_id,
          leadsSet: Number(w.leads_set) || 0,
          leadsWithDamage: Number(w.leads_with_damage) || 0,
          leadsClosed: Number(w.leads_closed) || 0,
          shiftsWorked: Number(w.shifts_worked) || 0,
          pointsEarned: Number(w.points_earned) || 0,
          name: displayNameMap.get(w.user_id) || "Anonymous",
        }))
        .sort((a, b) => b.leadsClosed - a.leadsClosed)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setWeeklyEntries(sorted);
      setWeeklyLoading(false);
    };

    fetchWeeklyLeaderboard();
  }, [selectedDate]);

  // Fetch monthly leaderboard
  useEffect(() => {
    const fetchMonthlyLeaderboard = async () => {
      setMonthlyLoading(true);

      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Use week_end >= monthStart to catch weeks that overlap with the month
      const { data: weeklyData, error } = await supabase
        .from("weekly_canvasser_metrics")
        .select("user_id, leads_set, leads_with_damage, leads_closed, shifts_worked, points_earned")
        .gte("week_end", monthStartStr)
        .lte("week_start", monthEndStr);

      if (error) {
        console.error("Error fetching monthly leaderboard:", error);
        setMonthlyLoading(false);
        return;
      }

      if (!weeklyData || weeklyData.length === 0) {
        setMonthlyEntries([]);
        setMonthlyLoading(false);
        return;
      }

      // Aggregate by user
      const aggregated = new Map<string, any>();
      weeklyData.forEach(w => {
        const existing = aggregated.get(w.user_id) || { leadsSet: 0, leadsWithDamage: 0, leadsClosed: 0, shiftsWorked: 0, pointsEarned: 0 };
        aggregated.set(w.user_id, {
          leadsSet: existing.leadsSet + (Number(w.leads_set) || 0),
          leadsWithDamage: existing.leadsWithDamage + (Number(w.leads_with_damage) || 0),
          leadsClosed: existing.leadsClosed + (Number(w.leads_closed) || 0),
          shiftsWorked: existing.shiftsWorked + (Number(w.shifts_worked) || 0),
          pointsEarned: existing.pointsEarned + (Number(w.points_earned) || 0),
        });
      });

      const userIds = Array.from(aggregated.keys());
      const { data: metricsData } = userIds.length > 0
        ? await supabase.from("canvasser_metrics").select("user_id, display_name").in("user_id", userIds)
        : { data: [] };

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
          name: displayNameMap.get(userId) || "Anonymous",
        }))
        .sort((a, b) => b.leadsClosed - a.leadsClosed)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setMonthlyEntries(sorted);
      setMonthlyLoading(false);
    };

    fetchMonthlyLeaderboard();
  }, [selectedMonthDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">See how you stack up against other canvassers</p>
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CanvasserLeaderboardTable entries={ytdEntries} currentUserId={user?.id} />
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <WeeklyCanvasserLeaderboardTable entries={monthlyEntries} currentUserId={user?.id} />
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <WeeklyCanvasserLeaderboardTable entries={weeklyEntries} currentUserId={user?.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
