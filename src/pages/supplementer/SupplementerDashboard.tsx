import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Loader2, Star, DollarSign, TrendingUp, Clock, FileCheck, Percent, Info, Trophy, Plus } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SupplementerMetrics {
  display_name: string | null;
  points: number;
  coc_bonus_points: number;
  total_rcv_increased: number;
  total_money_collected: number;
  total_supplements_processed: number;
  avg_coc_completion_days: number;
  avg_depreciation_release_days: number;
  avg_code_release_days: number;
  avg_revised_scope_days: number;
  collection_rate: number;
  yearly_goal: number;
}

interface RecentJob {
  id: string;
  job_number: string | null;
  client_name: string;
  status: string;
  rcv_increase: number;
  assigned_at: string;
}

export default function SupplementerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SupplementerMetrics | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [metricsRes, jobsRes] = await Promise.all([
      supabase
        .from("supplementer_metrics")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("supplement_jobs")
        .select("id, job_number, client_name, status, rcv_increase, assigned_at")
        .eq("supplementer_id", user.id)
        .in("status", ["active", "coc_pending", "depreciation_pending"])
        .order("assigned_at", { ascending: false })
        .limit(5),
    ]);

    if (metricsRes.error) console.error("Error fetching metrics:", metricsRes.error);
    else setMetrics(metricsRes.data);

    if (jobsRes.error) console.error("Error fetching jobs:", jobsRes.error);
    else setRecentJobs(jobsRes.data || []);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const rcvPoints = Math.floor((metrics?.total_rcv_increased || 0) / 1000);
  const collectionPoints = Math.floor((metrics?.total_money_collected || 0) / 2000);
  const cocBonus = metrics?.coc_bonus_points || 0;

  const statusColors: Record<string, string> = {
    active: "bg-blue-100 text-blue-800",
    coc_pending: "bg-yellow-100 text-yellow-800",
    depreciation_pending: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Stats</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}!
          </p>
        </div>
        <Button onClick={() => navigate("/supplementer/jobs?new=true")}>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Primary KPI: Total Points */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Total Points</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">How Points Are Earned</p>
                    <p>• RCV Points: 1 pt per $1,000 RCV increase</p>
                    <p>• Collection Points: 1 pt per $2,000 collected</p>
                    <p>• Speed Bonus: ≤7 days COC = 5 pts, 8-10 = 3, 11-14 = 1</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-4xl sm:text-5xl font-bold text-primary">{metrics?.points || 0}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">RCV Pts</p>
                <p className="font-bold text-foreground">{rcvPoints}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Collection Pts</p>
                <p className="font-bold text-foreground">{collectionPoints}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Speed Bonus</p>
                <p className="font-bold text-foreground">{cocBonus}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total RCV Increased" value={formatCurrency(metrics?.total_rcv_increased || 0)} icon={TrendingUp} />
        <StatsCard title="Supplements Processed" value={metrics?.total_supplements_processed || 0} icon={FileCheck} />
        <StatsCard title="Money Collected" value={formatCurrency(metrics?.total_money_collected || 0)} icon={DollarSign} valueClassName="text-green-500" />
        <StatsCard title="Collection Rate" value={`${(metrics?.collection_rate || 0).toFixed(1)}%`} icon={Percent} />
      </div>

      {/* Timing Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Avg COC Days" value={`${(metrics?.avg_coc_completion_days || 0).toFixed(1)} days`} icon={Clock} />
        <StatsCard title="Avg Depreciation Days" value={`${(metrics?.avg_depreciation_release_days || 0).toFixed(1)} days`} icon={Clock} />
        <StatsCard title="Avg Code Release Days" value={`${(metrics?.avg_code_release_days || 0).toFixed(1)} days`} icon={Clock} />
      </div>

      {/* Active Jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Jobs</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/supplementer/jobs")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/supplementer/jobs/${job.id}`)}
                >
                  <div>
                    <p className="font-medium text-foreground">{job.client_name}</p>
                    <p className="text-xs text-muted-foreground">{job.job_number || "No job #"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(Number(job.rcv_increase) || 0)}
                    </span>
                    <Badge className={statusColors[job.status] || "bg-muted"}>
                      {job.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
