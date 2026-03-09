import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Star, HardHat, AlertTriangle, ClipboardCheck, Percent, FileText, Plus, X } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProductionTimeClockWidget } from "@/components/production/ProductionTimeClockWidget";
import { toast } from "sonner";

interface ProductionMetrics {
  display_name: string | null;
  builds_completed: number;
  build_issues: number;
  checklists_completed: number;
  build_efficiency: number;
  points: number;
  yearly_goal: number;
}

export default function ProductionDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildsToday, setBuildsToday] = useState("");
  const [summaryNotes, setSummaryNotes] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logSubmitted, setLogSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      checkTodayLog();
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;
    const { data, error } = await (supabase.from("production_metrics") as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) console.error("Error fetching production metrics:", error);
    if (data) setMetrics(data);
    setLoading(false);
  };

  const checkTodayLog = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await (supabase.from("production_daily_logs") as any)
      .select("builds_completed, summary_notes")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .maybeSingle();

    if (data && (data.summary_notes || data.builds_completed > 0)) {
      setBuildsToday(data.builds_completed?.toString() || "0");
      setSummaryNotes(data.summary_notes || "");
      setLogSubmitted(true);
    }
  };

  const handleSubmitDailyLog = async () => {
    if (!user) return;
    setSubmittingLog(true);
    const today = new Date().toISOString().split("T")[0];
    const builds = parseInt(buildsToday) || 0;

    const { error } = await (supabase.from("production_daily_logs") as any)
      .upsert(
        {
          user_id: user.id,
          log_date: today,
          builds_completed: builds,
          summary_notes: summaryNotes || null,
        },
        { onConflict: "user_id,log_date" }
      );

    if (error) {
      console.error("Error submitting daily log:", error);
      toast.error("Failed to submit daily log");
    } else {
      toast.success("Daily activity log submitted");
      setLogSubmitted(true);
    }
    setSubmittingLog(false);
  };

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
          <HardHat className="h-6 w-6 text-amber-500" />
          {metrics?.display_name ? `${metrics.display_name}'s Stats` : "My Stats"}
        </h1>
        <p className="text-sm text-muted-foreground">Production performance overview</p>
      </div>

      {/* Total Points */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-4xl font-heading font-bold text-amber-500">
                {Math.round(metrics?.points || 0).toLocaleString()}
              </p>
            </div>
            <Star className="h-10 w-10 text-amber-500" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Builds Completed"
          value={metrics?.builds_completed || 0}
          icon={HardHat}
        />
        <StatsCard
          title="Build Issues"
          value={metrics?.build_issues || 0}
          icon={AlertTriangle}
          valueClassName="text-destructive"
        />
        <StatsCard
          title="Checklists Completed"
          value={metrics?.checklists_completed || 0}
          icon={ClipboardCheck}
        />
        <StatsCard
          title="Build Efficiency"
          value={`${Number(metrics?.build_efficiency || 0).toFixed(1)}%`}
          icon={Percent}
        />
      </div>

      {/* Time Clock */}
      <ProductionTimeClockWidget onShiftChange={fetchMetrics} />

      {/* Daily Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daily Activity Log
          </CardTitle>
          <CardDescription>
            Submit your end-of-day summary. This information is sent to the GM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buildsToday">Builds Completed Today</Label>
            <Input
              id="buildsToday"
              type="number"
              min="0"
              value={buildsToday}
              onChange={(e) => setBuildsToday(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summaryNotes">Summary / Notes</Label>
            <Textarea
              id="summaryNotes"
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Describe what was accomplished today, any issues, job addresses..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleSubmitDailyLog}
            disabled={submittingLog}
            className="w-full"
            variant={logSubmitted ? "outline" : "default"}
          >
            {submittingLog && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {logSubmitted ? "Update Daily Log" : "Submit Daily Log"}
          </Button>
          {logSubmitted && (
            <p className="text-xs text-green-600 text-center">
              ✓ Daily log submitted for today
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
