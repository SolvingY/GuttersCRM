import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Trophy, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { CanvasserActiveContestWidget } from "@/components/canvasser/CanvasserActiveContestWidget";
import { CanvasserLeaderboardTable, CanvasserLeaderboardEntry } from "@/components/dashboard/CanvasserLeaderboardTable";
import { WeeklyCanvasserLeaderboardTable, WeeklyCanvasserEntry } from "@/components/dashboard/WeeklyCanvasserLeaderboardTable";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar
} from 'recharts';
interface CanvasserMetrics {
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  points: number;
  income: number;
  yearly_goal: number;
}

interface WeeklyCanvasserMetric {
  week_start: string;
  week_end: string;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  income: number;
  points_earned: number;
}

export default function CanvasserStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CanvasserMetrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyCanvasserMetric[]>([]);
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyCanvasserMetric[]>([]); // For 52-week chart
  const [loading, setLoading] = useState(true);
  
  // Leaderboard states
  const [ytdEntries, setYtdEntries] = useState<CanvasserLeaderboardEntry[]>([]);
  const [weeklyLeaderboardEntries, setWeeklyLeaderboardEntries] = useState<WeeklyCanvasserEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

    // Fetch YTD metrics
    const { data, error } = await supabase
      .from("canvasser_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching metrics:", error);
    } else {
      setMetrics(data);
    }

    // Fetch weekly metrics (last 8 weeks for Recent Weekly Updates)
    const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('weekly_canvasser_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', eightWeeksAgo)
      .order('week_start', { ascending: false });

    if (weeklyError) {
      console.error('Error fetching weekly metrics:', weeklyError);
    } else {
      setWeeklyMetrics(weeklyData || []);
    }

    // Fetch all weekly metrics from fiscal year start (Dec 15, 2025)
    const fiscalStart = new Date(2025, 11, 15); // Dec 15, 2025
    const fiscalStartStr = format(fiscalStart, 'yyyy-MM-dd');
    const { data: allWeeklyData, error: allWeeklyError } = await supabase
      .from('weekly_canvasser_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', fiscalStartStr)
      .order('week_start', { ascending: true });

    if (allWeeklyError) {
      console.error('Error fetching all weekly metrics:', allWeeklyError);
    } else {
      setAllWeeklyMetrics(allWeeklyData || []);
    }

    setLoading(false);
    
    // Fetch leaderboard data
    await fetchLeaderboard();
  };
  
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    
    // Fetch YTD canvasser metrics for leaderboard
    const { data: metricsData, error } = await supabase
      .from("canvasser_metrics")
      .select("user_id, display_name, leads_set, leads_closed, leads_with_damage, yearly_goal, points")
      .order("leads_closed", { ascending: false });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboardLoading(false);
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

    const sortedYtd = Array.from(uniqueUsers.values())
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

    setYtdEntries(sortedYtd);
    
    // Fetch current week leaderboard
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    const { data: weeklyData, error: weeklyError } = await supabase
      .from("weekly_canvasser_metrics")
      .select("user_id, leads_set, leads_with_damage, leads_closed, shifts_worked, points_earned")
      .eq("week_start", weekStartStr);

    if (weeklyError) {
      console.error("Error fetching weekly leaderboard:", weeklyError);
      setLeaderboardLoading(false);
      return;
    }

    if (!weeklyData || weeklyData.length === 0) {
      setWeeklyLeaderboardEntries([]);
      setLeaderboardLoading(false);
      return;
    }

    // Fetch display names
    const userIds = weeklyData.map(w => w.user_id);
    const { data: displayNameData } = userIds.length > 0
      ? await supabase.from("canvasser_metrics").select("user_id, display_name").in("user_id", userIds)
      : { data: [] };

    const displayNameMap = new Map<string, string | null>();
    displayNameData?.forEach(m => {
      if (m.display_name && !displayNameMap.has(m.user_id)) {
        displayNameMap.set(m.user_id, m.display_name);
      }
    });

    const sortedWeekly = weeklyData
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

    setWeeklyLeaderboardEntries(sortedWeekly);
    setLeaderboardLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const conversionRate = metrics && metrics.leads_set > 0 
    ? ((metrics.leads_closed / metrics.leads_set) * 100).toFixed(1)
    : "0.0";

  const damageRate = metrics && metrics.leads_set > 0
    ? ((metrics.leads_with_damage / metrics.leads_set) * 100).toFixed(1)
    : "0.0";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare 52-week fiscal year progression data for leads closed (bar chart)
  const get52WeekData = () => {
    const yearlyGoal = metrics?.yearly_goal || 0;
    const fiscalStart = new Date(2025, 11, 15); // Dec 15, 2025
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; leadsClosed: number; goalPace: number; cumulativeGoal: number }[] = [];
    
    // Generate all 52 weeks of the fiscal year
    for (let i = 0; i < 52; i++) {
      const weekStart = new Date(fiscalStart);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      // Find matching weekly metric data
      const weeklyMetric = allWeeklyMetrics.find(w => {
        const wStart = new Date(w.week_start);
        return wStart >= weekStart && wStart < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      });
      
      weeks.push({
        week: `W${i + 1}`,
        weekLabel: format(weekStart, 'MMM d'),
        leadsClosed: Number(weeklyMetric?.leads_closed) || 0,
        goalPace: weeklyGoalPace,
        cumulativeGoal: weeklyGoalPace * (i + 1),
      });
    }
    
    // Calculate cumulative leads closed
    let cumulative = 0;
    return weeks.map(w => {
      cumulative += w.leadsClosed;
      return { ...w, cumulativeLeadsClosed: cumulative };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">Track your canvassing performance</p>
      </div>

      {/* Active Contests Widget */}
      <CanvasserActiveContestWidget />

      {/* Yearly Goal Progress */}
      {metrics?.yearly_goal && metrics.yearly_goal > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Yearly Goal Progress
            </CardTitle>
            <CardDescription>
              {metrics.leads_closed >= metrics.yearly_goal
                ? "🎉 Congratulations! You've reached your goal!"
                : `${metrics.yearly_goal - metrics.leads_closed} leads closed to go`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-bold text-primary">{metrics.leads_closed}</span>
                <span className="text-2xl text-muted-foreground"> / {metrics.yearly_goal}</span>
              </div>
              <span className="text-2xl font-semibold text-foreground">
                {((metrics.leads_closed / metrics.yearly_goal) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min((metrics.leads_closed / metrics.yearly_goal) * 100, 100)} 
              className="h-3"
            />
            <p className="text-sm text-muted-foreground">
              Leads closed this year towards your annual target
            </p>
          </CardContent>
        </Card>
      )}

      {/* 52-Week Fiscal Year Bar Chart */}
      {metrics?.yearly_goal && metrics.yearly_goal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              52-Week Progress (Fiscal Year Dec 15 - Dec 15)
            </CardTitle>
            <CardDescription>
              Track your leads closed progress week by week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={get52WeekData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    interval={3}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'leadsClosed' ? 'Weekly Leads Closed' : name === 'cumulativeLeadsClosed' ? 'Cumulative' : 'Goal Pace'
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return `Week of ${payload[0].payload.weekLabel}`;
                      }
                      return label;
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="leadsClosed"
                    fill="hsl(var(--primary))"
                    name="Weekly Leads Closed"
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeLeadsClosed"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                    name="Cumulative"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeGoal"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Goal Pace"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Set
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics?.leads_set ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total appointments scheduled
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Closed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics?.leads_closed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successful conversions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads with Damage
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics?.leads_with_damage ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties with confirmed damage
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shifts Worked
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {metrics?.shifts_worked ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total shifts completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Snapshot */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          <CardDescription>See how you stack up against other canvassers</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="ytd" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="ytd">Year to Date</TabsTrigger>
                <TabsTrigger value="weekly">This Week</TabsTrigger>
              </TabsList>

              <TabsContent value="ytd">
                <CanvasserLeaderboardTable entries={ytdEntries} currentUserId={user?.id} />
              </TabsContent>

              <TabsContent value="weekly">
                <WeeklyCanvasserLeaderboardTable entries={weeklyLeaderboardEntries} currentUserId={user?.id} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Weekly Updates Section */}
      {weeklyMetrics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Weekly Updates
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Info className="h-3.5 w-3.5" />
              <span>Points: 10 per lead closed, 5 per lead with damage, 1 per lead set</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyMetrics.slice(0, 4).map((week) => (
                <div key={week.week_start} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Week of {format(new Date(week.week_start), 'MMM d')} - {format(new Date(week.week_end), 'MMM d')}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{week.leads_set} leads set</span>
                      <span>{week.leads_closed} closed</span>
                      <span>{week.shifts_worked} shifts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(Number(week.income))}</p>
                    {week.points_earned > 0 && (
                      <p className="text-xs text-primary">+{Number(week.points_earned)} pts</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold text-primary">{conversionRate}%</span>
              <span className="text-sm text-muted-foreground">
                {metrics?.leads_closed ?? 0} / {metrics?.leads_set ?? 0} leads
              </span>
            </div>
            <Progress value={Number(conversionRate)} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Percentage of leads set that resulted in closed deals
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Damage Detection Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold text-yellow-500">{damageRate}%</span>
              <span className="text-sm text-muted-foreground">
                {metrics?.leads_with_damage ?? 0} / {metrics?.leads_set ?? 0} leads
              </span>
            </div>
            <Progress value={Number(damageRate)} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Percentage of leads with confirmed property damage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income and Points Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income Card */}
        <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Total Income</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(metrics?.income ?? 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Earnings from all canvassing activities
            </p>
          </CardContent>
        </Card>

        {/* Points Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {metrics?.points?.toLocaleString() ?? 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Points earned from all activities
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
