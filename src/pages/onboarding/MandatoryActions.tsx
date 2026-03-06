import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/SignaturePad";
import {
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  Clock,
  Shield,
  LogOut,
  PenLine,
  Download,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface MandatoryAction {
  id: string;
  action_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  blocks_access: boolean;
  file_url: string | null;
  created_at: string;
}

export default function MandatoryActions() {
  const { user, signOut, refreshOnboardingStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: actions = [], refetch } = useQuery({
    queryKey: ["mandatory-actions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("mandatory_actions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .eq("blocks_access", true)
        .order("created_at");
      if (error) throw error;
      return data as MandatoryAction[];
    },
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      actionId,
      signatureData,
      signerName,
    }: {
      actionId: string;
      signatureData?: string;
      signerName?: string;
    }) => {
      const update: Record<string, any> = {
        status: "completed",
        completed_at: new Date().toISOString(),
      };
      if (signatureData) update.signature_data = signatureData;
      if (signerName) update.signed_by_name = signerName;
      if (signatureData) update.signed_at = new Date().toISOString();

      const { error } = await supabase
        .from("mandatory_actions")
        .update(update)
        .eq("id", actionId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetch();
      await refreshOnboardingStatus();
      const remaining = actions.length - 1;
      if (remaining <= 0) {
        toast({ title: "All actions completed! Redirecting..." });
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        toast({ title: "Action completed" });
      }
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Action Required
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              You must complete the following before you can access the dashboard.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            userId={user.id}
            onComplete={(sig, name) =>
              completeMutation.mutate({ actionId: action.id, signatureData: sig, signerName: name })
            }
            isCompleting={completeMutation.isPending}
          />
        ))}

        {actions.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">All actions completed!</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  action,
  userId,
  onComplete,
  isCompleting,
}: {
  action: MandatoryAction;
  userId: string;
  onComplete: (signatureData?: string, signerName?: string) => void;
  isCompleting: boolean;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [signature, setSignature] = useState("");
  const [signerName, setSignerName] = useState("");
  const [docAccepted, setDocAccepted] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `mandatory/${userId}/${action.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contractor-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await supabase.from("contractor_files").insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
        description: `Mandatory action: ${action.title}`,
      } as any);

      onComplete(undefined, undefined);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSign = () => {
    if (!signerName.trim()) {
      toast({ title: "Please type your full name to sign", variant: "destructive" });
      return;
    }
    if (!signature) {
      toast({ title: "Please draw your signature", variant: "destructive" });
      return;
    }
    onComplete(signature, signerName.trim());
  };

  const typeIcons: Record<string, React.ReactNode> = {
    document_upload: <Upload className="w-5 h-5" />,
    document_sign: <PenLine className="w-5 h-5" />,
    info_update: <Shield className="w-5 h-5" />,
    policy_ack: <Shield className="w-5 h-5" />,
    custom: <AlertTriangle className="w-5 h-5" />,
  };

  // --- document_sign with admin-provided document ---
  const isDocSign = action.action_type === "document_sign" && !!action.file_url;

  return (
    <Card className={isDocSign ? "border-blue-200" : "border-amber-200"}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isDocSign ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
          }`}>
            {typeIcons[action.action_type] || <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{action.title}</CardTitle>
            {action.description && (
              <CardDescription className="mt-1">{action.description}</CardDescription>
            )}
          </div>
          {action.due_date && (
            <Badge variant="outline" className="shrink-0 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Due {format(new Date(action.due_date), "MMM d")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── Document Sign Flow ───────────────────────────── */}
        {isDocSign && (
          <>
            {/* Document viewer */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Document to Review & Sign
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setShowDoc(!showDoc)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    {showDoc ? "Hide" : "View"}
                  </Button>
                  <a href={action.file_url!} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Download className="w-3 h-3 mr-1" /> Download
                    </Button>
                  </a>
                </div>
              </div>

              {showDoc && (
                <div className="w-full bg-muted/20" style={{ height: 480 }}>
                  <iframe
                    src={action.file_url!}
                    className="w-full h-full border-0"
                    title="Document Preview"
                  />
                </div>
              )}

              {!showDoc && (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Click <strong>View</strong> to read the document, or <strong>Download</strong> to open it.</p>
                  <p className="text-xs mt-1">You must review it before signing.</p>
                </div>
              )}
            </div>

            {/* Acceptance checkbox */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <input
                type="checkbox"
                id={`accept-${action.id}`}
                checked={docAccepted}
                onChange={(e) => setDocAccepted(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <label htmlFor={`accept-${action.id}`} className="text-sm leading-snug">
                I have read and understood this document and agree to the terms contained within it.
              </label>
            </div>

            {/* Signature capture */}
            {docAccepted && (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">Full Legal Name *</Label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Type your full name as it appears on the document"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Typing your name confirms your intent to sign this document electronically.
                  </p>
                </div>

                <SignaturePad
                  label="Draw Your Signature *"
                  value={signature}
                  onChange={setSignature}
                  height={140}
                />

                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 leading-relaxed">
                  By clicking "Sign & Submit" you agree that your electronic signature is the legal
                  equivalent of your manual signature on this document, and that you are entering
                  into this agreement voluntarily.
                </div>

                <Button
                  className="w-full"
                  onClick={handleSign}
                  disabled={isCompleting || !signature || !signerName.trim()}
                >
                  {isCompleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    <><PenLine className="w-4 h-4 mr-2" /> Sign & Submit</>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── Upload Flow (document_upload or document_sign without file) ── */}
        {!isDocSign && (action.action_type === "document_upload" || action.action_type === "document_sign") && (
          <>
            {action.file_url && (
              <div className="mb-2 bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <a href={action.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                  View attached document
                </a>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Upload your document</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleUpload}
                  disabled={uploading || isCompleting}
                  className="mt-1"
                />
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Acknowledge / Custom Flow ─────────────────────── */}
        {(action.action_type === "policy_ack" || action.action_type === "info_update" || action.action_type === "custom") && (
          <>
            {action.file_url && (
              <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <a href={action.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                  View attached document
                </a>
              </div>
            )}
            <Button onClick={() => onComplete()} disabled={isCompleting}>
              {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Mark as Complete
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
