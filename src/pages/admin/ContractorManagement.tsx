import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getScoreColor } from "@/lib/dnaAssessment";
import { format } from "date-fns";
import { ClipboardList, ExternalLink, UserCheck, Users } from "lucide-react";
import { ContractorProfileSheet } from "@/components/admin/ContractorProfileSheet";

type TabValue = "active" | "onboarding" | "archived";

const roleColors: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  user: "bg-primary text-primary-foreground",
  canvasser: "bg-green-600 text-white",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

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
    switch (tab) {
      case "active":
        // Active = not archived AND has assessment (fully onboarded)
        return users.filter((u) => !u.isArchived && u.hasAssessment && !u.dnaPending);
      case "onboarding":
        // Onboarding = not archived AND (no assessment OR assessment pending)
        return users.filter((u) => !u.isArchived && (!u.hasAssessment || u.dnaPending));
      case "archived":
        return users.filter((u) => u.isArchived);
      default:
        return users;
    }
  }, [users, tab]);

  const stats = useMemo(() => ({
    active: users.filter((u) => !u.isArchived && u.hasAssessment && !u.dnaPending).length,
    onboarding: users.filter((u) => !u.isArchived && (!u.hasAssessment || u.dnaPending)).length,
    archived: users.filter((u) => u.isArchived).length,
  }), [users]);

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

              {/* Hire info */}
              {user.hireDate && (
                <p className="text-xs text-muted-foreground">
                  Hired: {format(new Date(user.hireDate), "MMM d, yyyy")}
                </p>
              )}

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
