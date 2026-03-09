import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  builds: number;
  efficiency: number;
  points: number;
}

export default function ProductionLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedWeek]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    // Use Thursday-based week
    const weekStart = format(startOfWeek(selectedWeek, { weekStartsOn: 4 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(selectedWeek, { weekStartsOn: 4 }), "yyyy-MM-dd");

    const { data } = await (supabase.from("weekly_production_metrics") as any)
      .select("*")
      .eq("week_start", weekStart);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, is_archived, hidden_from_leaderboard");

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    const parsed: LeaderboardEntry[] = (data || [])
      .filter((m: any) => {
        const profile = profileMap.get(m.user_id);
        return profile && !profile.is_archived && !profile.hidden_from_leaderboard;
      })
      .map((m: any) => ({
        rank: 0,
        userId: m.user_id,
        name: profileMap.get(m.user_id)?.full_name || "Unknown",
        builds: m.builds_completed || 0,
        efficiency: Number(m.build_efficiency) || 0,
        points: Number(m.points_earned) || 0,
      }))
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.points - a.points);

    parsed.forEach((e, i) => (e.rank = i + 1));
    setEntries(parsed);
    setLoading(false);
  };

  const weekLabel = `${format(startOfWeek(selectedWeek, { weekStartsOn: 4 }), "MMM d")} – ${format(endOfWeek(selectedWeek, { weekStartsOn: 4 }), "MMM d, yyyy")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Production Leaderboard
        </h1>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button variant="ghost" size="sm" onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Builds</TableHead>
              <TableHead className="text-center">Efficiency %</TableHead>
              <TableHead className="text-center">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No data for this week
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow
                  key={entry.userId}
                  className={cn(entry.userId === user?.id && "bg-amber-500/5")}
                >
                  <TableCell>
                    {entry.rank <= 3 ? (
                      <Badge className={cn(
                        entry.rank === 1 && "bg-yellow-500",
                        entry.rank === 2 && "bg-gray-400",
                        entry.rank === 3 && "bg-amber-700",
                      )}>
                        #{entry.rank}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">#{entry.rank}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.name}
                    {entry.userId === user?.id && (
                      <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{entry.builds}</TableCell>
                  <TableCell className="text-center">{entry.efficiency.toFixed(1)}%</TableCell>
                  <TableCell className="text-center font-bold">{entry.points}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
