import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target } from "lucide-react";

interface CanvasserGoalModalProps {
  onGoalSet?: () => void;
}

export function CanvasserGoalModal({ onGoalSet }: CanvasserGoalModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [yearlyGoal, setYearlyGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      checkExistingGoal();
    }
  }, [user]);

  const checkExistingGoal = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("canvasser_metrics")
      .select("yearly_goal")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error checking goal:", error);
      setLoading(false);
      return;
    }

    // Show modal if no goal set or goal is 0
    if (!data || data.yearly_goal === 0 || data.yearly_goal === null) {
      setOpen(true);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;

    const goal = parseInt(yearlyGoal);
    if (isNaN(goal) || goal <= 0) {
      toast({
        title: "Invalid goal",
        description: "Please enter a valid number greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("canvasser_metrics")
      .update({ yearly_goal: goal })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error saving goal",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Goal set!",
        description: `Your yearly goal of ${goal} leads closed has been saved.`,
      });
      setOpen(false);
      if (onGoalSet) onGoalSet();
    }
    setSaving(false);
  };

  const handleSkip = () => {
    setOpen(false);
    toast({
      title: "Goal skipped",
      description: "You can set your goal later in Settings.",
    });
    if (onGoalSet) onGoalSet();
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Set Your Yearly Goal
          </DialogTitle>
          <DialogDescription>
            Set a goal for leads closed this year. This will help track your progress on the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="yearlyGoal">Yearly Leads Closed Goal</Label>
            <Input
              id="yearlyGoal"
              type="number"
              placeholder="e.g., 100"
              value={yearlyGoal}
              onChange={(e) => setYearlyGoal(e.target.value)}
              min={1}
            />
            <p className="text-xs text-muted-foreground">
              How many leads do you want to close this year?
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !yearlyGoal}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set Goal"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
