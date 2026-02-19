import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Info, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

interface SupplementerEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  rcvIncreased: number;
  moneyCollected: number;
  collectionRate: number;
  avgCocDays: number;
  supplementsProcessed: number;
}

export default function SupplementerLeaderboard() {
  const { user } = useAuth();
  const [ytdEntries, setYtdEntries] = useState<SupplementerEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<SupplementerEntry[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<SupplementerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("yearly");
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchLeaderboard();
    
    const channel = supabase
      .channel('supplementer-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplementer_metrics' }, () => fetchLeaderboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_supplementer_metrics' }, () => fetchLeaderboard())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (activeTab === 'weekly') fetchWeeklyData();
  }, [selectedWeek, activeTab]);

  useEffect(() => {
    if (activeTab === 'monthly') fetchMonthlyData();
  }, [selectedMonth, activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    const { data: activeProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_archived", false);
    const activeUserIds = new Set(activeProfiles?.map((p) => p.id) || []);

    const { data, error } = await supabase
      .from("supplementer_metrics")
      .select("user_id, display_name, points, total_rcv_increased, total_money_collected, collection_rate, avg_coc_completion_days, total_supplements_processed")
      .order("points", { ascending: false });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
      return;
    }

    const entries = (data || [])
      .filter((d) => activeUserIds.has(d.user_id))
      .map((d, i) => ({
        rank: i + 1,
        userId: d.user_id,
        name: d.display_name || "Anonymous",
        points: d.points || 0,
        rcvIncreased: Number(d.total_rcv_increased) || 0,
        moneyCollected: Number(d.total_money_collected) || 0,
        collectionRate: Number(d.collection_rate) || 0,
        avgCocDays: Number(d.avg_coc_completion_days) || 0,
        supplementsProcessed: d.total_supplements_processed || 0,
      }));

    setYtdEntries(entries);
    setLoading(false);
  };

  const fetchWeeklyData = async () => {
    const weekStart = format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const { data: activeProfiles } = await supabase.from("profiles").select("id").eq("is_archived", false);
    const activeUserIds = new Set(activeProfiles?.map((p) => p.id) || []);

    const { data } = await supabase
      .from("weekly_supplementer_metrics")
      .select("*")
      .eq("week_start", weekStart)
      .order("points_earned", { ascending: false });

    const entries = (data || [])
      .filter(d => activeUserIds.has(d.user_id) && (Number(d.points_earned) > 0 || Number(d.rcv_increased) > 0))
      .map((d, i) => ({
        rank: i + 1,
        userId: d.user_id,
        name: d.display_name || "Anonymous",
        points: Number(d.points_earned) || 0,
        rcvIncreased: Number(d.rcv_increased) || 0,
        moneyCollected: Number(d.money_collected) || 0,
        collectionRate: Number(d.rcv_increased) > 0 ? (Number(d.money_collected) / Number(d.rcv_increased)) * 100 : 0,
        avgCocDays: Number(d.avg_coc_days) || 0,
        supplementsProcessed: d.supplements_completed || 0,
      }));

    setWeeklyEntries(entries);
  };

  const fetchMonthlyData = async () => {
    const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    const { data: activeProfiles } = await supabase.from("profiles").select("id").eq("is_archived", false);
    const activeUserIds = new Set(activeProfiles?.map((p) => p.id) || []);

    const { data } = await supabase
      .from("weekly_supplementer_metrics")
      .select("*")
      .gte("week_start", monthStart)
      .lte("week_start", monthEnd);

    // Aggregate by user
    const userMap = new Map<string, { name: string; points: number; rcv: number; collected: number; cocDays: number[]; supplements: number }>();
    (data || []).filter(d => activeUserIds.has(d.user_id)).forEach(d => {
      const existing = userMap.get(d.user_id) || { name: d.display_name || "Anonymous", points: 0, rcv: 0, collected: 0, cocDays: [], supplements: 0 };
      existing.points += Number(d.points_earned) || 0;
      existing.rcv += Number(d.rcv_increased) || 0;
      existing.collected += Number(d.money_collected) || 0;
      if (Number(d.avg_coc_days) > 0) existing.cocDays.push(Number(d.avg_coc_days));
      existing.supplements += d.supplements_completed || 0;
      userMap.set(d.user_id, existing);
    });

    const entries = Array.from(userMap.entries())
      .filter(([_, v]) => v.points > 0 || v.rcv > 0)
      .sort((a, b) => b[1].points - a[1].points)
      .map(([userId, v], i) => ({
        rank: i + 1,
        userId,
        name: v.name,
        points: v.points,
        rcvIncreased: v.rcv,
        moneyCollected: v.collected,
        collectionRate: v.rcv > 0 ? (v.collected / v.rcv) * 100 : 0,
        avgCocDays: v.cocDays.length > 0 ? v.cocDays.reduce((a, b) => a + b, 0) / v.cocDays.length : 0,
        supplementsProcessed: v.supplements,
      }));

    setMonthlyEntries(entries);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  const renderTable = (entries: SupplementerEntry[]) => {
    const totals = entries.reduce((acc, e) => ({
      points: acc.points + e.points,
      rcv: acc.rcv + e.rcvIncreased,
      collected: acc.collected + e.moneyCollected,
      supplements: acc.supplements + e.supplementsProcessed,
    }), { points: 0, rcv: 0, collected: 0, supplements: 0 });

    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right font-bold">Points</TableHead>
              <TableHead className="text-right">RCV Increased</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Avg COC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No supplementer data yet
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow
                  key={e.userId}
                  className={cn(e.userId === user?.id && "bg-primary/5")}
                >
                  <TableCell className="font-medium">{getRankIcon(e.rank)}</TableCell>
                  <TableCell className={cn("font-medium", e.userId === user?.id && "text-primary")}>
                    {e.name}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">{e.points}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.rcvIncreased)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.moneyCollected)}</TableCell>
                  <TableCell className="text-right">{e.collectionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{e.avgCocDays > 0 ? `${e.avgCocDays.toFixed(1)}d` : "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {entries.length > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Team Totals</TableCell>
                <TableCell className="text-right font-bold">{totals.points}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.rcv)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.collected)}</TableCell>
                <TableCell className="text-right">{totals.rcv > 0 ? ((totals.collected / totals.rcv) * 100).toFixed(1) : "0.0"}%</TableCell>
                <TableCell className="text-right">-</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    );
  };

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">See how you stack up against other supplementers</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-sm text-muted-foreground cursor-help">
                <Info className="h-4 w-4" />
                How points work
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">Points Formula</p>
              <p>• 1 pt per $1,000 RCV increase</p>
              <p>• 1 pt per $2,000 collected</p>
              <p>• Speed Bonus: ≤7d COC = 5pts, 8-10d = 3, 11-14d = 1</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="yearly">Yearly (YTD)</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="yearly" className="mt-4">
            {renderTable(ytdEntries)}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {renderTable(weeklyEntries)}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {renderTable(monthlyEntries)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
