import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  Upload,
  FileText,
  User,
  Phone,
  Shield,
  Wrench,
  GraduationCap,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  step_key: string;
  step_name: string;
  step_type: string;
  description: string;
  required: boolean;
  sort_order: number;
}

interface UserProgress {
  id: string;
  step_id: string;
  status: string;
  completed_at: string | null;
  metadata: Record<string, any>;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  welcome_policy: <Shield className="w-5 h-5" />,
  personal_info: <User className="w-5 h-5" />,
  emergency_contact: <Phone className="w-5 h-5" />,
  upload_w9: <FileText className="w-5 h-5" />,
  upload_banking: <FileText className="w-5 h-5" />,
  upload_model_release: <FileText className="w-5 h-5" />,
  upload_dd_form: <FileText className="w-5 h-5" />,
  sign_offer_letter: <FileText className="w-5 h-5" />,
  sign_contract: <FileText className="w-5 h-5" />,
  setup_giddy_up: <Wrench className="w-5 h-5" />,
  setup_time_tree: <Wrench className="w-5 h-5" />,
  dna_assessment: <ClipboardList className="w-5 h-5" />,
  training: <GraduationCap className="w-5 h-5" />,
};

export default function OnboardingFlow() {
  const { user, isAdmin, refreshOnboardingStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Fetch onboarding steps
  const { data: steps = [] } = useQuery({
    queryKey: ["onboarding-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_steps")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as OnboardingStep[];
    },
  });

  // Fetch user's progress
  const { data: progress = [], refetch: refetchProgress } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_onboarding_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user,
  });

  // Fetch profile data for info_review steps
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["onboarding-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStepProgress = (stepId: string) => {
    return progress.find((p) => p.step_id === stepId);
  };

  const completedCount = steps.filter((s) => {
    const p = getStepProgress(s.id);
    return p?.status === "completed";
  }).length;

  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  // Complete step mutation
  const completeMutation = useMutation({
    mutationFn: async ({ stepId, metadata }: { stepId: string; metadata?: Record<string, any> }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_onboarding_progress")
        .upsert({
          user_id: user.id,
          step_id: stepId,
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: metadata || {},
        }, { onConflict: "user_id,step_id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchProgress();
      toast({ title: "Step completed!", description: "Moving to the next step." });
      // Advance to next step if available
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    },
  });

  const currentStep = steps[currentStepIndex];
  const currentProgress = currentStep ? getStepProgress(currentStep.id) : null;
  const isCurrentCompleted = currentProgress?.status === "completed";

  // Auto-advance to first incomplete step on initial load only
  const [initializedRef] = useState({ done: false });
  useEffect(() => {
    if (steps.length > 0 && progress.length >= 0 && !initializedRef.done) {
      initializedRef.done = true;
      const firstIncomplete = steps.findIndex((s) => {
        const p = getStepProgress(s.id);
        return p?.status !== "completed";
      });
      if (firstIncomplete >= 0) {
        setCurrentStepIndex(firstIncomplete);
      }
    }
  }, [steps.length]);

  if (!user || steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-heading text-2xl uppercase tracking-wide">Welcome to NextGen Roofing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete the following steps to get started with your new role.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Progress value={progressPercent} className="flex-1 h-2" />
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{steps.length} complete
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Step sidebar */}
        <div className="space-y-1">
          {steps.map((step, idx) => {
            const stepProg = getStepProgress(step.id);
            const isCompleted = stepProg?.status === "completed";
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  isCurrent
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : isCompleted
                    ? "text-muted-foreground hover:bg-muted/50"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className={`w-4 h-4 shrink-0 ${isCurrent ? "text-accent" : "text-muted-foreground"}`} />
                )}
                <span className="truncate">{step.step_name}</span>
                {!step.required && (
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                    Optional
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div>
          {currentStep && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    {STEP_ICONS[currentStep.step_key] || <Circle className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="font-heading uppercase text-lg">{currentStep.step_name}</CardTitle>
                    <CardDescription>{currentStep.description}</CardDescription>
                  </div>
                  {isCurrentCompleted && (
                    <Badge className="ml-auto bg-green-100 text-green-800">Completed</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <StepContent
                  step={currentStep}
                  progress={currentProgress}
                  profile={profile}
                  userId={user.id}
                  onComplete={(metadata) => completeMutation.mutate({ stepId: currentStep.id, metadata })}
                  isCompleting={completeMutation.isPending}
                  refetchProfile={refetchProfile}
                />

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>

                  {currentStepIndex < steps.length - 1 ? (
                    <Button
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        const { data } = await supabase.rpc("check_onboarding_complete", { p_user_id: user.id });
                        if (data === true) {
                          await refreshOnboardingStatus();
                          toast({ title: "All done! Redirecting..." });
                          navigate("/dashboard");
                        } else {
                          toast({ title: "Some required steps are not complete", variant: "destructive" });
                        }
                      }}
                    >
                      Finish Onboarding
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step content renderer
// ============================================================
function StepContent({
  step,
  progress,
  profile,
  userId,
  onComplete,
  isCompleting,
  refetchProfile,
}: {
  step: OnboardingStep;
  progress: UserProgress | null | undefined;
  profile: any;
  userId: string;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  refetchProfile: () => void;
}) {
  const isCompleted = progress?.status === "completed";

  switch (step.step_type) {
    case "policy_ack":
      return <PolicyAckStep isCompleted={isCompleted} onComplete={onComplete} isCompleting={isCompleting} />;
    case "info_review":
      return (
        <InfoReviewStep
          stepKey={step.step_key}
          profile={profile}
          userId={userId}
          isCompleted={isCompleted}
          onComplete={onComplete}
          isCompleting={isCompleting}
          refetchProfile={refetchProfile}
        />
      );
    case "document_upload":
      return (
        <DocumentUploadStep
          stepKey={step.step_key}
          stepName={step.step_name}
          userId={userId}
          isCompleted={isCompleted}
          onComplete={onComplete}
          isCompleting={isCompleting}
          metadata={progress?.metadata}
        />
      );
    case "tool_setup":
      return <ToolSetupStep stepKey={step.step_key} isCompleted={isCompleted} onComplete={onComplete} isCompleting={isCompleting} />;
    case "assessment":
      return <AssessmentStep isCompleted={isCompleted} onComplete={onComplete} isCompleting={isCompleting} userId={userId} />;
    case "training":
      return <TrainingStep isCompleted={isCompleted} />;
    default:
      return <p className="text-muted-foreground">Unknown step type.</p>;
  }
}

// ============================================================
// Policy Acknowledgment
// ============================================================
function PolicyAckStep({
  isCompleted,
  onComplete,
  isCompleting,
}: {
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">You have acknowledged the company policy.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-3 max-h-64 overflow-y-auto border border-border">
        <p className="font-semibold">NextGen Roofing Company Policy</p>
        <p>
          By joining NextGen Roofing, you agree to uphold the highest standards of professionalism,
          integrity, and customer service. Key expectations include:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Maintain professional conduct at all times when representing the company</li>
          <li>Follow all safety protocols and OSHA guidelines on job sites</li>
          <li>Provide accurate and honest information to customers</li>
          <li>Protect confidential company and customer information</li>
          <li>Report to work on time and fulfill scheduling commitments</li>
          <li>Treat all team members, customers, and partners with respect</li>
          <li>Comply with all local, state, and federal regulations</li>
          <li>Use company tools, equipment, and resources responsibly</li>
          <li>Participate in required training and professional development</li>
          <li>Follow the chain of command for issue resolution</li>
        </ul>
        <p>
          Violation of these policies may result in disciplinary action, up to and including termination.
        </p>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="policy-agree"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
        />
        <label htmlFor="policy-agree" className="text-sm cursor-pointer">
          I have read, understood, and agree to the NextGen Roofing company policies and code of conduct.
        </label>
      </div>

      <Button onClick={() => onComplete({ acknowledged_at: new Date().toISOString() })} disabled={!agreed || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
        Acknowledge & Continue
      </Button>
    </div>
  );
}

// ============================================================
// Info Review (Personal Info / Emergency Contact)
// ============================================================
function InfoReviewStep({
  stepKey,
  profile,
  userId,
  isCompleted,
  onComplete,
  isCompleting,
  refetchProfile,
}: {
  stepKey: string;
  profile: any;
  userId: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  refetchProfile: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const isPersonalInfo = stepKey === "personal_info";

  const [form, setForm] = useState({
    phone: "",
    birthday: "",
    street_address: "",
    city: "",
    state: "",
    zip_code: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        phone: profile.phone || "",
        birthday: profile.birthday || "",
        street_address: profile.street_address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_code: profile.zip_code || "",
        emergency_contact_name: profile.emergency_contact_name || "",
        emergency_contact_phone: profile.emergency_contact_phone || "",
        emergency_contact_relationship: profile.emergency_contact_relationship || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = isPersonalInfo
        ? {
            phone: form.phone,
            birthday: form.birthday || null,
            street_address: form.street_address,
            city: form.city,
            state: form.state,
            zip_code: form.zip_code,
          }
        : {
            emergency_contact_name: form.emergency_contact_name,
            emergency_contact_phone: form.emergency_contact_phone,
            emergency_contact_relationship: form.emergency_contact_relationship,
          };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
      refetchProfile();
      onComplete(updates);
      toast({ title: "Information saved" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">
          {isPersonalInfo ? "Personal information" : "Emergency contact"} has been submitted.
        </span>
      </div>
    );
  }

  if (isPersonalInfo) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Phone Number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Street Address</Label>
            <Input value={form.street_address} onChange={(e) => setForm({ ...form, street_address: e.target.value })} placeholder="123 Main St" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="TX" />
          </div>
          <div>
            <Label>ZIP Code</Label>
            <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} placeholder="75001" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || isCompleting || !form.phone}>
          {(saving || isCompleting) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Save & Complete
        </Button>
      </div>
    );
  }

  // Emergency contact
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Emergency Contact Name</Label>
          <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Jane Doe" />
        </div>
        <div>
          <Label>Emergency Contact Phone</Label>
          <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="(555) 987-6543" />
        </div>
        <div>
          <Label>Relationship</Label>
          <Input value={form.emergency_contact_relationship} onChange={(e) => setForm({ ...form, emergency_contact_relationship: e.target.value })} placeholder="Spouse, Parent, etc." />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving || isCompleting || !form.emergency_contact_name || !form.emergency_contact_phone}>
        {(saving || isCompleting) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Save & Complete
      </Button>
    </div>
  );
}

// ============================================================
// Document Upload Step
// ============================================================
function DocumentUploadStep({
  stepKey,
  stepName,
  userId,
  isCompleted,
  onComplete,
  isCompleting,
  metadata,
}: {
  stepKey: string;
  stepName: string;
  userId: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  metadata?: Record<string, any>;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(metadata?.file_name || null);

  // For sign steps: admin uploads the doc, contractor just confirms
  const isSignStep = stepKey === "sign_offer_letter" || stepKey === "sign_contract";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `onboarding/${userId}/${stepKey}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contractor-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contractor-files")
        .getPublicUrl(filePath);

      // Also create a contractor_files record
      const categoryMap: Record<string, string> = {
        upload_w9: "W9",
        upload_banking: "Banking",
        upload_model_release: "Other",
        upload_dd_form: "Other",
        sign_offer_letter: "Offer Letters",
        sign_contract: "Contracts",
      };

      const catName = categoryMap[stepKey] || "Other";
      const { data: catData } = await supabase
        .from("contractor_document_categories")
        .select("id")
        .eq("name", catName)
        .maybeSingle();

      await supabase.from("contractor_files").insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
        category_id: catData?.id || null,
        description: `Uploaded during onboarding: ${stepName}`,
      } as any);

      setUploadedFile(file.name);
      onComplete({ file_name: file.name, file_path: filePath, file_url: urlData.publicUrl });
      toast({ title: "File uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {uploadedFile || metadata?.file_name ? `Uploaded: ${uploadedFile || metadata?.file_name}` : "Step completed"}
          </span>
        </div>
      </div>
    );
  }

  if (isSignStep) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Waiting for admin</p>
            <p className="text-amber-700 mt-1">
              Your admin will upload the {stepKey === "sign_offer_letter" ? "offer letter" : "contract"} for
              you to review. You can also upload a signed copy yourself if you have it.
            </p>
          </div>
        </div>
        <div>
          <Label className="text-sm">Upload signed document (if you have it)</Label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleUpload}
            disabled={uploading}
            className="mt-1"
          />
        </div>
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm">Upload your {stepName}</Label>
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleUpload}
          disabled={uploading}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, DOC, DOCX, PNG, JPG</p>
      </div>
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tool Setup Step
// ============================================================
function ToolSetupStep({
  stepKey,
  isCompleted,
  onComplete,
  isCompleting,
}: {
  stepKey: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const toolName = stepKey === "setup_giddy_up" ? "Giddy Up" : "Time Tree";

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">{toolName} access confirmed.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your admin should have set up your <strong>{toolName}</strong> account. Please confirm you have access.
      </p>

      <div className="flex items-start gap-3">
        <Checkbox
          id={`tool-${stepKey}`}
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
        />
        <label htmlFor={`tool-${stepKey}`} className="text-sm cursor-pointer">
          I confirm that my {toolName} account is set up and I have access.
        </label>
      </div>

      <Button onClick={() => onComplete({ confirmed_at: new Date().toISOString() })} disabled={!confirmed || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Confirm Access
      </Button>
    </div>
  );
}

// ============================================================
// Assessment Step
// ============================================================
function AssessmentStep({
  isCompleted,
  onComplete,
  isCompleting,
  userId,
}: {
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  userId: string;
}) {
  const navigate = useNavigate();

  // Check if they already have a DNA assessment from their job application
  const { data: existingAssessment } = useQuery({
    queryKey: ["onboarding-dna-check", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("dna_score, alignment_category")
        .eq("created_user_id", userId)
        .not("dna_score", "is", null)
        .maybeSingle();
      return data;
    },
  });

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">DNA Assessment complete.</span>
      </div>
    );
  }

  if (existingAssessment?.dna_score) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800">Assessment already on file</p>
          <p className="text-blue-700 mt-1">
            You completed the DNA assessment during your job application.
            Score: <strong>{existingAssessment.dna_score}/30</strong> — {existingAssessment.alignment_category}
          </p>
        </div>
        <Button onClick={() => onComplete({ source: "job_application", score: existingAssessment.dna_score })} disabled={isCompleting}>
          {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Mark as Complete
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Complete the NGR DNA cultural alignment assessment. This takes approximately 5-10 minutes.
      </p>
      <Button onClick={() => navigate("/dashboard/assessment")}>
        <ClipboardList className="w-4 h-4 mr-2" /> Take Assessment
      </Button>
    </div>
  );
}

// ============================================================
// Training Step (Placeholder)
// ============================================================
function TrainingStep({ isCompleted }: { isCompleted: boolean }) {
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Training complete.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-6 text-center border border-border">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-sm">Training Modules Coming Soon</p>
        <p className="text-xs text-muted-foreground mt-1">
          Required training modules will be available here in a future update.
          This step is optional for now.
        </p>
      </div>
    </div>
  );
}
