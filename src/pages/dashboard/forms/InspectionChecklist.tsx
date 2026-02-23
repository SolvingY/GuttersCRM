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

export default function InspectionChecklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const lead = (location.state as any)?.lead;
  const existingForm = (location.state as any)?.existingForm;

  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [perimeterChecks, setPerimeterChecks] = useState<Record<string, boolean | null>>({});
  const [insideChecks, setInsideChecks] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingForm) {
      const d = existingForm.form_data as any;
      setConditions(d.conditions || {});
      setPerimeterChecks(d.perimeterChecks || {});
      setInsideChecks(d.insideChecks || {});
      setNotes(d.notes || "");
    }
  }, [existingForm]);

  const toggleThreeState = (
    current: Record<string, boolean | null>,
    setter: (v: Record<string, boolean | null>) => void,
    key: string
  ) => {
    const val = current[key];
    if (val === undefined || val === null) setter({ ...current, [key]: true });
    else if (val === true) setter({ ...current, [key]: false });
    else setter({ ...current, [key]: null });
  };

  const getTriStateIcon = (val: boolean | null | undefined) => {
    if (val === true) return "✅";
    if (val === false) return "❌";
    return "⬜";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = { conditions, perimeterChecks, insideChecks, notes };

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
      {lead && <p className="text-sm text-muted-foreground">{lead.full_name} — {lead.street_address}, {lead.city}</p>}

      {/* Gutter Conditions */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Gutter Conditions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gutterConditions.map(c => (
            <div key={c.key} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Checkbox
                checked={!!conditions[c.key]}
                onCheckedChange={(v) => setConditions({ ...conditions, [c.key]: !!v })}
              />
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perimeter & Inside Checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-heading text-sm uppercase">Perimeter Inspection</h2>
          <div className="space-y-2">
            {perimeterItems.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => toggleThreeState(perimeterChecks, setPerimeterChecks, item)}
                className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <span className="text-lg">{getTriStateIcon(perimeterChecks[item])}</span>
                <span className="text-sm">{item}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-heading text-sm uppercase">Inside Gutter</h2>
          <div className="space-y-2">
            {insideGutterItems.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => toggleThreeState(insideChecks, setInsideChecks, item)}
                className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <span className="text-lg">{getTriStateIcon(insideChecks[item])}</span>
                <span className="text-sm">{item}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading text-lg uppercase">Notes</h2>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Additional observations..." />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {existingForm ? "Update Checklist" : "Save Checklist"}
      </Button>
    </div>
  );
}
