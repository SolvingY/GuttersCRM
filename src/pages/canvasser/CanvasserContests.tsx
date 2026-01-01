import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trophy, Clock, Gift, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  prize_description: string;
  prize_value: number;
  prize_2nd_description: string | null;
  prize_2nd_value: number | null;
  prize_3rd_description: string | null;
  prize_3rd_value: number | null;
  start_date: string;
  end_date: string;
  metric_type: string;
  is_active: boolean;
  winner_display_name: string | null;
}

interface LeaderEntry {
  user_id: string;
  display_name: string | null;
  value: number;
}

export default function CanvasserContests() {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderEntry[]>>({});

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    const { data, error } = await supabase
      .from("contests")
      .select("*")
      .eq("target_role", "canvasser")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching contests:", error);
    } else {
      setContests(data || []);
      // Fetch leaders for active contests
      const active = data?.filter(c => getContestStatus(c) === "Active") || [];
      for (const contest of active) {
        await fetchLeaders(contest);
      }
    }
    setLoading(false);
  };

  const fetchLeaders = async (contest: Contest) => {
    const metricField = contest.metric_type as keyof LeaderEntry;
    
    const { data } = await supabase
      .from("canvasser_metrics")
      .select(`user_id, display_name, ${contest.metric_type}`)
      .order(contest.metric_type, { ascending: false })
      .limit(5);

    if (data) {
      const uniqueUsers = new Map<string, LeaderEntry>();
      data.forEach((entry: any) => {
        if (!uniqueUsers.has(entry.user_id)) {
          uniqueUsers.set(entry.user_id, {
            user_id: entry.user_id,
            display_name: entry.display_name,
            value: entry[contest.metric_type] || 0,
          });
        }
      });
      setLeaderboards(prev => ({
        ...prev,
        [contest.id]: Array.from(uniqueUsers.values()).slice(0, 3),
      }));
    }
  };

  const getContestStatus = (contest: Contest) => {
    const now = new Date();
    const start = new Date(contest.start_date);
    const end = new Date(contest.end_date);

    if (!contest.is_active) return "Ended";
    if (now < start) return "Upcoming";
    if (now > end) return "Ended";
    return "Active";
  };

  const getContestProgress = (contest: Contest) => {
    const now = new Date();
    const start = new Date(contest.start_date);
    const end = new Date(contest.end_date);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getTimeRemaining = (contest: Contest) => {
    const now = new Date();
    const end = new Date(contest.end_date);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "leads_set": return "Leads Set";
      case "leads_closed": return "Leads Closed";
      case "leads_with_damage": return "Leads with Damage";
      case "shifts_worked": return "Shifts Worked";
      case "points": return "Points";
      default: return metric;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeContests = contests.filter(c => getContestStatus(c) === "Active");
  const upcomingContests = contests.filter(c => getContestStatus(c) === "Upcoming");
  const endedContests = contests.filter(c => getContestStatus(c) === "Ended");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contests</h1>
        <p className="text-muted-foreground mt-1">Compete for prizes and recognition</p>
      </div>

      {/* Active Contests */}
      {activeContests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Active Contests
          </h2>
          {activeContests.map(contest => (
            <Card key={contest.id} className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{contest.icon}</span>
                    <div>
                      <CardTitle className="text-xl">{contest.title}</CardTitle>
                      <CardDescription>{contest.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {getTimeRemaining(contest)}
                </div>
                <Progress value={getContestProgress(contest)} className="h-2" />
                
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Metric: <strong>{getMetricLabel(contest.metric_type)}</strong></span>
                </div>

                {/* Prizes */}
                <div className="grid gap-2 sm:grid-cols-3 pt-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10">
                    <Gift className="h-4 w-4 text-yellow-500" />
                    <div className="text-sm">
                      <div className="font-medium">1st Place</div>
                      <div className="text-muted-foreground">{contest.prize_description}</div>
                    </div>
                  </div>
                  {contest.prize_2nd_description && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-500/10">
                      <Gift className="h-4 w-4 text-gray-400" />
                      <div className="text-sm">
                        <div className="font-medium">2nd Place</div>
                        <div className="text-muted-foreground">{contest.prize_2nd_description}</div>
                      </div>
                    </div>
                  )}
                  {contest.prize_3rd_description && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
                      <Gift className="h-4 w-4 text-amber-600" />
                      <div className="text-sm">
                        <div className="font-medium">3rd Place</div>
                        <div className="text-muted-foreground">{contest.prize_3rd_description}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Leaders */}
                {leaderboards[contest.id] && leaderboards[contest.id].length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium mb-2">Current Leaders</h4>
                    <div className="space-y-2">
                      {leaderboards[contest.id].map((leader, idx) => (
                        <div
                          key={leader.user_id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg",
                            leader.user_id === user?.id ? "bg-primary/10" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-6">#{idx + 1}</span>
                            <span>{leader.display_name || "Anonymous"}</span>
                            {leader.user_id === user?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <span className="font-bold">{leader.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Contests */}
      {upcomingContests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Upcoming Contests</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingContests.map(contest => (
              <Card key={contest.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{contest.icon}</span>
                    <div>
                      <CardTitle>{contest.title}</CardTitle>
                      <CardDescription>
                        Starts {new Date(contest.start_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {contest.description}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="text-sm">{contest.prize_description}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Contests */}
      {endedContests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground text-muted-foreground">Past Contests</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {endedContests.map(contest => (
              <Card key={contest.id} className="opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{contest.icon}</span>
                    <CardTitle className="text-base">{contest.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {contest.winner_display_name ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span>Winner: <strong>{contest.winner_display_name}</strong></span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Contest ended</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {contests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No Contests Yet</h3>
            <p className="text-muted-foreground mt-1">
              Check back later for exciting canvasser competitions!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
