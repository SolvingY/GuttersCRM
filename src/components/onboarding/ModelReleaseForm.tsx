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
          <div className="bg-muted/30 rounded p-4 text-sm border border-border mt-4 space-y-3">
            <p>
              {form.legalName || "_________________________ "} (the "Model"), for good and valuable consideration, the receipt of which is acknowledged, hereby grants to Next Generation Roofing, its legal representatives, assignees, and those acting under its authority, the unrestricted right and permission to copyright and/or use, and/or publish photographic and videographic portraits, pictures, and videos of the Model, and the negatives, transparencies, prints, or digital information pertaining to them, in still, single, multiple, moving or video format, or in which Model may be included in whole or in part, or composite, or distorted in form, or reproductions thereof, in color or otherwise, in any media for advertising or any other lawful purpose.
            </p>
            <p>
              Model hereby relinquishes any right that he/she may have to examine or approve the finished product or products or the advertising copy or printed matter that may be used in connection with an image or video that Next Generation Roofing has taken of the Model, or the use to which it may be applied. Model waives any ownership and publication right he/she might be entitled to in connection with the Pictures/Videos, with the exception of personal portfolio. Model agrees he/she has no right to sell, license, or publish any of the pictures/videos to any person or entity.
            </p>
            <p>
              Model further releases Next Generation Roofing its parent company, subsidiaries, affiliates, officers, agents, servants, or employees from any claims for remuneration associated with any form of damage, foreseen or unforeseen, associated with the proper commercial or artistic use of these images unless it can be shown that said reproduction was maliciously caused, produced and published for the sole purpose of subjecting the talent to conspicuous ridicule, scandal, reproach, scorn and indignity. Model also waives any and all claims, demands, actions and causes of action whatsoever arising out of or related to any loss, damage, or injury, that may be sustained by Model, or any of the property belonging to Model, whether caused by the negligence of the Releases, or otherwise, while performing the session, or while in, on or upon the premises where the session was performed.
            </p>
            <p>
              It is the express intent of Model that this document shall bind all members of the Model's family, heirs, assignees and personal representatives.
            </p>
            <p>
              Model represents and warrants that he/she is 18 years of age or older, that the session was conducted in a competent and professional manner, and this release was willingly signed.
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
