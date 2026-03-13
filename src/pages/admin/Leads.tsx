import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Home, Droplets, Wrench, MapPin, Phone, Mail, AlertTriangle, Flame, Clock, CalendarClock, Plus, ChevronDown, ChevronRight, Users, DollarSign, List, CheckCircle2, XCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoAssignmentSettings } from "@/components/admin/AutoAssignmentSettings";
import { LeadExportButton } from "@/components/admin/LeadExportButton";
import { CreateLeadDialog } from "@/components/admin/CreateLeadDialog";
import { getLeadSourceIcon, getLeadSourceLabel } from "@/lib/leadSourceConfig";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { OverdueFollowupsWidget } from "@/components/dashboard/OverdueFollowupsWidget";
import { SectionCarousel } from "@/components/dashboard/SectionCarousel";
import { RevenueAnalyticsWidget } from "@/components/dashboard/RevenueAnalyticsWidget";

const serviceIcons: Record<string, any> = {
  commercial: Building2,
  residential: Home,
  gutters: Droplets,
  repair: Wrench,
};

const serviceLabels: Record<string, string> = {
  commercial: "Commercial Roofing",
  residential: "Residential Roofing",
  gutters: "Gutters & Protection",
  repair: "Repair Work",
};

const statusColors: Record<string, string> = {
  new: "bg-destructive text-destructive-foreground",
  contacted: "bg-yellow-500 text-white",
  quoted: "bg-blue-500 text-white",
  scheduled: "bg-green-500 text-white",
  won: "bg-emerald-600 text-white",
  completed: "bg-emerald-700 text-white",
  lost: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

const priorityConfig: Record<string, { label: string; className: string; icon: any }> = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: Flame },
  normal: { label: "Normal", className: "bg-muted text-muted-foreground border-border", icon: null },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border", icon: null },
};

const statusCarouselConfig: { id: string; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: List },
  { id: "new", label: "New", icon: AlertTriangle },
  { id: "contacted", label: "Contacted", icon: Phone },
  { id: "quoted", label: "Quoted", icon: DollarSign },
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "won", label: "Won", icon: CheckCircle2 },
  { id: "completed", label: "Complete", icon: CheckCircle2 },
  { id: "lost", label: "Lost", icon: XCircle },
  { id: "archived", label: "Archived", icon: Archive },
];

export default function Leads() {
  const [serviceFilter, setServiceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [revenueSection, setRevenueSection] = useState<string | null>(null);
  const toggleRevenueSection = (id: string) => setRevenueSection(prev => prev === id ? null : id);
  const [statusSection, setStatusSection] = useState<string | null>(null);

  const { data: allLeads = [], isLoading } = useQuery({
    queryKey: ["admin-leads", serviceFilter, priorityFilter, assignedFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("quote_requests")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (serviceFilter !== "all") query = query.eq("service_type", serviceFilter);
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);
      if (sourceFilter !== "all") query = query.eq("lead_source", sourceFilter);
      if (assignedFilter === "unassigned") query = query.is("assigned_to", null);
      else if (assignedFilter !== "all") query = query.eq("assigned_to", assignedFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch canvasser names for leads with canvasser_id
  const canvasserIds = [...new Set(allLeads.filter(l => l.canvasser_id).map(l => l.canvasser_id as string))];
  const { data: canvasserProfiles = [] } = useQuery({
    queryKey: ["canvasser-profiles", canvasserIds],
    queryFn: async () => {
      if (canvasserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", canvasserIds);
      return data || [];
    },
    enabled: canvasserIds.length > 0,
  });
  const canvasserNames: Record<string, string> = {};
  canvasserProfiles.forEach((p: any) => { if (p.full_name) canvasserNames[p.id] = p.full_name; });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_metrics").select("user_id, display_name");
      if (error) throw error;
      return data;
    },
  });

  const getLeadsForStatus = (status: string) => {
    if (status === "all") return allLeads.filter((l) => l.status !== "archived");
    return allLeads.filter((l) => l.status === status);
  };

  const statusCounts: Record<string, number> = {};
  statusCarouselConfig.forEach(({ id }) => {
    statusCounts[id] = getLeadsForStatus(id).length;
  });

  const now = new Date();

  const renderLeadCards = (leads: any[]) => {
    const sorted = [...leads].sort((a, b) => {
      const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

    if (sorted.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No leads found</div>;
    }

    return (
      <div className="space-y-3">
        {sorted.map((lead) => {
          const ServiceIcon = serviceIcons[lead.service_type] || Building2;
          const priority = priorityConfig[lead.priority] || priorityConfig.normal;
          const PriorityIcon = priority.icon;
          const followupDue = lead.next_followup_due ? new Date(lead.next_followup_due) : null;
          const isOverdue = followupDue && followupDue < now;
          const isDueToday = followupDue && !isOverdue && followupDue.toDateString() === now.toDateString();
          const LeadSourceIcon = getLeadSourceIcon((lead as any).lead_source || "internet");
          const leadType = (lead as any).lead_type || "internet";
          const manuallyCreated = (lead as any).manually_created;

          return (
            <Link
              key={lead.id}
              to={`/admin/leads/${lead.id}`}
              className="block border border-border rounded-lg p-4 hover:border-accent/50 transition-colors bg-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-secondary rounded-lg shrink-0">
                    <ServiceIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-heading text-sm uppercase">
                        {serviceLabels[lead.service_type]}
                      </span>
                      <Badge className={cn("text-[10px]", statusColors[lead.status])}>
                        {lead.status}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] gap-1", leadType === "canvasser" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : leadType === "self_gen" ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-blue-500/10 text-blue-600 border-blue-500/30")}>
                        <LeadSourceIcon className="w-3 h-3" />
                        {leadType === "canvasser" ? "Canvasser" : leadType === "self_gen" ? "Self-Gen" : "Internet"}
                      </Badge>
                      {manuallyCreated && (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                          Manual
                        </Badge>
                      )}
                      {lead.priority !== "normal" && (
                        <Badge variant="outline" className={cn("text-[10px] gap-1", priority.className)}>
                          {PriorityIcon && <PriorityIcon className="w-3 h-3" />}
                          {priority.label}
                        </Badge>
                      )}
                      {lead.quote_status === "pending_approval" && (
                        <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          Quote Pending
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{lead.full_name}</p>
                    {leadType === "canvasser" && lead.canvasser_id && canvasserNames[lead.canvasser_id] && (
                      <p className="text-xs text-purple-600">Set by: {canvasserNames[lead.canvasser_id]}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lead.city}, {lead.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0 space-y-1">
                  <p className="font-heading text-accent">{lead.reference_number}</p>
                  <p className="flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                  {followupDue && (
                    <p className={cn(
                      "flex items-center gap-1 justify-end",
                      isOverdue ? "text-destructive" : isDueToday ? "text-yellow-600" : ""
                    )}>
                      <CalendarClock className="w-3 h-3" />
                      {isOverdue ? "Overdue" : isDueToday ? "Due today" : followupDue.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <OverdueFollowupsWidget isAdmin={true} />

      {/* Revenue from Leads Carousel */}
      <SectionCarousel activeSection={revenueSection} onToggle={toggleRevenueSection}>
        <SectionCarousel.Item id="revenue-leads" title="Revenue from Leads" icon={DollarSign}>
          <RevenueAnalyticsWidget />
        </SectionCarousel.Item>
      </SectionCarousel>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl uppercase">Lead Management</h1>
          <p className="text-sm text-muted-foreground">Manage quote requests and client leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create Lead
          </Button>
          <LeadExportButton leads={allLeads} salesReps={salesReps} />
        </div>
      </div>

      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AutoAssignmentSettings />

      <UnassignedCanvasserQueue salesReps={salesReps} />

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="gutters">Gutters</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Lead Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="internet">Internet/Website</SelectItem>
            <SelectItem value="phone_general">Phone - General</SelectItem>
            <SelectItem value="phone_canvasser">Phone - Canvasser</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="walk_in">Walk-In</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {salesReps.map((rep) => (
              <SelectItem key={rep.user_id} value={rep.user_id}>
                {rep.display_name || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Carousel */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : (
        <SectionCarousel activeSection={statusSection} onToggle={(id) => setStatusSection(prev => prev === id ? null : id)}>
          {statusCarouselConfig.map(({ id, label, icon }) => (
            <SectionCarousel.Item
              key={id}
              id={id}
              title={`${label} (${statusCounts[id] ?? 0})`}
              icon={icon}
              indicator={id === "new" && (statusCounts["new"] ?? 0) > 0 ? "pulse" : undefined}
            >
              {renderLeadCards(getLeadsForStatus(id))}
            </SectionCarousel.Item>
          ))}
        </SectionCarousel>
      )}
    </div>
  );
}

function UnassignedCanvasserQueue({ salesReps }: { salesReps: any[] }) {
  const [open, setOpen] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unassignedLeads = [] } = useQuery({
    queryKey: ["unassigned-canvasser-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .eq("lead_source", "canvasser")
        .is("assigned_to", null)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: canvasserProfiles = [] } = useQuery({
    queryKey: ["canvasser-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
  });

  const { data: leadFormCounts = [] } = useQuery({
    queryKey: ["lead-form-counts-queue"],
    queryFn: async () => {
      const ids = unassignedLeads.map((l: any) => l.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("lead_forms").select("lead_id, form_type").in("lead_id", ids);
      return data || [];
    },
    enabled: unassignedLeads.length > 0,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ leadId, repId }: { leadId: string; repId: string }) => {
      const { error } = await supabase.from("quote_requests").update({
        assigned_to: repId, assigned_at: new Date().toISOString(), assigned_by: user?.id,
      }).eq("id", leadId);
      if (error) throw error;
      await supabase.from("lead_activity_log").insert({
        lead_id: leadId, user_id: user?.id, activity_type: "assignment",
        content: `Lead assigned by manager`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unassigned-canvasser-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast({ title: "Lead assigned" });
    },
  });

  if (unassignedLeads.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span className="font-heading text-sm uppercase">Unassigned Canvasser Leads ({unassignedLeads.length})</span>
          </div>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {unassignedLeads.map((lead: any) => {
          const canvasser = canvasserProfiles.find((p: any) => p.id === lead.canvasser_id);
          const forms = leadFormCounts.filter((f: any) => f.lead_id === lead.id);
          const hasChecklist = forms.some((f: any) => f.form_type === "inspection");
          const hasAppointment = forms.some((f: any) => f.form_type === "appointment");
          const hasRoofingInspection = forms.some((f: any) => f.form_type === "roofing_inspection");
          const hasRoofingAppointment = forms.some((f: any) => f.form_type === "roofing_appointment");

          return (
            <div key={lead.id} className="border border-border rounded-lg p-4 bg-card space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{lead.full_name}</p>
                  <p className="text-xs text-muted-foreground">{lead.street_address}, {lead.city} • {lead.service_type}</p>
                  <p className="text-xs text-muted-foreground">Submitted by: {canvasser?.full_name || "Unknown"} • {new Date(lead.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px]", hasChecklist ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-muted text-muted-foreground")}>
                    {hasChecklist ? "✓ Gutter Checklist" : "No Checklist"}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]", hasAppointment ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-muted text-muted-foreground")}>
                    {hasAppointment ? "✓ Gutter Appt" : "No Appt Sheet"}
                  </Badge>
                  {hasRoofingInspection && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                      ✓ Roofing Details
                    </Badge>
                  )}
                  {hasRoofingAppointment && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                      ✓ Roofing Appt
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={(repId) => assignMutation.mutate({ leadId: lead.id, repId })}>
                  <SelectTrigger className="w-[200px] text-xs"><SelectValue placeholder="Assign to Rep..." /></SelectTrigger>
                  <SelectContent>
                    {salesReps.map((rep: any) => (
                      <SelectItem key={rep.user_id} value={rep.user_id}>{rep.display_name || "Unknown"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
