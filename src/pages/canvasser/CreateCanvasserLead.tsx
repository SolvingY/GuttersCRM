import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, ClipboardCheck, CalendarDays, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const gutterConditions = [
  { key: "clogged", label: "Clogged", desc: "debris piling, water stains, gutters pulling from fascia" },
  { key: "leaking", label: "Leaking", desc: "water dripping from gutter system" },
  { key: "improperlyPitched", label: "Improperly Pitched", desc: "water sits stagnant or overshoots gutters" },
  { key: "sagging", label: "Sagging", desc: "gutters pulling away from soffit and fascia" },
];

const perimeterItems = [
  "Foundation/concrete issues",
  "Tiger Stripes/algae growth",
  "Mold or mildew",
  "Sagging or damaged gutters",
  "Rotten or damaged fascia",
  "Soil erosion or trench",
  "Damaged siding or brick",
  "Clogged downspouts",
  "Spike/ferrule in gutter",
  "Metal/Shingles over gutters",
];

const insideGutterItems = [
  "Shingle grit, muck and sludge",
  "Leaves and foliage",
  "Seeds, acorns and seed pods",
  "Pine needles, Cypress needles",
  "Weeds, branches and debris",
  "Peeling paint",
  "Standing water",
  "Mosquitoes, Fire Ants, Termites",
  "Birds, Squirrels and Other Nests",
  "Rats, frogs, roaches, snakes",
];

const inspectionServices = [
  "Full Gutter Inspection",
  "Downspout & Drainage Evaluation",
  "Soffit & Fascia Health Check",
  "Custom Quote/Estimate",
];

const whyChooseUs = [
  "Locally owned and operated",
  "Licensed and insured",
  "Free estimates and inspections",
  "Lifetime No-Leak Warranty",
  "Highest quality materials",
];

export default function CreateCanvasserLead() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Lead info
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Oklahoma");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [notes, setNotes] = useState("");

  // Inspection checklist
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [perimeterChecks, setPerimeterChecks] = useState<Record<string, boolean | null>>({});
  const [insideChecks, setInsideChecks] = useState<Record<string, boolean | null>>({});
  const [preExisting, setPreExisting] = useState("");
  const [safetyConcerns, setSafetyConcerns] = useState("");

  // Appointment
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const isChecklistTouched = () => {
    return Object.values(conditions).some(v => v) ||
      Object.values(perimeterChecks).some(v => v !== undefined && v !== null) ||
      Object.values(insideChecks).some(v => v !== undefined && v !== null) ||
      preExisting.trim() !== "" || safetyConcerns.trim() !== "";
  };

  const isAppointmentTouched = () => {
    return appointmentDate !== "" || appointmentTime !== "";
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !address.trim() || !phone.trim()) {
      toast({ title: "Required fields missing", description: "Customer Name, Address, and Phone are required.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Insert lead into quote_requests
      const { data: leadData, error: leadError } = await supabase
        .from("quote_requests")
        .insert({
          full_name: customerName,
          street_address: address,
          city: city || "N/A",
          state,
          zip_code: zip || "",
          phone,
          email: email || "noemail@placeholder.com",
          service_type: serviceInterest || "gutters",
          lead_source: "canvasser",
          lead_type: "canvasser",
          canvasser_id: user?.id,
          status: "new",
          manually_created: true,
          created_by: user?.id,
          form_data: {
            description: notes,
            altPhone,
            serviceInterest,
          },
        })
        .select("id")
        .single();

      if (leadError) throw leadError;
      const leadId = leadData.id;

      // Save inspection checklist if touched
      if (isChecklistTouched()) {
        await supabase.from("lead_forms").insert({
          lead_id: leadId,
          form_type: "inspection",
          status: "completed",
          form_data: {
            customerName,
            address: `${address}, ${city}, ${state} ${zip}`,
            date: new Date().toISOString().split("T")[0],
            conditions,
            perimeterChecks,
            insideChecks,
            preExisting,
            safetyConcerns,
          },
          created_by: user?.id,
        });
      }

      // Save appointment if touched
      if (isAppointmentTouched()) {
        await supabase.from("lead_forms").insert({
          lead_id: leadId,
          form_type: "appointment",
          status: "completed",
          form_data: {
            customerName,
            address: `${address}, ${city}, ${state} ${zip}`,
            appointmentDate,
            appointmentTime,
            notes: appointmentNotes,
            services: inspectionServices,
          },
          created_by: user?.id,
        });
      }

      // Log activity
      await supabase.from("lead_activity_log").insert({
        lead_id: leadId,
        user_id: user?.id,
        activity_type: "created",
        content: "Lead created by canvasser",
      });

      toast({ title: "Lead submitted!", description: "Your manager will review and assign it shortly." });
      navigate("/canvasser/stats");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/canvasser/stats")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Button>

      <div>
        <h1 className="font-heading text-2xl uppercase">Create Lead</h1>
        <p className="text-sm text-muted-foreground">Submit a new lead for manager review and assignment</p>
      </div>

      {/* Section A: Lead Info */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading text-lg uppercase">Lead Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Customer Name *</label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Address *</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" />
          </div>
          <div>
            <label className="text-sm font-medium">City</label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">State</label>
              <Input value={state} onChange={e => setState(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Zip</label>
              <Input value={zip} onChange={e => setZip(e.target.value)} placeholder="Zip" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Phone *</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <label className="text-sm font-medium">Alt Phone</label>
            <Input value={altPhone} onChange={e => setAltPhone(e.target.value)} placeholder="Alternative phone" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" />
          </div>
          <div>
            <label className="text-sm font-medium">Service Interest</label>
            <Select value={serviceInterest} onValueChange={setServiceInterest}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gutters">Gutters</SelectItem>
                <SelectItem value="protection">Protection</SelectItem>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Notes / Description</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded text-xs font-medium">Lead Source: Canvasser (auto)</span>
          </div>
        </div>
      </div>

      {/* Section B: Inspection Checklist */}
      <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
        <CollapsibleTrigger asChild>
          <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <span className="font-heading text-sm uppercase">📋 Fill Out Inspection Checklist</span>
            </div>
            {checklistOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 space-y-6">
          {/* Header */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{customerName || "—"}</span></div>
            <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{address || "—"}</span></div>
            <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
          </div>

          {/* Gutter Conditions */}
          <div>
            <h3 className="font-heading text-sm uppercase mb-3">Gutter Condition</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gutterConditions.map(c => (
                <label key={c.key} className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30">
                  <Checkbox
                    checked={!!conditions[c.key]}
                    onCheckedChange={(v) => setConditions(prev => ({ ...prev, [c.key]: !!v }))}
                  />
                  <div>
                    <span className="font-medium text-sm">{c.label}</span>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Perimeter & Inside Checklists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-heading text-sm uppercase mb-3">Perimeter Inspection</h3>
              <div className="space-y-2">
                {perimeterItems.map(item => (
                  <div key={item} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                    <span>{item}</span>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant={perimeterChecks[item] === true ? "default" : "outline"} className="h-7 px-2 text-xs"
                        onClick={() => setPerimeterChecks(p => ({ ...p, [item]: true }))}>Yes</Button>
                      <Button type="button" size="sm" variant={perimeterChecks[item] === false ? "destructive" : "outline"} className="h-7 px-2 text-xs"
                        onClick={() => setPerimeterChecks(p => ({ ...p, [item]: false }))}>No</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-heading text-sm uppercase mb-3">What's Inside Your Gutters</h3>
              <div className="space-y-2">
                {insideGutterItems.map(item => (
                  <div key={item} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                    <span>{item}</span>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant={insideChecks[item] === true ? "default" : "outline"} className="h-7 px-2 text-xs"
                        onClick={() => setInsideChecks(p => ({ ...p, [item]: true }))}>Yes</Button>
                      <Button type="button" size="sm" variant={insideChecks[item] === false ? "destructive" : "outline"} className="h-7 px-2 text-xs"
                        onClick={() => setInsideChecks(p => ({ ...p, [item]: false }))}>No</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Free text */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Any pre-existing conditions or damage?</label>
              <Textarea value={preExisting} onChange={e => setPreExisting(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Any safety concerns?</label>
              <Textarea value={safetyConcerns} onChange={e => setSafetyConcerns(e.target.value)} rows={2} />
            </div>
          </div>

          <p className="text-center font-bold text-foreground text-sm py-2">
            WE CAN ALL AGREE SOMETHING NEEDS TO BE DONE RIGHT?
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Appointment Sheet */}
      <Collapsible open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <CollapsibleTrigger asChild>
          <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <span className="font-heading text-sm uppercase">📅 Schedule a Consultation</span>
            </div>
            {appointmentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Appointment Date</label>
              <Input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Appointment Time</label>
              <Input type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Representative Notes</label>
            <Textarea value={appointmentNotes} onChange={e => setAppointmentNotes(e.target.value)} rows={2} placeholder="Any notes for the assigned rep..." />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Rep Name: (to be assigned by manager)</label>
          </div>

          {/* Read-only inspection items */}
          <div className="border-t border-border pt-4 space-y-2">
            <h4 className="text-sm font-medium">Included with every consultation:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {inspectionServices.map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>

          {/* Why Choose Us */}
          <div className="border-t border-border pt-4 space-y-2">
            <h4 className="text-sm font-medium">Why Choose Next Gen?</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {whyChooseUs.map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>

          {/* Footnotes */}
          <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
            <p>• An adult (18+) must be present at time of appointment</p>
            <p>• 24-hour reschedule notice required</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2" size="lg">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Submit Lead for Review
      </Button>
    </div>
  );
}
