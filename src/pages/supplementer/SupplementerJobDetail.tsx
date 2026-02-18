import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface JobData {
  id: string;
  job_number: string | null;
  client_name: string;
  property_address: string | null;
  insurance_carrier: string | null;
  claim_number: string | null;
  original_rcv: number;
  statement_of_loss_rcv: number;
  rcv_increase: number;
  depreciation_amount: number;
  code_upgrade_amount: number;
  money_collected: number;
  coc_completed_at: string | null;
  coc_completion_days: number | null;
  coc_bonus_points: number;
  depreciation_released_at: string | null;
  depreciation_release_days: number | null;
  code_released_at: string | null;
  code_release_days: number | null;
  revised_scope_received_at: string | null;
  revised_scope_days: number | null;
  status: string;
  notes: string | null;
  assigned_at: string;
}

export default function SupplementerJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<JobData>>({});

  useEffect(() => {
    if (id && user) fetchJob();
  }, [id, user]);

  const fetchJob = async () => {
    const { data, error } = await supabase
      .from("supplement_jobs")
      .select("*")
      .eq("id", id!)
      .single();

    if (error) {
      console.error("Error fetching job:", error);
      toast({ title: "Error", description: "Job not found", variant: "destructive" });
      navigate("/supplementer/jobs");
      return;
    }

    setJob(data);
    setForm({
      job_number: data.job_number,
      client_name: data.client_name,
      property_address: data.property_address,
      insurance_carrier: data.insurance_carrier,
      claim_number: data.claim_number,
      original_rcv: data.original_rcv,
      statement_of_loss_rcv: data.statement_of_loss_rcv,
      depreciation_amount: data.depreciation_amount,
      code_upgrade_amount: data.code_upgrade_amount,
      money_collected: data.money_collected,
      coc_completed_at: data.coc_completed_at ? data.coc_completed_at.slice(0, 10) : null,
      depreciation_released_at: data.depreciation_released_at ? data.depreciation_released_at.slice(0, 10) : null,
      code_released_at: data.code_released_at ? data.code_released_at.slice(0, 10) : null,
      revised_scope_received_at: data.revised_scope_received_at ? data.revised_scope_received_at.slice(0, 10) : null,
      status: data.status,
      notes: data.notes,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);

    const updateData: Record<string, any> = {
      job_number: form.job_number || null,
      client_name: form.client_name,
      property_address: form.property_address || null,
      insurance_carrier: form.insurance_carrier || null,
      claim_number: form.claim_number || null,
      original_rcv: Number(form.original_rcv) || 0,
      statement_of_loss_rcv: Number(form.statement_of_loss_rcv) || 0,
      depreciation_amount: Number(form.depreciation_amount) || 0,
      code_upgrade_amount: Number(form.code_upgrade_amount) || 0,
      money_collected: Number(form.money_collected) || 0,
      coc_completed_at: form.coc_completed_at || null,
      depreciation_released_at: form.depreciation_released_at || null,
      code_released_at: form.code_released_at || null,
      revised_scope_received_at: form.revised_scope_received_at || null,
      status: form.status,
      notes: form.notes || null,
      last_modified_by: user.id,
    };

    if (form.status === "completed" && job?.status !== "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("supplement_jobs")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Job updated successfully." });
      fetchJob();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return null;

  const rcvIncrease = (Number(form.statement_of_loss_rcv) || 0) - (Number(form.original_rcv) || 0);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/supplementer/jobs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{job.client_name}</h1>
          <p className="text-sm text-muted-foreground">{job.job_number || "No job number"}</p>
        </div>
      </div>

      {/* Job Info */}
      <Card>
        <CardHeader><CardTitle>Job Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={form.client_name || ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Job Number</Label>
              <Input value={form.job_number || ""} onChange={(e) => setForm({ ...form, job_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Insurance Carrier</Label>
              <Input value={form.insurance_carrier || ""} onChange={(e) => setForm({ ...form, insurance_carrier: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Claim Number</Label>
              <Input value={form.claim_number || ""} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Property Address</Label>
            <Input value={form.property_address || ""} onChange={(e) => setForm({ ...form, property_address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="coc_pending">COC Pending</SelectItem>
                <SelectItem value="depreciation_pending">Depreciation Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <Card>
        <CardHeader><CardTitle>Financial Metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Original RCV ($)</Label>
              <Input type="number" min={0} value={form.original_rcv ?? 0} onChange={(e) => setForm({ ...form, original_rcv: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Statement of Loss RCV ($)</Label>
              <Input type="number" min={0} value={form.statement_of_loss_rcv ?? 0} onChange={(e) => setForm({ ...form, statement_of_loss_rcv: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>RCV Increase (auto-calculated)</Label>
              <Input type="number" value={rcvIncrease} disabled className="bg-muted font-bold" />
            </div>
            <div className="space-y-2">
              <Label>Depreciation Amount ($)</Label>
              <Input type="number" min={0} value={form.depreciation_amount ?? 0} onChange={(e) => setForm({ ...form, depreciation_amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Code Upgrade Amount ($)</Label>
              <Input type="number" min={0} value={form.code_upgrade_amount ?? 0} onChange={(e) => setForm({ ...form, code_upgrade_amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Money Collected ($)</Label>
              <Input type="number" min={0} value={form.money_collected ?? 0} onChange={(e) => setForm({ ...form, money_collected: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing Milestones */}
      <Card>
        <CardHeader><CardTitle>Timing Milestones</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>COC Completed Date</Label>
              <Input type="date" value={form.coc_completed_at || ""} onChange={(e) => setForm({ ...form, coc_completed_at: e.target.value || null })} />
              {job.coc_completion_days !== null && (
                <div className="flex items-center gap-2 mt-1 p-2 rounded bg-muted/50">
                  <span className="text-sm">{job.coc_completion_days} days</span>
                  {job.coc_bonus_points > 0 && (
                    <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      +{job.coc_bonus_points} pts
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Depreciation Released Date</Label>
              <Input type="date" value={form.depreciation_released_at || ""} onChange={(e) => setForm({ ...form, depreciation_released_at: e.target.value || null })} />
              {job.depreciation_release_days !== null && (
                <p className="text-sm text-muted-foreground mt-1">{job.depreciation_release_days} days</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Code Released Date</Label>
              <Input type="date" value={form.code_released_at || ""} onChange={(e) => setForm({ ...form, code_released_at: e.target.value || null })} />
              {job.code_release_days !== null && (
                <p className="text-sm text-muted-foreground mt-1">{job.code_release_days} days</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Revised Scope Received Date</Label>
              <Input type="date" value={form.revised_scope_received_at || ""} onChange={(e) => setForm({ ...form, revised_scope_received_at: e.target.value || null })} />
              {job.revised_scope_days !== null && (
                <p className="text-sm text-muted-foreground mt-1">{job.revised_scope_days} days</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Add notes about this job..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}
