import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

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

export default function AppointmentSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const lead = (location.state as any)?.lead;
  const existingForm = (location.state as any)?.existingForm;

  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  useEffect(() => {
    if (existingForm) {
      const d = existingForm.form_data as any;
      setAppointmentDate(d.appointmentDate || "");
      setAppointmentTime(d.appointmentTime || "");
      setAppointmentNotes(d.notes || "");
    }
  }, [existingForm]);

  const handleSave = async () => {
    if (!appointmentDate) {
      toast({ title: "Date required", description: "Please select an appointment date.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const formData = {
        customerName: lead?.full_name || "",
        address: lead ? `${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}` : "",
        appointmentDate,
        appointmentTime,
        notes: appointmentNotes,
        services: inspectionServices,
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
          form_type: "appointment",
          form_data: formData,
          status: "completed",
          created_by: user?.id,
        });
      }

      await supabase.from("lead_activity_log").insert({
        lead_id: id,
        user_id: user?.id,
        activity_type: "appointment_scheduled",
        content: `Appointment scheduled for ${appointmentDate}`,
      });

      toast({ title: "Appointment saved successfully" });
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

      <div>
        <h1 className="font-heading text-2xl uppercase">📅 Schedule a Consultation</h1>
        {lead && <p className="text-sm text-muted-foreground">{lead.full_name} — {lead.street_address}, {lead.city}</p>}
      </div>

      <div className="border border-border rounded-lg p-5 space-y-4">
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
      </div>

      {/* Included with every consultation */}
      <div className="border border-border rounded-lg p-5 space-y-2">
        <h4 className="text-sm font-medium">Included with every consultation:</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          {inspectionServices.map(s => <li key={s}>{s}</li>)}
        </ul>
      </div>

      {/* Why Choose Us */}
      <div className="border border-border rounded-lg p-5 space-y-2">
        <h4 className="text-sm font-medium">Why Choose Next Gen?</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          {whyChooseUs.map(s => <li key={s}>{s}</li>)}
        </ul>
      </div>

      {/* Footnotes */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• An adult (18+) must be present at time of appointment</p>
        <p>• 24-hour reschedule notice required</p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {existingForm ? "Update Appointment" : "Save Appointment"}
      </Button>
    </div>
  );
}
