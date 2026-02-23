import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Home, Droplets, Wrench, MapPin, Phone, Mail, Clock, CheckCircle, XCircle, Loader2, CalendarClock, AlarmClockPlus, Calculator, FileText, CalendarDays, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { QuoteApprovalSection } from "@/components/admin/QuoteApprovalSection";
import { LeadActivityLog } from "@/components/admin/LeadActivityLog";
import { Badge } from "@/components/ui/badge";
import { getLeadSourceIcon, getLeadSourceLabel } from "@/lib/leadSourceConfig";
import NGRGutterCalculator from "@/components/NGRGutterCalculator";
import { LeadFilesSection } from "@/components/admin/LeadFilesSection";
import { LeadSchedulingPayments } from "@/components/lead/LeadSchedulingPayments";

const serviceLabels: Record<string, string> = {
  commercial: "Commercial Roofing",
  residential: "Residential Roofing",
  gutters: "Gutters & Protection",
  repair: "Repair Work",
};

const serviceIcons: Record<string, any> = { commercial: Building2, residential: Home, gutters: Droplets, repair: Wrench };

const statusOptions = ["new", "contacted", "quoted", "won", "lost", "scheduled", "completed"];
const lostReasons = ["Price too high", "Chose competitor", "Project cancelled", "No response", "Timeline didn't work", "Other"];

export default function LeadDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lostReason, setLostReason] = useState("");
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<any>(null);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .eq("id", id)
        .eq("assigned_to", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: estimates = [], refetch: refetchEstimates } = useQuery({
    queryKey: ["lead-estimates", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gutter_estimates")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: leadForms = [] } = useQuery({
    queryKey: ["lead-forms", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_forms")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const updateLead = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("quote_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-leads"] });
      toast({ title: "Lead updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  if (!lead) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">This lead is not assigned to you or does not exist.</p>
        <Button variant="ghost" onClick={() => navigate("/dashboard/my-leads")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to My Leads
        </Button>
      </div>
    );
  }

  const ServiceIcon = serviceIcons[lead.service_type] || Building2;
  const formData = (lead.form_data || {}) as Record<string, any>;

  const renderFormData = () => {
    const entries = Object.entries(formData).filter(([k]) => k !== "photoUrls");
    if (entries.length === 0) return <p className="text-sm text-muted-foreground">No details provided</p>;
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1">
            <span className="text-xs text-muted-foreground capitalize min-w-[140px]">
              {key.replace(/([A-Z])/g, " $1").trim()}:
            </span>
            <span className="text-sm font-medium">
              {Array.isArray(value) ? value.join(", ") : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleLogFollowup = async () => {
    await supabase.from("lead_activity_log").insert({
      lead_id: lead.id,
      user_id: user?.id,
      activity_type: "followup",
      content: "Follow-up completed",
    });
    updateLead.mutate({
      next_followup_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      last_followup_at: new Date().toISOString(),
      followup_count: (lead.followup_count || 0) + 1,
    });
    queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
  };

  const handleSnooze = () => {
    const current = lead.next_followup_due ? new Date(lead.next_followup_due) : new Date();
    updateLead.mutate({
      next_followup_due: new Date(current.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard/my-leads")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to My Leads
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-secondary rounded-lg">
            <ServiceIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl uppercase">{lead.full_name}</h1>
              {(() => {
                const LeadSourceIcon = getLeadSourceIcon((lead as any).lead_source || "internet");
                const leadType = (lead as any).lead_type || "internet";
                return (
                  <Badge variant="outline" className={cn("text-[10px] gap-1", leadType === "canvasser" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : "bg-blue-500/10 text-blue-600 border-blue-500/30")}>
                    <LeadSourceIcon className="w-3 h-3" />
                    {leadType === "canvasser" ? "Canvasser Lead" : "Internet Lead"}
                  </Badge>
                );
              })()}
            </div>
            <p className="text-sm text-muted-foreground">{serviceLabels[lead.service_type]} • {lead.reference_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lead.status} onValueChange={(v) => {
            const updates: Record<string, any> = { status: v };
            if (v === "contacted" && !lead.contacted_at) updates.contacted_at = new Date().toISOString();
            if (v === "quoted" && !lead.quoted_at) updates.quoted_at = new Date().toISOString();
            if (v === "won") updates.won_at = new Date().toISOString();
            updateLead.mutate(updates);
          }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCalculator(!showCalculator)} className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <Calculator className="w-4 h-4" /> {showCalculator ? "Close Estimator" : "📐 Open Estimator"}
          </Button>
        </div>
      </div>

      {/* Document Action Buttons */}
      {(() => {
        const contractForm = (leadForms as any[]).find((f: any) => f.form_type === "contract");
        const flexForm = (leadForms as any[]).find((f: any) => f.form_type === "flex_schedule");
        const warrantyForm = (leadForms as any[]).find((f: any) => f.form_type === "warranty");
        const inspectionForm = (leadForms as any[]).find((f: any) => f.form_type === "inspection");
        const appointmentForm = (leadForms as any[]).find((f: any) => f.form_type === "appointment");
        const showContract = ["won", "approved", "scheduled"].includes(lead.status);
        const showFlex = ["won", "scheduled"].includes(lead.status);
        const showWarranty = lead.status === "completed";
        const showInspection = true;
        const showAppointment = true;
        
        return (
          <div className="flex flex-wrap gap-2">
            {showInspection && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/leads/${lead.id}/inspection`, { state: { lead, existingForm: inspectionForm || null } })}>
                <CheckCircle className="w-4 h-4" /> {inspectionForm ? "✅ View Checklist" : "✅ 20-Point Checklist"}
                {inspectionForm && <Badge variant="outline" className={cn("ml-1 text-[10px]", inspectionForm.status === "signed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{inspectionForm.status}</Badge>}
              </Button>
            )}
            {showContract && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/leads/${lead.id}/contract`, { state: { lead, existingForm: contractForm || null } })}>
                <FileText className="w-4 h-4" /> {contractForm ? "📋 View Contract" : "📋 Create Contract"}
                {contractForm && <Badge variant="outline" className={cn("ml-1 text-[10px]", contractForm.status === "signed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{contractForm.status}</Badge>}
              </Button>
            )}
            {showFlex && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/leads/${lead.id}/flex-schedule`, { state: { lead, existingForm: flexForm || null } })}>
                <CalendarDays className="w-4 h-4" /> {flexForm ? "📆 View Flex Schedule" : "📆 Flex Schedule Form"}
                {flexForm && <Badge variant="outline" className={cn("ml-1 text-[10px]", flexForm.status === "signed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{flexForm.status}</Badge>}
              </Button>
            )}
            {showWarranty && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/leads/${lead.id}/warranty`, { state: { lead, existingForm: warrantyForm || null } })}>
                <Shield className="w-4 h-4" /> {warrantyForm ? "📄 View Warranty" : "📄 Warranty Document"}
                {warrantyForm && <Badge variant="outline" className={cn("ml-1 text-[10px]", warrantyForm.status === "signed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{warrantyForm.status}</Badge>}
              </Button>
            )}
            {showAppointment && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/leads/${lead.id}/appointment`, { state: { lead, existingForm: appointmentForm || null } })}>
                <CalendarDays className="w-4 h-4" /> {appointmentForm ? "📅 View Appointment" : "📅 Schedule Appointment"}
                {appointmentForm && <Badge variant="outline" className={cn("ml-1 text-[10px]", appointmentForm.status === "signed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{appointmentForm.status}</Badge>}
              </Button>
            )}
          </div>
        );
      })()}

      {/* Calculator Panel */}
      {showCalculator && (
        <div className="border border-border rounded-lg overflow-hidden">
          {editingEstimate && (
            <div className="p-3 bg-muted">
              <Button variant="ghost" size="sm" onClick={() => { setShowCalculator(false); setEditingEstimate(null); }} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Lead
              </Button>
            </div>
          )}
          <NGRGutterCalculator
            lead={{ id: lead.id, full_name: lead.full_name, city: lead.city, state: lead.state, reference_number: lead.reference_number || "" }}
            existingEstimate={editingEstimate}
            onSave={() => { setShowCalculator(false); setEditingEstimate(null); refetchEstimates(); }}
          />
        </div>
      )}

      {/* Past Estimates */}
      <div className="border border-border rounded-lg p-5">
        <h2 className="font-heading text-lg uppercase mb-4">Past Estimates</h2>
        {estimates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No estimates yet</p>
        ) : (
          <div className="space-y-3">
            {(estimates as any[]).map((est: any) => (
              <div key={est.id} className="border-b border-border pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(est.created_at).toLocaleDateString()}</span>
                  <Button size="sm" variant="outline" onClick={() => { setEditingEstimate(est); setShowCalculator(true); }}>
                    Open &amp; Edit
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-muted-foreground text-xs block">Quoted</span><span className="font-medium">${Number(est.quoted_price || 0).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Floor</span><span>${Number(est.total_floor || 0).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Commission</span><span className="text-green-600 font-medium">${Number(est.commission || 0).toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Info */}
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-heading text-lg uppercase mb-4">Service Details</h2>
            {renderFormData()}
          </div>

          {/* Contact Info */}
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-heading text-lg uppercase mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-sm hover:text-accent">{lead.email}</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="text-sm hover:text-accent">{lead.phone}</a>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p>{lead.street_address}</p>
                  <p>{lead.city}, {lead.state} {lead.zip_code}</p>
                </div>
              </div>
              {lead.best_contact_time?.length > 0 && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{lead.best_contact_time.join(", ")}</p>
                </div>
              )}
              {lead.referral_source && (
                <p className="text-xs text-muted-foreground">Source: {lead.referral_source}</p>
              )}
            </div>
          </div>

          {/* Photos */}
          {lead.photo_urls?.length > 0 && (
            <div className="border border-border rounded-lg p-5">
              <h2 className="font-heading text-lg uppercase mb-4">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {lead.photo_urls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border hover:border-accent transition-colors">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <LeadFilesSection leadId={lead.id} isAdmin={false} />

          {/* Documents Section */}
          {(leadForms as any[]).length > 0 && (
            <div className="border border-border rounded-lg p-5">
              <h2 className="font-heading text-lg uppercase mb-4">Documents</h2>
              <div className="space-y-2">
                {(leadForms as any[]).map((form: any) => {
                  const typeLabels: Record<string, string> = { contract: "📋 Contract", flex_schedule: "📆 Flex Schedule", warranty: "📄 Warranty", inspection: "✓ Inspection", appointment: "📅 Appointment" };
                  const statusColors: Record<string, string> = { signed: "bg-green-500/10 text-green-600 border-green-500/30", completed: "bg-blue-500/10 text-blue-600 border-blue-500/30", draft: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
                  return (
                    <div key={form.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{typeLabels[form.form_type] || form.form_type}</span>
                        <Badge variant="outline" className={cn("text-[10px]", statusColors[form.status] || "")}>{form.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Log */}
          <LeadActivityLog leadId={lead.id} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quote Section - submit only, no approve/reject */}
          <QuoteApprovalSection lead={lead} isAdmin={false} />

          {/* Scheduling, Payments, Close Job, Canvasser Badge */}
          <LeadSchedulingPayments lead={lead} onLeadUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
            queryClient.invalidateQueries({ queryKey: ["my-leads"] });
          }} />

          {/* Follow-up Tracking */}
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-heading text-lg uppercase mb-4">Follow-up</h2>
            {lead.next_followup_due ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  <span className={cn(
                    "text-sm",
                    new Date(lead.next_followup_due) < new Date() ? "text-destructive font-medium" : ""
                  )}>
                    {new Date(lead.next_followup_due) < new Date() ? "Overdue: " : "Due: "}
                    {new Date(lead.next_followup_due).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Follow-ups: {lead.followup_count || 0}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No follow-up scheduled</p>
            )}
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={handleLogFollowup} disabled={updateLead.isPending}>
                <CheckCircle className="w-3 h-3" /> Log Follow-up
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={handleSnooze} disabled={updateLead.isPending}>
                <AlarmClockPlus className="w-3 h-3" /> Snooze 24h
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-heading text-lg uppercase mb-4">Timeline</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
              {lead.contacted_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contacted</span>
                  <span>{new Date(lead.contacted_at).toLocaleDateString()}</span>
                </div>
              )}
              {lead.quoted_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quoted</span>
                  <span>{new Date(lead.quoted_at).toLocaleDateString()}</span>
                </div>
              )}
              {lead.won_at && (
                <div className="flex justify-between text-green-600">
                  <span>Won</span>
                  <span>{new Date(lead.won_at).toLocaleDateString()}</span>
                </div>
              )}
              {lead.lost_at && (
                <div className="flex justify-between text-destructive">
                  <span>Lost</span>
                  <span>{new Date(lead.lost_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {lead.status !== "won" && lead.status !== "lost" && (
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-green-600 border-green-600/30 hover:bg-green-600/10"
                  onClick={() => updateLead.mutate({ status: "won", won_at: new Date().toISOString() })}>
                  <CheckCircle className="w-3 h-3" /> Won
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    if (!lostReason) {
                      toast({ title: "Select a reason", description: "Please select a loss reason first", variant: "destructive" });
                      return;
                    }
                    updateLead.mutate({ status: "lost", lost_at: new Date().toISOString(), lost_reason: lostReason });
                  }}>
                  <XCircle className="w-3 h-3" /> Lost
                </Button>
              </div>
            )}

            {lead.status !== "won" && lead.status !== "lost" && (
              <div className="mt-3">
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Loss reason (if lost)" /></SelectTrigger>
                  <SelectContent>
                    {lostReasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
