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
import { ArrowLeft, Mail, Phone, XCircle, UserCheck, ChevronDown, AlertTriangle, Star, Save, Calendar, FileText, CheckCircle, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import {
  dnaQuestions,
  dnaCategories,
  getCategoryScore,
  getScoreColor,
  getScoreBarColor,
  getAlignmentStars,
  getPositiveIndicators,
  getQuestionWeight,
  getQuestionWeightLabel,
  MAX_SCORE,
  QUESTION_WEIGHTS,
} from "@/lib/dnaAssessment";
import type { AlignmentCategory } from "@/lib/dnaAssessment";
import { HireApplicantDialog } from "@/components/admin/HireApplicantDialog";

function generateHTMLReport(app: any) {
  const answers = (app.dna_answers || {}) as Record<string, "A" | "B">;
  const redFlags = (app.red_flags || []) as string[];
  const positiveIndicators = getPositiveIndicators(answers);
  const score = app.dna_score || 0;
  const percentage = Math.round((score / MAX_SCORE) * 100);

  const scoreColor = score >= 24 ? "#16a34a" : score >= 18 ? "#eab308" : score >= 12 ? "#f97316" : "#dc2626";

  const categoryHTML = dnaCategories.map((cat) => {
    const { earned, total } = getCategoryScore(answers, cat);
    const questionsHTML = cat.questionIds.map((qId) => {
      const q = dnaQuestions.find((dq) => dq.id === qId)!;
      const ans = answers[qId];
      const isB = ans === "B";
      const weight = getQuestionWeight(qId);
      const weightLabel = weight >= 2 ? ` <span style="background:#fef3c7;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;color:#92400e;">${getQuestionWeightLabel(qId)}</span>` : "";
      return `<div style="margin:8px 0;padding-left:20px;font-size:13px;">
        <span style="color:${isB ? "#16a34a" : "#dc2626"};">${isB ? "✓" : "✗"}</span>
        <strong>Q${q.number}:</strong>
        ${isB ? q.optionB : q.optionA} (${ans})${weightLabel}
      </div>`;
    }).join("");

    return `<div style="margin:20px 0;padding:15px;background:#f9fafb;border-radius:6px;">
      <h3 style="margin:0 0 10px;color:#374151;">${cat.name} (${earned}/${total})</h3>
      ${questionsHTML}
    </div>`;
  }).join("");

  const positiveHTML = positiveIndicators.length > 0
    ? `<div style="margin:15px 0;"><h4>Positive Indicators</h4>${positiveIndicators.map((i) => `<div style="background:#dcfce7;padding:8px 12px;margin:5px 0;border-left:4px solid #16a34a;border-radius:4px;color:#166534;">✓ ${i}</div>`).join("")}</div>`
    : "";

  const redFlagsHTML = redFlags.length > 0
    ? `<div style="margin:15px 0;"><h4>Areas to Explore</h4>${redFlags.map((f) => `<div style="background:#fee2e2;padding:8px 12px;margin:5px 0;border-left:4px solid #dc2626;border-radius:4px;color:#991b1b;">⚠ ${f}</div>`).join("")}</div>`
    : "";

  const htmlContent = `<!DOCTYPE html>
<html><head><title>Job Application - ${app.full_name}</title>
<style>
  body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:900px;margin:40px auto;padding:20px;line-height:1.6;}
  .header{background:#dc2626;color:white;padding:30px;border-radius:8px;margin-bottom:30px;}
  .header h1{margin:0 0 10px;font-size:28px;}
  .section{margin:30px 0;padding:25px;border:1px solid #e5e5e5;border-radius:8px;}
  .section h2{margin-top:0;color:#1f2937;border-bottom:2px solid #dc2626;padding-bottom:10px;}
  .narrative{background:#f9fafb;padding:15px;border-left:3px solid #9ca3af;margin:15px 0;white-space:pre-wrap;}
  @media print{.no-print{display:none;}body{margin:0;}.section{page-break-inside:avoid;}}
</style></head><body>
<div class="header">
  <h1>Next Generation Roofing</h1>
  <p>Job Application Assessment</p>
  <p><strong>Applicant:</strong> ${app.full_name}</p>
  <p><strong>Applied:</strong> ${format(new Date(app.created_at), "MMMM d, yyyy")}</p>
</div>
<div class="section"><h2>Basic Information</h2>
  <p><strong>Email:</strong> ${app.email}</p>
  <p><strong>Phone:</strong> ${app.phone}</p>
  <p><strong>Current Title:</strong> ${app.current_job_title || "N/A"}</p>
</div>
<div class="section"><h2>Position & Experience</h2>
  <p><strong>Desired Position:</strong> ${app.desired_position}</p>
  <p><strong>Years of Experience:</strong> ${app.years_experience}</p>
  <p><strong>Availability:</strong> ${app.availability}</p>
</div>
<div class="section"><h2>NGR DNA Assessment</h2>
  <div style="font-size:48px;font-weight:bold;color:${scoreColor};margin:20px 0;">${score}/${MAX_SCORE} (${percentage}%)</div>
  <p><strong>Alignment:</strong> ${app.alignment_category}</p>
  <p><strong>Recommended Role:</strong> ${app.recommended_role}</p>
  ${positiveHTML}${redFlagsHTML}
  <h3>Detailed Category Breakdown</h3>
  ${categoryHTML}
</div>
<div class="section"><h2>Narrative Responses</h2>
  <h3>1. The Ownership Standard</h3>
  <div class="narrative">${app.narrative_ownership}</div>
  <h3>2. The Mentor Mindset</h3>
  <div class="narrative">${app.narrative_mentor}</div>
  <h3>3. The "Next Gen" Why</h3>
  <div class="narrative">${app.narrative_why_ngr}</div>
</div>
${app.admin_notes ? `<div class="section"><h2>Admin Notes</h2><div class="narrative">${app.admin_notes}</div></div>` : ""}
${app.interview_notes ? `<div class="section"><h2>Interview Notes</h2><div class="narrative">${app.interview_notes}</div></div>` : ""}
<div class="no-print" style="text-align:center;margin:40px 0;">
  <button onclick="window.print()" style="background:#dc2626;color:white;border:none;padding:12px 30px;border-radius:6px;font-size:16px;cursor:pointer;">🖨️ Print / Save as PDF</button>
</div>
</body></html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

export default function ApplicantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [dnaOpen, setDnaOpen] = useState(false);
  const [showHireDialog, setShowHireDialog] = useState(false);

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
    if (status === "reviewed") extra.reviewed_at = new Date().toISOString();
    if (status === "contacted") extra.contacted_at = new Date().toISOString();
    updateApp.mutate(extra);
  };

  if (isLoading) return <p className="text-muted-foreground text-center py-16">Loading...</p>;
  if (!app) return <p className="text-destructive text-center py-16">Application not found.</p>;

  const answers = (app.dna_answers || {}) as Record<string, "A" | "B">;
  const redFlags = (app.red_flags || []) as string[];
  const positiveIndicators = getPositiveIndicators(answers);
  const stars = getAlignmentStars(app.alignment_category as AlignmentCategory);
  const scorePercent = Math.round((app.dna_score / MAX_SCORE) * 100);

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
              <span className={`text-3xl font-heading ${getScoreColor(app.dna_score)}`}>{app.dna_score}/{MAX_SCORE}</span>
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

        {/* Positive Indicators */}
        {positiveIndicators.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {positiveIndicators.map((indicator, i) => (
              <Badge key={i} className="text-xs bg-green-50 text-green-800 border-l-4 border-green-500 hover:bg-green-100">
                <CheckCircle className="w-3 h-3 mr-1" /> {indicator}
              </Badge>
            ))}
          </div>
        )}

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
              const allCorrect = earned === total;
              return (
                <div key={cat.name} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading uppercase text-sm">{cat.name}</h3>
                    <span className={`text-sm font-semibold ${allCorrect ? "text-green-600" : earned >= total / 2 ? "text-yellow-600" : "text-red-600"}`}>
                      {earned}/{total} {allCorrect ? "✅" : "⚠"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cat.questionIds.map((qId) => {
                      const q = dnaQuestions.find((dq) => dq.id === qId)!;
                      const ans = answers[qId];
                      const isB = ans === "B";
                      const weight = getQuestionWeight(qId);
                      return (
                        <div key={qId} className="border border-border rounded p-2 text-xs space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <span>Q{q.number}</span>
                            {weight >= 2 && (
                              <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">
                                {getQuestionWeightLabel(qId)}
                              </span>
                            )}
                            <span className={`ml-auto ${isB ? "text-green-600" : "text-red-500"}`}>
                              Selected: {ans}
                            </span>
                          </div>
                          <div className={`flex items-start gap-2 p-1.5 rounded ${ans === "A" ? "bg-red-50 border border-red-200" : "bg-muted/50"}`}>
                            <span className="font-semibold text-muted-foreground shrink-0">A:</span>
                            <span>{q.optionA}</span>
                            {ans === "A" && <span className="ml-auto shrink-0 text-red-600 font-semibold">← Selected</span>}
                          </div>
                          <div className={`flex items-start gap-2 p-1.5 rounded ${ans === "B" ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}>
                            <span className="font-semibold text-muted-foreground shrink-0">B:</span>
                            <span>{q.optionB}</span>
                            {ans === "B" && <span className="ml-auto shrink-0 text-green-600 font-semibold">✓ Selected</span>}
                            {ans !== "B" && <span className="ml-auto shrink-0 text-muted-foreground italic">Correct answer</span>}
                          </div>
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
        <Button variant="outline" onClick={() => generateHTMLReport(app)}>
          <FileText className="w-4 h-4 mr-1" /> Export to PDF
        </Button>
        <Button variant="outline" onClick={() => setShowHireDialog(true)} className="border-blue-500 text-blue-600 hover:bg-blue-50">
          <UserCheck className="w-4 h-4 mr-1" /> Move to Hired
        </Button>
        {!app.archived ? (
          <Button
            variant="outline"
            onClick={() => {
              updateApp.mutate({ archived: true, archived_at: new Date().toISOString() });
            }}
            className="text-muted-foreground"
          >
            <Archive className="w-4 h-4 mr-1" /> Archive
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              updateApp.mutate({ archived: false, archived_at: null });
            }}
          >
            <ArchiveRestore className="w-4 h-4 mr-1" /> Restore
          </Button>
        )}
        <Button variant="outline" onClick={() => changeStatus("rejected")} className="border-destructive text-destructive hover:bg-destructive/10">
          <XCircle className="w-4 h-4 mr-1" /> Reject
        </Button>
      </div>

      {/* Hire Dialog */}
      <HireApplicantDialog
        isOpen={showHireDialog}
        onClose={() => setShowHireDialog(false)}
        applicant={app}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["job-application", id] });
          queryClient.invalidateQueries({ queryKey: ["job-applications"] });
        }}
      />
    </div>
  );
}
