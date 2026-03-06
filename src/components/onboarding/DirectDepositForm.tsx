import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DirectDepositFormProps {
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
  metadata?: Record<string, any>;
}

export default function DirectDepositForm({ isCompleted, onComplete, isCompleting, metadata }: DirectDepositFormProps) {
  const [form, setForm] = useState({
    accountHolderName: "",
    email: "",
    phone: "",
    ssn: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    confirmAccountNumber: "",
    accountType: "personal",
    mailingAddress: "",
    authorized: false,
    signatureName: "",
  });
  const [routingError, setRoutingError] = useState("");
  const [accountMatchError, setAccountMatchError] = useState("");

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Direct deposit authorized{metadata?.bankName ? ` (${metadata.bankName})` : ""}.</span>
      </div>
    );
  }

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const validateRouting = () => {
    const digits = form.routingNumber.replace(/\D/g, "");
    if (digits.length !== 9) {
      setRoutingError("Routing number must be exactly 9 digits.");
    } else {
      setRoutingError("");
    }
  };

  const validateAccountMatch = () => {
    if (form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber) {
      setAccountMatchError("Account numbers do not match.");
    } else {
      setAccountMatchError("");
    }
  };

  const routingDigits = form.routingNumber.replace(/\D/g, "");
  const isValid = form.accountHolderName.trim() && form.bankName.trim() &&
    routingDigits.length === 9 && form.accountNumber.trim() &&
    form.accountNumber === form.confirmAccountNumber &&
    form.authorized && form.signatureName.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    // Don't store full account numbers in metadata for security — store masked versions
    onComplete({
      accountHolderName: form.accountHolderName,
      bankName: form.bankName,
      routingLast4: routingDigits.slice(-4),
      accountLast4: form.accountNumber.slice(-4),
      accountType: form.accountType,
      submittedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-5 bg-white shadow-sm">
        <h3 className="font-heading text-base uppercase mb-4 text-center border-b border-border pb-3">
          Next Generation Direct Deposit Form
        </h3>

        <div className="space-y-4">
          <div>
            <Label className="font-medium">Full Legal Name *</Label>
            <Input value={form.accountHolderName} onChange={(e) => update("accountHolderName", e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-medium">Email Address</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="font-medium">Phone Number</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="font-medium">Social Security Number</Label>
            <Input
              value={form.ssn}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                const formatted = v.length > 5 ? `${v.slice(0,3)}-${v.slice(3,5)}-${v.slice(5)}` : v.length > 3 ? `${v.slice(0,3)}-${v.slice(3)}` : v;
                update("ssn", formatted);
              }}
              placeholder="XXX-XX-XXXX"
              className="mt-1 max-w-xs"
            />
          </div>

          <div>
            <Label className="font-medium">Mailing Address</Label>
            <Input value={form.mailingAddress} onChange={(e) => update("mailingAddress", e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="font-medium">Bank Name *</Label>
            <Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="font-medium">Routing Number *</Label>
            <Input
              value={form.routingNumber}
              onChange={(e) => {
                update("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9));
                setRoutingError("");
              }}
              onBlur={validateRouting}
              placeholder="9-digit routing number"
              className="mt-1 max-w-xs"
            />
            {routingError && <p className="text-xs text-destructive mt-1">{routingError}</p>}
          </div>

          <div>
            <Label className="font-medium">Account Number *</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => { update("accountNumber", e.target.value); setAccountMatchError(""); }}
              className="mt-1 max-w-xs"
            />
          </div>

          <div>
            <Label className="font-medium">Confirm Account Number *</Label>
            <Input
              value={form.confirmAccountNumber}
              onChange={(e) => { update("confirmAccountNumber", e.target.value); setAccountMatchError(""); }}
              onBlur={validateAccountMatch}
              className="mt-1 max-w-xs"
            />
            {accountMatchError && <p className="text-xs text-destructive mt-1">{accountMatchError}</p>}
          </div>

          <div>
            <Label className="font-medium">Account Type *</Label>
            <RadioGroup value={form.accountType} onValueChange={(v) => update("accountType", v)} className="mt-2 flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="personal" id="acct-personal" />
                <label htmlFor="acct-personal" className="text-sm cursor-pointer">Personal</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="business" id="acct-business" />
                <label htmlFor="acct-business" className="text-sm cursor-pointer">Business</label>
              </div>
            </RadioGroup>
          </div>

          {/* Authorization text */}
          <div className="bg-muted/30 rounded p-4 text-sm border border-border">
            <p>
              I authorize NextGen Roofing to initiate credit entries and, if necessary, debit entries and
              adjustments to my account at the financial institution named above.
            </p>
          </div>

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
            <Checkbox id="dd-auth" checked={form.authorized} onCheckedChange={(v) => update("authorized", v === true)} />
            <label htmlFor="dd-auth" className="text-sm cursor-pointer">
              I authorize the direct deposit arrangement described above.
            </label>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!isValid || isCompleting}>
        {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        Authorize Direct Deposit
      </Button>
    </div>
  );
}
