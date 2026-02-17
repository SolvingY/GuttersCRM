import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Star, Copy, ExternalLink, TrendingUp, DollarSign, Target } from "lucide-react";
import { format, subDays } from "date-fns";
import { getScoreColor } from "@/lib/dnaAssessment";

type TabValue = "all" | "active" | "onboarding" | "archived";

const roleColors: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  user: "bg-primary text-primary-foreground",
  canvasser: "bg-green-600 text-white",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function ContractorManagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabValue>("active");

  // Fetch all data in parallel
  const { data: profiles = [] } = useQuery({
    queryKey: ["cm-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["cm-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: salesMetrics = [] } = useQuery({
    queryKey: ["cm-user-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_metrics").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: canvasserMetrics = [] } = useQuery({
    queryKey: ["cm-canvasser-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("canvasser_metrics").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: hiredApps = [] } = useQuery({
    queryKey: ["cm-hired-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("created_user_id, full_name, email, dna_score, alignment_category, hired_at, start_date, desired_position, recommended_role")
        .eq("status", "hired");
      if (error) throw error;
      return data;
    },
  });

  // Build enriched user list
  const users = useMemo(() => {
    const rolesMap = new Map<string, string[]>();
    userRoles.forEach((r) => {
      const list = rolesMap.get(r.user_id) || [];
      list.push(r.role);
      rolesMap.set(r.user_id, list);
    });

    const salesMap = new Map<string, typeof salesMetrics[0]>();
    salesMetrics.forEach((m) => salesMap.set(m.user_id, m));

    const canvasserMap = new Map<string, typeof canvasserMetrics[0]>();
    canvasserMetrics.forEach((m) => canvasserMap.set(m.user_id, m));

    const hiredMap = new Map<string, typeof hiredApps[0]>();
    hiredApps.forEach((a) => {
      if (a.created_user_id) hiredMap.set(a.created_user_id, a);
    });

    return profiles.map((p) => {
      const roles = rolesMap.get(p.id) || ["user"];
      const sales = salesMap.get(p.id);
      const canvasser = canvasserMap.get(p.id);
      const hireApp = hiredMap.get(p.id);

      return {
        id: p.id,
        name: sales?.display_name || canvasser?.display_name || p.full_name || "Unknown",
        roles,
        isArchived: p.is_archived ?? false,
        createdAt: p.created_at,
        // Sales data
        salesRank: sales?.sales_rank,
        approvedRevenue: sales?.approved_revenue ?? 0,
        closedDeals: sales?.closed_deals ?? 0,
        leads: sales?.leads ?? 0,
        points: sales?.points ?? 0,
        yearlyGoal: sales?.yearly_goal ?? 0,
        // Canvasser data
        canvasserRank: canvasser?.canvasser_rank,
        leadsSet: canvasser?.leads_set ?? 0,
        leadsClosed: canvasser?.leads_closed ?? 0,
        canvasserPoints: canvasser?.points ?? 0,
        canvasserIncome: canvasser?.income ?? 0,
        // Hire info
        hireDate: hireApp?.hired_at,
        startDate: hireApp?.start_date,
        dnaScore: hireApp?.dna_score ?? null,
        alignmentCategory: hireApp?.alignment_category ?? null,
        hasAssessment: !!hireApp,
        hasSalesMetrics: !!sales,
        hasCanvasserMetrics: !!canvasser,
      };
    });
  }, [profiles, userRoles, salesMetrics, canvasserMetrics, hiredApps]);

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const filteredUsers = useMemo(() => {
    switch (tab) {
      case "active":
        return users.filter((u) => !u.isArchived);
      case "archived":
        return users.filter((u) => u.isArchived);
      case "onboarding":
        return users.filter((u) => !u.isArchived && u.hireDate && u.hireDate >= thirtyDaysAgo);
      default:
        return users;
    }
  }, [users, tab, thirtyDaysAgo]);

  const copyAssessmentLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url);
    toast({ title: "DNA Assessment link copied!" });
  };

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => !u.isArchived).length,
    onboarding: users.filter((u) => !u.isArchived && u.hireDate && u.hireDate >= thirtyDaysAgo).length,
    archived: users.filter((u) => u.isArchived).length,
  }), [users, thirtyDaysAgo]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading uppercase">Contractor Management</h1>
          <p className="text-sm text-muted-foreground">Team profiles, performance & onboarding CRM</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-heading">{stats.total}</p>
          <p className="text-xs text-muted-foreground uppercase">Total</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-heading">{stats.active}</p>
          <p className="text-xs text-muted-foreground uppercase">Active</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-heading">{stats.onboarding}</p>
          <p className="text-xs text-muted-foreground uppercase">Onboarding</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-heading">{stats.archived}</p>
          <p className="text-xs text-muted-foreground uppercase">Archived</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">All Team</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* User cards */}
      {filteredUsers.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No team members found in this category.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-card border border-border rounded-lg p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading text-lg uppercase">{user.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {user.roles.map((role) => (
                      <Badge key={role} className={`text-xs ${roleColors[role] || "bg-muted"}`}>
                        {role}
                      </Badge>
                    ))}
                    {user.salesRank && (
                      <Badge variant="outline" className="text-xs">{user.salesRank}</Badge>
                    )}
                    {user.canvasserRank && (
                      <Badge variant="outline" className="text-xs">{user.canvasserRank}</Badge>
                    )}
                    {user.isArchived && (
                      <Badge variant="secondary" className="text-xs">Archived</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Hire & DNA info */}
              {user.hireDate && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Hired: {format(new Date(user.hireDate), "MMM d, yyyy")}</p>
                  {user.startDate && <p>Start Date: {format(new Date(user.startDate), "MMM d, yyyy")}</p>}
                </div>
              )}

              {user.dnaScore !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">DNA Score:</span>
                  <span className={`font-heading font-bold ${getScoreColor(user.dnaScore)}`}>
                    {user.dnaScore}/30
                  </span>
                  <span className="text-xs text-muted-foreground">({user.alignmentCategory})</span>
                </div>
              )}

              {/* Performance stats */}
              {user.hasSalesMetrics && (
                <div className="grid grid-cols-3 gap-2 text-center bg-muted/50 rounded-md p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-heading font-bold">{formatCurrency(user.approvedRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contracts</p>
                    <p className="text-sm font-heading font-bold">{user.closedDeals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-sm font-heading font-bold">{Number(user.points).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {user.hasCanvasserMetrics && (
                <div className="grid grid-cols-3 gap-2 text-center bg-muted/50 rounded-md p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Leads Set</p>
                    <p className="text-sm font-heading font-bold">{user.leadsSet}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Closed</p>
                    <p className="text-sm font-heading font-bold">{user.leadsClosed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-sm font-heading font-bold">{Number(user.canvasserPoints).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {!user.hasAssessment && (
                  <Button size="sm" variant="outline" onClick={copyAssessmentLink}>
                    <Copy className="w-3 h-3 mr-1" /> Send DNA Assessment
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
