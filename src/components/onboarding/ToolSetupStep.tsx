import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2 } from "lucide-react";

interface ToolSetupStepProps {
  stepKey: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}

const TOOL_INFO: Record<string, { name: string; description: string }> = {
  setup_giddy_up: {
    name: "Giddy Up",
    description: "Your admin should have set up your Giddy Up account. Please confirm you have access and have logged in.",
  },
  setup_time_tree: {
    name: "Time Tree",
    description: "Your admin should have added you to Time Tree for scheduling. Please confirm you have access.",
  },
  setup_lead_scout: {
    name: "Lead Scout",
    description: "Your admin will add you to Lead Scout, the lead management platform. Please confirm you have access and have logged in.",
  },
  setup_discord: {
    name: "Discord",
    description: "Join the NextGen Roofing Discord server using the invite link your manager provides. Confirm you have access.",
  },
  setup_hail_trace: {
    name: "Hail Trace",
    description: "Your admin will add you to Hail Trace for storm tracking. Confirm you have access.",
  },
};

export default function ToolSetupStep({ stepKey, isCompleted, onComplete, isCompleting }: ToolSetupStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const info = TOOL_INFO[stepKey] || { name: stepKey, description: "Confirm you have access to this tool." };

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">{info.name} access confirmed.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{info.description}</p>

      <div className="flex items-start gap-3">
        <Checkbox id={`tool-${stepKey}`} checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
        <label htmlFor={`tool-${stepKey}`} className="text-sm cursor-pointer">
          I confirm that my {info.name} account is set up and I have access.
        </label>
      </div>

      <Button onClick={() => onComplete({ confirmed_at: new Date().toISOString() })} disabled={!confirmed || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Confirm Access
      </Button>
    </div>
  );
}
