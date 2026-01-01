import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trophy, Clock, Gift, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import contestBackground from "@/assets/contest-background.jpg";

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
  const [countdown, setCountdown] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchContests();
  }, []);

  // Real-time countdown timer
  useEffect(() => {
    const activeContests = contests.filter(c => getContestStatus(c) === "Active");
    if (activeContests.length === 0) return;

    const interval = setInterval(() => {
      const newCountdown: Record<string, string> = {};
      activeContests.forEach(contest => {
        newCountdown[contest.id] = getDetailedTimeRemaining(contest.end_date);
      });
      setCountdown(newCountdown);
    }, 1000);

    return () => clearInterval(interval);
  }, [contests]);

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
      const active = data?.filter(c => getContestStatus(c) === "Active") || [];
      for (const contest of active) {
        await fetchLeaders(contest);
      }
    }
    setLoading(false);
  };

  const fetchLeaders = async (contest: Contest) => {
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

  const getDetailedTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    const seconds = differenceInSeconds(end, now) % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
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
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(${contestBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-background/90" />
      
      <div className="relative z-10 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contests</h1>
          <p className="text-muted-foreground mt-1">Compete for prizes and recognition</p>
        </div>

        {/* Active Contests with Podium Display */}
        {activeContests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Active Contests
            </h2>
            {activeContests.map(contest => (
              <Card key={contest.id} className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-primary/20 rounded-full text-4xl">
                        {contest.icon || '🏆'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-heading text-foreground">{contest.title}</h3>
                          <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">Active</Badge>
                        </div>
                        {contest.description && (
                          <p className="text-muted-foreground mb-3">{contest.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{contest.prize_description}</span>
                          </div>
                          {contest.prize_value > 0 && (
                            <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                              🥇 ${contest.prize_value.toLocaleString()}
                            </Badge>
                          )}
                          {contest.prize_2nd_value && contest.prize_2nd_value > 0 && (
                            <Badge variant="secondary">🥈 ${contest.prize_2nd_value.toLocaleString()}</Badge>
                          )}
                          {contest.prize_3rd_value && contest.prize_3rd_value > 0 && (
                            <Badge variant="outline">🥉 ${contest.prize_3rd_value.toLocaleString()}</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          Metric: <strong>{getMetricLabel(contest.metric_type)}</strong>
                        </div>
                        
                        {/* Progress Bar with Countdown */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Time Remaining</span>
                            <span className="font-mono font-semibold text-primary">
                              {countdown[contest.id] || getDetailedTimeRemaining(contest.end_date)}
                            </span>
                          </div>
                          <Progress value={getContestProgress(contest)} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{format(new Date(contest.start_date), 'MMM d')}</span>
                            <span>{format(new Date(contest.end_date), 'MMM d')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Podium Display */}
                    {leaderboards[contest.id] && leaderboards[contest.id].length > 0 && (
                      <div className="w-full lg:w-auto">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">Leaderboard</p>
                        <div className="flex items-end justify-center gap-2 sm:gap-3">
                          {/* 2nd Place */}
                          {leaderboards[contest.id][1] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xl sm:text-2xl">🥈</span>
                              <div className="bg-muted/70 rounded-lg p-2 sm:p-3 w-20 sm:w-24 text-center h-32 sm:h-36 flex flex-col justify-start pt-2">
                                <p className="text-xs font-medium text-foreground truncate">{leaderboards[contest.id][1].display_name || "Anonymous"}</p>
                                <p className="text-xs text-muted-foreground">{leaderboards[contest.id][1].value.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 font-semibold mt-1">+50 pts</p>
                              </div>
                            </div>
                          )}
                          
                          {/* 1st Place */}
                          {leaderboards[contest.id][0] && (
                            <div className="flex flex-col items-center">
                              <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mb-1" />
                              <span className="text-2xl sm:text-3xl">🥇</span>
                              <div className="bg-primary/20 border border-primary/30 rounded-lg p-2 sm:p-3 w-24 sm:w-28 text-center h-36 sm:h-44 flex flex-col justify-start pt-3">
                                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{leaderboards[contest.id][0].display_name || "Anonymous"}</p>
                                <p className="text-xs sm:text-sm text-primary font-bold">{leaderboards[contest.id][0].value.toLocaleString()}</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mt-1">+100 pts</p>
                              </div>
                            </div>
                          )}
                          
                          {/* 3rd Place */}
                          {leaderboards[contest.id][2] && (
                            <div className="flex flex-col items-center">
                              <span className="text-xl sm:text-2xl">🥉</span>
                              <div className="bg-muted/70 rounded-lg p-2 sm:p-3 w-20 sm:w-24 text-center h-28 sm:h-32 flex flex-col justify-start pt-2">
                                <p className="text-xs font-medium text-foreground truncate">{leaderboards[contest.id][2].display_name || "Anonymous"}</p>
                                <p className="text-xs text-muted-foreground">{leaderboards[contest.id][2].value.toLocaleString()}</p>
                                <p className="text-xs text-amber-600 font-semibold mt-1">+25 pts</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                    <p className="text-sm text-muted-foreground">{contest.description}</p>
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
            <h2 className="text-xl font-semibold text-muted-foreground">Past Contests</h2>
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
    </div>
  );
}