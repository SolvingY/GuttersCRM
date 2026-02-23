import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GutterContract() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const lead = (location.state as any)?.lead;
  const existingForm = (location.state as any)?.existingForm;

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: estimate } = useQuery({
    queryKey: ["lead-estimate", id],
    queryFn: async () => {
      const { data } = await supabase.from("gutter_estimates").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Form fields
  const [ownerName, setOwnerName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [cityField, setCityField] = useState("");
  const [stateField, setStateField] = useState("");
  const [zipField, setZipField] = useState("");
  const [phoneField, setPhoneField] = useState("");
  const [emailField, setEmailField] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [lastFourCC, setLastFourCC] = useState("");
  const [authPlan, setAuthPlan] = useState("");
  const [electronicPayment, setElectronicPayment] = useState(false);
  const [otherPayTerms, setOtherPayTerms] = useState("");
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerSignature, setCustomerSignature] = useState("");
  const [secondOwnerSignature, setSecondOwnerSignature] = useState("");
  const [showSecondOwner, setShowSecondOwner] = useState(false);
  const [scopeOfWork, setScopeOfWork] = useState("");

  useEffect(() => {
    if (existingForm) {
      const d = existingForm.form_data as any;
      setOwnerName(d.ownerName || "");
      setStreetAddress(d.streetAddress || "");
      setCityField(d.city || "");
      setStateField(d.state || "");
      setZipField(d.zip || "");
      setPhoneField(d.phone || "");
      setEmailField(d.email || "");
      setContractPrice(d.contractPrice || "");
      setDownPayment(d.downPayment || "");
      setStartDate(d.startDate || "");
      setCompletionDate(d.completionDate || "");
      setLastFourCC(d.lastFourCC || "");
      setAuthPlan(d.authPlan || "");
      setElectronicPayment(d.electronicPayment || false);
      setOtherPayTerms(d.otherPayTerms || "");
      setScopeOfWork(d.scopeOfWork || "");
      setCustomerSignature(existingForm.signature_data || "");
      setSecondOwnerSignature(d.secondOwnerSignature || "");
      setShowSecondOwner(!!d.secondOwnerSignature);
      setSignatureDate(d.signatureDate || new Date().toISOString().split("T")[0]);
    } else if (lead) {
      setOwnerName(lead.full_name || "");
      setStreetAddress(lead.street_address || "");
      setCityField(lead.city || "");
      setStateField(lead.state || "");
      setZipField(lead.zip_code || "");
      setPhoneField(lead.phone || "");
      setEmailField(lead.email || "");
      setContractPrice(lead.quote_amount?.toString() || "");
    }
  }, [lead, existingForm]);

  useEffect(() => {
    if (estimate && !existingForm) {
      const md = estimate.measurement_data as any;
      if (estimate.gutter_footage) {
        const colorLabel = estimate.gutter_color === "Premium (+$2/ft)" ? "Premium" : "Standard";
        const dsSize = md?.dsType === '3x4 (= 6")' ? "3x4" : "2x3";
        const gutterDsPrice = md?.gutterDsQuoted ? `$${Number(md.gutterDsQuoted).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "";
        const protPrice = md?.protQuoted ? `$${Number(md.protQuoted).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "";

        const lines: string[] = [];

        // What's Included
        lines.push("WHAT'S INCLUDED:");
        lines.push("• All labor and installation");
        lines.push("• Material costs");
        lines.push("• Applicable taxes");
        lines.push("• Removal and haul-off of existing gutters");
        lines.push("• Job site cleanup");
        lines.push("• All applicable warranties as listed below");
        lines.push("Note: Removal of existing gutters is included unless otherwise specified.");
        lines.push("");

        // Gutter/Downspout line
        lines.push(`${estimate.gutter_size || '6"'} ${colorLabel} Gutters & ${dsSize} Downspouts${gutterDsPrice ? ` — ${gutterDsPrice}` : ""}`);
        lines.push("  • Lifetime Leak-Free Guarantee — With yearly scheduled inspection");
        lines.push("  • 25-Year Baked-On Paint Warranty — Applies to gutters and downspouts");

        // Protection line
        if (estimate.protection_product && (estimate.protection_footage ?? 0) > 0) {
          lines.push("");
          lines.push(`${estimate.protection_product}${protPrice ? ` — ${protPrice}` : ""}`);
          const prod = estimate.protection_product || "";
          if (prod.includes("Cheap Mesh")) {
            // No warranty for cheap mesh
          } else if (prod.includes("Gutter RX Collector")) {
            lines.push("  • 10-Year Manufacturer Warranty");
          } else {
            lines.push("  • 45-Year Manufacturer Warranty");
          }
        }

        setScopeOfWork(lines.join("\n"));
      } else if (md?.description) {
        setScopeOfWork(md.description);
      }
    }
  }, [estimate, existingForm]);

  const unpaidBalance = Math.max(0, (parseFloat(contractPrice) || 0) - (parseFloat(downPayment) || 0));

  const handleSave = async () => {
    if (!customerSignature) {
      toast({ title: "Signature required", description: "Customer must sign the contract.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const formData = {
        ownerName, streetAddress, city: cityField, state: stateField, zip: zipField,
        phone: phoneField, email: emailField, contractPrice, downPayment,
        unpaidBalance: unpaidBalance.toFixed(2), startDate, completionDate,
        lastFourCC, authPlan, electronicPayment, otherPayTerms, scopeOfWork,
        repName: profile?.full_name || "", signatureDate,
        secondOwnerSignature: showSecondOwner ? secondOwnerSignature : null,
      };

      if (existingForm) {
        await supabase.from("lead_forms").update({
          form_data: formData,
          status: "signed",
          signed_by_name: ownerName,
          signed_at: new Date().toISOString(),
          signature_data: customerSignature,
          updated_at: new Date().toISOString(),
        }).eq("id", existingForm.id);
      } else {
        await supabase.from("lead_forms").insert({
          lead_id: id,
          form_type: "contract",
          form_data: formData,
          status: "signed",
          signed_by_name: ownerName,
          signed_at: new Date().toISOString(),
          signature_data: customerSignature,
          created_by: user?.id,
        });
      }

      // Update lead status to scheduled if won/approved
      if (lead && ["won", "approved"].includes(lead.status)) {
        await supabase.from("quote_requests").update({ status: "scheduled" }).eq("id", id);
      }

      await supabase.from("lead_activity_log").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "contract_signed",
        content: `Contract signed by ${ownerName}`,
      });

      toast({ title: "Contract saved successfully" });
      navigate(`/dashboard/leads/${id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(`/dashboard/leads/${id}`)} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Lead
      </Button>
      <h1 className="font-heading text-2xl uppercase">Gutter Contract</h1>

      {/* Customer/Property Info */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Customer Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Owner Name</label>
            <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Address</label>
            <Input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
          </div>
          <div><label className="text-sm font-medium">City</label><Input value={cityField} onChange={e => setCityField(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-sm font-medium">State</label><Input value={stateField} onChange={e => setStateField(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Zip</label><Input value={zipField} onChange={e => setZipField(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium">Phone</label><Input value={phoneField} onChange={e => setPhoneField(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Email</label><Input value={emailField} onChange={e => setEmailField(e.target.value)} /></div>
        </div>
      </div>

      {/* Scope */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Scope of Work</h2>
        <textarea className="w-full border border-border rounded p-3 text-sm bg-background whitespace-pre-wrap" rows={14} value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} />
      </div>

      {/* Pricing */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Contract Terms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium">Contract Price ($)</label><Input type="number" value={contractPrice} onChange={e => setContractPrice(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Down Payment ($)</label><Input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} /></div>
          <div>
            <label className="text-sm font-medium">Unpaid Balance ($)</label>
            <div className="h-10 flex items-center px-3 border border-border rounded-md bg-muted text-sm font-medium">${unpaidBalance.toFixed(2)}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Approx Start Date</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Approx Completion Date</label><Input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Last 4 digits CC / SID #</label><Input value={lastFourCC} onChange={e => setLastFourCC(e.target.value)} maxLength={4} /></div>
          <div><label className="text-sm font-medium">6-digit Auth Plan #</label><Input value={authPlan} onChange={e => setAuthPlan(e.target.value)} maxLength={6} /></div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={electronicPayment} onCheckedChange={v => setElectronicPayment(!!v)} />
          <label className="text-sm">Electronic Payment (CC / Financing)</label>
        </div>
        <div>
          <label className="text-sm font-medium">Other Pay Terms</label>
          <Input value={otherPayTerms} onChange={e => setOtherPayTerms(e.target.value)} />
        </div>
      </div>

      {/* Legal Text */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Payment Terms</h2>
        <div className="text-xs text-muted-foreground space-y-3">
          <p><strong>A.</strong> Unpaid balance of cash price or bank completion certificate must be paid to Seller's installer at time work is completed.</p>
          <p><strong>B.</strong> If full price is not paid in cash, contract subject to financing approval.</p>
          <p><strong>C.</strong> Installation subject to production scheduling, weather conditions. All workmanship guaranteed for one (1) calendar year. Service calls after one (1) year subject to service charge.</p>
          <p><strong>D.</strong> Buyer may cancel by mailing written notice post-marked no later than third business day after date Agreement signed. If Owner cancels AFTER THREE (3) DAYS from acceptance and before commencement of work, Owner agrees to pay 25% of contract price or cost of materials purchased.</p>
          <p><strong>E.</strong> IN WITNESS WHEREOF, the parties have executed this Agreement on the date indicated below.</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Signatures</h2>
        <div>
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={signatureDate} onChange={e => setSignatureDate(e.target.value)} />
        </div>
        <SignaturePad label="Customer Signature" value={customerSignature} onChange={setCustomerSignature} />
        <div className="flex items-center gap-2">
          <Checkbox checked={showSecondOwner} onCheckedChange={v => setShowSecondOwner(!!v)} />
          <label className="text-sm">Add second owner signature</label>
        </div>
        {showSecondOwner && (
          <SignaturePad label="Second Owner Signature" value={secondOwnerSignature} onChange={setSecondOwnerSignature} />
        )}
        <div>
          <label className="text-sm font-medium">Sales Representative</label>
          <div className="h-10 flex items-center px-3 border border-border rounded-md bg-muted text-sm">{profile?.full_name || "—"}</div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {existingForm ? "Update Contract" : "Sign & Save Contract"}
      </Button>
    </div>
  );
}
