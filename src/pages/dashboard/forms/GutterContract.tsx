import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Send, Clock, CheckCircle2, Undo2, Mail, Download, Upload } from "lucide-react";
import { generateAndUploadContractPDF, downloadContractPDF } from "@/lib/generateContractPDF";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { protectionWarrantyYears } from "@/lib/warrantyTerms";

interface GutterContractProps {
  lead?: any;
  existingForm?: any;
  readOnly?: boolean;
  signingMode?: boolean;
  onCustomerSign?: (signatureData: string, signedName: string) => void;
}

export default function GutterContract({
  lead: propLead,
  existingForm: propExistingForm,
  readOnly = false,
  signingMode = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCustomerSign,
}: GutterContractProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [recallingContract, setRecallingContract] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);

  const lead = propLead || (location.state as any)?.lead;
  const existingForm = propExistingForm || (location.state as any)?.existingForm;

  // Customer signing state (for signingMode)
  const [customerTypedName, setCustomerTypedName] = useState("");
  const [customerSigData, setCustomerSigData] = useState("");
  const [customerAgreed, setCustomerAgreed] = useState(false);

  const isRouteBased = !propLead && !propExistingForm;

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user && !signingMode,
  });

  const { data: estimate } = useQuery({
    queryKey: ["lead-estimate", id || lead?.id],
    queryFn: async () => {
      const leadId = id || lead?.id;
      const { data } = await supabase.from("gutter_estimates").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!(id || lead?.id) && !signingMode,
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
        lines.push("WHAT'S INCLUDED:");
        lines.push("• All labor and installation");
        lines.push("• Material costs");
        lines.push("• Applicable taxes");
        lines.push("• Removal and haul-off of existing gutters");
        lines.push("• Job site cleanup");
        lines.push("• All applicable warranties as listed below");
        lines.push("Note: Removal of existing gutters is included unless otherwise specified.");
        lines.push("");
        lines.push(`${estimate.gutter_size || '6"'} ${colorLabel} Gutters & ${dsSize} Downspouts${gutterDsPrice ? ` — ${gutterDsPrice}` : ""}`);
        lines.push("  • Lifetime Leak-Free Guarantee — With yearly scheduled inspection");
        lines.push("  • 25-Year Baked-On Paint Warranty — Applies to gutters and downspouts");
        if (estimate.protection_product && (estimate.protection_footage ?? 0) > 0) {
          lines.push("");
          lines.push(`${estimate.protection_product}${protPrice ? ` — ${protPrice}` : ""}`);
          const protYears = protectionWarrantyYears(estimate.protection_product);
          if (protYears) {
            lines.push(`  • ${protYears}-Year Manufacturer Warranty`);
          }
        }
        setScopeOfWork(lines.join("\n"));
      } else if (md?.description) {
        setScopeOfWork(md.description);
      }
    }
  }, [estimate, existingForm]);

  const unpaidBalance = Math.max(0, (parseFloat(contractPrice) || 0) - (parseFloat(downPayment) || 0));

  const sendConfirmationEmail = async (name?: string, email?: string) => {
    try {
      await supabase.functions.invoke("send-signed-contract-confirmation", {
        body: {
          clientName: name || lead?.full_name || ownerName,
          clientEmail: email || lead?.email || emailField,
          contractAmount: contractPrice,
          repName: profile?.full_name || "",
          signedDate: new Date().toISOString(),
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleSendConfirmationManual = async () => {
    setSendingConfirmation(true);
    const ok = await sendConfirmationEmail();
    setSendingConfirmation(false);
    if (ok) {
      toast({ title: `Confirmation sent to ${lead?.email || emailField}` });
    } else {
      toast({ title: "Failed to send confirmation", variant: "destructive" });
    }
  };

  const handleUploadPDFToFiles = async () => {
    if (!user || !existingForm) return;
    setUploadingPDF(true);
    try {
      const leadId = id || lead?.id;
      const result = await generateAndUploadContractPDF(
        existingForm.form_data,
        existingForm.signature_data,
        leadId,
        user.id,
        (existingForm as any).signed_at || (existingForm as any).customer_signed_at,
        (existingForm as any).customer_signed_name,
        (existingForm as any).signed_by_name,
      );
      if (result.success) {
        toast({ title: "Contract PDF saved to lead files" });
      } else {
        toast({ title: "Failed to save PDF", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save PDF", variant: "destructive" });
    } finally {
      setUploadingPDF(false);
    }
  };

  const buildContractData = () => ({
    ownerName, streetAddress, city: cityField, state: stateField, zip: zipField,
    phone: phoneField, email: emailField, contractPrice, downPayment,
    unpaidBalance: unpaidBalance.toFixed(2), startDate, completionDate,
    lastFourCC, authPlan, electronicPayment, otherPayTerms, scopeOfWork,
    repName: profile?.full_name || "", signatureDate,
    secondOwnerSignature: showSecondOwner ? secondOwnerSignature : null,
  });

  const handleSave = async () => {
    const isDraft = existingForm?.status === "draft";
    const isFinalizing = !isDraft || !!customerSignature;

    // Require signature when finalizing (not a pure draft-only update)
    if (isFinalizing && !customerSignature) {
      toast({ title: "Signature required", description: "Customer must sign the contract.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const formData = buildContractData();
      const leadId = id || lead?.id;

      if (existingForm) {
        if (isDraft && !customerSignature) {
          // Draft update without signature: save form data only, keep status as draft
          await supabase.from("lead_forms").update({
            form_data: formData,
            updated_at: new Date().toISOString(),
          }).eq("id", existingForm.id);
        } else {
          // Finalizing: either was already non-draft, or draft with signature
          await supabase.from("lead_forms").update({
            form_data: formData,
            status: "signed",
            signed_by_name: ownerName,
            signed_at: new Date().toISOString(),
            signature_data: customerSignature,
            updated_at: new Date().toISOString(),
          }).eq("id", existingForm.id);
        }
      } else {
        await supabase.from("lead_forms").insert({
          lead_id: leadId,
          form_type: "contract",
          form_data: formData,
          status: "signed",
          signed_by_name: ownerName,
          signed_at: new Date().toISOString(),
          signature_data: customerSignature,
          created_by: user?.id,
        });
      }

      if (isFinalizing && lead && ["won", "approved"].includes(lead.status)) {
        await supabase.from("quote_requests").update({ status: "scheduled" }).eq("id", leadId);
      }

      await supabase.from("lead_activity_log").insert({
        lead_id: leadId,
        user_id: user?.id,
        activity_type: isFinalizing ? "contract_signed" : "contract_updated",
        content: isFinalizing ? `Contract signed in person by ${ownerName}` : "Contract draft updated",
      });

      // Auto-send confirmation email for in-person signing (non-draft)
      if (isFinalizing && emailField) {
        const emailSent = await sendConfirmationEmail(ownerName, emailField);
        if (emailSent) {
          await supabase.from("lead_activity_log").insert({
            lead_id: leadId,
            user_id: user?.id,
            activity_type: "confirmation_sent",
            content: `Signed contract confirmation sent to ${emailField}`,
          });
        }
      }

      // Auto-generate and upload PDF for signed contracts
      if (isFinalizing && user) {
        const formDataForPDF = buildContractData();
        generateAndUploadContractPDF(
          formDataForPDF,
          customerSignature,
          leadId,
          user.id,
          new Date().toISOString(),
          null,
          ownerName,
        ).catch(console.error);
      }

      toast({ title: isFinalizing ? "Contract saved successfully" : "Contract draft updated" });
      const isAdminRoute = location.pathname.startsWith("/admin");
      navigate(isAdminRoute ? `/admin/leads/${leadId}` : `/dashboard/leads/${leadId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRecallContract = async () => {
    setRecallingContract(true);
    try {
      const leadId = id || lead?.id;
      const { error } = await supabase.from("lead_forms").update({
        status: "draft",
        sent_for_signing_at: null,
        token_expires_at: new Date(0).toISOString(),
      } as any).eq("id", existingForm.id);
      if (error) throw error;
      await supabase.from("lead_activity_log").insert({
        lead_id: leadId,
        user_id: user?.id,
        activity_type: "contract_recalled",
        content: "Contract recalled for corrections",
      });
      queryClient.invalidateQueries({ queryKey: ["lead-forms", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast({ title: "Contract recalled — you can now edit and resend" });
      const isAdminRoute = location.pathname.startsWith("/admin");
      navigate(isAdminRoute ? `/admin/leads/${leadId}` : `/dashboard/leads/${leadId}`);
    } catch (err: any) {
      toast({ title: "Failed to recall contract", description: err.message, variant: "destructive" });
    } finally {
      setRecallingContract(false);
    }
  };

  const handleSendForSignature = async () => {
    // Validate required fields
    const missing: string[] = [];
    if (!contractPrice) missing.push("Contract Price");
    if (downPayment === "") missing.push("Down Payment");
    if (!startDate) missing.push("Approx Start Date");
    if (!signatureDate) missing.push("Agreement Date");
    if (missing.length > 0) {
      toast({ title: "Required fields missing", description: `Please fill in: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const formData = buildContractData();
      const leadId = id || lead?.id;
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 7);

      const upsertData: any = {
        lead_id: leadId,
        form_type: "contract",
        form_data: formData,
        status: "sent",
        token_expires_at: tokenExpiry.toISOString(),
        sent_for_signing_at: new Date().toISOString(),
        created_by: user?.id,
        rep_signature_data: customerSignature || null,
      };
      if (existingForm?.id) upsertData.id = existingForm.id;

      const { data: form, error } = await supabase
        .from("lead_forms")
        .upsert(upsertData)
        .select()
        .single();

      if (error) throw error;

      await supabase.functions.invoke("send-contract-signing-email", {
        body: {
          clientName: lead?.full_name || ownerName,
          clientEmail: lead?.email || emailField,
          signingToken: (form as any).signing_token,
          contractAmount: contractPrice,
          repName: profile?.full_name || "",
          expiresAt: tokenExpiry.toISOString(),
        },
      });

      await supabase.from("lead_activity_log").insert({
        lead_id: leadId,
        user_id: user?.id,
        activity_type: "contract_sent",
        content: `Contract sent to customer for signature`,
      });

      toast({ title: `Contract sent to ${lead?.email || emailField}` });
      navigate(`/dashboard/leads/${leadId}`);
    } catch (err: any) {
      toast({ title: "Failed to send contract", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      const leadId = id || lead?.id;
      let token = (existingForm as any)?.signing_token;
      const tokenExpiry = (existingForm as any)?.token_expires_at;
      const isExpired = !tokenExpiry || new Date(tokenExpiry) < new Date();

      if (isExpired) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        const { data, error } = await supabase
          .from("lead_forms")
          .update({
            token_expires_at: newExpiry.toISOString(),
            sent_for_signing_at: new Date().toISOString(),
          } as any)
          .eq("id", existingForm.id)
          .select()
          .single();
        if (error) throw error;
        token = (data as any).signing_token;
      }

      await supabase.functions.invoke("send-contract-signing-email", {
        body: {
          clientName: lead?.full_name || ownerName,
          clientEmail: lead?.email || emailField,
          signingToken: token,
          contractAmount: contractPrice,
          repName: profile?.full_name || "",
          expiresAt: isExpired ? new Date(Date.now() + 7 * 86400000).toISOString() : tokenExpiry,
        },
      });

      toast({ title: `Contract resent to ${lead?.email || emailField}` });
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Helper to render a field as text or input
  const renderField = (label: string, value: string, onChange: (v: string) => void, props?: any) => (
    <div className={props?.className}>
      <label className="text-sm font-medium">{label}</label>
      {readOnly ? (
        <p className="py-2 px-3 border border-transparent text-sm min-h-[40px]">{value || "—"}</p>
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} {...(props?.inputProps || {})} />
      )}
    </div>
  );

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const contractFormStatus = (existingForm as any)?.status;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {isRouteBased && !signingMode && (
        <Button variant="ghost" onClick={() => {
          const isAdminRoute = location.pathname.startsWith("/admin");
          navigate(isAdminRoute ? `/admin/leads/${id}` : `/dashboard/leads/${id}`);
        }} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Lead
        </Button>
      )}
      <h1 className="font-heading text-2xl uppercase">Gutter Contract</h1>

      {/* Signing Status Display (rep view only) */}
      {!signingMode && contractFormStatus === "sent" && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Clock className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">⏳ Awaiting customer signature</p>
            <p className="text-xs text-amber-600">Sent {formatDisplayDate((existingForm as any)?.sent_for_signing_at)}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleResend} disabled={sending} className="gap-1">
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Resend
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={recallingContract}>
                  {recallingContract ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                  Recall
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Recall this contract?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will void the signing link and reset the contract to draft so you can make corrections and resend it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleRecallContract}>
                    Recall Contract
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {!signingMode && contractFormStatus === "signed" && (existingForm as any)?.customer_signed_name && (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700">✅ Signed by {(existingForm as any).customer_signed_name}</p>
            <p className="text-xs text-green-600">{formatDisplayDate((existingForm as any).customer_signed_at)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleSendConfirmationManual} disabled={sendingConfirmation} className="gap-1">
            {sendingConfirmation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            Email Copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadContractPDF(existingForm.form_data, existingForm.signature_data, (existingForm as any).customer_signed_at, (existingForm as any).customer_signed_name, (existingForm as any).signed_by_name)} className="gap-1">
            <Download className="w-3 h-3" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleUploadPDFToFiles} disabled={uploadingPDF} className="gap-1">
            {uploadingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Save to Files
          </Button>
        </div>
      )}

      {/* In-person signed (has signature_data but no customer_signed_name = signed by rep in person) */}
      {!signingMode && contractFormStatus === "signed" && !(existingForm as any)?.customer_signed_name && (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700">✅ Signed in person by {(existingForm as any)?.signed_by_name || ownerName}</p>
            <p className="text-xs text-green-600">{formatDisplayDate((existingForm as any)?.signed_at)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleSendConfirmationManual} disabled={sendingConfirmation} className="gap-1">
            {sendingConfirmation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            Email Copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadContractPDF(existingForm.form_data, existingForm.signature_data, (existingForm as any).signed_at, null, (existingForm as any).signed_by_name)} className="gap-1">
            <Download className="w-3 h-3" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleUploadPDFToFiles} disabled={uploadingPDF} className="gap-1">
            {uploadingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Save to Files
          </Button>
        </div>
      )}

      {/* Customer/Property Info */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Customer Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderField("Owner Name", ownerName, setOwnerName, { className: "sm:col-span-2" })}
          {renderField("Address", streetAddress, setStreetAddress, { className: "sm:col-span-2" })}
          {renderField("City", cityField, setCityField)}
          <div className="grid grid-cols-2 gap-2">
            {renderField("State", stateField, setStateField)}
            {renderField("Zip", zipField, setZipField)}
          </div>
          {renderField("Phone", phoneField, setPhoneField)}
          {renderField("Email", emailField, setEmailField)}
        </div>
      </div>

      {/* Scope */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Scope of Work</h2>
        {readOnly ? (
          <div className="w-full border border-transparent rounded p-3 text-sm whitespace-pre-wrap min-h-[200px]">{scopeOfWork || "—"}</div>
        ) : (
          <textarea className="w-full border border-border rounded p-3 text-sm bg-background whitespace-pre-wrap" rows={14} value={scopeOfWork} onChange={(e) => setScopeOfWork(e.target.value)} />
        )}
      </div>

      {/* Pricing */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Contract Terms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {readOnly ? (
            <>
              <div><label className="text-sm font-medium">Contract Price ($)</label><p className="py-2 px-3 text-sm">{contractPrice ? `$${Number(contractPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</p></div>
              <div><label className="text-sm font-medium">Down Payment ($)</label><p className="py-2 px-3 text-sm">{downPayment ? `$${Number(downPayment).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</p></div>
            </>
          ) : (
            <>
              <div><label className="text-sm font-medium">Contract Price ($) <span className="text-destructive">*</span></label><Input type="number" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Down Payment ($) <span className="text-destructive">*</span></label><Input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} /></div>
            </>
          )}
          <div>
            <label className="text-sm font-medium">Unpaid Balance ($)</label>
            <div className="h-10 flex items-center px-3 border border-border rounded-md bg-muted text-sm font-medium">${unpaidBalance.toFixed(2)}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {readOnly ? (
            <>
              <div><label className="text-sm font-medium">Approx Start Date</label><p className="py-2 px-3 text-sm">{startDate || "—"}</p></div>
              <div><label className="text-sm font-medium">Approx Completion Date</label><p className="py-2 px-3 text-sm">{completionDate || "—"}</p></div>
            </>
          ) : (
            <>
              <div><label className="text-sm font-medium">Approx Start Date <span className="text-destructive">*</span></label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Approx Completion Date</label><Input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} /></div>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {readOnly ? (
            <>
              <div><label className="text-sm font-medium">Last 4 digits CC / SID #</label><p className="py-2 px-3 text-sm">{lastFourCC || "—"}</p></div>
              <div><label className="text-sm font-medium">6-digit Auth Plan #</label><p className="py-2 px-3 text-sm">{authPlan || "—"}</p></div>
            </>
          ) : (
            <>
              <div><label className="text-sm font-medium">Last 4 digits CC / SID #</label><Input value={lastFourCC} onChange={(e) => setLastFourCC(e.target.value)} maxLength={4} /></div>
              <div><label className="text-sm font-medium">6-digit Auth Plan #</label><Input value={authPlan} onChange={(e) => setAuthPlan(e.target.value)} maxLength={6} /></div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <>
              <span className="text-sm">{electronicPayment ? "☑" : "☐"}</span>
              <label className="text-sm">Electronic Payment (CC / Financing)</label>
            </>
          ) : (
            <>
              <Checkbox checked={electronicPayment} onCheckedChange={(v) => setElectronicPayment(!!v)} />
              <label className="text-sm">Electronic Payment (CC / Financing)</label>
            </>
          )}
        </div>
        {renderField("Other Pay Terms", otherPayTerms, setOtherPayTerms)}
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

      {/* Signatures - hide rep signature in signing mode */}
      {!signingMode && (
        <div className="border border-border rounded-lg p-5 space-y-4">
          <h2 className="font-heading text-lg uppercase">Signatures</h2>
          {readOnly ? (
            <div>
              <label className="text-sm font-medium">Date</label>
              <p className="py-2 px-3 text-sm">{signatureDate || "—"}</p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Agreement Date <span className="text-destructive">*</span></label>
              <Input type="date" value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} />
            </div>
          )}
          {readOnly ? (
            customerSignature ? (
              <div>
                <label className="text-sm font-medium">Customer Signature</label>
                <img src={customerSignature} alt="Customer Signature" className="border border-border rounded-lg max-w-[400px] mt-1" />
              </div>
            ) : null
          ) : (
            <SignaturePad label="Customer Signature" value={customerSignature} onChange={setCustomerSignature} />
          )}
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Checkbox checked={showSecondOwner} onCheckedChange={(v) => setShowSecondOwner(!!v)} />
              <label className="text-sm">Add second owner signature</label>
            </div>
          )}
          {showSecondOwner && (
            readOnly ? (
              secondOwnerSignature ? (
                <div>
                  <label className="text-sm font-medium">Second Owner Signature</label>
                  <img src={secondOwnerSignature} alt="Second Owner Signature" className="border border-border rounded-lg max-w-[400px] mt-1" />
                </div>
              ) : null
            ) : (
              <SignaturePad label="Second Owner Signature" value={secondOwnerSignature} onChange={setSecondOwnerSignature} />
            )
          )}
          <div>
            <label className="text-sm font-medium">Sales Representative</label>
            <div className="h-10 flex items-center px-3 border border-border rounded-md bg-muted text-sm">{profile?.full_name || (existingForm?.form_data as any)?.repName || "—"}</div>
          </div>
        </div>
      )}

      {/* Customer Signing Section (public signing mode) */}
      {signingMode && (
        <div className="border-2 border-primary rounded-lg p-6 space-y-5 bg-primary/5">
          <h2 className="font-heading text-lg uppercase text-center">Please Review & Sign Below</h2>
          <p className="text-sm text-muted-foreground text-center">Please review the contract above and sign below to confirm your agreement.</p>

          <div>
            <label className="text-sm font-medium">Type your full legal name</label>
            <Input
              value={customerTypedName}
              onChange={(e) => setCustomerTypedName(e.target.value)}
              placeholder="Full legal name as it appears above"
            />
          </div>

          <SignaturePad label="Your Signature" value={customerSigData} onChange={setCustomerSigData} />

          <div className="flex items-start gap-2">
            <Checkbox checked={customerAgreed} onCheckedChange={(v) => setCustomerAgreed(!!v)} className="mt-1" />
            <label className="text-sm">
              I have read and agree to all terms of this contract. I understand this constitutes a legally binding agreement.
            </label>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => onCustomerSign?.(customerSigData, customerTypedName)}
            disabled={!customerTypedName.trim() || !customerSigData || !customerAgreed}
          >
            <CheckCircle2 className="w-5 h-5" />
            ✅ I Agree — Submit Signature
          </Button>
        </div>
      )}

      {/* Action Buttons (rep view only, not read-only, not signing mode) */}
      {!readOnly && !signingMode && (
        <div className="space-y-3">
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {existingForm && existingForm.status !== "draft" ? "Update Contract" : "Sign & Save Contract"}
          </Button>

          {lead && (
            <Button
              variant="outline"
              onClick={handleSendForSignature}
              disabled={sending}
              className="w-full gap-2"
              size="lg"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending..." : "📧 Send to Customer for Signature"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
