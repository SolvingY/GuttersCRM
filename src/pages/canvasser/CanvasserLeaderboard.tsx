import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { WeeklyCanvasserLeaderboardTable, type WeeklyCanvasserEntry } from "@/components/dashboard/WeeklyCanvasserLeaderboardTable";
import { CommentsSection } from "@/components/dashboard/CommentsSection";
import { fetchCanvasserLeaderboardByDateRange } from "@/lib/fetchCanvasserLeaderboardData";
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

export default function CanvasserLeaderboard() {
  const { user } = useAuth();
  const [ytdEntries, setYtdEntries] = useState<WeeklyCanvasserEntry[]>([]);
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
      
      const { data: activeProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_archived", false);
      
      const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

      const { data: metricsData, error } = await supabase
        .from("canvasser_metrics")
        .select("user_id, display_name, leads_set, leads_closed, leads_with_damage, leads_without_damage, doors_knocked, points, conversations_had, not_interested, cancelled_leads, hours_worked, contest_points, wager_points")
        .order("leads_closed", { ascending: false });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        setLoading(false);
        return;
      }

      // Get unique entries per user (latest) - filter for active users only
      const uniqueUsers = new Map<string, any>();
      metricsData?.forEach((entry) => {
        if (!uniqueUsers.has(entry.user_id) && activeUserIds.has(entry.user_id)) {
          uniqueUsers.set(entry.user_id, entry);
        }
      });

      const sorted = Array.from(uniqueUsers.values())
        .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
        .map((entry, index) => ({
          rank: index + 1,
          userId: entry.user_id,
          name: entry.display_name || "Anonymous",
          leadsClosed: entry.leads_closed || 0,
          leadsSet: entry.leads_set || 0,
          leadsWithDamage: entry.leads_with_damage || 0,
          leadsWithoutDamage: entry.leads_without_damage || 0,
          doorsKnocked: entry.doors_knocked || 0,
          conversationsHad: entry.conversations_had || 0,
          notInterested: entry.not_interested || 0,
          cancelledLeads: entry.cancelled_leads || 0,
          hoursWorked: entry.hours_worked || 0,
          pointsEarned: Number(entry.points) || 0,
          contestPoints: Number(entry.contest_points) || 0,
          wagerPoints: Number(entry.wager_points) || 0,
        }));

      setYtdEntries(sorted);
      setLoading(false);
    };

    fetchYtdLeaderboard();
  }, []);

  // Fetch weekly leaderboard from daily_canvasser_metric_entries
  useEffect(() => {
    const fetchWeeklyLeaderboard = async () => {
      setWeeklyLoading(true);
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const entries = await fetchCanvasserLeaderboardByDateRange(startDate, endDate);
      setWeeklyEntries(entries);
      setWeeklyLoading(false);
    };

    fetchWeeklyLeaderboard();
  }, [selectedDate]);

  // Fetch monthly leaderboard from daily_canvasser_metric_entries
  useEffect(() => {
    const fetchMonthlyLeaderboard = async () => {
      setMonthlyLoading(true);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      const entries = await fetchCanvasserLeaderboardByDateRange(startDate, endDate);
      setMonthlyEntries(entries);
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
            <WeeklyCanvasserLeaderboardTable entries={ytdEntries} currentUserId={user?.id} />
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

      {/* Canvasser Team Comments */}
      <CommentsSection thread="canvasser" />
    </div>
  );
}
