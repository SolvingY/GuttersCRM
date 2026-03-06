import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface W9FormProps {
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  metadata?: Record<string, any>;
}

export default function W9Form({ isCompleted, onComplete, isCompleting, metadata }: W9FormProps) {
  const [form, setForm] = useState({
    legalName: "",
    businessName: "",
    taxClassification: "",
    llcType: "",
    otherType: "",
    exemptPayeeCode: "",
    fatcaCode: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    accountNumbers: "",
    tinType: "ssn" as "ssn" | "ein",
    ssn: "",
    ein: "",
    certified: false,
    signatureName: "",
  });

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">W-9 form submitted{metadata?.legalName ? ` for ${metadata.legalName}` : ""}.</span>
      </div>
    );
  }

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const isValid = form.legalName.trim() && form.taxClassification && form.streetAddress.trim() &&
    form.city.trim() && form.state.trim() && form.zipCode.trim() &&
    (form.tinType === "ssn" ? form.ssn.trim() : form.ein.trim()) &&
    form.certified && form.signatureName.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    onComplete({
      ...form,
      submittedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-5 bg-white shadow-sm">
        <h3 className="font-heading text-base uppercase mb-4 text-center border-b border-border pb-3">
          Form W-9 — Request for Taxpayer Identification Number
        </h3>

        {/* Name */}
        <div className="space-y-4">
          <div>
            <Label className="font-medium">1. Legal Name (as shown on your income tax return) *</Label>
            <Input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Full legal name" className="mt-1" />
          </div>

          <div>
            <Label>2. Business Name / Disregarded Entity Name (if different)</Label>
            <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="mt-1" />
          </div>

          {/* Tax Classification */}
          <div>
            <Label className="font-medium">3. Federal Tax Classification *</Label>
            <RadioGroup value={form.taxClassification} onValueChange={(v) => update("taxClassification", v)} className="mt-2 space-y-2">
              {[
                { value: "individual", label: "Individual/sole proprietor or single-member LLC" },
                { value: "c_corp", label: "C Corporation" },
                { value: "s_corp", label: "S Corporation" },
                { value: "partnership", label: "Partnership" },
                { value: "trust_estate", label: "Trust/estate" },
                { value: "llc", label: "Limited liability company (LLC)" },
                { value: "other", label: "Other" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`tax-${opt.value}`} />
                  <label htmlFor={`tax-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                </div>
              ))}
            </RadioGroup>
            {form.taxClassification === "llc" && (
              <div className="mt-2 pl-6">
                <Label className="text-xs">LLC tax classification (C=C corporation, S=S corporation, P=Partnership)</Label>
                <Input value={form.llcType} onChange={(e) => update("llcType", e.target.value)} placeholder="C, S, or P" className="mt-1 max-w-24" />
              </div>
            )}
            {form.taxClassification === "other" && (
              <div className="mt-2 pl-6">
                <Input value={form.otherType} onChange={(e) => update("otherType", e.target.value)} placeholder="Specify type" className="mt-1 max-w-xs" />
              </div>
            )}
          </div>

          {/* Exemptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>4. Exempt payee code (if any)</Label>
              <Input value={form.exemptPayeeCode} onChange={(e) => update("exemptPayeeCode", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Exemption from FATCA reporting code (if any)</Label>
              <Input value={form.fatcaCode} onChange={(e) => update("fatcaCode", e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-border pt-4">
            <Label className="font-medium">5. Address *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="sm:col-span-2">
                <Input value={form.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} placeholder="Street address" />
              </div>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="State" />
                <Input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} placeholder="ZIP code" />
              </div>
            </div>
          </div>

          <div>
            <Label>6. Account number(s) (optional)</Label>
            <Input value={form.accountNumbers} onChange={(e) => update("accountNumbers", e.target.value)} className="mt-1" />
          </div>

          {/* TIN */}
          <div className="border-t border-border pt-4">
            <Label className="font-medium">Part I — Taxpayer Identification Number (TIN) *</Label>
            <div className="mt-2 flex gap-4">
              <Button
                variant={form.tinType === "ssn" ? "default" : "outline"}
                size="sm"
                onClick={() => update("tinType", "ssn")}
                type="button"
              >
                SSN
              </Button>
              <Button
                variant={form.tinType === "ein" ? "default" : "outline"}
                size="sm"
                onClick={() => update("tinType", "ein")}
                type="button"
              >
                EIN
              </Button>
            </div>
            <div className="mt-2 max-w-xs">
              {form.tinType === "ssn" ? (
                <Input
                  value={form.ssn}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                    const formatted = v.length > 5 ? `${v.slice(0,3)}-${v.slice(3,5)}-${v.slice(5)}` : v.length > 3 ? `${v.slice(0,3)}-${v.slice(3)}` : v;
                    update("ssn", formatted);
                  }}
                  placeholder="XXX-XX-XXXX"
                />
              ) : (
                <Input
                  value={form.ein}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                    const formatted = v.length > 2 ? `${v.slice(0,2)}-${v.slice(2)}` : v;
                    update("ein", formatted);
                  }}
                  placeholder="XX-XXXXXXX"
                />
              )}
            </div>
          </div>

          {/* Certification */}
          <div className="border-t border-border pt-4">
            <Label className="font-medium">Part II — Certification</Label>
            <div className="bg-muted/30 rounded p-3 text-xs text-muted-foreground mt-2 max-h-40 overflow-y-auto border border-border">
              <p>Under penalties of perjury, I certify that:</p>
              <ol className="list-decimal pl-4 space-y-1 mt-1">
                <li>The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and</li>
                <li>I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and</li>
                <li>I am a U.S. citizen or other U.S. person (defined below); and</li>
                <li>The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</li>
              </ol>
            </div>

            <div className="flex items-start gap-3 mt-3">
              <Checkbox id="w9-certify" checked={form.certified} onCheckedChange={(v) => update("certified", v === true)} />
              <label htmlFor="w9-certify" className="text-sm cursor-pointer">
                I certify, under penalties of perjury, that the information provided is true, correct, and complete.
              </label>
            </div>
          </div>

          {/* Signature */}
          <div className="border-t border-border pt-4">
            <Label className="font-medium">Signature</Label>
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
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!isValid || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Submit W-9
      </Button>
    </div>
  );
}
