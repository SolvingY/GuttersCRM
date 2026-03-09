import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getScoreColor } from "@/lib/dnaAssessment";
import { format } from "date-fns";
import {
  ChevronDown,
  ClipboardList,
  ExternalLink,
  UserCheck,
  Users,
  CheckCircle,
  Circle,
  AlertTriangle,
  Send,
  Loader2,
  Bell,
  FileText,
  Upload,
  PenLine,
} from "lucide-react";
import { ContractorProfileSheet } from "@/components/admin/ContractorProfileSheet";
import { useAuth } from "@/hooks/useAuth";
import HailAssessmentsTab from "@/components/admin/HailAssessmentsTab";

type TabValue = "active" | "onboarding" | "archived" | "hail-assessments";

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
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>("active");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mandatoryTarget, setMandatoryTarget] = useState<string | null>(null);
  const [showMandatoryDialog, setShowMandatoryDialog] = useState(false);
  const [mandatoryDialogType, setMandatoryDialogType] = useState<string>("document_upload");

  // Fetch all data in parallel
  const { data: profiles = [] } = useQuery({
    queryKey: ["cm-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Onboarding progress for all users
  const { data: allOnboardingProgress = [] } = useQuery({
    queryKey: ["cm-onboarding-progress"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("user_onboarding_progress" as any) as any)
        .select("user_id, step_id, status, step:onboarding_steps(step_key, step_name, step_type, required, sort_order)");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pending mandatory actions for all users
  const { data: pendingMandatoryActions = [], refetch: refetchActions } = useQuery({
    queryKey: ["cm-pending-mandatory-actions"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("mandatory_actions" as any) as any)
        .select("*")
        .eq("status", "pending")
        .eq("blocks_access", true);
      if (error) throw error;
      return data ?? [];
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

  const { data: allReviews = [] } = useQuery({
    queryKey: ["cm-all-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("*")
        .order("review_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
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
      const profileStartDate = (p as any).start_date ?? null;

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
        // Contract info
        hireDate: hireApp?.hired_at,
        startDate: profileStartDate || hireApp?.start_date,
        dnaScore: hireApp?.dna_score ?? null,
        alignmentCategory: hireApp?.alignment_category ?? null,
        hasAssessment: !!hireApp,
        hasSalesMetrics: !!sales,
        hasCanvasserMetrics: !!canvasser,
        dnaPending,
        // Derive from progress data: no records = legacy user = treat as complete.
        // A user is onboarding if they have at least one pending required step.
        onboardingComplete: (() => {
          const userProgress = allOnboardingProgress.filter((op) => op.user_id === p.id);
          if (userProgress.length === 0) return true; // legacy user, no onboarding records
          const hasIncomplete = userProgress.some(
            (op) => (op.step as any)?.required && op.status !== "completed"
          );
          return !hasIncomplete;
        })(),
      };
    });
  }, [profiles, userRoles, salesMetrics, canvasserMetrics, hiredApps, allOnboardingProgress]);

  const filteredUsers = useMemo(() => {
    let list: typeof users;
    switch (tab) {
      case "active":
        list = users.filter((u) => !u.isArchived && u.onboardingComplete);
        break;
      case "onboarding":
        list = users.filter((u) => !u.isArchived && !u.onboardingComplete);
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
    active: users.filter((u) => !u.isArchived && u.onboardingComplete).length,
    onboarding: users.filter((u) => !u.isArchived && !u.onboardingComplete).length,
    archived: users.filter((u) => u.isArchived).length,
  }), [users]);

  // Per-user onboarding helpers
  const getUserOnboarding = (userId: string) => allOnboardingProgress.filter((p: any) => p.user_id === userId);
  const getUserCompletionPct = (userId: string) => {
    const prog = getUserOnboarding(userId);
    if (prog.length === 0) return 0;
    return Math.round((prog.filter((p: any) => p.status === "completed").length / prog.length) * 100);
  };
  const getUserMissingDocs = (userId: string) =>
    getUserOnboarding(userId).filter((p: any) => (p.step as any)?.step_type === "document_upload" && p.status !== "completed");
  const getUserPendingActions = (userId: string) =>
    pendingMandatoryActions.filter((a: any) => a.user_id === userId);

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

  // Quarterly review stats
  const reviewStats = useMemo(() => {
    if (allReviews.length === 0) return null;
    const ratings = allReviews.filter((r) => r.overall_rating != null).map((r) => r.overall_rating as number);
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Group by quarter
    const quarterMap = new Map<string, { total: number; count: number }>();
    allReviews.forEach((r) => {
      if (r.overall_rating == null) return;
      const existing = quarterMap.get(r.quarter) || { total: 0, count: 0 };
      existing.total += r.overall_rating;
      existing.count += 1;
      quarterMap.set(r.quarter, existing);
    });
    const quarters = Array.from(quarterMap.entries())
      .map(([q, { total, count }]) => ({ quarter: q, count, avg: total / count }))
      .sort((a, b) => b.quarter.localeCompare(a.quarter));

    // Latest review per user
    const userLatest = new Map<string, typeof allReviews[0]>();
    allReviews.forEach((r) => {
      if (!userLatest.has(r.user_id)) userLatest.set(r.user_id, r);
    });

    return { avg, total: ratings.length, quarters, userLatest: Array.from(userLatest.values()) };
  }, [allReviews]);

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
          <TabsTrigger value="hail-assessments">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Hail Assessments
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab description */}
      <p className="text-sm text-muted-foreground -mt-2">
        {tab === "active" && "Team members who have completed onboarding."}
        {tab === "onboarding" && "Team members currently working through their onboarding checklist."}
        {tab === "archived" && "Former team members no longer active."}
        {tab === "hail-assessments" && "Submitted commercial hail assessment reports."}
      </p>

      {/* Hail Assessments Tab */}
      {tab === "hail-assessments" && <HailAssessmentsTab />}

      {/* Onboarding Overview — Onboarding tab only */}
      {tab === "onboarding" && filteredUsers.length > 0 && (
        <Collapsible defaultOpen>
          <div className="bg-card border border-amber-200 rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-amber-400" />
                <div className="text-left">
                  <p className="font-heading text-sm uppercase tracking-wide flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Onboarding Alerts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {filteredUsers.length} member{filteredUsers.length !== 1 ? "s" : ""} in progress
                    {pendingMandatoryActions.length > 0 && ` · ${pendingMandatoryActions.length} pending mandatory action${pendingMandatoryActions.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 border-t border-border space-y-3 pt-4">
                {filteredUsers.map((member) => {
                  const pct = getUserCompletionPct(member.id);
                  const missingDocs = getUserMissingDocs(member.id);
                  const pending = getUserPendingActions(member.id);
                  const prog = getUserOnboarding(member.id);
                  return (
                    <div key={member.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{member.name}</p>
                            {member.startDate && (
                              <p className="text-xs text-muted-foreground">
                                Started {format(new Date(member.startDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{pct}%</p>
                            <Progress value={pct} className="w-20 h-1.5 mt-0.5" />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setMandatoryTarget(member.id);
                              setMandatoryDialogType("document_sign");
                              setShowMandatoryDialog(true);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" /> Send Doc
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setMandatoryTarget(member.id);
                              setMandatoryDialogType("document_upload");
                              setShowMandatoryDialog(true);
                            }}
                          >
                            <Send className="w-3 h-3 mr-1" /> Request
                          </Button>
                        </div>
                      </div>

                      {/* Step grid */}
                      {prog.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                          {[...prog]
                            .sort((a: any, b: any) => (a.step?.sort_order || 0) - (b.step?.sort_order || 0))
                            .map((p: any) => (
                              <div
                                key={p.step_id}
                                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                  p.status === "completed"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-muted/50 text-muted-foreground"
                                }`}
                              >
                                {p.status === "completed"
                                  ? <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                                  : <Circle className="w-2.5 h-2.5 shrink-0" />}
                                <span className="truncate">{(p.step as any)?.step_name}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Alerts row */}
                      <div className="flex flex-wrap gap-1.5">
                        {missingDocs.map((d: any) => (
                          <Badge key={d.step_id} variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            Missing: {(d.step as any)?.step_name}
                          </Badge>
                        ))}
                        {pending.map((a: any) => (
                          <Badge key={a.id} variant="outline" className="text-[10px] text-red-700 border-red-300 bg-red-50">
                            Pending: {a.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* DNA Heat Map — Active tab only */}
      {tab === "active" && teamDNAStats && (
        <Collapsible>
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

      {/* Quarterly Reviews — Active tab only */}
      {tab === "active" && reviewStats && (
        <Collapsible>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-primary" />
                <div className="text-left">
                  <p className="font-heading text-sm uppercase tracking-wide">Quarterly Reviews</p>
                  <p className="text-xs text-muted-foreground">
                    Avg Rating: <span className="font-bold text-foreground">{reviewStats.avg.toFixed(1)}/5</span>
                    {" — "}{reviewStats.total} review{reviewStats.total !== 1 ? "s" : ""} total
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

                {/* Quarter breakdown */}
                <div>
                  <p className="text-xs font-heading uppercase text-muted-foreground mb-2">By Quarter</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {reviewStats.quarters.map(({ quarter, count, avg }) => (
                      <div key={quarter} className="bg-muted/40 rounded-md p-3 text-center">
                        <p className="text-xs font-heading uppercase text-muted-foreground">{quarter}</p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= Math.round(avg) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-heading font-bold mt-0.5">{avg.toFixed(1)}/5</p>
                        <p className="text-[10px] text-muted-foreground">{count} review{count !== 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Member latest ratings */}
                <div>
                  <p className="text-xs font-heading uppercase text-muted-foreground mb-2">Latest Member Ratings</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {reviewStats.userLatest.map((review) => {
                      const member = users.find((u) => u.id === review.user_id);
                      return (
                        <div
                          key={review.id}
                          className="bg-muted/40 rounded-md p-2 text-center cursor-pointer hover:bg-muted/60 transition-colors"
                          onClick={() => member && handleOpenProfile(member)}
                        >
                          <p className="text-[10px] font-bold truncate leading-tight">{member?.name || "Unknown"}</p>
                          <div className="flex items-center justify-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= (review.overall_rating ?? 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{review.quarter}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

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
                {(user.startDate || user.hireDate) && (
                  <p className="text-xs text-muted-foreground">
                    Contract Start: {format(new Date(user.startDate || user.hireDate!), "MMM d, yyyy")}
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

      {/* Create Mandatory Action Dialog */}
      <CreateMandatoryActionDialog
        isOpen={showMandatoryDialog}
        onClose={() => { setShowMandatoryDialog(false); setMandatoryTarget(null); }}
        targetUserId={mandatoryTarget}
        defaultActionType={mandatoryDialogType}
        members={users.filter((u) => !u.isArchived)}
        currentUserId={currentUser?.id || ""}
        onCreated={() => {
          refetchActions();
          queryClient.invalidateQueries({ queryKey: ["cm-pending-mandatory-actions"] });
        }}
      />
    </div>
  );
}

// ── Mandatory Action Dialog ──────────────────────────────────────────────────
function CreateMandatoryActionDialog({
  isOpen,
  onClose,
  targetUserId,
  defaultActionType = "document_upload",
  members,
  currentUserId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string | null;
  defaultActionType?: string;
  members: { id: string; name: string }[];
  currentUserId: string;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [form, setForm] = useState({
    userId: targetUserId || "",
    actionType: defaultActionType,
    title: "",
    description: "",
    dueDate: "",
    blocksAccess: true,
  });

  // Sync when props change (dialog re-opened for a new member)
  useMemo(() => {
    setForm((f) => ({
      ...f,
      userId: targetUserId || f.userId,
      actionType: defaultActionType,
    }));
    setFileToUpload(null);
  }, [targetUserId, defaultActionType]);

  const handleCreate = async () => {
    if (!form.userId || !form.title) {
      toast({ title: "Please select a member and enter a title", variant: "destructive" });
      return;
    }
    if (form.actionType === "document_sign" && !fileToUpload) {
      toast({ title: "Please attach a document for the contractor to sign", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let fileUrl: string | null = null;

      // Upload document if provided
      if (fileToUpload) {
        const filePath = `signed-docs/${form.userId}/${Date.now()}_${fileToUpload.name}`;
        const { error: uploadError } = await supabase.storage
          .from("contractor-files")
          .upload(filePath, fileToUpload);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("contractor-files").getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;

        // Track in contractor_files
        await supabase.from("contractor_files").insert({
          user_id: form.userId,
          file_name: fileToUpload.name,
          file_path: filePath,
          file_type: fileToUpload.type,
          file_size: fileToUpload.size,
          uploaded_by: currentUserId,
          description: form.title,
          requires_signature: form.actionType === "document_sign",
        } as any);
      }

      const { error } = await (supabase.from("mandatory_actions" as any) as any).insert({
        user_id: form.userId,
        requested_by: currentUserId,
        action_type: form.actionType,
        title: form.title,
        description: form.description || null,
        due_date: form.dueDate || null,
        blocks_access: form.blocksAccess,
        file_url: fileUrl,
      });
      if (error) throw error;

      onCreated();
      toast({ title: "Action created", description: `"${form.title}" sent to team member.` });
      onClose();
      setForm({ userId: "", actionType: "document_upload", title: "", description: "", dueDate: "", blocksAccess: true });
      setFileToUpload(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isDocSign = form.actionType === "document_sign";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase flex items-center gap-2">
            {isDocSign ? <PenLine className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {isDocSign ? "Send Document for Signing" : "Request Mandatory Action"}
          </DialogTitle>
          <DialogDescription>
            {isDocSign
              ? "Upload a document (offer letter, contract, etc.) — the contractor will review and e-sign it on their next login."
              : "Creates a required action that blocks dashboard access until the team member completes it."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Team Member</Label>
            <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Action Type</Label>
            <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document_sign">Document for Signing (e-signature)</SelectItem>
                <SelectItem value="document_upload">Document Upload (contractor uploads)</SelectItem>
                <SelectItem value="info_update">Information Update</SelectItem>
                <SelectItem value="policy_ack">Policy Acknowledgment</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isDocSign ? "e.g., Offer Letter — Sign to Accept" : "e.g., Upload updated W-9"}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder={isDocSign ? "Instructions for the contractor before signing..." : "Additional details..."}
            />
          </div>

          {/* Document upload — required for document_sign, optional otherwise */}
          {(isDocSign || form.actionType === "document_upload") && (
            <div>
              <Label>{isDocSign ? "Document to Sign *" : "Attach Document (optional)"}</Label>
              <div
                className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  fileToUpload ? "border-green-400 bg-green-50" : "border-border hover:border-accent"
                }`}
                onClick={() => document.getElementById("admin-doc-upload")?.click()}
              >
                {fileToUpload ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">{fileToUpload.name}</span>
                    <span className="text-xs text-muted-foreground">({(fileToUpload.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="w-6 h-6" />
                    <p className="text-sm">Click to choose file</p>
                    <p className="text-xs">PDF, DOC, DOCX, PNG, JPG</p>
                  </div>
                )}
              </div>
              <input
                id="admin-doc-upload"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)}
              />
              {fileToUpload && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive mt-1"
                  onClick={() => setFileToUpload(null)}
                >
                  Remove file
                </button>
              )}
            </div>
          )}

          <div>
            <Label>Due Date (optional)</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="blocks"
              checked={form.blocksAccess}
              onChange={(e) => setForm({ ...form, blocksAccess: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="blocks" className="text-sm">Block dashboard access until completed</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isDocSign ? "Uploading..." : "Creating..."}</>
              ) : isDocSign ? (
                <><PenLine className="w-4 h-4 mr-2" /> Send for Signing</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Create Action</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
