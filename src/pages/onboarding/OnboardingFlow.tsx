import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  FileText,
  Wrench,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Shield,
  Mail,
  MessageSquare,
  Shirt,
  Package,
  Compass,
  TreePine,
  Search,
  Hash,
  CloudLightning,
  FileCheck,
  CreditCard,
  Camera,
} from "lucide-react";

import ContractSignStep from "@/components/onboarding/ContractSignStep";
import W9Form from "@/components/onboarding/W9Form";
import ModelReleaseForm from "@/components/onboarding/ModelReleaseForm";
import DirectDepositForm from "@/components/onboarding/DirectDepositForm";
import ConfirmationStep from "@/components/onboarding/ConfirmationStep";
import ToolSetupStep from "@/components/onboarding/ToolSetupStep";
import PolicyAckStep from "@/components/onboarding/PolicyAckStep";

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
  contract_sign: <FileCheck className="w-5 h-5" />,
  w9_form: <FileText className="w-5 h-5" />,
  model_release: <Camera className="w-5 h-5" />,
  direct_deposit: <CreditCard className="w-5 h-5" />,
  google_email: <Mail className="w-5 h-5" />,
  setup_giddy_up: <Compass className="w-5 h-5" />,
  setup_time_tree: <TreePine className="w-5 h-5" />,
  setup_lead_scout: <Search className="w-5 h-5" />,
  setup_discord: <Hash className="w-5 h-5" />,
  setup_hail_trace: <CloudLightning className="w-5 h-5" />,
  group_chat: <MessageSquare className="w-5 h-5" />,
  uniform: <Shirt className="w-5 h-5" />,
  sales_materials: <Package className="w-5 h-5" />,
  tools_insurance: <Shield className="w-5 h-5" />,
};

export default function OnboardingFlow() {
  const { user, refreshOnboardingStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const { data: steps = [] } = useQuery({
    queryKey: ["onboarding-steps"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("onboarding_steps" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as OnboardingStep[];
    },
  });

  const { data: progress = [], refetch: refetchProgress } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase
        .from("user_onboarding_progress" as any) as any)
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as unknown as UserProgress[];
    },
    enabled: !!user,
  });

  const getStepProgress = (stepId: string) => progress.find((p) => p.step_id === stepId);

  const completedCount = steps.filter((s) => getStepProgress(s.id)?.status === "completed").length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const completeMutation = useMutation({
    mutationFn: async ({ stepId, metadata }: { stepId: string; metadata?: Record<string, any> }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase
        .from("user_onboarding_progress" as any) as any)
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
      const { data } = await (supabase as any).rpc("check_onboarding_complete", { p_user_id: user!.id });
      if (data === true) {
        await refreshOnboardingStatus();
        toast({ title: "Onboarding Complete!", description: "Welcome to the team! Redirecting to your dashboard..." });
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    },
  });

  const currentStep = steps[currentStepIndex];
  const currentProgress = currentStep ? getStepProgress(currentStep.id) : null;
  const isCurrentCompleted = currentProgress?.status === "completed";

  useEffect(() => {
    if (steps.length > 0 && progress.length > 0) {
      const firstIncomplete = steps.findIndex((s) => getStepProgress(s.id)?.status !== "completed");
      if (firstIncomplete >= 0 && firstIncomplete !== currentStepIndex) {
        setCurrentStepIndex(firstIncomplete);
      }
    }
  }, [steps.length, progress.length]);

  if (!user || steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
            const isCompleted = getStepProgress(step.id)?.status === "completed";
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
                  userId={user.id}
                  onComplete={(metadata) => completeMutation.mutate({ stepId: currentStep.id, metadata })}
                  isCompleting={completeMutation.isPending}
                />

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>

                  {currentStepIndex < steps.length - 1 ? (
                    <Button onClick={() => setCurrentStepIndex(currentStepIndex + 1)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        const { data } = await (supabase as any).rpc("check_onboarding_complete", { p_user_id: user.id });
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

function StepContent({
  step,
  progress,
  userId,
  onComplete,
  isCompleting,
}: {
  step: OnboardingStep;
  progress: UserProgress | null | undefined;
  userId: string;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}) {
  const isCompleted = progress?.status === "completed";

  switch (step.step_type) {
    case "document_sign":
      return (
        <ContractSignStep
          userId={userId}
          isCompleted={isCompleted}
          onComplete={onComplete}
          isCompleting={isCompleting}
        />
      );
    case "inline_form":
      if (step.step_key === "w9_form") {
        return <W9Form isCompleted={isCompleted} onComplete={onComplete} isCompleting={isCompleting} metadata={progress?.metadata} />;
      }
      if (step.step_key === "model_release") {
        return <ModelReleaseForm isCompleted={isCompleted} onComplete={onComplete} isCompleting={isCompleting} metadata={progress?.metadata} />;
      }
      if (step.step_key === "direct_deposit") {
        return <DirectDepositForm isCompleted={isCompleted} onComplete={onComplete} isCompleting={isCompleting} metadata={progress?.metadata} />;
      }
      return <p className="text-sm text-muted-foreground">Unknown inline form.</p>;
    case "confirmation":
      return (
        <ConfirmationStep
          stepKey={step.step_key}
          isCompleted={isCompleted}
          onComplete={onComplete}
          isCompleting={isCompleting}
        />
      );
    case "tool_setup":
      return (
        <ToolSetupStep
          stepKey={step.step_key}
          isCompleted={isCompleted}
          onComplete={onComplete}
          isCompleting={isCompleting}
        />
      );
    case "policy_ack":
      return (
        <PolicyAckStep
          stepKey={step.step_key}
          isCompleted={isCompleted}
          onComplete={onComplete}
          isCompleting={isCompleting}
        />
      );
    default:
      return <p className="text-muted-foreground">Unknown step type.</p>;
  }
}
