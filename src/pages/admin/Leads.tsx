import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Home, Droplets, Wrench, MapPin, Phone, Mail, AlertTriangle, Flame, Clock, CalendarClock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoAssignmentSettings } from "@/components/admin/AutoAssignmentSettings";
import { LeadExportButton } from "@/components/admin/LeadExportButton";
import { CreateLeadDialog } from "@/components/admin/CreateLeadDialog";
import { getLeadSourceIcon, getLeadSourceLabel } from "@/lib/leadSourceConfig";

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
  lost: "bg-muted text-muted-foreground",
};

const priorityConfig: Record<string, { label: string; className: string; icon: any }> = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: Flame },
  normal: { label: "Normal", className: "bg-muted text-muted-foreground border-border", icon: null },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border", icon: null },
};

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter, serviceFilter, priorityFilter, assignedFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("quote_requests")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
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

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_metrics").select("user_id, display_name");
      if (error) throw error;
      return data;
    },
  });

  const statusCounts = {
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    quoted: leads.filter((l) => l.status === "quoted").length,
    scheduled: leads.filter((l) => l.status === "scheduled").length,
    won: leads.filter((l) => l.status === "won").length,
  };

  const sortedLeads = [...leads].sort((a, b) => {
    const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl uppercase">Lead Management</h1>
          <p className="text-sm text-muted-foreground">Manage quote requests and client leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create Lead
          </Button>
          <LeadExportButton leads={leads} salesReps={salesReps} />
        </div>
      </div>

      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AutoAssignmentSettings />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            className={cn(
              "p-3 rounded-lg border text-center transition-colors",
              statusFilter === status ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}
          >
            <div className="font-heading text-2xl">{count}</div>
            <div className="text-xs text-muted-foreground capitalize">{status}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="gutters">Gutters</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Lead Source" /></SelectTrigger>
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
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assigned To" /></SelectTrigger>
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

      {/* Lead Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : sortedLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No leads found</div>
      ) : (
        <div className="space-y-3">
          {sortedLeads.map((lead) => {
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
                        <Badge variant="outline" className={cn("text-[10px] gap-1", leadType === "canvasser" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : "bg-blue-500/10 text-blue-600 border-blue-500/30")}>
                          <LeadSourceIcon className="w-3 h-3" />
                          {leadType === "canvasser" ? "Canvasser" : "Internet"}
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
      )}
    </div>
  );
}
