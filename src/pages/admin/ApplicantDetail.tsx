import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, CheckCircle, XCircle, UserCheck, ChevronDown, AlertTriangle, Star, Save, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  dnaQuestions,
  dnaCategories,
  getCategoryScore,
  getScoreColor,
  getScoreBarColor,
  getAlignmentStars,
} from "@/lib/dnaAssessment";
import type { AlignmentCategory } from "@/lib/dnaAssessment";

export default function ApplicantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [dnaOpen, setDnaOpen] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ["job-application", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  if (app && !notesLoaded) {
    setAdminNotes(app.admin_notes || "");
    setInterviewNotes(app.interview_notes || "");
    setNotesLoaded(true);
  }

  const updateApp = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("job_applications")
        .update({ ...updates, status_changed_by: user?.id, status_changed_at: new Date().toISOString() } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-application", id] });
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast({ title: "Updated successfully" });
    },
  });

  const saveNotes = () => {
    updateApp.mutate({ admin_notes: adminNotes, interview_notes: interviewNotes });
  };

  const changeStatus = (status: string) => {
    const extra: Record<string, any> = { status };
    if (status === "reviewed") {
      extra.reviewed_at = new Date().toISOString();
    }
    if (status === "contacted") {
      extra.contacted_at = new Date().toISOString();
    }
    updateApp.mutate(extra);
  };

  if (isLoading) return <p className="text-muted-foreground text-center py-16">Loading...</p>;
  if (!app) return <p className="text-destructive text-center py-16">Application not found.</p>;

  const answers = (app.dna_answers || {}) as Record<string, "A" | "B">;
  const redFlags = (app.red_flags || []) as string[];
  const stars = getAlignmentStars(app.alignment_category as AlignmentCategory);
  const scorePercent = Math.round((app.dna_score / 20) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/applicants")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to All Applicants
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl uppercase">{app.full_name}</h1>
          <p className="text-sm text-muted-foreground">Applied {format(new Date(app.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
        </div>
        <Select value={app.status} onValueChange={changeStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["new", "reviewed", "contacted", "rejected", "hired"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Basic Info */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading uppercase text-sm text-accent">Basic Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${app.email}`} className="text-accent hover:underline">{app.email}</a></div>
          <div><span className="text-muted-foreground">Phone:</span> {app.phone}</div>
          <div><span className="text-muted-foreground">Current Title:</span> {app.current_job_title || "—"}</div>
        </div>
      </div>

      {/* Position */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading uppercase text-sm text-accent">Position & Experience</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">Desired:</span> {app.desired_position}</div>
          <div><span className="text-muted-foreground">Experience:</span> {app.years_experience}</div>
          <div><span className="text-muted-foreground">Availability:</span> {app.availability}</div>
        </div>
      </div>

      {/* DNA Assessment */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading uppercase text-sm text-accent">NGR DNA Assessment</h2>

        {/* Score gauge */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-end gap-2 mb-1">
              <span className={`text-3xl font-heading ${getScoreColor(app.dna_score)}`}>{app.dna_score}/20</span>
              <span className="text-sm text-muted-foreground">({scorePercent}%)</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getScoreBarColor(app.dna_score)}`} style={{ width: `${scorePercent}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < stars ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
            ))}
            <span className="ml-1 font-semibold">{app.alignment_category}</span>
          </div>
          <div><span className="text-muted-foreground">Recommended:</span> {app.recommended_role}</div>
        </div>

        {/* Red flags */}
        {redFlags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {redFlags.map((flag, i) => (
              <Badge key={i} variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" /> {flag}
              </Badge>
            ))}
          </div>
        )}

        {/* Detailed breakdown */}
        <Collapsible open={dnaOpen} onOpenChange={setDnaOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              View Detailed DNA Breakdown
              <ChevronDown className={`w-4 h-4 transition-transform ${dnaOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {dnaCategories.map((cat) => {
              const { earned, total } = getCategoryScore(answers, cat);
              const allB = earned === total;
              return (
                <div key={cat.name} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading uppercase text-sm">{cat.name}</h3>
                    <span className={`text-sm font-semibold ${allB ? "text-green-600" : earned >= total / 2 ? "text-yellow-600" : "text-red-600"}`}>
                      {earned}/{total} {allB ? "✅" : "⚠"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cat.questionIds.map((qId) => {
                      const q = dnaQuestions.find((dq) => dq.id === qId)!;
                      const ans = answers[qId];
                      const isB = ans === "B";
                      return (
                        <div key={qId} className="flex items-start gap-2 text-xs">
                          <span className={`mt-0.5 ${isB ? "text-green-600" : "text-red-500"}`}>{isB ? "✓" : "✗"}</span>
                          <span className="text-muted-foreground">Q{q.number}:</span>
                          <span>{isB ? q.optionB : q.optionA} ({ans})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Narratives */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <h2 className="font-heading uppercase text-sm text-accent">Narrative Responses</h2>
        <div>
          <h3 className="font-heading text-sm uppercase mb-1">1. The Ownership Standard</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.narrative_ownership}</p>
        </div>
        <div>
          <h3 className="font-heading text-sm uppercase mb-1">2. The Mentor Mindset</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.narrative_mentor}</p>
        </div>
        <div>
          <h3 className="font-heading text-sm uppercase mb-1">3. The "Next Gen" Why</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.narrative_why_ngr}</p>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading uppercase text-sm text-accent">Admin Notes</h2>
        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4} placeholder="Add private notes..." />
        <Button size="sm" onClick={saveNotes} disabled={updateApp.isPending}>
          <Save className="w-4 h-4 mr-1" /> Save Notes
        </Button>
      </div>

      {/* Interview Notes */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="font-heading uppercase text-sm text-accent">Interview Notes</h2>
        </div>
        <Textarea value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} rows={4} placeholder="Add interview details..." />
        <p className="text-xs text-muted-foreground italic">📅 Full calendar integration coming soon.</p>
        <Button size="sm" onClick={saveNotes} disabled={updateApp.isPending}>
          <Save className="w-4 h-4 mr-1" /> Save Notes
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <a href={`mailto:${app.email}`}>
          <Button variant="outline"><Mail className="w-4 h-4 mr-1" /> Send Email</Button>
        </a>
        <Button variant="outline" onClick={() => changeStatus("contacted")}>
          <Phone className="w-4 h-4 mr-1" /> Mark as Contacted
        </Button>
        <Button variant="outline" onClick={() => changeStatus("hired")} className="border-blue-500 text-blue-600 hover:bg-blue-50">
          <UserCheck className="w-4 h-4 mr-1" /> Move to Hired
        </Button>
        <Button variant="outline" onClick={() => changeStatus("rejected")} className="border-destructive text-destructive hover:bg-destructive/10">
          <XCircle className="w-4 h-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}
