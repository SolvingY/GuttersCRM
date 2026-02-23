import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function FlexSchedule() {
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
    queryKey: ["lead-estimate-flex", id],
    queryFn: async () => {
      const { data } = await supabase.from("gutter_estimates").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const [customerName, setCustomerName] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [addressField, setAddressField] = useState("");
  const [cityField, setCityField] = useState("");
  const [stateField, setStateField] = useState("");
  const [phoneField, setPhoneField] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [readyAfterDate, setReadyAfterDate] = useState("");
  const [flexNotes, setFlexNotes] = useState("");
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerSignature, setCustomerSignature] = useState("");

  useEffect(() => {
    if (existingForm) {
      const d = existingForm.form_data as any;
      setCustomerName(d.customerName || "");
      setJobNumber(d.jobNumber || "");
      setAddressField(d.address || "");
      setCityField(d.city || "");
      setStateField(d.state || "");
      setPhoneField(d.phone || "");
      setDiscountAmount(d.discountAmount || "");
      setReadyAfterDate(d.readyAfterDate || "");
      setFlexNotes(d.notes || "");
      setCustomerSignature(existingForm.signature_data || "");
      setSignatureDate(d.signatureDate || new Date().toISOString().split("T")[0]);
    } else if (lead) {
      setCustomerName(lead.full_name || "");
      setJobNumber(lead.reference_number || "");
      setAddressField(lead.street_address || "");
      setCityField(lead.city || "");
      setStateField(lead.state || "");
      setPhoneField(lead.phone || "");
    }
  }, [lead, existingForm]);

  useEffect(() => {
    if (estimate && !existingForm && !discountAmount) {
      const totalRetail = Number(estimate.total_retail) || 0;
      const quotedPrice = Number(estimate.quoted_price) || 0;
      if (totalRetail > quotedPrice) {
        setDiscountAmount((totalRetail - quotedPrice).toFixed(2));
      }
    }
  }, [estimate, existingForm, discountAmount]);

  const handleSave = async () => {
    if (!customerSignature) {
      toast({ title: "Signature required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const formData = {
        customerName, jobNumber, address: addressField, city: cityField,
        state: stateField, phone: phoneField, discountAmount,
        readyAfterDate, notes: flexNotes, repName: profile?.full_name || "",
        signatureDate,
      };

      if (existingForm) {
        await supabase.from("lead_forms").update({
          form_data: formData, status: "signed", signed_by_name: customerName,
          signed_at: new Date().toISOString(), signature_data: customerSignature,
        }).eq("id", existingForm.id);
      } else {
        await supabase.from("lead_forms").insert({
          lead_id: id, form_type: "flex_schedule", form_data: formData,
          status: "signed", signed_by_name: customerName,
          signed_at: new Date().toISOString(), signature_data: customerSignature,
          created_by: user?.id,
        });
      }

      await supabase.from("lead_activity_log").insert({
        lead_id: id, user_id: user?.id, activity_type: "flex_schedule_signed",
        content: `Flex schedule agreement signed by ${customerName}`,
      });

      toast({ title: "Flex schedule saved" });
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
      <h1 className="font-heading text-2xl uppercase">Flex Schedule Agreement</h1>

      <div className="border border-border rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Customer Name</label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Job #</label><Input value={jobNumber} onChange={e => setJobNumber(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Address</label><Input value={addressField} onChange={e => setAddressField(e.target.value)} /></div>
          <div><label className="text-sm font-medium">City</label><Input value={cityField} onChange={e => setCityField(e.target.value)} /></div>
          <div><label className="text-sm font-medium">State</label><Input value={stateField} onChange={e => setStateField(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Phone</label><Input value={phoneField} onChange={e => setPhoneField(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Discount Amount ($)</label><Input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} /></div>
        </div>
      </div>

      {/* Legal Text */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <p className="text-sm text-foreground">
          The above-named customer has accepted the discount of <strong>${discountAmount || "0.00"}</strong> to participate in the Flexible Installation scheduling program. This discounted price is in consideration of the customer's flexibility in the installation scheduling of the remodeling project. In order to qualify, the customer agrees to the following:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>NGG will determine the date of installation.</li>
          <li>There is the possibility that the installation may need to be rescheduled due to unforeseen circumstances.</li>
          <li>The home will be free and clear of movable obstructions in the area(s) of installation.</li>
          <li>Work or projects that may interfere with the installation of NGG products must be completed prior to NGG installation.</li>
          <li>Special pricing is to be kept confidential as to not interfere with our best business practices.</li>
        </ul>
      </div>

      <div className="border border-border rounded-lg p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Ready for installation on or after</label>
          <Input type="date" value={readyAfterDate} onChange={e => setReadyAfterDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={flexNotes} onChange={e => setFlexNotes(e.target.value)} rows={2} />
        </div>
      </div>

      {/* Signatures */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Signatures</h2>
        <SignaturePad label="Customer Signature" value={customerSignature} onChange={setCustomerSignature} />
        <div>
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={signatureDate} onChange={e => setSignatureDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">NGG Representative</label>
          <div className="h-10 flex items-center px-3 border border-border rounded-md bg-muted text-sm">{profile?.full_name || "—"}</div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {existingForm ? "Update Agreement" : "Sign & Save Agreement"}
      </Button>
    </div>
  );
}
