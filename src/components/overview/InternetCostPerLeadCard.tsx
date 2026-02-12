import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DollarSign } from "lucide-react";
import { startOfMonth, format } from "date-fns";

export function InternetCostPerLeadCard() {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data: adSpend = 0 } = useQuery({
    queryKey: ["ad-spend-current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_spend_tracking")
        .select("ad_spend")
        .eq("month", monthStart)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.ad_spend) || 0;
    },
  });

  const { data: leadCount = 0 } = useQuery({
    queryKey: ["internet-leads-month"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("quote_requests")
        .select("*", { count: "exact", head: true })
        .eq("lead_type", "internet")
        .not("assigned_to", "is", null)
        .gte("assigned_at", monthStart + "T00:00:00");
      if (error) throw error;
      return count || 0;
    },
  });

  const cpl = leadCount > 0 ? adSpend / leadCount : 0;
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cpl);

  return <StatsCard title="Internet Cost Per Lead" value={leadCount > 0 ? formatted : "N/A"} icon={DollarSign} />;
}
