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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CanvasserMetrics {
  metricId: string;
  name: string;
  leadsSet: number;
  leadsClosed: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  conversationsHad: number;
  notInterested: number;
  hoursWorked: number;
  points: number;
  income: number;
  yearlyGoal: number;
  doorsKnocked?: number;
}

interface EditCanvasserMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CanvasserMetrics | null;
  onSuccess: () => void;
}

export function EditCanvasserMetricsModal({ open, onOpenChange, user, onSuccess }: EditCanvasserMetricsModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leadsSet: 0,
    leadsClosed: 0,
    leadsWithDamage: 0,
    leadsWithoutDamage: 0,
    conversationsHad: 0,
    notInterested: 0,
    hoursWorked: 0,
    points: 0,
    income: 0,
    yearlyGoal: 0,
    doorsKnocked: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        leadsSet: user.leadsSet || 0,
        leadsClosed: user.leadsClosed || 0,
        leadsWithDamage: user.leadsWithDamage || 0,
        leadsWithoutDamage: user.leadsWithoutDamage || 0,
        conversationsHad: user.conversationsHad || 0,
        notInterested: user.notInterested || 0,
        hoursWorked: user.hoursWorked || 0,
        points: user.points || 0,
        income: user.income || 0,
        yearlyGoal: user.yearlyGoal || 0,
        doorsKnocked: user.doorsKnocked || 0,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('canvasser_metrics')
        .update({
          yearly_goal: formData.yearlyGoal,
          leads_set: formData.leadsSet,
          leads_closed: formData.leadsClosed,
          leads_with_damage: formData.leadsWithDamage,
          leads_without_damage: formData.leadsWithoutDamage,
          conversations_had: formData.conversationsHad,
          not_interested: formData.notInterested,
          hours_worked: formData.hoursWorked,
          points: formData.points,
          income: formData.income,
          doors_knocked: formData.doorsKnocked,
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
      console.error('Error updating canvasser metrics:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update metrics',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Canvasser Metrics</DialogTitle>
          <DialogDescription>
            Update metrics for {user?.name || 'canvasser'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="yearlyGoal" className="text-right">
                Yearly Goal
              </Label>
              <Input
                id="yearlyGoal"
                type="number"
                min="0"
                value={formData.yearlyGoal}
                onChange={(e) => setFormData({ ...formData, yearlyGoal: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter yearly goal (leads closed)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leadsSet" className="text-right">
                Leads Set
              </Label>
              <Input
                id="leadsSet"
                type="number"
                min="0"
                value={formData.leadsSet}
                onChange={(e) => setFormData({ ...formData, leadsSet: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter leads set"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leadsClosed" className="text-right">
                Leads Closed
              </Label>
              <Input
                id="leadsClosed"
                type="number"
                min="0"
                value={formData.leadsClosed}
                onChange={(e) => setFormData({ ...formData, leadsClosed: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter leads closed"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leadsWithDamage" className="text-right">
                With Damage
              </Label>
              <Input
                id="leadsWithDamage"
                type="number"
                min="0"
                value={formData.leadsWithDamage}
                onChange={(e) => setFormData({ ...formData, leadsWithDamage: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter leads with damage"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leadsWithoutDamage" className="text-right">
                w/o Damage
              </Label>
              <Input
                id="leadsWithoutDamage"
                type="number"
                min="0"
                value={formData.leadsWithoutDamage}
                onChange={(e) => setFormData({ ...formData, leadsWithoutDamage: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter leads without damage"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="conversationsHad" className="text-right">
                Convos Had
              </Label>
              <Input
                id="conversationsHad"
                type="number"
                min="0"
                value={formData.conversationsHad}
                onChange={(e) => setFormData({ ...formData, conversationsHad: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter conversations had"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notInterested" className="text-right">
                Not Interested
              </Label>
              <Input
                id="notInterested"
                type="number"
                min="0"
                value={formData.notInterested}
                onChange={(e) => setFormData({ ...formData, notInterested: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter not interested count"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hoursWorked" className="text-right">
                Hours Worked
              </Label>
              <Input
                id="hoursWorked"
                type="number"
                min="0"
                step="0.5"
                value={formData.hoursWorked}
                onChange={(e) => setFormData({ ...formData, hoursWorked: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter hours worked"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="income" className="text-right">
                Income ($)
              </Label>
              <Input
                id="income"
                type="number"
                min="0"
                step="0.01"
                value={formData.income}
                onChange={(e) => setFormData({ ...formData, income: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter income"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doorsKnocked" className="text-right">
                Doors Knocked
              </Label>
              <Input
                id="doorsKnocked"
                type="number"
                min="0"
                value={formData.doorsKnocked}
                onChange={(e) => setFormData({ ...formData, doorsKnocked: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="Enter doors knocked"
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
