import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";

interface AdSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMonth?: string;
}

export function AdSpendDialog({ open, onOpenChange, initialMonth }: AdSpendDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");

  // Set initial month when dialog opens
  useEffect(() => {
    if (open && initialMonth) {
      setSelectedMonth(initialMonth);
    } else if (open) {
      setSelectedMonth(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    }
  }, [open, initialMonth]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), i));
    return { value: format(date, "yyyy-MM-dd"), label: format(date, "MMMM yyyy") };
  });

  const { data: history = [] } = useQuery({
    queryKey: ["ad-spend-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_spend_tracking")
        .select("*")
        .order("month", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Pre-fill amount when month selection changes
  useEffect(() => {
    const existing = history.find(h => (h.month || '').substring(0, 10) === selectedMonth);
    setAmount(existing ? String(existing.ad_spend) : "");
  }, [selectedMonth, history]);

  const handleSubmit = async () => {
    if (!amount) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("update_ad_spend", {
        p_month: selectedMonth,
        p_ad_spend: parseFloat(amount),
      });
      if (error) throw error;

      toast({ title: "Ad spend saved" });
      queryClient.invalidateQueries({ queryKey: ["ad-spend-history"] });
      queryClient.invalidateQueries({ queryKey: ["ad-spend-current"] });
      queryClient.invalidateQueries({ queryKey: ["ad-spend-ytd"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Manage Ad Spend</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {history.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Recent History</p>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{format(new Date(h.month), "MMMM yyyy")}</span>
                    <span className="font-medium">{formatCurrency(Number(h.ad_spend))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
