import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ModelReleaseFormProps {
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  metadata?: Record<string, any>;
}

export default function ModelReleaseForm({ isCompleted, onComplete, isCompleting, metadata }: ModelReleaseFormProps) {
  const [form, setForm] = useState({
    legalName: "",
    dob: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    isMinor: false,
    guardianName: "",
    guardianSignature: "",
    signatureName: "",
    acknowledged: false,
  });

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Model release signed{metadata?.legalName ? ` by ${metadata.legalName}` : ""}.</span>
      </div>
    );
  }

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const isValid = form.legalName.trim() && form.dob && form.streetAddress.trim() &&
    form.city.trim() && form.state.trim() && form.zipCode.trim() &&
    form.phone.trim() && form.email.trim() && form.signatureName.trim() && form.acknowledged &&
    (!form.isMinor || (form.guardianName.trim() && form.guardianSignature.trim()));

  const handleSubmit = () => {
    if (!isValid) return;
    onComplete({ ...form, submittedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-5 bg-white shadow-sm">
        <h3 className="font-heading text-base uppercase mb-4 text-center border-b border-border pb-3">
          Model Release & Image Rights Waiver
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="font-medium">Full Legal Name *</Label>
              <Input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-medium">Date of Birth *</Label>
              <Input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-medium">Phone Number *</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="font-medium">Email Address *</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="font-medium">Street Address *</Label>
              <Input value={form.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} className="mt-1" />
            </div>
            <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
            <div className="grid grid-cols-2 gap-3">
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="State" />
              <Input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} placeholder="ZIP" />
            </div>
          </div>

          {/* Agreement text */}
          <div className="bg-muted/30 rounded p-4 text-sm border border-border mt-4">
            <p>
              I hereby grant NextGen Roofing and its subsidiaries, agents, and assigns the irrevocable right
              and permission to use my name, photograph, image, likeness, voice, and biographical information
              in any and all media, including but not limited to digital, print, video, and social media, for
              marketing, promotional, and commercial purposes. This release is perpetual, worldwide, and
              royalty-free. I waive any right to inspect or approve the finished product.
            </p>
          </div>

          {/* Minor checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox id="is-minor" checked={form.isMinor} onCheckedChange={(v) => update("isMinor", v === true)} />
            <label htmlFor="is-minor" className="text-sm cursor-pointer">I am under 18 years of age</label>
          </div>

          {form.isMinor && (
            <div className="pl-6 space-y-3 border-l-2 border-accent/20">
              <div>
                <Label>Parent/Guardian Name *</Label>
                <Input value={form.guardianName} onChange={(e) => update("guardianName", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Parent/Guardian Signature *</Label>
                <Input value={form.guardianSignature} onChange={(e) => update("guardianSignature", e.target.value)} placeholder="Type full name" className="mt-1 max-w-sm" />
                {form.guardianSignature && (
                  <p className="font-serif italic text-xl border-b border-foreground/30 pb-1 inline-block mt-1">
                    {form.guardianSignature}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Signature */}
          <div className="border-t border-border pt-4">
            <Label className="font-medium">Signature *</Label>
            <Input
              value={form.signatureName}
              onChange={(e) => update("signatureName", e.target.value)}
              placeholder="Type your full legal name"
              className="mt-1 max-w-sm"
            />
            {form.signatureName && (
              <div className="mt-2">
                <p className="font-serif italic text-2xl border-b border-foreground/30 pb-1 inline-block">
                  {form.signatureName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Date: {format(new Date(), "MMMM d, yyyy")}</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox id="model-ack" checked={form.acknowledged} onCheckedChange={(v) => update("acknowledged", v === true)} />
            <label htmlFor="model-ack" className="text-sm cursor-pointer">
              I have read and understand this model release and agree to its terms.
            </label>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!isValid || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Sign Model Release
      </Button>
    </div>
  );
}
