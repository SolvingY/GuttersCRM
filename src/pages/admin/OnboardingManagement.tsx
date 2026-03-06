import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Circle,
  ChevronDown,
  PlusCircle,
  Loader2,
  FileText,
  Clock,
  Send,
  Upload,
  Shield,
  Bell,
} from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  full_name: string;
  onboarding_complete: boolean;
  onboarding_completed_at: string | null;
  start_date: string | null;
}

interface OnboardingProgress {
  id: string;
  user_id: string;
  step_id: string;
  status: string;
  completed_at: string | null;
  step: {
    step_key: string;
    step_name: string;
    step_type: string;
    required: boolean;
    sort_order: number;
  };
}

interface MandatoryAction {
  id: string;
  user_id: string;
  action_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  blocks_access: boolean;
  created_at: string;
  user?: { full_name: string };
}

export default function OnboardingManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showMandatoryDialog, setShowMandatoryDialog] = useState(false);
  const [mandatoryTarget, setMandatoryTarget] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(true);

  // Fetch team members with onboarding status
  const { data: members = [] } = useQuery({
    queryKey: ["admin-onboarding-members"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("profiles") as any)
        .select("id, full_name, onboarding_complete, onboarding_completed_at, start_date, is_archived")
        .eq("is_archived", false)
        .order("full_name");
      if (error) throw error;
      return (data || []) as unknown as (TeamMember & { is_archived: boolean })[];
    },
  });

  // Fetch all onboarding progress for all users
  const { data: allProgress = [] } = useQuery({
    queryKey: ["admin-all-onboarding-progress"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("user_onboarding_progress" as any) as any)
        .select("*, step:onboarding_steps(step_key, step_name, step_type, required, sort_order)")
        .order("step(sort_order)");
      if (error) throw error;
      return data as OnboardingProgress[];
    },
  });

  // Fetch all pending mandatory actions
  const { data: pendingActions = [] } = useQuery({
    queryKey: ["admin-pending-mandatory-actions"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("mandatory_actions" as any) as any)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MandatoryAction[];
    },
  });

  // Members who need attention (incomplete onboarding or missing docs)
  const incompleteMembers = members.filter((m) => !m.onboarding_complete);
  const completedMembers = members.filter((m) => m.onboarding_complete);

  // Get per-member progress
  const getMemberProgress = (userId: string) => {
    return allProgress.filter((p) => p.user_id === userId);
  };

  const getMemberCompletionRate = (userId: string) => {
    const prog = getMemberProgress(userId);
    if (prog.length === 0) return 0;
    const completed = prog.filter((p) => p.status === "completed").length;
    return Math.round((completed / prog.length) * 100);
  };

  // Get missing document categories per member
  const getMissingDocs = (userId: string) => {
    return allProgress.filter(
      (p) => p.user_id === userId && p.step?.step_type === "document_upload" && p.status !== "completed"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl uppercase tracking-wide">Onboarding Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track team onboarding progress, missing documents, and mandatory actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-800">
            {incompleteMembers.length} in progress
          </Badge>
          <Badge className="bg-green-100 text-green-800">
            {completedMembers.length} complete
          </Badge>
        </div>
      </div>

      {/* Notifications Panel — members needing attention */}
      <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer border-amber-200 hover:border-amber-300 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Action Required ({incompleteMembers.length} members)
                </CardTitle>
                <ChevronDown className={`w-4 h-4 transition-transform ${notificationsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 mt-2">
            {incompleteMembers.map((member) => {
              const prog = getMemberProgress(member.id);
              const missingDocs = getMissingDocs(member.id);
              const completionRate = getMemberCompletionRate(member.id);
              const memberActions = pendingActions.filter((a) => a.user_id === member.id);

              return (
                <Card key={member.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold">
                          {member.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.start_date
                              ? `Started ${format(new Date(member.start_date), "MMM d, yyyy")}`
                              : "No start date"
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{completionRate}% complete</p>
                          <Progress value={completionRate} className="w-24 h-1.5 mt-1" />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMandatoryTarget(member.id);
                            setShowMandatoryDialog(true);
                          }}
                        >
                          <Send className="w-3 h-3 mr-1" /> Request Action
                        </Button>
                      </div>
                    </div>

                    {/* Missing docs alerts */}
                    {missingDocs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {missingDocs.map((doc) => (
                          <Badge key={doc.id} variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Missing: {doc.step?.step_name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Pending mandatory actions */}
                    {memberActions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {memberActions.map((action) => (
                          <Badge key={action.id} variant="outline" className="text-xs text-red-700 border-red-300 bg-red-50">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending: {action.title}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Step progress */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                      {prog
                        .sort((a, b) => (a.step?.sort_order || 0) - (b.step?.sort_order || 0))
                        .map((p) => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                              p.status === "completed"
                                ? "bg-green-50 text-green-700"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {p.status === "completed" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Circle className="w-3 h-3" />
                            )}
                            <span className="truncate">{p.step?.step_name}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {incompleteMembers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                All team members have completed onboarding.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Completed members summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Onboarded Team Members ({completedMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedMembers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {completedMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="truncate">{m.full_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No members have completed onboarding yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Pending mandatory actions overview */}
      {pendingActions.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Active Mandatory Actions ({pendingActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingActions.map((action) => {
                const member = members.find((m) => m.id === action.user_id);
                return (
                  <div key={action.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {member?.full_name || "Unknown"} •{" "}
                        {format(new Date(action.created_at), "MMM d, yyyy")}
                        {action.due_date && ` • Due: ${format(new Date(action.due_date), "MMM d")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.blocks_access && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Blocks Access</Badge>
                      )}
                      <DismissActionButton actionId={action.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Mandatory Action Dialog */}
      <CreateMandatoryActionDialog
        isOpen={showMandatoryDialog}
        onClose={() => {
          setShowMandatoryDialog(false);
          setMandatoryTarget(null);
        }}
        targetUserId={mandatoryTarget}
        members={members}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}

function DismissActionButton({ actionId }: { actionId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDismiss = async () => {
    setLoading(true);
    try {
      await (supabase
        .from("mandatory_actions" as any) as any)
        .update({ status: "dismissed" })
        .eq("id", actionId);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-mandatory-actions"] });
      toast({ title: "Action dismissed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={loading} className="text-xs">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Dismiss"}
    </Button>
  );
}

function CreateMandatoryActionDialog({
  isOpen,
  onClose,
  targetUserId,
  members,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string | null;
  members: TeamMember[];
  currentUserId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: targetUserId || "",
    actionType: "document_upload" as string,
    title: "",
    description: "",
    dueDate: "",
    blocksAccess: true,
  });

  // Update userId when targetUserId changes
  useState(() => {
    if (targetUserId) setForm((f) => ({ ...f, userId: targetUserId }));
  });

  const handleCreate = async () => {
    if (!form.userId || !form.title) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase.from("mandatory_actions" as any) as any).insert({
        user_id: form.userId,
        requested_by: currentUserId,
        action_type: form.actionType,
        title: form.title,
        description: form.description || null,
        due_date: form.dueDate || null,
        blocks_access: form.blocksAccess,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-pending-mandatory-actions"] });
      toast({ title: "Mandatory action created", description: `${form.title} assigned to team member.` });
      onClose();
      setForm({ userId: "", actionType: "document_upload", title: "", description: "", dueDate: "", blocksAccess: true });
    } catch (err: any) {
      toast({ title: "Error creating action", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Create Mandatory Action</DialogTitle>
          <DialogDescription>
            This creates a required action that blocks the user from accessing the dashboard until completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Team Member</Label>
            <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Action Type</Label>
            <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document_upload">Document Upload</SelectItem>
                <SelectItem value="document_sign">Document Sign</SelectItem>
                <SelectItem value="info_update">Information Update</SelectItem>
                <SelectItem value="policy_ack">Policy Acknowledgment</SelectItem>
                <SelectItem value="custom">Custom Action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Upload updated W-9"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional details for the team member..."
              rows={2}
            />
          </div>

          <div>
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="blocks-access"
              checked={form.blocksAccess}
              onChange={(e) => setForm({ ...form, blocksAccess: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor="blocks-access" className="text-sm">
              Block dashboard access until completed
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? "Creating..." : "Create Action"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
