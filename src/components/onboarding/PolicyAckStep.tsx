import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, Shield } from "lucide-react";

interface PolicyAckStepProps {
  stepKey: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}

export default function PolicyAckStep({ stepKey, isCompleted, onComplete, isCompleting }: PolicyAckStepProps) {
  const [agreed, setAgreed] = useState(false);

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Policy acknowledged.</span>
      </div>
    );
  }

  if (stepKey === "tools_insurance") {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-3 max-h-72 overflow-y-auto border border-border">
          <p className="font-semibold">Tools & Insurance Requirements</p>
          <p>
            As a NextGen Roofing Sales Representative, you are responsible for providing the following
            tools and maintaining proper insurance:
          </p>
          <div className="mt-2">
            <p className="font-medium">Required Tools & Supplies:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Reliable personal vehicle</li>
              <li>Valid driver's license and clean driving record</li>
              <li>Measuring wheel (or measuring app on phone)</li>
              <li>Safety footwear appropriate for job site visits</li>
              <li>Personal cell phone with data plan</li>
              <li>Professional presentation materials (provided by company)</li>
            </ul>
          </div>
          <div className="mt-2">
            <p className="font-medium">Insurance Requirements:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Personal auto insurance (minimum state-required coverage)</li>
              <li>Liability insurance may be required — your manager will advise</li>
            </ul>
          </div>
          <p className="mt-2">
            By acknowledging below, you confirm you understand and accept these requirements.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox id="tools-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
          <label htmlFor="tools-agree" className="text-sm cursor-pointer">
            I understand and accept the tools and insurance requirements outlined above.
          </label>
        </div>

        <Button onClick={() => onComplete({ acknowledged_at: new Date().toISOString() })} disabled={!agreed || isCompleting}>
          {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
          I Understand and Accept
        </Button>
      </div>
    );
  }

  // Generic policy ack fallback
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Checkbox id="policy-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
        <label htmlFor="policy-agree" className="text-sm cursor-pointer">
          I have read, understood, and agree to the policy.
        </label>
      </div>
      <Button onClick={() => onComplete({ acknowledged_at: new Date().toISOString() })} disabled={!agreed || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
        Acknowledge & Continue
      </Button>
    </div>
  );
}
