import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CanvasserMetrics {
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  points: number;
}

export default function CanvasserStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CanvasserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

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
    setLoading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">Track your canvassing performance</p>
      </div>

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

      {/* Points Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Total Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold text-primary">
            {metrics?.points?.toLocaleString() ?? 0}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Points earned from all activities
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
