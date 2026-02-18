import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, User, Target, DollarSign } from "lucide-react";

export default function SupplementerSettings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [yearlyGoal, setYearlyGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("supplementer_metrics")
      .select("display_name, yearly_goal")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) console.error("Error fetching settings:", error);
    else if (data) {
      setDisplayName(data.display_name || "");
      setYearlyGoal(data.yearly_goal?.toString() || "100000");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("supplementer_metrics")
      .update({
        display_name: displayName,
        yearly_goal: parseFloat(yearlyGoal) || 100000,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved", description: "Your settings have been updated." });
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
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>Update your display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" />
            <p className="text-xs text-muted-foreground">This is how your name appears on the leaderboard</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Yearly Goal
          </CardTitle>
          <CardDescription>Set your annual RCV recovery target</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="yearlyGoal" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              RCV Recovery Goal ($)
            </Label>
            <Input id="yearlyGoal" type="number" value={yearlyGoal} onChange={(e) => setYearlyGoal(e.target.value)} min={0} placeholder="100000" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Changes
      </Button>

      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">Supplementer</span>
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
