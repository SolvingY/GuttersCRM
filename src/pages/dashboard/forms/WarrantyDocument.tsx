import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, Mail } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function WarrantyDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const isAdminRoute = location.pathname.startsWith("/admin");
  const backPath = isAdminRoute ? `/admin/leads/${id}` : `/dashboard/leads/${id}`;

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
    queryKey: ["lead-estimate-warranty", id],
    queryFn: async () => {
      const { data } = await supabase.from("gutter_estimates").select("protection_product, measurement_data").eq("lead_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const [homeownerName, setHomeownerName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [cityField, setCityField] = useState("");
  const [stateField, setStateField] = useState("");
  const [zipField, setZipField] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [warrantyApplies, setWarrantyApplies] = useState(false);
  const [homeownerSignature, setHomeownerSignature] = useState("");
  const [repSignature, setRepSignature] = useState("");
  const [homeownerSignDate, setHomeownerSignDate] = useState(new Date().toISOString().split("T")[0]);
  const [repSignDate, setRepSignDate] = useState(new Date().toISOString().split("T")[0]);

  const quoteAmount = lead?.quote_amount || 0;
  const totalRebate = (Number(quoteAmount) * 0.10).toFixed(2);

  useEffect(() => {
    if (existingForm) {
      const d = existingForm.form_data as any;
      setHomeownerName(d.homeownerName || "");
      setPropertyAddress(d.propertyAddress || "");
      setCityField(d.city || "");
      setStateField(d.state || "");
      setZipField(d.zip || "");
      setInstallDate(d.installDate || "");
      setWarrantyApplies(d.warrantyApplies || false);
      setHomeownerSignature(existingForm.signature_data || "");
      setRepSignature(existingForm.rep_signature_data || "");
      setHomeownerSignDate(d.homeownerSignDate || new Date().toISOString().split("T")[0]);
      setRepSignDate(d.repSignDate || new Date().toISOString().split("T")[0]);
    } else if (lead) {
      setHomeownerName(lead.full_name || "");
      setPropertyAddress(lead.street_address || "");
      setCityField(lead.city || "");
      setStateField(lead.state || "");
      setZipField(lead.zip_code || "");
      setInstallDate(lead.install_date || "");
    }
  }, [lead, existingForm]);

  const handleSendWarrantyEmail = async () => {
    if (!lead?.email) {
      toast({ title: "No email on file", variant: "destructive" });
      setEmailPromptOpen(false);
      return;
    }
    setSendingEmail(true);
    try {
      const protectionProduct = estimate?.protection_product || "Standard";
      const { error: emailError } = await supabase.functions.invoke("send-warranty-email", {
        body: {
          clientName: homeownerName,
          clientEmail: lead.email,
          quoteAmount: Number(quoteAmount),
          referenceNumber: lead.reference_number || "",
          installDate,
          completedAt: lead.completed_at || new Date().toISOString(),
          protectionProduct,
        },
      });
      if (emailError) throw emailError;
      toast({ title: "Warranty email sent to homeowner" });
    } catch (err: any) {
      console.error("Warranty email failed:", err);
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
      setEmailPromptOpen(false);
      navigate(backPath);
    }
  };

  const handleSave = async () => {
    if (!homeownerSignature || !repSignature) {
      toast({ title: "Both signatures required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const formData = {
        homeownerName, propertyAddress, city: cityField, state: stateField,
        zip: zipField, installDate, warrantyApplies, totalRebate,
        repName: profile?.full_name || "", homeownerSignDate, repSignDate,
      };

      if (existingForm) {
        await supabase.from("lead_forms").update({
          form_data: formData, status: "signed", signed_by_name: homeownerName,
          signed_at: new Date().toISOString(), signature_data: homeownerSignature,
          rep_signature_data: repSignature,
        }).eq("id", existingForm.id);
      } else {
        await supabase.from("lead_forms").insert({
          lead_id: id, form_type: "warranty", form_data: formData,
          status: "signed", signed_by_name: homeownerName,
          signed_at: new Date().toISOString(), signature_data: homeownerSignature,
          rep_signature_data: repSignature, created_by: user?.id,
        });
      }

      await supabase.from("lead_activity_log").insert({
        lead_id: id, user_id: user?.id, activity_type: "warranty_signed",
        content: `Warranty document signed by ${homeownerName}`,
      });

      // Invalidate lead-forms query so lead card refreshes
      queryClient.invalidateQueries({ queryKey: ["lead-forms", id] });

      toast({ title: "Warranty document saved" });

      // Show email prompt instead of navigating immediately
      setEmailPromptOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Lead
      </Button>
      <h1 className="font-heading text-2xl uppercase">Warranty Document</h1>

      {/* Customer Info */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="text-sm font-medium">Homeowner Name</label><Input value={homeownerName} onChange={e => setHomeownerName(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium">Property Address</label><Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} /></div>
          <div><label className="text-sm font-medium">City</label><Input value={cityField} onChange={e => setCityField(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-sm font-medium">State</label><Input value={stateField} onChange={e => setStateField(e.target.value)} /></div>
            <div><label className="text-sm font-medium">ZIP</label><Input value={zipField} onChange={e => setZipField(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium">Installation Date</label><Input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} /></div>
          <div><label className="text-sm font-medium">NGG Representative</label><div className="h-10 flex items-center px-3 border border-border rounded-md bg-muted text-sm">{profile?.full_name || "—"}</div></div>
        </div>
      </div>

      {/* Warranty Summary */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Warranty Summary</h2>
        <p className="text-sm text-muted-foreground">
          Next Generation Guttering ("NGG") provides the original homeowner listed below a Lifetime No Leak Warranty guaranteeing that all NGG installed gutter systems will remain leak free due to installation defects or faulty workmanship for the lifetime of the product, provided the required maintenance conditions are met. If a leak occurs under normal conditions and within the scope of this warranty, NGG will inspect and repair or replace the affected section at no cost to the homeowner. NGG offers a complimentary yearly inspection of the gutter system. Client must call 30 days in advance to schedule inspection.
        </p>
        <div className="flex items-center gap-2 pt-2">
          <Checkbox checked={warrantyApplies} onCheckedChange={v => setWarrantyApplies(!!v)} />
          <label className="text-sm font-medium">Yes — warranty applies to this service</label>
        </div>
      </div>

      {/* Future Roof Rebate */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Future Roof Rebate</h2>
        <p className="text-sm text-muted-foreground">
          Next Generation Guttering ("NGG") agrees to give a 10% rebate of Guttering project price towards a future roof replacement by parent company Next Generation Roofing. This rebate can be used towards the project cost of the roof but CANNOT be applied towards deductible or any other projects other than a qualifying roof replacement.
        </p>
        <div className="text-center py-3">
          <p className="text-sm font-medium">TOTAL REBATE FOR THIS PROJECT:</p>
          <p className="text-2xl font-bold text-destructive">${totalRebate}</p>
        </div>
      </div>

      {/* Coverage */}
      <div className="border border-border rounded-lg p-5 space-y-2">
        <h2 className="font-heading text-lg uppercase">Warranty Coverage</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Leaks caused by defective materials or NGG workmanship</li>
          <li>Seal failure at joints, end caps, or miters installed by NGG</li>
          <li>Defective hangers, miters, or fasteners installed by NGG</li>
          <li>Paint or finish durability consistent with manufacturer standards</li>
          <li>Repairs will be completed promptly after inspection and verification</li>
        </ul>
      </div>

      {/* Terms */}
      <Collapsible open={termsOpen} onOpenChange={setTermsOpen}>
        <CollapsibleTrigger asChild>
          <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
            <span className="font-heading text-sm uppercase">Terms & Conditions</span>
            {termsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 text-xs text-muted-foreground space-y-4">
          <div>
            <h4 className="font-bold text-foreground mb-1">1. Maintenance Requirements</h4>
            <p>Annual inspection by NGG, maintain fascia/soffit/roofline, report issues within 30 days, no modifications by others.</p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">2. Warranty Exclusions</h4>
            <p>Acts of God, damage by trees/ladders/construction, animal interference, roof movement, fascia deterioration, clogging overflow, paint fading, third-party repairs.</p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">3. Claim Procedure</h4>
            <p>Contact support@oknextgen.com or (405) 724-8092, include proof of annual cleaning + NGG inspection + photos, inspection scheduled within 10 business days.</p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">4. Transfer & Limitation</h4>
            <p>Transferable once if maintenance requirements met, liability limited to repair/replacement, not responsible for consequential damages.</p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">5. Entire Agreement</h4>
            <p>This document represents complete warranty agreement, no verbal modifications.</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Signatures */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Signatures</h2>
        <SignaturePad label="Homeowner Signature" value={homeownerSignature} onChange={setHomeownerSignature} />
        <div><label className="text-sm font-medium">Date</label><Input type="date" value={homeownerSignDate} onChange={e => setHomeownerSignDate(e.target.value)} /></div>
        <SignaturePad label="NGG Representative Signature" value={repSignature} onChange={setRepSignature} />
        <div><label className="text-sm font-medium">Date</label><Input type="date" value={repSignDate} onChange={e => setRepSignDate(e.target.value)} /></div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {existingForm ? "Update Warranty" : "Sign & Save Warranty"}
      </Button>

      {/* Email Prompt Dialog */}
      <Dialog open={emailPromptOpen} onOpenChange={(open) => {
        if (!open) {
          setEmailPromptOpen(false);
          navigate(backPath);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Send Warranty to Homeowner?</DialogTitle>
            <DialogDescription>
              Would you like to email the warranty documents to {lead?.email || "the homeowner"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEmailPromptOpen(false); navigate(backPath); }}>
              Skip
            </Button>
            <Button onClick={handleSendWarrantyEmail} disabled={sendingEmail} className="gap-2">
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
