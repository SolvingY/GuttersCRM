import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  points: number;
}

type MetricType = "leads_set" | "leads_closed" | "points";

export default function CanvasserLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("leads_set");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("canvasser_metrics")
      .select("user_id, display_name, leads_set, leads_closed, leads_with_damage, shifts_worked, points")
      .order("leads_set", { ascending: false });

    if (error) {
      console.error("Error fetching leaderboard:", error);
    } else {
      // Get unique entries per user (latest)
      const uniqueUsers = new Map<string, LeaderboardEntry>();
      data?.forEach((entry) => {
        if (!uniqueUsers.has(entry.user_id)) {
          uniqueUsers.set(entry.user_id, entry);
        }
      });
      setEntries(Array.from(uniqueUsers.values()));
    }
    setLoading(false);
  };

  const getSortedEntries = () => {
    return [...entries].sort((a, b) => {
      return (b[selectedMetric] ?? 0) - (a[selectedMetric] ?? 0);
    });
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-muted-foreground font-medium">{rank}</span>;
    }
  };

  const getMetricLabel = (metric: MetricType) => {
    switch (metric) {
      case "leads_set":
        return "Leads Set";
      case "leads_closed":
        return "Leads Closed";
      case "points":
        return "Points";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedEntries = getSortedEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">See how you stack up against other canvassers</p>
      </div>

      <Tabs defaultValue="leads_set" onValueChange={(v) => setSelectedMetric(v as MetricType)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="leads_set">Leads Set</TabsTrigger>
          <TabsTrigger value="leads_closed">Leads Closed</TabsTrigger>
          <TabsTrigger value="points">Points</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedMetric} className="mt-6">
          {/* Top 3 Podium */}
          {sortedEntries.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd Place */}
              <Card className={cn(
                "text-center pt-8 pb-4",
                sortedEntries[1]?.user_id === user?.id && "ring-2 ring-primary"
              )}>
                <CardContent className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                    <Medal className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="font-semibold text-foreground truncate px-2">
                    {sortedEntries[1]?.display_name || "Anonymous"}
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {sortedEntries[1]?.[selectedMetric]?.toLocaleString() ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">2nd Place</div>
                </CardContent>
              </Card>

              {/* 1st Place */}
              <Card className={cn(
                "text-center pt-4 pb-4 -mt-4 border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-transparent",
                sortedEntries[0]?.user_id === user?.id && "ring-2 ring-primary"
              )}>
                <CardContent className="space-y-2">
                  <div className="w-20 h-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-yellow-500" />
                  </div>
                  <div className="font-semibold text-foreground truncate px-2">
                    {sortedEntries[0]?.display_name || "Anonymous"}
                  </div>
                  <div className="text-3xl font-bold text-yellow-600">
                    {sortedEntries[0]?.[selectedMetric]?.toLocaleString() ?? 0}
                  </div>
                  <div className="text-sm font-medium text-yellow-600">1st Place</div>
                </CardContent>
              </Card>

              {/* 3rd Place */}
              <Card className={cn(
                "text-center pt-8 pb-4",
                sortedEntries[2]?.user_id === user?.id && "ring-2 ring-primary"
              )}>
                <CardContent className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                    <Award className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="font-semibold text-foreground truncate px-2">
                    {sortedEntries[2]?.display_name || "Anonymous"}
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {sortedEntries[2]?.[selectedMetric]?.toLocaleString() ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">3rd Place</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Full Rankings - {getMetricLabel(selectedMetric)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedEntries.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-colors",
                      entry.user_id === user?.id
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {entry.display_name || "Anonymous"}
                          {entry.user_id === user?.id && (
                            <span className="ml-2 text-xs text-primary">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.shifts_worked} shifts worked
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">
                        {entry[selectedMetric]?.toLocaleString() ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getMetricLabel(selectedMetric)}
                      </div>
                    </div>
                  </div>
                ))}

                {sortedEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No canvassers found. Be the first!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
