import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface OverdueLead {
  id: string;
  full_name: string;
  next_followup_due: string;
  status: string;
  assigned_to: string | null;
  rep_name?: string;
}

interface OverdueFollowupsWidgetProps {
  isAdmin: boolean;
}

export function OverdueFollowupsWidget({ isAdmin }: OverdueFollowupsWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overdueLeads, setOverdueLeads] = useState<OverdueLead[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchOverdue = async () => {
      let query = supabase
        .from("quote_requests")
        .select("id, full_name, next_followup_due, status, assigned_to")
        .lt("next_followup_due", new Date().toISOString())
        .not("next_followup_due", "is", null)
        .in("status", ["new", "contacted", "quoted"])
        .order("next_followup_due", { ascending: true });

      if (!isAdmin) {
        query = query.eq("assigned_to", user.id);
      }

      const { data } = await query;
      if (!data || data.length === 0) {
        setOverdueLeads([]);
        return;
      }

      if (isAdmin) {
        // Fetch rep names
        const repIds = [...new Set(data.filter(l => l.assigned_to).map(l => l.assigned_to!))];
        const { data: profiles } = repIds.length > 0
          ? await supabase.from("profiles").select("id, full_name").in("id", repIds)
          : { data: [] };
        const profileMap = new Map<string, string>(profiles?.map(p => [p.id, p.full_name || "Unknown"] as [string, string]) || []);

        setOverdueLeads(data.map(l => ({
          ...l,
          rep_name: l.assigned_to ? (profileMap.get(l.assigned_to) || "Unassigned") : "Unassigned",
        })));
      } else {
        setOverdueLeads(data);
      }
    };
    fetchOverdue();
  }, [user, isAdmin]);

  if (!overdueLeads || overdueLeads.length === 0) return null;

  const getOverdueBy = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  // Rep view: simple red banner
  if (!isAdmin) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            🚨 You have {overdueLeads.length} overdue follow-up{overdueLeads.length > 1 ? "s" : ""}.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-500/30 hover:bg-red-500/10"
          onClick={() => navigate("/dashboard/my-leads")}
        >
          View Leads
        </Button>
      </div>
    );
  }

  // Admin view: full table
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg overflow-hidden">
      <div className="p-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold text-red-600 dark:text-red-400">
          🚨 OVERDUE FOLLOW-UPS ({overdueLeads.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-red-500/5">
            <tr>
              <th className="text-left py-2 px-4 text-xs font-medium text-red-600 dark:text-red-400">Rep</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-red-600 dark:text-red-400">Customer</th>
              <th className="text-left py-2 px-4 text-xs font-medium text-red-600 dark:text-red-400">Status</th>
              <th className="text-right py-2 px-4 text-xs font-medium text-red-600 dark:text-red-400">Overdue By</th>
            </tr>
          </thead>
          <tbody>
            {overdueLeads.slice(0, 20).map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-red-500/10 hover:bg-red-500/5 cursor-pointer"
                onClick={() => navigate(`/admin/leads/${lead.id}`)}
              >
                <td className="py-2 px-4 text-sm text-foreground">{lead.rep_name}</td>
                <td className="py-2 px-4 text-sm text-foreground font-medium">{lead.full_name}</td>
                <td className="py-2 px-4 text-sm text-foreground capitalize">{lead.status}</td>
                <td className="py-2 px-4 text-sm text-red-600 dark:text-red-400 text-right font-medium">
                  {getOverdueBy(lead.next_followup_due)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
