import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DollarSign, Pencil } from "lucide-react";
import { startOfMonth, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { AdSpendDialog } from "@/components/admin/AdSpendDialog";

export function AdSpendCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(adSpend);

  return (
    <>
      <div className="relative">
        <StatsCard title="Ad Spend (This Month)" value={formatted} icon={DollarSign} />
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={() => setDialogOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      <AdSpendDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
