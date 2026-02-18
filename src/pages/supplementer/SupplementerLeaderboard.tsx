import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Info, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

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

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  const renderTable = (entries: SupplementerEntry[]) => (
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
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">See how you stack up against other supplementers</p>
        </div>
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        renderTable(ytdEntries)
      )}
    </div>
  );
}
