import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RANK_OPTIONS } from '@/lib/constants';

interface UserMetrics {
  metricId: string;
  name: string;
  sales: number;
  points: number;
  yearlyGoal: number;
  salesRank: string;
  closedDeals: number;
  earningsYtd?: number;
  leads: number;
}

interface EditMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserMetrics | null;
  onSuccess: () => void;
}

export function EditMetricsModal({ open, onOpenChange, user, onSuccess }: EditMetricsModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    sales: 0,
    points: 0,
    yearlyGoal: 0,
    salesRank: 'SR1',
    closedDeals: 0,
    earningsYtd: 0,
    leads: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        sales: user.sales || 0,
        points: user.points || 0,
        yearlyGoal: user.yearlyGoal || 0,
        salesRank: user.salesRank || 'SR1',
        closedDeals: user.closedDeals || 0,
        earningsYtd: user.earningsYtd || 0,
        leads: user.leads || 0,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // userId is now the metric ID, update directly
      const { error } = await supabase
        .from('user_metrics')
        .update({
          sales: formData.sales,
          points: formData.points,
          yearly_goal: formData.yearlyGoal,
          sales_rank: formData.salesRank,
          closed_deals: formData.closedDeals,
          earnings_ytd: formData.earningsYtd,
          leads: formData.leads,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.metricId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Metrics updated for ${user.name}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating metrics:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update metrics',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Metrics</DialogTitle>
          <DialogDescription>
            Update metrics for {user?.name || 'user'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sales" className="text-right">
                Sales
              </Label>
              <Input
                id="sales"
                type="number"
                step="0.01"
                min="0"
                value={formData.sales}
                onChange={(e) => setFormData({ ...formData, sales: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter sales amount"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="earningsYtd" className="text-right">
                YTD Earnings
              </Label>
              <Input
                id="earningsYtd"
                type="number"
                step="0.01"
                min="0"
                value={formData.earningsYtd}
                onChange={(e) => setFormData({ ...formData, earningsYtd: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter YTD earnings"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">
                Points
              </Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter points"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="yearlyGoal" className="text-right">
                Yearly Goal
              </Label>
              <Input
                id="yearlyGoal"
                type="number"
                step="1000"
                min="0"
                value={formData.yearlyGoal}
                onChange={(e) => setFormData({ ...formData, yearlyGoal: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter yearly goal"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salesRank" className="text-right">
                Rank
              </Label>
              <Select
                value={formData.salesRank}
                onValueChange={(value) => setFormData({ ...formData, salesRank: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select rank" />
                </SelectTrigger>
                <SelectContent>
                  {RANK_OPTIONS.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="closedDeals" className="text-right">
                Closed Deals
              </Label>
              <Input
                id="closedDeals"
                type="number"
                min="0"
                value={formData.closedDeals}
                onChange={(e) => setFormData({ ...formData, closedDeals: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter closed deals"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leads" className="text-right">
                Leads
              </Label>
              <Input
                id="leads"
                type="number"
                min="0"
                value={formData.leads}
                onChange={(e) => setFormData({ ...formData, leads: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter leads count"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
