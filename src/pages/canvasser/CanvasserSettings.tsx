import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, User, Target, FileCheck, DollarSign } from "lucide-react";

export default function CanvasserSettings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [contractsGoal, setContractsGoal] = useState("");
  const [leadsSetGoal, setLeadsSetGoal] = useState("");
  const [incomeGoal, setIncomeGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("canvasser_metrics")
      .select("display_name, yearly_goal, leads_set_goal, income_goal")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching settings:", error);
    } else if (data) {
      setDisplayName(data.display_name || "");
      setContractsGoal(data.yearly_goal?.toString() || "0");
      setLeadsSetGoal(data.leads_set_goal?.toString() || "0");
      setIncomeGoal(data.income_goal?.toString() || "0");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const contracts = parseInt(contractsGoal) || 0;
    const leadsSet = parseInt(leadsSetGoal) || 0;
    const income = parseFloat(incomeGoal) || 0;

    const { error } = await supabase
      .from("canvasser_metrics")
      .update({ 
        display_name: displayName, 
        yearly_goal: contracts,
        leads_set_goal: leadsSet,
        income_goal: income
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Your settings and goals have been updated.",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and goals</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Update your display name and other preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Contact an administrator to change your email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
            <p className="text-xs text-muted-foreground">
              This is how your name appears on the leaderboard
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Yearly Goals
          </CardTitle>
          <CardDescription>
            Set your annual targets to track your progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractsGoal" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Contracts Goal (Leads Closed)
            </Label>
            <Input
              id="contractsGoal"
              type="number"
              value={contractsGoal}
              onChange={(e) => setContractsGoal(e.target.value)}
              placeholder="Enter your contracts goal"
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              How many leads do you want to close this year?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadsSetGoal" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Leads Set Goal
            </Label>
            <Input
              id="leadsSetGoal"
              type="number"
              value={leadsSetGoal}
              onChange={(e) => setLeadsSetGoal(e.target.value)}
              placeholder="Enter your leads set goal"
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              How many leads do you want to set this year?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeGoal" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Income Goal ($)
            </Label>
            <Input
              id="incomeGoal"
              type="number"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(e.target.value)}
              placeholder="Enter your income goal"
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              What's your income target for this year?
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">Canvasser</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-xs">{user?.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}