import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2 } from "lucide-react";

interface ConfirmationStepProps {
  stepKey: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}

const STEP_CONTENT: Record<string, { description: string; buttonText: string; checklist?: string[] }> = {
  google_email: {
    description:
      "Your admin will create your @nextgenroofing.com Google Workspace email account. Please confirm you have received your login credentials and can access your company email.",
    buttonText: "I Have My Google Email",
  },
  group_chat: {
    description:
      "Please confirm you have been added to the NextGen Roofing team group chat on iMessage.",
    buttonText: "I'm in the Group Chat",
  },
  uniform: {
    description:
      "Please confirm you have received or ordered your NextGen Roofing uniform.",
    buttonText: "I Have My Uniform",
  },
  sales_materials: {
    description:
      "Confirm you have received all of the following sales materials and resources:",
    buttonText: "I Have All My Materials",
    checklist: [
      "Sales scripts & pitch deck",
      "Ventilation calculator",
      "Good Faith Estimate (GF) forms",
      "Marketing flyers",
      "Any additional materials provided by manager",
    ],
  },
};

export default function ConfirmationStep({ stepKey, isCompleted, onComplete, isCompleting }: ConfirmationStepProps) {
  const content = STEP_CONTENT[stepKey];
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Confirmed and completed.</span>
      </div>
    );
  }

  if (!content) {
    return <p className="text-sm text-muted-foreground">Unknown confirmation step.</p>;
  }

  const allChecked = content.checklist
    ? content.checklist.every((_, i) => checkedItems[i])
    : true;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{content.description}</p>

      {content.checklist && (
        <div className="space-y-2 pl-1">
          {content.checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <Checkbox
                id={`checklist-${i}`}
                checked={!!checkedItems[i]}
                onCheckedChange={(v) =>
                  setCheckedItems((prev) => ({ ...prev, [i]: v === true }))
                }
              />
              <label htmlFor={`checklist-${i}`} className="text-sm cursor-pointer">
                {item}
              </label>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={() => onComplete({ confirmed_at: new Date().toISOString() })}
        disabled={!allChecked || isCompleting}
      >
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        {content.buttonText}
      </Button>
    </div>
  );
}
