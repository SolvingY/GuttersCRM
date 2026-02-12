import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Home, Droplets, Wrench, MapPin, Phone, Mail, AlertTriangle, Flame, Clock, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getLeadSourceIcon } from "@/lib/leadSourceConfig";

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

export default function MyLeads() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["my-leads", user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("quote_requests")
        .select("*")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl uppercase">My Leads</h1>
        <p className="text-sm text-muted-foreground">Leads assigned to you</p>
      </div>

      <div className="flex gap-3">
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
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No leads assigned to you</div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const ServiceIcon = serviceIcons[lead.service_type] || Building2;
            const priority = priorityConfig[lead.priority] || priorityConfig.normal;
            const PriorityIcon = priority.icon;
            const followupDue = lead.next_followup_due ? new Date(lead.next_followup_due) : null;
            const isOverdue = followupDue && followupDue < now;
            const isDueToday = followupDue && !isOverdue && followupDue.toDateString() === now.toDateString();

            return (
              <Link
                key={lead.id}
                to={`/dashboard/leads/${lead.id}`}
                className="block border border-border rounded-lg p-4 hover:border-accent/50 transition-colors bg-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-secondary rounded-lg shrink-0">
                      <ServiceIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-heading text-sm uppercase">{serviceLabels[lead.service_type]}</span>
                        <Badge className={cn("text-[10px]", statusColors[lead.status])}>{lead.status}</Badge>
                        {(() => {
                          const LeadSourceIcon = getLeadSourceIcon((lead as any).lead_source || "internet");
                          const leadType = (lead as any).lead_type || "internet";
                          return (
                            <Badge variant="outline" className={cn("text-[10px] gap-1", leadType === "canvasser" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : "bg-blue-500/10 text-blue-600 border-blue-500/30")}>
                              <LeadSourceIcon className="w-3 h-3" />
                              {leadType === "canvasser" ? "Canvasser" : "Internet"}
                            </Badge>
                          );
                        })()}
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
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}, {lead.state}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
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
