import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  CheckCircle,
  Circle,
  ChevronDown,
  Loader2,
  FileText,
  Clock,
  Send,
  Bell,
  PlusCircle,
  Eye,
  Trash2,
  Edit,
  Upload,
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
}

interface OfferTemplate {
  id: string;
  position_title: string;
  template_content: string;
  pay_structure_description: string | null;
  is_active: boolean;
  created_at: string;
}

interface OfferLetter {
  id: string;
  contractor_id: string;
  position_title: string;
  start_date: string | null;
  letter_content: string | null;
  file_url: string | null;
  status: string;
  sent_at: string;
  signed_at: string | null;
  signed_by_name: string | null;
  declined_at: string | null;
}

export default function OnboardingManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMandatoryDialog, setShowMandatoryDialog] = useState(false);
  const [mandatoryTarget, setMandatoryTarget] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(true);

  const { data: members = [] } = useQuery({
    queryKey: ["admin-onboarding-members"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("profiles") as any)
        .select("id, full_name, onboarding_complete, onboarding_completed_at, start_date, is_archived")
        .eq("is_archived", false)
        .order("full_name");
      if (error) throw error;
      return (data || []) as unknown as (TeamMember & { is_archived: boolean })[];
    },
  });

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

  const incompleteMembers = members.filter((m) => !m.onboarding_complete);
  const completedMembers = members.filter((m) => m.onboarding_complete);

  const getMemberProgress = (userId: string) => allProgress.filter((p) => p.user_id === userId);
  const getMemberCompletionRate = (userId: string) => {
    const prog = getMemberProgress(userId);
    if (prog.length === 0) return 0;
    return Math.round((prog.filter((p) => p.status === "completed").length / prog.length) * 100);
  };
  const getMissingDocs = (userId: string) =>
    allProgress.filter((p) => p.user_id === userId && p.step?.step_type === "document_upload" && p.status !== "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl uppercase tracking-wide">Onboarding Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track team onboarding progress, offer letters, and mandatory actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-800">{incompleteMembers.length} in progress</Badge>
          <Badge className="bg-green-100 text-green-800">{completedMembers.length} complete</Badge>
        </div>
      </div>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Team Progress</TabsTrigger>
          <TabsTrigger value="offer-letters">Offer Letters</TabsTrigger>
          <TabsTrigger value="report-settings">Report Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6 mt-4">
          {/* Notifications Panel */}
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
                                {member.start_date ? `Started ${format(new Date(member.start_date), "MMM d, yyyy")}` : "No start date"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{completionRate}% complete</p>
                              <Progress value={completionRate} className="w-24 h-1.5 mt-1" />
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { setMandatoryTarget(member.id); setShowMandatoryDialog(true); }}>
                              <Send className="w-3 h-3 mr-1" /> Request Action
                            </Button>
                          </div>
                        </div>

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

                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                          {prog.sort((a, b) => (a.step?.sort_order || 0) - (b.step?.sort_order || 0)).map((p) => (
                            <div key={p.id} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                              p.status === "completed" ? "bg-green-50 text-green-700" : "bg-muted/50 text-muted-foreground"
                            }`}>
                              {p.status === "completed" ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                              <span className="truncate">{p.step?.step_name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {incompleteMembers.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">All team members have completed onboarding.</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Completed members */}
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

          {/* Pending mandatory actions */}
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
                            Assigned to: {member?.full_name || "Unknown"} • {format(new Date(action.created_at), "MMM d, yyyy")}
                            {action.due_date && ` • Due: ${format(new Date(action.due_date), "MMM d")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {action.blocks_access && <Badge className="bg-red-100 text-red-800 text-xs">Blocks Access</Badge>}
                          <DismissActionButton actionId={action.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="offer-letters" className="space-y-6 mt-4">
          <OfferLettersTab members={members} currentUserId={user?.id || ""} />
        </TabsContent>

        <TabsContent value="report-settings" className="space-y-6 mt-4">
          <ReportEmailSettingsTab />
        </TabsContent>
      </Tabs>

      <CreateMandatoryActionDialog
        isOpen={showMandatoryDialog}
        onClose={() => { setShowMandatoryDialog(false); setMandatoryTarget(null); }}
        targetUserId={mandatoryTarget}
        members={members}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}

// ============================================================
// Offer Letters Tab
// ============================================================
function OfferLettersTab({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OfferTemplate | null>(null);
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null);

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["offer-letter-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("offer_letter_templates" as any) as any)
        .select("*").eq("is_active", true).order("created_at");
      if (error) throw error;
      return data as OfferTemplate[];
    },
  });

  // Sent letters
  const { data: sentLetters = [] } = useQuery({
    queryKey: ["sent-offer-letters"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("contractor_offer_letters" as any) as any)
        .select("*").order("sent_at", { ascending: false });
      if (error) throw error;
      return data as OfferLetter[];
    },
  });

  const deleteTemplate = async (id: string) => {
    await (supabase.from("offer_letter_templates" as any) as any).update({ is_active: false }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["offer-letter-templates"] });
    toast({ title: "Template deleted" });
  };

  return (
    <div className="space-y-6">
      {/* Section A — Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Offer Letter Templates
            </CardTitle>
            <Button size="sm" onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }}>
              <PlusCircle className="w-4 h-4 mr-1" /> New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-sm">{t.position_title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {t.template_content.slice(0, 80)}...
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingTemplate(t); setShowTemplateForm(true); }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B — Send */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Offer Letter
            </CardTitle>
            <Button onClick={() => setShowSendDialog(true)}>
              <Send className="w-4 h-4 mr-1" /> Send Offer Letter
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Section C — Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sent Letters Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {sentLetters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offer letters sent yet.</p>
          ) : (
            <div className="space-y-2">
              {sentLetters.map((letter) => {
                const member = members.find((m) => m.id === letter.contractor_id);
                const isExpanded = expandedLetter === letter.id;
                return (
                  <div key={letter.id}>
                    <button
                      onClick={() => setExpandedLetter(isExpanded ? null : letter.id)}
                      className="w-full flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">{member?.full_name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{letter.position_title}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(letter.sent_at), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          letter.status === "signed" ? "bg-green-100 text-green-800" :
                          letter.status === "declined" ? "bg-red-100 text-red-800" :
                          "bg-amber-100 text-amber-800"
                        }>
                          {letter.status === "pending_review" ? "Pending" : letter.status.charAt(0).toUpperCase() + letter.status.slice(1)}
                        </Badge>
                        {letter.signed_at && (
                          <span className="text-xs text-muted-foreground">{format(new Date(letter.signed_at), "MMM d")}</span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 p-4 bg-white rounded-lg border border-border">
                        {letter.letter_content ? (
                          <pre className="text-sm whitespace-pre-wrap font-sans">{letter.letter_content}</pre>
                        ) : letter.file_url ? (
                          <a href={letter.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">
                            View uploaded PDF
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">No content available.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Form Dialog */}
      <TemplateFormDialog
        isOpen={showTemplateForm}
        onClose={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
        editing={editingTemplate}
        currentUserId={currentUserId}
      />

      {/* Send Dialog */}
      <SendOfferLetterDialog
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        members={members}
        templates={templates}
        currentUserId={currentUserId}
      />
    </div>
  );
}

// ============================================================
// Template Form Dialog
// ============================================================
function TemplateFormDialog({ isOpen, onClose, editing, currentUserId }: {
  isOpen: boolean; onClose: () => void; editing: OfferTemplate | null; currentUserId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ positionTitle: "", templateContent: "", payStructure: "" });

  useEffect(() => {
    if (editing) {
      setForm({ positionTitle: editing.position_title, templateContent: editing.template_content, payStructure: editing.pay_structure_description || "" });
    } else {
      setForm({ positionTitle: "", templateContent: "", payStructure: "" });
    }
  }, [editing, isOpen]);

  const handleSave = async () => {
    if (!form.positionTitle || !form.templateContent) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      if (editing) {
        await (supabase.from("offer_letter_templates" as any) as any)
          .update({ position_title: form.positionTitle, template_content: form.templateContent, pay_structure_description: form.payStructure || null, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
      } else {
        await (supabase.from("offer_letter_templates" as any) as any)
          .insert({ position_title: form.positionTitle, template_content: form.templateContent, pay_structure_description: form.payStructure || null, created_by: currentUserId });
      }
      queryClient.invalidateQueries({ queryKey: ["offer-letter-templates"] });
      toast({ title: editing ? "Template updated" : "Template created" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">{editing ? "Edit" : "New"} Offer Letter Template</DialogTitle>
          <DialogDescription>Use {"{{contractor_name}}"}, {"{{start_date}}"}, {"{{position_title}}"}, {"{{pay_structure}}"} as placeholders.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Position Title *</Label>
            <Input value={form.positionTitle} onChange={(e) => setForm({ ...form, positionTitle: e.target.value })} placeholder="e.g. Sales Representative" />
          </div>
          <div>
            <Label>Pay Structure Description</Label>
            <Textarea value={form.payStructure} onChange={(e) => setForm({ ...form, payStructure: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Letter Body *</Label>
            <Textarea value={form.templateContent} onChange={(e) => setForm({ ...form, templateContent: e.target.value })} rows={10} className="font-mono text-xs" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? "Update" : "Save"} Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Send Offer Letter Dialog
// ============================================================
function SendOfferLetterDialog({ isOpen, onClose, members, templates, currentUserId }: {
  isOpen: boolean; onClose: () => void; members: TeamMember[]; templates: OfferTemplate[]; currentUserId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"template" | "pdf">("template");
  const [contractorId, setContractorId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [payStructure, setPayStructure] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [filePath, setFilePath] = useState("");

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedMember = members.find((m) => m.id === contractorId);

  useEffect(() => {
    if (selectedTemplate) {
      setPositionTitle(selectedTemplate.position_title);
      setPayStructure(selectedTemplate.pay_structure_description || "");
    }
  }, [templateId]);

  const renderPreview = () => {
    if (!selectedTemplate) return "";
    let content = selectedTemplate.template_content;
    content = content.replace(/\{\{contractor_name\}\}/g, selectedMember?.full_name || "[Contractor Name]");
    content = content.replace(/\{\{start_date\}\}/g, startDate ? format(new Date(startDate + "T12:00:00"), "MMMM d, yyyy") : "[Start Date]");
    content = content.replace(/\{\{position_title\}\}/g, positionTitle || "[Position]");
    content = content.replace(/\{\{pay_structure\}\}/g, payStructure || "[Pay Structure]");
    return content;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `offer-letters/${contractorId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("contractor-files").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("contractor-files").getPublicUrl(path);
      setFileUrl(urlData.publicUrl);
      setFilePath(path);
      toast({ title: "File uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleSend = async () => {
    if (!contractorId) { toast({ title: "Select a contractor", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const letterContent = method === "template" ? renderPreview() : null;
      const { error } = await (supabase.from("contractor_offer_letters" as any) as any).insert({
        contractor_id: contractorId,
        template_id: method === "template" ? templateId || null : null,
        position_title: positionTitle || "Sales Representative",
        start_date: startDate || null,
        pay_structure: payStructure || null,
        additional_terms: additionalTerms || null,
        letter_content: letterContent,
        file_path: method === "pdf" ? filePath || null : null,
        file_url: method === "pdf" ? fileUrl || null : null,
        admin_id: currentUserId,
        status: "pending_review",
      });
      if (error) throw error;

      // Upsert progress for contract_sign step to in_progress
      const { data: contractStep } = await (supabase.from("onboarding_steps" as any) as any)
        .select("id").eq("step_key", "contract_sign").maybeSingle();
      if (contractStep) {
        await (supabase.from("user_onboarding_progress" as any) as any).upsert({
          user_id: contractorId,
          step_id: contractStep.id,
          status: "in_progress",
          metadata: {},
        }, { onConflict: "user_id,step_id" });
      }

      queryClient.invalidateQueries({ queryKey: ["sent-offer-letters"] });
      toast({ title: "Offer letter sent", description: `Sent to ${selectedMember?.full_name || "contractor"}.` });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const incompleteMembers = members.filter((m) => !m.onboarding_complete);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Send Offer Letter</DialogTitle>
          <DialogDescription>Select a contractor and choose how to send their offer letter.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Step 1: Contractor */}
          <div>
            <Label>Select Contractor *</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger><SelectValue placeholder="Choose team member" /></SelectTrigger>
              <SelectContent>
                {incompleteMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Method */}
          <div>
            <Label>Method</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => setMethod("template")}
                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                  method === "template" ? "border-accent bg-accent/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <FileText className="w-5 h-5 mb-1" />
                <p className="font-medium">Use Template</p>
                <p className="text-xs text-muted-foreground">Fill in details from a template</p>
              </button>
              <button
                onClick={() => setMethod("pdf")}
                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                  method === "pdf" ? "border-accent bg-accent/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Upload className="w-5 h-5 mb-1" />
                <p className="font-medium">Upload PDF</p>
                <p className="text-xs text-muted-foreground">Upload a pre-made offer letter</p>
              </button>
            </div>
          </div>

          {method === "template" ? (
            <>
              <div>
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.position_title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Position Title</Label>
                  <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Pay Structure</Label>
                <Textarea value={payStructure} onChange={(e) => setPayStructure(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Additional Terms (optional)</Label>
                <Textarea value={additionalTerms} onChange={(e) => setAdditionalTerms(e.target.value)} rows={2} />
              </div>
              {selectedTemplate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="mt-1 p-4 border border-border rounded-lg bg-white text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {renderPreview()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <Label>Position Title</Label>
                <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="Sales Representative" />
              </div>
              <div>
                <Label>Upload PDF *</Label>
                <Input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="mt-1" />
                {uploading && <p className="text-xs text-muted-foreground mt-1"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Uploading...</p>}
                {fileUrl && <p className="text-xs text-green-600 mt-1">✓ File uploaded</p>}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSend} disabled={loading || !contractorId || (method === "pdf" && !fileUrl)} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Offer Letter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Dismiss Action Button
// ============================================================
function DismissActionButton({ actionId }: { actionId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDismiss = async () => {
    setLoading(true);
    try {
      await (supabase.from("mandatory_actions" as any) as any).update({ status: "dismissed" }).eq("id", actionId);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-mandatory-actions"] });
      toast({ title: "Action dismissed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={loading} className="text-xs">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Dismiss"}
    </Button>
  );
}

// ============================================================
// Create Mandatory Action Dialog
// ============================================================
function CreateMandatoryActionDialog({ isOpen, onClose, targetUserId, members, currentUserId }: {
  isOpen: boolean; onClose: () => void; targetUserId: string | null; members: TeamMember[]; currentUserId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ userId: "", actionType: "document_upload", title: "", description: "", dueDate: "", blocksAccess: true });

  useEffect(() => {
    if (targetUserId) setForm((f) => ({ ...f, userId: targetUserId }));
  }, [targetUserId]);

  const handleCreate = async () => {
    if (!form.userId || !form.title) { toast({ title: "Please fill in required fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error } = await (supabase.from("mandatory_actions" as any) as any).insert({
        user_id: form.userId, requested_by: currentUserId, action_type: form.actionType,
        title: form.title, description: form.description || null, due_date: form.dueDate || null, blocks_access: form.blocksAccess,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-pending-mandatory-actions"] });
      toast({ title: "Mandatory action created" });
      onClose();
      setForm({ userId: "", actionType: "document_upload", title: "", description: "", dueDate: "", blocksAccess: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Create Mandatory Action</DialogTitle>
          <DialogDescription>Creates a required action that blocks the user from the dashboard until completed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Team Member</Label>
            <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
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
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Upload updated W-9" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="blocks-access" checked={form.blocksAccess} onChange={(e) => setForm({ ...form, blocksAccess: e.target.checked })} className="rounded border-border" />
            <label htmlFor="blocks-access" className="text-sm">Block dashboard access until completed</label>
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
