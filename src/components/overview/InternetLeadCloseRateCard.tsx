import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Percent } from "lucide-react";

export function InternetLeadCloseRateCard() {
  const { data } = useQuery({
    queryKey: ["internet-ltc-rate"],
    queryFn: async () => {
      const { data: metrics, error } = await supabase
        .from("user_metrics")
        .select("internet_leads, internet_leads_closed")
        .order("metric_date", { ascending: false });
      if (error) throw error;

      // Deduplicate by taking latest per user (already ordered desc)
      const seen = new Set<string>();
      let totalLeads = 0;
      let totalClosed = 0;
      for (const m of metrics || []) {
        const key = (m as any).user_id;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        totalLeads += Number((m as any).internet_leads) || 0;
        totalClosed += Number((m as any).internet_leads_closed) || 0;
      }

      return totalLeads > 0 ? (totalClosed / totalLeads) * 100 : 0;
    },
  });

  const rate = data ?? 0;
  const color = rate >= 60 ? "text-green-600" : rate >= 30 ? "text-yellow-600" : "text-red-600";

  return <StatsCard title="Internet Lead Close %" value={`${rate.toFixed(1)}%`} icon={Percent} valueClassName={color} />;
}
