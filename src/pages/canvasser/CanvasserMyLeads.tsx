import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, MapPin, Calendar, ClipboardList } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 border-blue-200",
  contacted: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  quoted: "bg-purple-500/10 text-purple-700 border-purple-200",
  won: "bg-green-500/10 text-green-700 border-green-200",
  scheduled: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  lost: "bg-red-500/10 text-red-700 border-red-200",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function CanvasserMyLeads() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["canvasser-my-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, reference_number, full_name, phone, city, state, service_type, status, created_at")
        .eq("canvasser_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filtered = statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter);
  const statuses = [...new Set(leads.map((l) => l.status))];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Leads</h1>
        <p className="text-sm text-muted-foreground">Leads you've set</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({leads.length})</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s} ({leads.filter((l) => l.status === s).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm">Leads you create will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{lead.full_name}</span>
                      <span className="text-xs text-muted-foreground">{lead.reference_number}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {lead.phone}
                        </span>
                      )}
                      {(lead.city || lead.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {[lead.city, lead.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={statusColors[lead.status] || ""}>
                      {lead.status}
                    </Badge>
                    {lead.service_type && (
                      <span className="text-xs text-muted-foreground capitalize">{lead.service_type}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
