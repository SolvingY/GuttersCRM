import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronDown, ChevronRight, Home, CalendarDays, ClipboardCheck, Droplets } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ResidentialQuestions } from "@/components/quote/ResidentialQuestions";

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const leadSourceOptions = [
  { value: "internet", label: "Internet/Website" },
  { value: "phone_general", label: "Phone - General" },
  { value: "phone_canvasser", label: "Phone - From Canvasser" },
  { value: "canvasser", label: "Canvasser" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-In" },
  { value: "other", label: "Other" },
  { value: "self_gen", label: "Self-Generated" },
];

const serviceOptions = [
  { value: "commercial", label: "Commercial Roofing" },
  { value: "residential", label: "Residential Roofing" },
  { value: "gutters", label: "Gutters & Protection" },
  { value: "repair", label: "Repair Work" },
];

const timelineOptions = [
  "Urgent (within 1 week)",
  "Soon (1-4 weeks)",
  "Within a few months",
  "Just getting quotes",
];

const priorityOptions = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const roofingConsultationItems = [
  "Full Roof Inspection (exterior and visible interior)",
  "Storm & Hail Damage Assessment",
  "Soffit, Fascia & Gutter Evaluation",
  "Insurance Claim Consultation (if applicable)",
  "Custom Quote & Estimate",
];

const roofingWhyChoose = [
  "Licensed & insured roofing specialists",
  "Free inspections with no obligation",
  "Insurance claim experts on staff",
  "Financing options available",
];

// Gutter inspection constants (same as canvasser page)
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

const gutterInspectionServices = [
  "Full Gutter Inspection",
  "Downspout & Drainage Evaluation",
  "Soffit & Fascia Health Check",
  "Custom Quote/Estimate",
];

const gutterWhyChoose = [
  "Locally owned and operated",
  "Licensed and insured",
  "Free estimates and inspections",
  "Lifetime No-Leak Warranty",
  "Highest quality materials",
];

export function CreateLeadDialog({ open, onOpenChange }: CreateLeadDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    lead_source: "internet",
    service_type: "residential",
    full_name: "",
    email: "",
    phone: "",
    street_address: "",
    city: "",
    state: "Oklahoma",
    zip_code: "",
    timeline: "",
    description: "",
    assigned_to: "",
    priority: "normal",
    admin_notes: "",
    canvasser_id: "",
  });

  // Roofing qualification
  const [roofingData, setRoofingData] = useState<Record<string, any>>({});
  const [roofingQualOpen, setRoofingQualOpen] = useState(false);

  // Roofing appointment
  const [roofingApptOpen, setRoofingApptOpen] = useState(false);
  const [roofingApptDate, setRoofingApptDate] = useState("");
  const [roofingApptTime, setRoofingApptTime] = useState("");
  const [roofingApptRepName, setRoofingApptRepName] = useState("");
  const [roofingApptRepPhone, setRoofingApptRepPhone] = useState("");
  const [roofingApptNotes, setRoofingApptNotes] = useState("");

  // Gutter inspection checklist
  const [gutterChecklistOpen, setGutterChecklistOpen] = useState(false);
  const [gutterConditionsState, setGutterConditionsState] = useState<Record<string, boolean>>({});
  const [gutterPerimeterChecks, setGutterPerimeterChecks] = useState<Record<string, boolean | null>>({});
  const [gutterInsideChecks, setGutterInsideChecks] = useState<Record<string, boolean | null>>({});
  const [gutterPreExisting, setGutterPreExisting] = useState("");
  const [gutterSafetyConcerns, setGutterSafetyConcerns] = useState("");

  // Gutter appointment
  const [gutterApptOpen, setGutterApptOpen] = useState(false);
  const [gutterApptDate, setGutterApptDate] = useState("");
  const [gutterApptTime, setGutterApptTime] = useState("");
  const [gutterApptNotes, setGutterApptNotes] = useState("");

  const isResidential = form.service_type === "residential";
  const isGutters = form.service_type === "gutters";
  const hasDetailedForms = isResidential || isGutters;

  const isGutterChecklistTouched = () => {
    return Object.values(gutterConditionsState).some(v => v) ||
      Object.values(gutterPerimeterChecks).some(v => v !== undefined && v !== null) ||
      Object.values(gutterInsideChecks).some(v => v !== undefined && v !== null) ||
      gutterPreExisting.trim() !== "" || gutterSafetyConcerns.trim() !== "";
  };

  const isGutterApptTouched = () => gutterApptDate !== "" || gutterApptTime !== "";

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-for-create-lead"],
    queryFn: async () => {
      const { data: reps } = await supabase.from("user_metrics").select("user_id, display_name");
      const { data: userRoles } = await supabase.from("user_roles").select("user_id").eq("role", "user");
      const userRoleIds = new Set((userRoles || []).map(r => r.user_id));
      return (reps || []).filter(r => userRoleIds.has(r.user_id));
    },
  });

  const { data: canvassers = [] } = useQuery({
    queryKey: ["canvassers-for-create-lead"],
    queryFn: async () => {
      const { data: canvasserRoles } = await supabase.from("user_roles").select("user_id").eq("role", "canvasser");
      if (!canvasserRoles?.length) return [];
      const canvasserIds = canvasserRoles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", canvasserIds);
      return (profiles || []).map(p => ({ user_id: p.id, display_name: p.full_name || "Unknown" }));
    },
  });

  const resetForm = () => {
    setForm({
      lead_source: "internet",
      service_type: "residential",
      full_name: "",
      email: "",
      phone: "",
      street_address: "",
      city: "",
      state: "Oklahoma",
      zip_code: "",
      timeline: "",
      description: "",
      assigned_to: "",
      priority: "normal",
      admin_notes: "",
      canvasser_id: "",
    });
    // Reset roofing
    setRoofingData({});
    setRoofingQualOpen(false);
    setRoofingApptOpen(false);
    setRoofingApptDate("");
    setRoofingApptTime("");
    setRoofingApptRepName("");
    setRoofingApptRepPhone("");
    setRoofingApptNotes("");
    // Reset gutter
    setGutterChecklistOpen(false);
    setGutterConditionsState({});
    setGutterPerimeterChecks({});
    setGutterInsideChecks({});
    setGutterPreExisting("");
    setGutterSafetyConcerns("");
    setGutterApptOpen(false);
    setGutterApptDate("");
    setGutterApptTime("");
    setGutterApptNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.street_address || !form.city) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_manual_lead", {
        p_lead_source: form.lead_source,
        p_service_type: form.service_type,
        p_full_name: form.full_name,
        p_email: form.email,
        p_phone: form.phone,
        p_street_address: form.street_address,
        p_city: form.city,
        p_state: form.state,
        p_zip_code: form.zip_code,
        p_timeline: form.timeline || null,
        p_description: form.description || null,
        p_assigned_to: form.assigned_to || null,
        p_priority: form.priority,
        p_admin_notes: form.admin_notes || null,
      });

      if (error) throw error;

      // If canvasser source with canvasser_id, update the lead
      if (form.lead_source === "canvasser" && form.canvasser_id) {
        const { error: updateError } = await supabase
          .from("quote_requests")
          .update({ canvasser_id: form.canvasser_id, lead_type: "canvasser" })
          .eq("reference_number", data);
        if (updateError) console.error("Failed to set canvasser_id:", updateError);
      }

      // If self_gen source, ensure lead_type is set
      if (form.lead_source === "self_gen") {
        const { error: updateError } = await supabase
          .from("quote_requests")
          .update({ lead_type: "self_gen" })
          .eq("reference_number", data);
        if (updateError) console.error("Failed to set self_gen lead_type:", updateError);
      }

      // Handle detailed forms — need the lead UUID first
      const roofingQualTouched = Object.keys(roofingData).length > 0;
      const roofingApptTouched = roofingApptDate !== "" || roofingApptTime !== "";
      const gutterCheckTouched = isGutterChecklistTouched();
      const gutterApptTouched = isGutterApptTouched();

      const needsLeadLookup =
        (isResidential && (roofingQualTouched || roofingApptTouched)) ||
        (isGutters && (gutterCheckTouched || gutterApptTouched));

      if (needsLeadLookup) {
        const { data: leadRecord } = await supabase
          .from("quote_requests")
          .select("id")
          .eq("reference_number", data)
          .single();

        if (leadRecord) {
          const leadId = leadRecord.id;
          const formDataUpdate: Record<string, any> = {};

          // Roofing forms
          if (isResidential) {
            if (roofingQualTouched) formDataUpdate.roofing = roofingData;
            if (roofingApptTouched) {
              formDataUpdate.roofingAppointment = {
                date: roofingApptDate,
                time: roofingApptTime,
                repName: roofingApptRepName,
                repPhone: roofingApptRepPhone,
                notes: roofingApptNotes,
              };
            }
          }

          // Gutter forms
          if (isGutters) {
            if (gutterCheckTouched) {
              formDataUpdate.inspection = {
                conditions: gutterConditionsState,
                perimeterChecks: gutterPerimeterChecks,
                insideChecks: gutterInsideChecks,
                preExisting: gutterPreExisting,
                safetyConcerns: gutterSafetyConcerns,
              };
            }
            if (gutterApptTouched) {
              formDataUpdate.appointment = {
                date: gutterApptDate,
                time: gutterApptTime,
                notes: gutterApptNotes,
              };
            }
          }

          if (Object.keys(formDataUpdate).length > 0) {
            await supabase
              .from("quote_requests")
              .update({ form_data: formDataUpdate })
              .eq("id", leadId);
          }

          // Insert lead_forms records — roofing
          if (isResidential && roofingQualTouched) {
            await supabase.from("lead_forms").insert({
              lead_id: leadId,
              form_type: "roofing_inspection",
              status: "completed",
              form_data: roofingData,
              created_by: user?.id,
            });
          }
          if (isResidential && roofingApptTouched) {
            await supabase.from("lead_forms").insert({
              lead_id: leadId,
              form_type: "roofing_appointment",
              status: "completed",
              form_data: {
                date: roofingApptDate,
                time: roofingApptTime,
                repName: roofingApptRepName,
                repPhone: roofingApptRepPhone,
                notes: roofingApptNotes,
                customerName: form.full_name,
                address: `${form.street_address}, ${form.city}, ${form.state} ${form.zip_code}`,
              },
              created_by: user?.id,
            });
          }

          // Insert lead_forms records — gutter
          if (isGutters && gutterCheckTouched) {
            await supabase.from("lead_forms").insert({
              lead_id: leadId,
              form_type: "inspection",
              status: "completed",
              form_data: {
                customerName: form.full_name,
                address: `${form.street_address}, ${form.city}, ${form.state} ${form.zip_code}`,
                date: new Date().toISOString().split("T")[0],
                conditions: gutterConditionsState,
                perimeterChecks: gutterPerimeterChecks,
                insideChecks: gutterInsideChecks,
                preExisting: gutterPreExisting,
                safetyConcerns: gutterSafetyConcerns,
              },
              created_by: user?.id,
            });
          }
          if (isGutters && gutterApptTouched) {
            await supabase.from("lead_forms").insert({
              lead_id: leadId,
              form_type: "appointment",
              status: "completed",
              form_data: {
                customerName: form.full_name,
                address: `${form.street_address}, ${form.city}, ${form.state} ${form.zip_code}`,
                appointmentDate: gutterApptDate,
                appointmentTime: gutterApptTime,
                notes: gutterApptNotes,
                services: gutterInspectionServices,
              },
              created_by: user?.id,
            });
          }
        }
      }

      toast({ title: "Lead created", description: `Reference: ${data}` });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["my-leads"] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 pr-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Source *</Label>
                <Select value={form.lead_source} onValueChange={v => setForm({ ...form, lead_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadSourceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service Type *</Label>
                <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Smith" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street Address *</Label>
              <Input value={form.street_address} onChange={e => setForm({ ...form, street_address: e.target.value })} placeholder="123 Main St" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Oklahoma City" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Zip</Label>
                <Input value={form.zip_code} onChange={e => setForm({ ...form, zip_code: e.target.value })} placeholder="73101" />
              </div>
            </div>

            {/* Roofing Qualification Form — only when residential */}
            {isResidential && (
              <>
                <Collapsible open={roofingQualOpen} onOpenChange={setRoofingQualOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-primary" />
                        <span className="font-heading text-sm uppercase">🏠 Fill Out Roofing Qualification Details</span>
                      </div>
                      {roofingQualOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 space-y-4">
                    <ResidentialQuestions data={roofingData} onChange={setRoofingData} />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={roofingApptOpen} onOpenChange={setRoofingApptOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        <span className="font-heading text-sm uppercase">📅 Schedule a Roofing Consultation</span>
                      </div>
                      {roofingApptOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Appointment Date</label>
                        <Input type="date" value={roofingApptDate} onChange={e => setRoofingApptDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Appointment Time</label>
                        <Input type="time" value={roofingApptTime} onChange={e => setRoofingApptTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rep/Consultant Name</label>
                      <Input value={roofingApptRepName} onChange={e => setRoofingApptRepName(e.target.value)} placeholder="Rep name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Direct Phone</label>
                      <Input value={roofingApptRepPhone} onChange={e => setRoofingApptRepPhone(e.target.value)} placeholder="(555) 000-0000" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes for homeowner</label>
                      <Textarea value={roofingApptNotes} onChange={e => setRoofingApptNotes(e.target.value)} rows={2} placeholder="Any notes for the homeowner..." />
                    </div>

                    <div className="border-t border-border pt-4 space-y-2">
                      <h4 className="text-sm font-medium">What We'll Do During Your Consultation:</h4>
                      <ul className="list-none text-sm text-muted-foreground space-y-1">
                        {roofingConsultationItems.map(s => <li key={s}>✅ {s}</li>)}
                      </ul>
                    </div>

                    <div className="border-t border-border pt-4 space-y-2">
                      <h4 className="text-sm font-medium">Why Choose Next Generation Roofing:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {roofingWhyChoose.map(s => <li key={s}>{s}</li>)}
                      </ul>
                    </div>

                    <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
                      <p>• Please ensure an adult (18+) is present for the full consultation</p>
                      <p>• If you need to reschedule, please contact your representative at least 24 hours in advance</p>
                      <p>• Have any previous inspection reports or insurance documents ready if available</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Gutter Inspection Checklist — only when gutters */}
            {isGutters && (
              <>
                <Collapsible open={gutterChecklistOpen} onOpenChange={setGutterChecklistOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-primary" />
                        <span className="font-heading text-sm uppercase">📋 Fill Out Gutter Inspection Checklist</span>
                      </div>
                      {gutterChecklistOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 space-y-6">
                    {/* Header */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{form.full_name || "—"}</span></div>
                      <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{form.street_address || "—"}</span></div>
                      <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
                    </div>

                    {/* Gutter Conditions */}
                    <div>
                      <h3 className="font-heading text-sm uppercase mb-3">Gutter Condition</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {gutterConditions.map(c => (
                          <label key={c.key} className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30">
                            <Checkbox
                              checked={!!gutterConditionsState[c.key]}
                              onCheckedChange={(v) => setGutterConditionsState(prev => ({ ...prev, [c.key]: !!v }))}
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
                                <Button type="button" size="sm" variant={gutterPerimeterChecks[item] === true ? "default" : "outline"} className="h-7 px-2 text-xs"
                                  onClick={() => setGutterPerimeterChecks(p => ({ ...p, [item]: true }))}>Yes</Button>
                                <Button type="button" size="sm" variant={gutterPerimeterChecks[item] === false ? "destructive" : "outline"} className="h-7 px-2 text-xs"
                                  onClick={() => setGutterPerimeterChecks(p => ({ ...p, [item]: false }))}>No</Button>
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
                                <Button type="button" size="sm" variant={gutterInsideChecks[item] === true ? "default" : "outline"} className="h-7 px-2 text-xs"
                                  onClick={() => setGutterInsideChecks(p => ({ ...p, [item]: true }))}>Yes</Button>
                                <Button type="button" size="sm" variant={gutterInsideChecks[item] === false ? "destructive" : "outline"} className="h-7 px-2 text-xs"
                                  onClick={() => setGutterInsideChecks(p => ({ ...p, [item]: false }))}>No</Button>
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
                        <Textarea value={gutterPreExisting} onChange={e => setGutterPreExisting(e.target.value)} rows={2} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Any safety concerns?</label>
                        <Textarea value={gutterSafetyConcerns} onChange={e => setGutterSafetyConcerns(e.target.value)} rows={2} />
                      </div>
                    </div>

                    <p className="text-center font-bold text-foreground text-sm py-2">
                      WE CAN ALL AGREE SOMETHING NEEDS TO BE DONE RIGHT?
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={gutterApptOpen} onOpenChange={setGutterApptOpen}>
                  <CollapsibleTrigger asChild>
                    <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        <span className="font-heading text-sm uppercase">📅 Schedule a Gutter Consultation</span>
                      </div>
                      {gutterApptOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 border border-border rounded-lg p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Appointment Date</label>
                        <Input type="date" value={gutterApptDate} onChange={e => setGutterApptDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Appointment Time</label>
                        <Input type="time" value={gutterApptTime} onChange={e => setGutterApptTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Representative Notes</label>
                      <Textarea value={gutterApptNotes} onChange={e => setGutterApptNotes(e.target.value)} rows={2} placeholder="Any notes for the assigned rep..." />
                    </div>

                    <div className="border-t border-border pt-4 space-y-2">
                      <h4 className="text-sm font-medium">Included with every consultation:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {gutterInspectionServices.map(s => <li key={s}>{s}</li>)}
                      </ul>
                    </div>

                    <div className="border-t border-border pt-4 space-y-2">
                      <h4 className="text-sm font-medium">Why Choose Next Gen?</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {gutterWhyChoose.map(s => <li key={s}>{s}</li>)}
                      </ul>
                    </div>

                    <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
                      <p>• An adult (18+) must be present at time of appointment</p>
                      <p>• 24-hour reschedule notice required</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Timeline & Description — hidden when residential or gutters (they have their own forms) */}
            {!hasDetailedForms && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <Select value={form.timeline} onValueChange={v => setForm({ ...form, timeline: v })}>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent>
                      {timelineOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {hasDetailedForms && (
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Canvasser Dropdown */}
            {form.lead_source === "canvasser" && (
              <div className="space-y-2">
                <Label>Canvasser *</Label>
                {canvassers.length === 0 ? (
                  <Select disabled>
                    <SelectTrigger><SelectValue placeholder="No canvassers found — add canvassers in user management" /></SelectTrigger>
                    <SelectContent />
                  </Select>
                ) : (
                  <Select value={form.canvasser_id} onValueChange={v => setForm({ ...form, canvasser_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select canvasser..." /></SelectTrigger>
                    <SelectContent>
                      {canvassers.map(c => (
                        <SelectItem key={c.user_id} value={c.user_id}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Assign To (optional)</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Leave unassigned" /></SelectTrigger>
                <SelectContent>
                  {salesReps.map(rep => (
                    <SelectItem key={rep.user_id} value={rep.user_id}>{rep.display_name || "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!hasDetailedForms && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details about the lead..." />
              </div>
            )}

            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea value={form.admin_notes} onChange={e => setForm({ ...form, admin_notes: e.target.value })} placeholder="Internal notes..." />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
