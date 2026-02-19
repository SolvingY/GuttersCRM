import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface SupplementerMetricsUser {
  metricId: string;
  name: string;
  points: number;
  totalRcvIncreased: number;
  totalMoneyCollected: number;
  totalSupplementsProcessed: number;
  cocBonusPoints: number;
  avgCocDays: number;
  avgDepreciationDays: number;
  avgCodeDays: number;
  collectionRate: number;
  yearlyGoal: number;
}

interface EditSupplementerMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SupplementerMetricsUser | null;
  onSuccess: () => void;
}

export function EditSupplementerMetricsModal({ open, onOpenChange, user, onSuccess }: EditSupplementerMetricsModalProps) {
  const { toast } = useToast();
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && user) {
      setYearlyGoal(String(user.yearlyGoal || ''));
    }
    onOpenChange(isOpen);
  };

  if (!user) return null;

  const rcvPoints = Math.floor(user.totalRcvIncreased / 1000);
  const collectionPoints = Math.floor(user.totalMoneyCollected / 2000);
  const speedBonus = user.cocBonusPoints;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('supplementer_metrics')
        .update({ yearly_goal: parseFloat(yearlyGoal) || 0 })
        .eq('id', user.metricId);

      if (error) throw error;

      toast({ title: 'Yearly goal updated' });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Edit {user.name}</DialogTitle>
          <DialogDescription>Update supplementer yearly goal.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Points Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Points Breakdown</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">RCV Points</span>
              <span className="text-right font-medium">{rcvPoints}</span>
              <span className="text-muted-foreground">Collection Points</span>
              <span className="text-right font-medium">{collectionPoints}</span>
              <span className="text-muted-foreground">Speed Bonus</span>
              <span className="text-right font-medium">{speedBonus}</span>
              <span className="text-foreground font-semibold border-t border-border pt-1">Total Points</span>
              <span className="text-right font-bold text-primary border-t border-border pt-1">{user.points}</span>
            </div>
          </div>

          {/* Read-only metrics */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Total RCV Increased</span>
            <span className="text-right font-medium">{formatCurrency(user.totalRcvIncreased)}</span>
            <span className="text-muted-foreground">Total Collected</span>
            <span className="text-right font-medium">{formatCurrency(user.totalMoneyCollected)}</span>
            <span className="text-muted-foreground">Supplements Processed</span>
            <span className="text-right font-medium">{user.totalSupplementsProcessed}</span>
            <span className="text-muted-foreground">Collection Rate</span>
            <span className="text-right font-medium">{user.collectionRate.toFixed(1)}%</span>
            <span className="text-muted-foreground">Avg COC Days</span>
            <span className="text-right font-medium">{user.avgCocDays.toFixed(1)}</span>
            <span className="text-muted-foreground">Avg Depreciation Days</span>
            <span className="text-right font-medium">{user.avgDepreciationDays.toFixed(1)}</span>
            <span className="text-muted-foreground">Avg Code Days</span>
            <span className="text-right font-medium">{user.avgCodeDays.toFixed(1)}</span>
          </div>

          {/* Editable yearly goal */}
          <div className="space-y-2">
            <Label>Yearly Goal ($)</Label>
            <Input
              type="number"
              min="0"
              step="1000"
              value={yearlyGoal}
              onChange={(e) => setYearlyGoal(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}