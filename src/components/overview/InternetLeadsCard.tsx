import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Globe } from "lucide-react";
import { startOfMonth, format } from "date-fns";

export function InternetLeadsCard() {
  const { data: count = 0 } = useQuery({
    queryKey: ["internet-leads-month"],
    queryFn: async () => {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd'T'HH:mm:ss");
      const { count, error } = await supabase
        .from("quote_requests")
        .select("*", { count: "exact", head: true })
        .eq("lead_type", "internet")
        .not("assigned_to", "is", null)
        .gte("assigned_at", monthStart);
      if (error) throw error;
      return count || 0;
    },
  });

  return <StatsCard title="Internet Leads (This Month)" value={count} icon={Globe} />;
}
