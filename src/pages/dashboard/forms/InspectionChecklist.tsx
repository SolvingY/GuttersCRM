import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

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

const roofingOnlyServices = ["residential", "commercial", "roofing"];

export default function InspectionChecklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const lead = (location.state as any)?.lead;
  const existingForm = (location.state as any)?.existingForm;

  const isRoofingOnly = lead ? roofingOnlyServices.includes(lead.service_type) : false;

  const DRAFT_KEY = `ngr_draft_inspection_checklist_${id}`;

  const [conditions, setConditions] = useState<Record<string, boolean>>(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s).conditions || {}; } catch {} return {};
  });
  const [perimeterChecks, setPerimeterChecks] = useState<Record<string, boolean | null>>(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s).perimeterChecks || {}; } catch {} return {};
  });
  const [insideChecks, setInsideChecks] = useState<Record<string, boolean | null>>(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s).insideChecks || {}; } catch {} return {};
  });
  const [preExisting, setPreExisting] = useState(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s).preExisting || ""; } catch {} return "";
  });
  const [safetyConcerns, setSafetyConcerns] = useState(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s).safetyConcerns || ""; } catch {} return "";
  });
  const [notes, setNotes] = useState(() => {
    try { const s = localStorage.getItem(DRAFT_KEY); if (s) return JSON.parse(s).notes || ""; } catch {} return "";
  });

  // Override with existing form data if editing
  useEffect(() => {
    if (existingForm) {
      const d = existingForm.form_data as any;
      setConditions(d.conditions || {});
      setPerimeterChecks(d.perimeterChecks || {});
      setInsideChecks(d.insideChecks || {});
      setPreExisting(d.preExisting || "");
      setSafetyConcerns(d.safetyConcerns || "");
      setNotes(d.notes || "");
    }
  }, [existingForm]);

  // Autosave draft
  useEffect(() => {
    const draft = { conditions, perimeterChecks, insideChecks, preExisting, safetyConcerns, notes };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [conditions, perimeterChecks, insideChecks, preExisting, safetyConcerns, notes, DRAFT_KEY]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = {
        customerName: lead?.full_name || "",
        address: lead ? `${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}` : "",
        date: new Date().toISOString().split("T")[0],
        conditions,
        perimeterChecks,
        insideChecks,
        preExisting,
        safetyConcerns,
        notes,
      };

      if (existingForm) {
        await supabase.from("lead_forms").update({
          form_data: formData,
          status: "completed",
          updated_at: new Date().toISOString(),
        }).eq("id", existingForm.id);
      } else {
        await supabase.from("lead_forms").insert({
          lead_id: id,
          form_type: "inspection",
          form_data: formData,
          status: "completed",
          created_by: user?.id,
        });
      }

      await supabase.from("lead_activity_log").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "inspection_completed",
        content: "20-Point Inspection Checklist completed",
      });

      toast({ title: "Checklist saved successfully" });
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
      <h1 className="font-heading text-2xl uppercase">20-Point Inspection Checklist</h1>

      {/* Header info */}
      {lead && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{lead.full_name}</span></div>
          <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{lead.street_address}, {lead.city}</span></div>
          <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
        </div>
      )}

      {/* Gutter Conditions - hidden for roofing-only */}
      {!isRoofingOnly && (
        <div className="border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-heading text-lg uppercase">Gutter Condition</h2>
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
      )}

      {/* Perimeter & Inside Checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-heading text-sm uppercase">Perimeter Inspection</h2>
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

        {/* Inside Gutter - hidden for roofing-only */}
        {!isRoofingOnly && (
          <div className="border border-border rounded-lg p-5 space-y-3">
            <h2 className="font-heading text-sm uppercase">What's Inside Your Gutters</h2>
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
        )}
      </div>

      {/* Pre-existing & Safety */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <div>
          <label className="text-sm font-medium">Any pre-existing conditions or damage?</label>
          <Textarea value={preExisting} onChange={e => setPreExisting(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="text-sm font-medium">Any safety concerns?</label>
          <Textarea value={safetyConcerns} onChange={e => setSafetyConcerns(e.target.value)} rows={2} />
        </div>
      </div>

      {/* Notes */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Notes</h2>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Additional observations..." />
      </div>

      <p className="text-center font-bold text-foreground text-sm py-2">
        WE CAN ALL AGREE SOMETHING NEEDS TO BE DONE RIGHT?
      </p>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {existingForm ? "Update Checklist" : "Save Checklist"}
      </Button>
    </div>
  );
}
