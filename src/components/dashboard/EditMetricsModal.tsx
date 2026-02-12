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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  realUserId: string;
  name: string;
  approvedRevenue: number;
  points: number;
  yearlyGoal: number;
  salesRank: string;
  closedDeals: number;
  earningsYtd?: number;
  leads: number;
  collections?: number;
  selfGeneratedDeals: number;
  canvassLeads: number;
  canvassDealsClose: number;
  internetLeads?: number;
  internetLeadsClosed?: number;
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
  const [isResettingWeekly, setIsResettingWeekly] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [formData, setFormData] = useState({
    approvedRevenue: 0,
    points: 0,
    yearlyGoal: 0,
    salesRank: 'SR1',
    earningsYtd: 0,
    collections: 0,
    selfGeneratedDeals: 0,
    canvassLeads: 0,
    canvassDealsClose: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        approvedRevenue: user.approvedRevenue || 0,
        points: user.points || 0,
        yearlyGoal: user.yearlyGoal || 0,
        salesRank: user.salesRank || 'SR1',
        earningsYtd: user.earningsYtd || 0,
        collections: user.collections || 0,
        selfGeneratedDeals: user.selfGeneratedDeals || 0,
        canvassLeads: user.canvassLeads || 0,
        canvassDealsClose: user.canvassDealsClose || 0,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Total leads now = canvass leads only (self-gen leads removed)
      const calculatedLeads = formData.canvassLeads;
      const calculatedClosedDeals = formData.selfGeneratedDeals + formData.canvassDealsClose;
      
      // Update with sub-component values AND calculated totals
      const { error } = await supabase
        .from('user_metrics')
        .update({
          approved_revenue: formData.approvedRevenue,
          points: formData.points,
          yearly_goal: formData.yearlyGoal,
          sales_rank: formData.salesRank,
          earnings_ytd: formData.earningsYtd,
          collections: formData.collections,
          self_generated_deals: formData.selfGeneratedDeals,
          canvass_leads: formData.canvassLeads,
          canvass_deals_closed: formData.canvassDealsClose,
          // Also update the totals for consistency
          leads: calculatedLeads,
          closed_deals: calculatedClosedDeals,
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

  const handleResetWeeklyMetrics = async () => {
    if (!user?.realUserId) {
      toast({
        title: 'Error',
        description: 'Cannot reset weekly metrics: user ID not found',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingWeekly(true);
    try {
      const { error } = await supabase
        .from('weekly_user_metrics')
        .update({
          approved_revenue: 0,
          collections: 0,
          leads: 0,
          closed_deals: 0,
          points_earned: 0,
          sales: 0,
          earnings: 0,
          canvass_leads: 0,
          canvass_deals_closed: 0,
        })
        .eq('user_id', user.realUserId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `All weekly metrics reset for ${user.name}`,
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error resetting weekly metrics:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset weekly metrics',
        variant: 'destructive',
      });
    } finally {
      setIsResettingWeekly(false);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Metrics</DialogTitle>
          <DialogDescription>
            Update metrics for {user?.name || 'user'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 pr-2">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="approvedRevenue" className="text-right">
                  Approved Revenue
                </Label>
                <Input
                  id="approvedRevenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.approvedRevenue}
                  onChange={(e) => setFormData({ ...formData, approvedRevenue: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                  placeholder="Enter approved revenue"
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
                <Label htmlFor="collections" className="text-right">
                  Collections
                </Label>
                <Input
                  id="collections"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.collections}
                  onChange={(e) => setFormData({ ...formData, collections: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                  placeholder="Enter collections amount"
                />
              </div>

              {/* Leads Section */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Canvass Leads (Assigned)</p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="canvassLeads" className="text-right">
                  Canvass Leads
                </Label>
                <Input
                  id="canvassLeads"
                  type="number"
                  min="0"
                  value={formData.canvassLeads}
                  onChange={(e) => setFormData({ ...formData, canvassLeads: parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                  placeholder="Enter canvass leads assigned"
                />
              </div>

              {/* Contracts Section */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Contracts Breakdown</p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="selfGeneratedDeals" className="text-right">
                  Self-Gen Contracts
                </Label>
                <Input
                  id="selfGeneratedDeals"
                  type="number"
                  min="0"
                  value={formData.selfGeneratedDeals}
                  onChange={(e) => setFormData({ ...formData, selfGeneratedDeals: parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                  placeholder="Enter self-generated contracts"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="canvassDealsClose" className="text-right">
                  Canvass Contracts
                </Label>
                <Input
                  id="canvassDealsClose"
                  type="number"
                  min="0"
                  value={formData.canvassDealsClose}
                  onChange={(e) => setFormData({ ...formData, canvassDealsClose: parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                  placeholder="Enter canvass contracts"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 bg-muted/50 rounded-md py-2">
                <Label className="text-right text-muted-foreground">
                  Total Contracts
                </Label>
                <div className="col-span-3 font-semibold">
                  {formData.selfGeneratedDeals + formData.canvassDealsClose}
                  <span className="text-xs text-muted-foreground ml-2">(auto-calculated)</span>
                </div>
              </div>

              {/* Internet Leads Section (Read-Only) */}
              {(user?.internetLeads !== undefined && user?.internetLeads !== null) && (
                <>
                  <div className="border-t border-border pt-4 mt-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Internet Leads (Auto-Tracked)</p>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 bg-muted/50 rounded-md py-2">
                    <Label className="text-right text-muted-foreground">Internet Leads</Label>
                    <div className="col-span-3 font-semibold">{user.internetLeads ?? 0}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 bg-muted/50 rounded-md py-2">
                    <Label className="text-right text-muted-foreground">Internet Closed</Label>
                    <div className="col-span-3 font-semibold">{user.internetLeadsClosed ?? 0}</div>
                  </div>

                  {/* LtC Breakdown */}
                  <div className="border-t border-border pt-4 mt-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Lead-to-Close Breakdown</p>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 bg-muted/50 rounded-md py-2">
                    <Label className="text-right text-muted-foreground">Canvass LtC</Label>
                    <div className="col-span-3 font-semibold">
                      {formData.canvassLeads > 0 ? ((formData.canvassDealsClose / formData.canvassLeads) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 bg-muted/50 rounded-md py-2">
                    <Label className="text-right text-muted-foreground">Internet LtC</Label>
                    <div className="col-span-3 font-semibold">
                      {(user.internetLeads ?? 0) > 0 ? (((user.internetLeadsClosed ?? 0) / (user.internetLeads ?? 1)) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 bg-muted/50 rounded-md py-2">
                    <Label className="text-right text-muted-foreground">Total LtC</Label>
                    <div className="col-span-3 font-semibold">
                      {(() => {
                        const totalLeads = formData.canvassLeads + (user.internetLeads ?? 0);
                        const totalClosed = formData.canvassDealsClose + (user.internetLeadsClosed ?? 0);
                        return totalLeads > 0 ? ((totalClosed / totalLeads) * 100).toFixed(1) : '0.0';
                      })()}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
            <div className="flex flex-col-reverse sm:flex-row w-full gap-2 sm:justify-between sm:items-center">
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={isResettingWeekly}
                className="w-full sm:w-auto"
              >
                {isResettingWeekly && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Weekly
              </Button>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Reset Weekly Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Weekly Metrics?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set all weekly metrics to zero for <span className="font-semibold">{user?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowResetConfirm(false);
                handleResetWeeklyMetrics();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Reset Weekly Metrics
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
