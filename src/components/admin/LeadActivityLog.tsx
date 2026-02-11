import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Phone, Mail, Calendar, ArrowRight, CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const activityIcons: Record<string, any> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  followup: Calendar,
  status_change: ArrowRight,
  assignment: ArrowRight,
  quote_submitted: FileText,
  quote_approved: CheckCircle,
  quote_rejected: XCircle,
};

const activityLabels: Record<string, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  followup: "Follow-up",
  status_change: "Status Change",
  assignment: "Assignment",
  quote_submitted: "Quote Submitted",
  quote_approved: "Quote Approved",
  quote_rejected: "Quote Rejected",
};

interface LeadActivityLogProps {
  leadId: string;
}

export function LeadActivityLog({ leadId }: LeadActivityLogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activityType, setActivityType] = useState("note");
  const [content, setContent] = useState("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activity_log")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Content required");
      const { error } = await supabase.from("lead_activity_log").insert({
        lead_id: leadId,
        user_id: user?.id,
        activity_type: activityType,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      setContent("");
      toast({ title: "Activity logged" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="border border-border rounded-lg p-5">
      <h2 className="font-heading text-lg uppercase mb-4">Activity Log</h2>

      {/* Add new entry */}
      <div className="space-y-2 mb-4 pb-4 border-b border-border">
        <div className="flex gap-2">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => addActivity.mutate()}
            disabled={addActivity.isPending || !content.trim()}
          >
            {addActivity.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Log"}
          </Button>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add notes about this interaction..."
          className="min-h-[60px] text-sm"
        />
      </div>

      {/* Timeline */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.activity_type] || MessageSquare;
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="p-1.5 bg-secondary rounded shrink-0 mt-0.5">
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-heading uppercase text-muted-foreground">
                      {activityLabels[activity.activity_type] || activity.activity_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{activity.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
