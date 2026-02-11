import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function AutoAssignmentSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["auto-assignment-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_assignment_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!settings) return;
      const { error } = await supabase
        .from("auto_assignment_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-assignment-settings"] });
      toast({ title: "Settings updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!settings) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 border border-border rounded-lg hover:border-accent/50 transition-colors bg-card">
        <Settings2 className="w-4 h-4 text-muted-foreground" />
        <span className="font-heading text-sm uppercase flex-1 text-left">Auto-Assignment Settings</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border border-t-0 border-border rounded-b-lg p-4 space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-assign-toggle">Enable Auto-Assignment</Label>
          <Switch
            id="auto-assign-toggle"
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings.mutate({ enabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>Assignment Method</Label>
          <Select
            value={settings.assignment_method}
            onValueChange={(v) => updateSettings.mutate({ assignment_method: v })}
            disabled={!settings.enabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="round_robin">Round Robin (fewest leads)</SelectItem>
              <SelectItem value="ranking_based">Ranking Based (best close rate)</SelectItem>
              <SelectItem value="workload_based">Workload Based (balanced)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Leads Per Rep</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={settings.max_leads_per_rep}
            onChange={(e) => updateSettings.mutate({ max_leads_per_rep: parseInt(e.target.value) || 10 })}
            disabled={!settings.enabled}
            className="w-24"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
