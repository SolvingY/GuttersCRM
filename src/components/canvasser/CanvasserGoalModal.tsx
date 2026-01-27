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
import { Loader2, Target, FileCheck, DollarSign } from "lucide-react";

interface CanvasserGoalModalProps {
  onGoalSet?: () => void;
}

export function CanvasserGoalModal({ onGoalSet }: CanvasserGoalModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contractsGoal, setContractsGoal] = useState("");
  const [leadsSetGoal, setLeadsSetGoal] = useState("");
  const [incomeGoal, setIncomeGoal] = useState("");
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
      .select("yearly_goal, leads_set_goal, income_goal")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error checking goal:", error);
      setLoading(false);
      return;
    }

    // Show modal if all goals are unset (all three = 0 or null)
    const hasNoGoals = !data || 
      ((data.yearly_goal === 0 || data.yearly_goal === null) &&
       (data.leads_set_goal === 0 || data.leads_set_goal === null) &&
       (data.income_goal === 0 || data.income_goal === null));

    if (hasNoGoals) {
      setOpen(true);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;

    const contracts = parseInt(contractsGoal) || 0;
    const leadsSet = parseInt(leadsSetGoal) || 0;
    const income = parseFloat(incomeGoal) || 0;

    // At least one goal should be set
    if (contracts <= 0 && leadsSet <= 0 && income <= 0) {
      toast({
        title: "Invalid goals",
        description: "Please enter at least one goal greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("canvasser_metrics")
      .update({ 
        yearly_goal: contracts,
        leads_set_goal: leadsSet,
        income_goal: income
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error saving goals",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Goals set!",
        description: "Your yearly goals have been saved.",
      });
      setOpen(false);
      if (onGoalSet) onGoalSet();
    }
    setSaving(false);
  };

  const handleSkip = () => {
    setOpen(false);
    toast({
      title: "Goals skipped",
      description: "You can set your goals later in Settings.",
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
            Set Your Yearly Goals
          </DialogTitle>
          <DialogDescription>
            Set your goals for the year. This will help track your progress on the leaderboard and stats page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contractsGoal" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Contracts Goal (Leads Closed)
            </Label>
            <Input
              id="contractsGoal"
              type="number"
              placeholder="e.g., 50"
              value={contractsGoal}
              onChange={(e) => setContractsGoal(e.target.value)}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadsSetGoal" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Leads Set Goal
            </Label>
            <Input
              id="leadsSetGoal"
              type="number"
              placeholder="e.g., 200"
              value={leadsSetGoal}
              onChange={(e) => setLeadsSetGoal(e.target.value)}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeGoal" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Income Goal ($)
            </Label>
            <Input
              id="incomeGoal"
              type="number"
              placeholder="e.g., 50000"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(e.target.value)}
              min={0}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            You can update these goals anytime in Settings.
          </p>

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
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set Goals"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}