import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Home, Droplets, Wrench, MapPin, Phone, Mail, Clock, CheckCircle, XCircle, Loader2, CalendarClock, AlarmClockPlus, Archive, Ban, FileText, CalendarDays, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { QuoteApprovalSection } from "@/components/admin/QuoteApprovalSection";
import { LeadActivityLog } from "@/components/admin/LeadActivityLog";
import { LeadFilesSection } from "@/components/admin/LeadFilesSection";
import { getLeadSourceIcon, getLeadSourceLabel } from "@/lib/leadSourceConfig";
import { useQuery as useRQQuery } from "@tanstack/react-query";
import { LeadSchedulingPayments } from "@/components/lead/LeadSchedulingPayments";

function AdminEstimatesSection({ leadId }: { leadId: string }) {
  const { data: estimates = [] } = useRQQuery({
    queryKey: ["admin-lead-estimates", leadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("gutter_estimates").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="border border-border rounded-lg p-5">
      <h2 className="font-heading text-lg uppercase mb-4">Saved Estimates</h2>
      {(estimates as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">No estimates yet</p>
      ) : (
        <div className="space-y-2">
          {(estimates as any[]).map((est: any) => (
            <div key={est.id} className="flex justify-between items-center text-sm border-b border-border pb-2">
              <span className="text-muted-foreground">{new Date(est.created_at).toLocaleDateString()}</span>
              <span className="font-medium">${Number(est.quoted_price || 0).toFixed(2)}</span>
              <span className="text-muted-foreground">Floor: ${Number(est.total_floor || 0).toFixed(2)}</span>
              <span className="font-medium" style={{ color: "hsl(var(--chart-2))" }}>Commission: ${Number(est.commission || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const serviceLabels: Record<string, string> = {
  commercial: "Commercial Roofing",
  residential: "Residential Roofing",
  gutters: "Gutters & Protection",
  repair: "Repair Work",
};

const serviceIcons: Record<string, any> = { commercial: Building2, residential: Home, gutters: Droplets, repair: Wrench };

const statusOptions = ["new", "contacted", "quoted", "scheduled", "won", "lost", "cancelled", "completed"];
const priorityOptions = ["urgent", "high", "normal", "low"];
const lostReasons = ["Price too high", "Chose competitor", "Project cancelled", "No response", "Timeline didn't work", "Other"];
const cancelledReasons = ["Customer changed mind", "Financing fell through", "Insurance denied", "Scheduling conflict", "Material unavailable", "Weather delay", "Other"];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [cancelledReason, setCancelledReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  // Check if current user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin");
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("quote_requests").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-for-assignment"],
    queryFn: async () => {
      const { data: reps, error } = await supabase.from("user_metrics").select("user_id, display_name");
      if (error) throw error;
      const { data: userRoles } = await supabase.from("user_roles").select("user_id").eq("role", "user");
      const userRoleIds = new Set((userRoles || []).map(r => r.user_id));
      return (reps || []).filter(r => userRoleIds.has(r.user_id));
    },
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
    enabled: !!id,
  });

  const updateLead = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("quote_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["my-leads"] });
      toast({ title: "Lead updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!lead) return <div className="text-center py-12 text-muted-foreground">Lead not found</div>;

  const ServiceIcon = serviceIcons[lead.service_type] || Building2;
  const formData = (lead.form_data || {}) as Record<string, any>;
  const currentNotes = notes ?? lead.admin_notes ?? "";

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

  const handleArchive = async () => {
    if (!archiveReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for archiving", variant: "destructive" });
      return;
    }
    setArchiving(true);
    try {
      const { error } = await supabase.rpc("archive_lead", {
        p_lead_id: lead.id,
        p_reason: archiveReason.trim(),
      });
      if (error) throw error;
      toast({ title: "Lead archived", description: "Lead has been archived and metrics updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["my-leads"] });
      navigate(isAdmin ? "/admin/leads" : "/dashboard/my-leads");
    } catch (err: any) {
      toast({ title: "Archive failed", description: err.message, variant: "destructive" });
    } finally {
      setArchiving(false);
      setArchiveOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(isAdmin ? "/admin/leads" : "/dashboard/my-leads")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Leads
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
                  <>
                    <Badge variant="outline" className={cn("text-[10px] gap-1", 
                      leadType === "canvasser" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : 
                      leadType === "self_gen" ? "bg-green-500/10 text-green-600 border-green-500/30" :
                      "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    )}>
                      <LeadSourceIcon className="w-3 h-3" />
                      {leadType === "canvasser" ? "Canvasser Lead" : leadType === "self_gen" ? "Self-Gen Lead" : "Internet Lead"}
                    </Badge>
                    {(lead as any).manually_created && (
                      <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Manual</Badge>
                    )}
                  </>
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
          {isAdmin && (
            <Select value={lead.priority} onValueChange={(v) => updateLead.mutate({ priority: v })}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {isAdmin && (
            <Select value={(lead as any).lead_type || "internet"} onValueChange={async (v) => {
              await supabase.rpc("change_lead_type", { p_lead_id: lead.id, p_new_type: v });
              queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
              queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
              toast({ title: "Lead type updated" });
            }}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internet">Internet</SelectItem>
                <SelectItem value="canvasser">Canvasser</SelectItem>
                <SelectItem value="self_gen">Self-Gen</SelectItem>
              </SelectContent>
            </Select>
          )}
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
            {showAppointment && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/leads/${lead.id}/appointment`, { state: { lead, existingForm: appointmentForm || null } })}>
                <CalendarDays className="w-4 h-4" /> {appointmentForm ? "📅 View Appointment" : "📅 Schedule Appointment"}
                {appointmentForm && <Badge variant="outline" className={cn("ml-1 text-[10px]", appointmentForm.status === "signed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{appointmentForm.status}</Badge>}
              </Button>
            )}
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
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - lead info */}
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
                <p className="text-xs text-muted-foreground">Referral Source: {lead.referral_source}</p>
              )}
              <p className="text-xs text-muted-foreground">Lead Source: {getLeadSourceLabel((lead as any).lead_source || "internet")}</p>
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

          {/* Saved Estimates */}
          <AdminEstimatesSection leadId={lead.id} />
        </div>

        {/* Right column - chronological lifecycle */}
        <div className="space-y-6">
          {/* 1. Assignment */}
          {isAdmin && (
            <div className="border border-border rounded-lg p-5">
              <h2 className="font-heading text-lg uppercase mb-4">Assignment</h2>
              <Select
                value={lead.assigned_to || "unassigned"}
                onValueChange={(v) => {
                  if (v === "unassigned") {
                    updateLead.mutate({ assigned_to: null, assigned_at: null });
                  } else {
                    updateLead.mutate({ assigned_to: v, assigned_at: new Date().toISOString() });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.user_id} value={rep.user_id}>
                      {rep.display_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lead.assigned_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Assigned: {new Date(lead.assigned_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* 2. Follow-up */}
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

          {/* 3. Quote Approval */}
          <QuoteApprovalSection lead={lead} isAdmin={isAdmin} />

          {/* 4. Outcome (Won/Lost/Cancelled) */}
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-heading text-lg uppercase mb-4">Outcome</h2>
            {lead.status === "won" && lead.won_at && (
              <p className="text-sm text-green-600 font-medium">Won on {new Date(lead.won_at).toLocaleDateString()}</p>
            )}
            {lead.status === "lost" && lead.lost_at && (
              <div>
                <p className="text-sm text-destructive font-medium">Lost on {new Date(lead.lost_at).toLocaleDateString()}</p>
                {lead.lost_reason && <p className="text-xs text-muted-foreground mt-1">Reason: {lead.lost_reason}</p>}
              </div>
            )}
            {lead.status === "cancelled" && (lead as any).cancelled_at && (
              <div>
                <p className="text-sm text-amber-600 font-medium">Cancelled on {new Date((lead as any).cancelled_at).toLocaleDateString()}</p>
                {(lead as any).cancelled_reason && <p className="text-xs text-muted-foreground mt-1">Reason: {(lead as any).cancelled_reason}</p>}
              </div>
            )}
            {!["won", "lost", "cancelled"].includes(lead.status) && (
              <>
                <div className="flex gap-2">
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
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-amber-600 border-amber-600/30 hover:bg-amber-600/10"
                    onClick={() => {
                      if (!cancelledReason) {
                        toast({ title: "Select a reason", description: "Please select a cancellation reason first", variant: "destructive" });
                        return;
                      }
                      updateLead.mutate({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_reason: cancelledReason } as any);
                    }}>
                    <Ban className="w-3 h-3" /> Cancelled
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  <Select value={lostReason} onValueChange={setLostReason}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Loss reason (if lost)" /></SelectTrigger>
                    <SelectContent>
                      {lostReasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={cancelledReason} onValueChange={setCancelledReason}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Cancellation reason (if cancelled)" /></SelectTrigger>
                    <SelectContent>
                      {cancelledReasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* 5. Scheduling / Payments / Close Job */}
          <LeadSchedulingPayments lead={lead} onLeadUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["lead-detail", id] });
            queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
            queryClient.invalidateQueries({ queryKey: ["my-leads"] });
          }} />

          {/* 6. Timeline (dates only) */}
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
              {(lead as any).cancelled_at && (
                <div className="flex justify-between text-amber-600">
                  <span>Cancelled</span>
                  <span>{new Date((lead as any).cancelled_at).toLocaleDateString()}</span>
                </div>
              )}
              {(lead as any).install_scheduled_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Install Scheduled</span>
                  <span>{new Date((lead as any).install_scheduled_at).toLocaleDateString()}</span>
                </div>
              )}
              {(lead as any).completed_at && (
                <div className="flex justify-between text-green-600">
                  <span>Completed</span>
                  <span>{new Date((lead as any).completed_at).toLocaleDateString()}</span>
                </div>
              )}
              {lead.lost_at && (
                <div className="flex justify-between text-destructive">
                  <span>Lost</span>
                  <span>{new Date(lead.lost_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* 7. Archive (Admin only) */}
          {isAdmin && lead.status !== 'archived' && (
            <div className="border border-destructive/20 rounded-lg p-5">
              <h2 className="font-heading text-lg uppercase mb-2">Archive Lead</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Archiving removes this lead from the rep's metrics and lead totals.
              </p>
              <Button 
                variant="outline" 
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="w-4 h-4" /> Archive Lead
              </Button>
            </div>
          )}

          {lead.status === 'archived' && (
            <div className="border border-muted rounded-lg p-5 bg-muted/30">
              <h2 className="font-heading text-lg uppercase mb-2 text-muted-foreground">Archived</h2>
              <p className="text-sm text-muted-foreground">
                Reason: {(lead as any).archived_reason || 'No reason provided'}
              </p>
              {(lead as any).archived_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Archived: {new Date((lead as any).archived_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* 8. Files */}
          <LeadFilesSection leadId={lead.id} isAdmin={isAdmin} />

          {/* 9. Activity Log */}
          <LeadActivityLog leadId={lead.id} />

          {/* 10. Admin Notes */}
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-heading text-lg uppercase mb-4">Admin Notes</h2>
            <Textarea
              value={currentNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              className="min-h-[120px]"
            />
            <Button
              size="sm"
              className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => updateLead.mutate({ admin_notes: currentNotes })}
              disabled={updateLead.isPending}
            >
              {updateLead.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Archive Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Lead</DialogTitle>
            <DialogDescription>
              This will remove the lead from the assigned rep's metrics and lead totals. This action cannot be easily undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Reason for archiving</Label>
              <Select value={archiveReason} onValueChange={setArchiveReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Duplicate lead">Duplicate lead</SelectItem>
                  <SelectItem value="Invalid/fake lead">Invalid/fake lead</SelectItem>
                  <SelectItem value="Customer requested removal">Customer requested removal</SelectItem>
                  <SelectItem value="Wrong contact info">Wrong contact info</SelectItem>
                  <SelectItem value="Out of service area">Out of service area</SelectItem>
                  <SelectItem value="Test lead">Test lead</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {archiveReason === "Other" && (
              <div className="space-y-2">
                <Label>Custom reason</Label>
                <Textarea
                  placeholder="Enter reason..."
                  value=""
                  onChange={(e) => setArchiveReason(e.target.value || "Other")}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleArchive} 
              disabled={archiving || !archiveReason}
            >
              {archiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Archive Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
