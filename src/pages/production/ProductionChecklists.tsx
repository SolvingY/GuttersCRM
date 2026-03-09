import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ClipboardCheck, CheckCircle, MapPin, Save } from "lucide-react";
import { format } from "date-fns";
import JobSearchInput from "@/components/shared/JobSearchInput";
import HomeownerFields from "@/components/shared/HomeownerFields";

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

interface Checklist {
  id: string;
  title: string;
  description: string | null;
  checklist_type: string;
  checklist_items: ChecklistItem[];
}

interface Submission {
  id: string;
  completed_at: string;
  job_address: string | null;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  pre_build: "Pre-Build",
  post_build: "Post-Build",
  water_test: "Water Test",
  repair: "Repair",
};

const TYPE_COLORS: Record<string, string> = {
  pre_build: "bg-blue-500",
  post_build: "bg-green-500",
  water_test: "bg-cyan-500",
  repair: "bg-orange-500",
};

export default function ProductionChecklists() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, Submission[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [jobAddress, setJobAddress] = useState("");
  const [checklistNotes, setChecklistNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Job linking & homeowner
  const [linkedJob, setLinkedJob] = useState<{ id: string; label: string } | null>(null);
  const [homeowner, setHomeowner] = useState({ name: "", phone: "", email: "" });
  const [reportNotes, setReportNotes] = useState("");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: checklistData } = await (supabase.from("production_checklists") as any)
      .select("*")
      .eq("is_active", true)
      .order("checklist_type");

    const parsed = (checklistData || []).map((c: any) => ({
      ...c,
      checklist_items: Array.isArray(c.checklist_items) ? c.checklist_items : [],
    }));
    setChecklists(parsed);

    if (user && parsed.length > 0) {
      const subsMap = new Map<string, Submission[]>();
      for (const cl of parsed) {
        const { data: subs } = await (supabase.from("production_checklist_submissions") as any)
          .select("id, completed_at, job_address, notes")
          .eq("checklist_id", cl.id)
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(5);
        subsMap.set(cl.id, subs || []);
      }
      setSubmissions(subsMap);
    }
    setLoading(false);
  };

  const handleOpenChecklist = (checklist: Checklist) => {
    setActiveChecklist(checklist);
    setCheckedItems(new Set());
    setJobAddress("");
    setChecklistNotes("");
    setLinkedJob(null);
    setHomeowner({ name: "", phone: "", email: "" });
    setReportNotes("");
  };

  const handleSubmitChecklist = async () => {
    if (!user || !activeChecklist) return;

    const requiredItems = activeChecklist.checklist_items.filter((i) => i.required);
    const allRequiredChecked = requiredItems.every((i) => checkedItems.has(i.id));
    if (!allRequiredChecked) {
      toast.error("Please complete all required items");
      return;
    }

    setSubmitting(true);
    try {
      const responses: Record<string, boolean> = {};
      activeChecklist.checklist_items.forEach((item) => {
        responses[item.id] = checkedItems.has(item.id);
      });

      const { error: subError } = await (supabase.from("production_checklist_submissions") as any)
        .insert({
          checklist_id: activeChecklist.id,
          user_id: user.id,
          responses,
          job_address: jobAddress || null,
          notes: checklistNotes || null,
          homeowner_name: homeowner.name.trim() || null,
          homeowner_phone: homeowner.phone.trim() || null,
          homeowner_email: homeowner.email.trim() || null,
          job_id: linkedJob?.id || null,
          report_notes: reportNotes.trim() || null,
          report_finalized: false,
          saved_at: new Date().toISOString(),
        });

      if (subError) throw subError;

      // Atomically increment checklists_submitted in daily log
      const today = new Date().toISOString().split("T")[0];
      const { data: existingLog } = await (supabase.from("production_daily_logs") as any)
        .select("id, checklists_submitted")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .maybeSingle();

      if (existingLog) {
        await (supabase.from("production_daily_logs") as any)
          .update({ checklists_submitted: (existingLog.checklists_submitted || 0) + 1 })
          .eq("id", existingLog.id);
      } else {
        await (supabase.from("production_daily_logs") as any)
          .insert({ user_id: user.id, log_date: today, checklists_submitted: 1 });
      }

      toast.success("Checklist submitted!");
      setActiveChecklist(null);
      fetchData();
    } catch (err: any) {
      toast.error("Failed to submit: " + err.message);
    }
    setSubmitting(false);
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
          <ClipboardCheck className="h-6 w-6 text-amber-500" />
          Production Checklists
        </h1>
        <p className="text-sm text-muted-foreground">Complete job site checklists to ensure quality standards</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {checklists.map((cl) => {
          const subs = submissions.get(cl.id) || [];
          return (
            <Card key={cl.id} className="hover:border-amber-500/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{cl.title}</CardTitle>
                    {cl.description && <CardDescription className="mt-1">{cl.description}</CardDescription>}
                  </div>
                  <Badge className={TYPE_COLORS[cl.checklist_type] || "bg-gray-500"}>
                    {TYPE_LABELS[cl.checklist_type] || cl.checklist_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{cl.checklist_items.length} items</p>
                <Button onClick={() => handleOpenChecklist(cl)} className="w-full">
                  Start Checklist
                </Button>
                {subs.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">Recent Submissions</p>
                    {subs.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{format(new Date(s.completed_at), "MMM d, h:mm a")}</span>
                        {s.job_address && <span className="truncate">— {s.job_address}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {checklists.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No checklists available. Contact your admin to set up checklists.
          </CardContent>
        </Card>
      )}

      {/* Checklist Modal */}
      <Dialog open={!!activeChecklist} onOpenChange={() => setActiveChecklist(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeChecklist?.title}</DialogTitle>
          </DialogHeader>
          {activeChecklist && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Job Address</Label>
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-3" />
                  <Input
                    value={jobAddress}
                    onChange={(e) => setJobAddress(e.target.value)}
                    placeholder="Enter job site address"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {activeChecklist.checklist_items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={checkedItems.has(item.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(checkedItems);
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                        setCheckedItems(next);
                      }}
                    />
                    <label htmlFor={`item-${item.id}`} className="text-sm leading-tight cursor-pointer">
                      {item.label}
                      {item.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveChecklist(null)}>Cancel</Button>
            <Button onClick={handleSubmitChecklist} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
