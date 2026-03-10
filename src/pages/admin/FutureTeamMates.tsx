import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, CheckCircle, Phone, Star, AlertTriangle, Archive, ArchiveRestore, CalendarCheck } from "lucide-react";
import { getAlignmentStars, getScoreColor, desiredPositions } from "@/lib/dnaAssessment";
import { ScheduleInterviewModal } from "@/components/admin/ScheduleInterviewModal";
import { format } from "date-fns";
import type { AlignmentCategory } from "@/lib/dnaAssessment";

const statusColors: Record<string, string> = {
  new: "bg-red-500 text-white",
  reviewed: "bg-yellow-500 text-black",
  contacted: "bg-green-500 text-white",
  scheduled_interview: "bg-blue-500 text-white",
  rejected: "bg-gray-400 text-white",
  hired: "bg-blue-700 text-white",
};

export default function FutureTeamMates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [alignmentFilter, setAlignmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [scheduleModal, setScheduleModal] = useState<{ id: string; name: string } | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["job-applications", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("archived", tab === "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("job_applications")
        .update({
          status,
          status_changed_by: user?.id,
          status_changed_at: new Date().toISOString(),
          ...(status === "reviewed" ? { reviewed_by: user?.id, reviewed_at: new Date().toISOString() } : {}),
          ...(status === "contacted" ? { contacted_at: new Date().toISOString() } : {}),
        } as any)
        .eq("id", id);
      if (error) throw error;

      // Trigger notification for contacted stage
      if (status === "contacted") {
        try {
          await supabase.functions.invoke("notify-applicant-stage-change", {
            body: { applicantId: id, newStage: "contacted" },
          });
        } catch (err) {
          console.error("Notification failed:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast({ title: "Status updated" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({
          archived: archive,
          archived_at: archive ? new Date().toISOString() : null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["new-applicants-count"] });
      toast({ title: archive ? "Application archived" : "Application restored" });
    },
  });

  const filtered = useMemo(() => {
    let result = [...applications];
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    if (roleFilter !== "all") result = result.filter((a) => a.desired_position === roleFilter);
    if (alignmentFilter !== "all") result = result.filter((a) => a.alignment_category === alignmentFilter);

    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "score-desc": return (b.dna_score || 0) - (a.dna_score || 0);
        case "name-asc": return a.full_name.localeCompare(b.full_name);
        default: return 0;
      }
    });
    return result;
  }, [applications, statusFilter, roleFilter, alignmentFilter, sortBy]);

  const stats = useMemo(() => ({
    new: applications.filter((a) => a.status === "new").length,
    reviewed: applications.filter((a) => a.status === "reviewed").length,
    contacted: applications.filter((a) => a.status === "contacted").length,
    scheduled_interview: applications.filter((a) => a.status === "scheduled_interview").length,
    hired: applications.filter((a) => a.status === "hired").length,
  }), [applications]);

  const exportCSV = () => {
    const headers = ["Name","Email","Phone","Applied","Current Title","Desired Position","Experience","Availability","DNA Score","Alignment","Recommended Role","Status","Red Flags"];
    const rows = filtered.map((a) => [
      a.full_name, a.email, a.phone,
      format(new Date(a.created_at), "yyyy-MM-dd"),
      a.current_job_title || "", a.desired_position, a.years_experience, a.availability,
      a.dna_score, a.alignment_category, a.recommended_role || "",
      a.status, (a.red_flags as string[])?.join("; ") || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-heading uppercase">Future Team Mates</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Active / Archived tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "archived")}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats */}
      {tab === "active" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(["new", "reviewed", "contacted", "scheduled_interview", "hired"] as const).map((s) => (
            <div key={s} className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-2xl font-heading">{stats[s]}</p>
              <p className="text-xs text-muted-foreground uppercase">{s === "scheduled_interview" ? "Interview" : s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["new", "reviewed", "contacted", "scheduled_interview", "rejected", "hired"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "scheduled_interview" ? "Scheduled Interview" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {desiredPositions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={alignmentFilter} onValueChange={setAlignmentFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alignment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alignment</SelectItem>
            {["Excellent Fit", "Strong Fit", "Moderate Fit", "Marginal Fit", "Low Fit"].map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="score-desc">Highest Score</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading applications...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No applications found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const stars = getAlignmentStars(app.alignment_category as AlignmentCategory);
            const redFlags = (app.red_flags as string[]) || [];
            return (
              <div key={app.id} className="bg-card border border-border rounded-lg p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-lg uppercase">{app.full_name}</h3>
                      <Badge className={`text-xs ${statusColors[app.status] || "bg-muted"}`}>{app.status}</Badge>
                      {redFlags.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" /> {redFlags.length} flag{redFlags.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Applied: {format(new Date(app.created_at), "MMM d, yyyy")} · DNA Score: <span className={`font-semibold ${getScoreColor(app.dna_score)}`}>{app.dna_score}/30</span>
                    </p>
                    <p className="text-sm mt-1">Desired: {app.desired_position} · Recommended: {app.recommended_role}</p>
                    <p className="text-sm text-muted-foreground">{app.years_experience} · {app.availability}</p>
                    {app.interview_scheduled_at && (
                      <p className="text-sm text-blue-600 mt-1">📅 Interview: {format(new Date(app.interview_scheduled_at), "MMM d, yyyy 'at' h:mm a")}</p>
                    )}
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < stars ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{app.alignment_category}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/applicants/${app.id}`)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    {tab === "active" && (
                      <>
                        {app.status === "new" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: app.id, status: "reviewed" })}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Reviewed
                          </Button>
                        )}
                        {(app.status === "new" || app.status === "reviewed") && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: app.id, status: "contacted" })}>
                            <Phone className="w-4 h-4 mr-1" /> Contact
                          </Button>
                        )}
                        {(app.status === "contacted" || app.status === "reviewed") && (
                          <Button size="sm" variant="outline" className="border-blue-500 text-blue-600" onClick={() => setScheduleModal({ id: app.id, name: app.full_name })}>
                            <CalendarCheck className="w-4 h-4 mr-1" /> Schedule Interview
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => archiveMutation.mutate({ id: app.id, archive: true })}
                          className="text-muted-foreground"
                        >
                          <Archive className="w-4 h-4 mr-1" /> Archive
                        </Button>
                      </>
                    )}
                    {tab === "archived" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => archiveMutation.mutate({ id: app.id, archive: false })}
                      >
                        <ArchiveRestore className="w-4 h-4 mr-1" /> Restore
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scheduleModal && (
        <ScheduleInterviewModal
          open={!!scheduleModal}
          onClose={() => setScheduleModal(null)}
          applicantId={scheduleModal.id}
          applicantName={scheduleModal.name}
        />
      )}
    </div>
  );
}
