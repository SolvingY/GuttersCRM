import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Target, Trophy } from 'lucide-react';

export function GoalSettingModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkUserMetrics = async () => {
      try {
        // Check if user has any metrics with a yearly goal set
        const { data, error } = await supabase
          .from('user_metrics')
          .select('yearly_goal')
          .eq('user_id', user.id)
          .order('metric_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error checking user metrics:', error);
          return;
        }

        // Show modal if no metrics exist OR yearly_goal is 0/null
        if (!data || !data.yearly_goal || Number(data.yearly_goal) === 0) {
          setIsOpen(true);
        }
      } finally {
        setLoading(false);
      }
    };

    // Small delay to let the dashboard load first
    const timer = setTimeout(checkUserMetrics, 500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const goal = parseFloat(yearlyGoal);
    if (isNaN(goal) || goal <= 0) {
      toast({
        title: 'Invalid goal',
        description: 'Please enter a valid yearly goal amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the user's latest metric with the yearly goal
      const { error } = await supabase
        .from('user_metrics')
        .update({ yearly_goal: goal })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Goal set!',
        description: `Your yearly goal of $${goal.toLocaleString()} has been saved.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error setting goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your goal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    toast({
      title: 'Goal skipped',
      description: 'You can set your goal later in Settings.',
    });
  };

  if (loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-accent/10 rounded-full">
              <Trophy className="h-6 w-6 text-accent" />
            </div>
          </div>
          <DialogTitle className="text-xl">Welcome To The 6 Figure System</DialogTitle>
          <DialogDescription>
            Set your yearly sales goal to track your progress throughout the fiscal year.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="yearlyGoal" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Yearly Sales Goal
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="yearlyGoal"
                type="number"
                min="0"
                step="1000"
                placeholder="500000"
                value={yearlyGoal}
                onChange={(e) => setYearlyGoal(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be your target for the Dec 2025 - Dec 2026 fiscal year.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !yearlyGoal}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Set Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
