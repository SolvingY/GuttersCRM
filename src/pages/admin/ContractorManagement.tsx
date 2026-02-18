import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { getScoreColor } from "@/lib/dnaAssessment";
import { format } from "date-fns";
import { ChevronDown, ClipboardList, ExternalLink, UserCheck, Users } from "lucide-react";
import { ContractorProfileSheet } from "@/components/admin/ContractorProfileSheet";

type TabValue = "active" | "onboarding" | "archived";

const roleColors: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  user: "bg-primary text-primary-foreground",
  canvasser: "bg-green-600 text-white",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function getHeatTileClass(score: number): string {
  if (score >= 24) return "bg-green-600";
  if (score >= 18) return "bg-yellow-500";
  if (score >= 12) return "bg-orange-500";
  return "bg-red-600";
}

const DNA_CATEGORIES = [
  { key: "excellent", label: "Excellent Fit", barClass: "bg-green-600", range: "24–30" },
  { key: "strong",    label: "Strong Fit",    barClass: "bg-yellow-500", range: "18–23" },
  { key: "moderate",  label: "Moderate Fit",  barClass: "bg-orange-500", range: "12–17" },
  { key: "marginal",  label: "Marginal Fit",  barClass: "bg-red-400",    range: "6–11"  },
  { key: "low",       label: "Low Fit",       barClass: "bg-red-700",    range: "0–5"   },
] as const;

export default function ContractorManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>("active");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch all data in parallel
  const { data: profiles = [] } = useQuery({
    queryKey: ["cm-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, is_archived, created_at, dna_assessment_pending, last_login_at, login_count");
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

  const assignAssessmentMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ dna_assessment_pending: true } as any)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cm-profiles"] });
      toast({ title: "DNA Assessment assigned", description: "The user will be prompted on their next login." });
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
      const dnaPending = (p as any).dna_assessment_pending ?? false;
      const lastLoginAt = (p as any).last_login_at ?? null;
      const loginCount = (p as any).login_count ?? 0;

      return {
        id: p.id,
        name: sales?.display_name || canvasser?.display_name || p.full_name || "Unknown",
        roles,
        isArchived: p.is_archived ?? false,
        createdAt: p.created_at,
        // Login tracking
        lastLoginAt,
        loginCount,
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
        // Hire info
        hireDate: hireApp?.hired_at,
        startDate: hireApp?.start_date,
        dnaScore: hireApp?.dna_score ?? null,
        alignmentCategory: hireApp?.alignment_category ?? null,
        hasAssessment: !!hireApp,
        hasSalesMetrics: !!sales,
        hasCanvasserMetrics: !!canvasser,
        dnaPending,
      };
    });
  }, [profiles, userRoles, salesMetrics, canvasserMetrics, hiredApps]);

  const filteredUsers = useMemo(() => {
    let list: typeof users;
    switch (tab) {
      case "active":
        list = users.filter((u) => !u.isArchived && u.hasAssessment && !u.dnaPending);
        break;
      case "onboarding":
        list = users.filter((u) => !u.isArchived && (!u.hasAssessment || u.dnaPending));
        break;
      case "archived":
        list = users.filter((u) => u.isArchived);
        break;
      default:
        list = users;
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [users, tab]);

  const stats = useMemo(() => ({
    active: users.filter((u) => !u.isArchived && u.hasAssessment && !u.dnaPending).length,
    onboarding: users.filter((u) => !u.isArchived && (!u.hasAssessment || u.dnaPending)).length,
    archived: users.filter((u) => u.isArchived).length,
  }), [users]);

  // Team DNA heat map stats (Active tab only)
  const teamDNAStats = useMemo(() => {
    const members = users.filter(
      (u) => !u.isArchived && u.hasAssessment && !u.dnaPending && u.dnaScore !== null
    );
    if (members.length === 0) return null;
    const scores = members.map((u) => u.dnaScore as number);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const distribution = {
      excellent: members.filter((u) => (u.dnaScore ?? 0) >= 24).length,
      strong: members.filter((u) => (u.dnaScore ?? 0) >= 18 && (u.dnaScore ?? 0) < 24).length,
      moderate: members.filter((u) => (u.dnaScore ?? 0) >= 12 && (u.dnaScore ?? 0) < 18).length,
      marginal: members.filter((u) => (u.dnaScore ?? 0) >= 6 && (u.dnaScore ?? 0) < 12).length,
      low: members.filter((u) => (u.dnaScore ?? 0) < 6).length,
    };
    const avgCategory =
      avg >= 24 ? "Excellent Fit" :
      avg >= 18 ? "Strong Fit" :
      avg >= 12 ? "Moderate Fit" :
      avg >= 6  ? "Marginal Fit" : "Low Fit";
    return { avg, distribution, members, total: members.length, avgCategory };
  }, [users]);

  const handleOpenProfile = (user: any) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  const handleAssignAssessment = (userId: string) => {
    assignAssessmentMutation.mutate(userId);
    // Update local selected user state too
    if (selectedUser?.id === userId) {
      setSelectedUser((prev: any) => prev ? { ...prev, dnaPending: true } : prev);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading uppercase">Contractor Management</h1>
        <p className="text-sm text-muted-foreground">Team profiles, performance & onboarding CRM</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "Onboarding", value: stats.onboarding, color: "text-yellow-600" },
          { label: "Archived", value: stats.archived, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4 text-center">
            <p className={`text-2xl font-heading ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground uppercase">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="active">
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            Active ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="onboarding">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Onboarding ({stats.onboarding})
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Archived ({stats.archived})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab description */}
      <p className="text-sm text-muted-foreground -mt-2">
        {tab === "active" && "Team members with accounts and completed DNA assessments."}
        {tab === "onboarding" && "Team members who haven't yet completed their DNA assessment."}
        {tab === "archived" && "Former team members no longer active."}
      </p>

      {/* DNA Heat Map — Active tab only */}
      {tab === "active" && teamDNAStats && (
        <Collapsible defaultOpen>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-accent" />
                <div className="text-left">
                  <p className="font-heading text-sm uppercase tracking-wide">Team DNA Intelligence</p>
                  <p className="text-xs text-muted-foreground">
                    Avg Score: <span className="font-bold text-foreground">{teamDNAStats.avg.toFixed(1)}/30</span>
                    {" — "}{teamDNAStats.avgCategory} &bull; {teamDNAStats.total} assessed
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

                {/* Heat tile grid */}
                <div>
                  <p className="text-xs font-heading uppercase text-muted-foreground mb-2">Team Score Map</p>
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                    {teamDNAStats.members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleOpenProfile(member)}
                        title={`${member.name}: ${member.dnaScore}/30`}
                        className={`rounded-md p-2 text-white text-center cursor-pointer transition-opacity hover:opacity-80 ${getHeatTileClass(member.dnaScore as number)}`}
                      >
                        <p className="text-[10px] font-bold truncate leading-tight">{member.name.split(" ")[0]}</p>
                        <p className="text-base font-heading font-black leading-tight">{member.dnaScore}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stacked distribution bar */}
                <div>
                  <p className="text-xs font-heading uppercase text-muted-foreground mb-1.5">Score Distribution</p>
                  <div className="flex h-5 rounded-full overflow-hidden w-full gap-px">
                    {DNA_CATEGORIES.map(({ key, barClass }) => {
                      const count = teamDNAStats.distribution[key];
                      const pct = teamDNAStats.total > 0 ? (count / teamDNAStats.total) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={key}
                          className={`${barClass} flex items-center justify-center`}
                          style={{ width: `${pct}%` }}
                          title={`${count} member${count !== 1 ? "s" : ""} — ${pct.toFixed(0)}%`}
                        >
                          {pct >= 12 && (
                            <span className="text-[10px] font-bold text-white">{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {DNA_CATEGORIES.map(({ key, label, barClass, range }) => {
                    const count = teamDNAStats.distribution[key];
                    const pct = teamDNAStats.total > 0 ? Math.round((count / teamDNAStats.total) * 100) : 0;
                    return (
                      <div key={key} className="text-center bg-muted/40 rounded-md p-2">
                        <div className={`w-3 h-3 rounded-full ${barClass} mx-auto mb-1`} />
                        <p className="text-lg font-heading font-black leading-none">{count}</p>
                        <p className="text-[10px] font-heading uppercase text-muted-foreground mt-0.5">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{range} pts</p>
                        <p className="text-[10px] text-muted-foreground">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* User cards */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No team members in this category.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-card border border-border rounded-lg p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-lg uppercase truncate">{user.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {user.roles.map((role) => (
                      <Badge key={role} className={`text-xs ${roleColors[role] || "bg-muted"}`}>
                        {role}
                      </Badge>
                    ))}
                    {user.salesRank && <Badge variant="outline" className="text-xs">{user.salesRank}</Badge>}
                    {user.canvasserRank && <Badge variant="outline" className="text-xs">{user.canvasserRank}</Badge>}
                    {user.isArchived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
                    {user.dnaPending && (
                      <Badge className="text-xs bg-yellow-100 text-yellow-800">Assessment Pending</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Hire & Login info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {user.hireDate && (
                  <p className="text-xs text-muted-foreground">
                    Hired: {format(new Date(user.hireDate), "MMM d, yyyy")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Last Login: {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy 'at' h:mm a") : "Never"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Logins: {user.loginCount}
                </p>
              </div>

              {/* DNA Score */}
              {user.dnaScore !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs">DNA:</span>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenProfile(user)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Open Profile
                </Button>
                {!user.hasAssessment && !user.dnaPending && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAssignAssessment(user.id)}
                    disabled={assignAssessmentMutation.isPending}
                  >
                    <ClipboardList className="w-3 h-3 mr-1" /> Assign Assessment
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Sheet */}
      <ContractorProfileSheet
        user={selectedUser}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAssignAssessment={handleAssignAssessment}
      />
    </div>
  );
}
