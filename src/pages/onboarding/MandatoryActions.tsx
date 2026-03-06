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
import {
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  Clock,
  Shield,
  LogOut,
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
    mutationFn: async ({ actionId, metadata }: { actionId: string; metadata?: Record<string, any> }) => {
      const { error } = await supabase
        .from("mandatory_actions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
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
            onComplete={(metadata) => completeMutation.mutate({ actionId: action.id, metadata })}
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
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

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

      // Create contractor_files record
      await supabase.from("contractor_files").insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
        description: `Mandatory action: ${action.title}`,
      } as any);

      onComplete({ file_name: file.name, file_path: filePath });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    document_upload: <Upload className="w-5 h-5" />,
    document_sign: <FileText className="w-5 h-5" />,
    info_update: <Shield className="w-5 h-5" />,
    policy_ack: <Shield className="w-5 h-5" />,
    custom: <AlertTriangle className="w-5 h-5" />,
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
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
      <CardContent>
        {/* If admin provided a file for the user to review */}
        {action.file_url && (
          <div className="mb-4 bg-muted/30 rounded-lg p-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <a href={action.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
              View attached document
            </a>
          </div>
        )}

        {(action.action_type === "document_upload" || action.action_type === "document_sign") && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Upload document</Label>
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
        )}

        {(action.action_type === "policy_ack" || action.action_type === "info_update" || action.action_type === "custom") && (
          <Button onClick={() => onComplete()} disabled={isCompleting}>
            {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Mark as Complete
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
