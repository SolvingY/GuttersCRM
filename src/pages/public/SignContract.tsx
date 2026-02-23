import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import GutterContract from "@/pages/dashboard/forms/GutterContract";
import { generateAndUploadContractPDF } from "@/lib/generateContractPDF";

export default function SignContract() {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      if (!token) { setTokenExpired(true); setLoading(false); return; }

      const { data, error } = await (supabase
        .from("lead_forms")
        .select("*") as any)
        .eq("signing_token", token)
        .single();

      if (error || !data) {
        setTokenExpired(true);
        setLoading(false);
        return;
      }

      const formData = data as any;

      if (formData.token_expires_at && new Date(formData.token_expires_at) < new Date()) {
        setTokenExpired(true);
        setLoading(false);
        return;
      }

      if (formData.status === "signed") {
        setAlreadySigned(true);
        setForm(formData);
        setLoading(false);
        return;
      }

      // Load lead data for display
      if (formData.lead_id) {
        const { data: leadData } = await supabase
          .from("quote_requests")
          .select("full_name, email, phone, street_address, city, state, zip_code, quote_amount")
          .eq("id", formData.lead_id)
          .single();
        setLead(leadData);
      }

      setForm(formData);
      setLoading(false);
    };
    loadForm();
  }, [token]);

  const handleSign = async (signatureData: string, signedName: string) => {
    setSigning(true);
    try {
      // Re-check the form is still valid for signing
      const { data: currentForm } = await (supabase
        .from("lead_forms")
        .select("status, token_expires_at") as any)
        .eq("signing_token", token)
        .single();

      if (!currentForm || currentForm.status !== "sent" || 
          (currentForm.token_expires_at && new Date(currentForm.token_expires_at) < new Date())) {
        toast({ title: "This contract is no longer available for signing", description: "It may have been recalled or updated. Please contact your representative for a new link.", variant: "destructive" });
        setTokenExpired(true);
        return;
      }

      const { error } = await (supabase
        .from("lead_forms")
        .update({
          status: "signed",
          signed_by_name: signedName,
          customer_signed_name: signedName,
          signature_data: signatureData,
          customer_signed_at: new Date().toISOString(),
          signed_at: new Date().toISOString(),
        } as any) as any)
        .eq("signing_token", token);

      if (error) throw error;

      await supabase.functions.invoke("notify-contract-signed", {
        body: {
          formId: form.id,
          leadId: form.lead_id,
          customerName: signedName,
          signedAt: new Date().toISOString(),
        },
      });

      // Auto-generate and upload PDF for remote signing
      if (form.lead_id && form.created_by) {
        generateAndUploadContractPDF(
          form.form_data,
          signatureData,
          form.lead_id,
          form.created_by,
          new Date().toISOString(),
          signedName,
          null,
        ).catch(console.error);
      }

      setCompleted(true);
    } catch (err: any) {
      toast({ title: "Failed to submit signature", description: "Please try again.", variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold">This signing link has expired or is invalid.</h1>
          <p className="text-muted-foreground">Please contact your representative to request a new link.</p>
          <div className="pt-4 text-sm text-muted-foreground">
            <p className="font-semibold">Next Generation Guttering</p>
            <p>(405) 724-8092 • www.OKNEXTGEN.com</p>
          </div>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold">This contract has already been signed.</h1>
          <p className="text-muted-foreground">
            Signed on {new Date((form as any)?.customer_signed_at || (form as any)?.signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
            Thank you for choosing Next Generation Guttering!
          </p>
          <div className="pt-4 text-sm text-muted-foreground">
            <p className="font-semibold">Next Generation Guttering</p>
            <p>3 NE 8th St, Oklahoma City, OK 73104</p>
            <p>(405) 724-8092 • www.OKNEXTGEN.com</p>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    const customerName = (form?.form_data as any)?.ownerName || lead?.full_name || "Customer";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold">Contract Signed Successfully</h1>
          <p className="text-muted-foreground">
            Thank you, {customerName}! Your signature has been recorded on{" "}
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}.
          </p>
          <p className="text-muted-foreground">
            Your installation contract with Next Generation Guttering is now complete. You will receive a copy by email shortly.
          </p>
          <div className="pt-4 text-sm text-muted-foreground">
            <p className="font-semibold">Next Generation Guttering</p>
            <p>3 NE 8th St, Oklahoma City, OK 73104</p>
            <p>(405) 724-8092 • www.OKNEXTGEN.com</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Next Generation Guttering</h1>
          <p className="text-sm text-muted-foreground">Contract Review & Signature</p>
        </div>
        <GutterContract
          lead={lead}
          existingForm={form}
          readOnly
          signingMode
          onCustomerSign={handleSign}
        />
      </div>
    </div>
  );
}
