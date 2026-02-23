import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

export function CreateLeadDialog({ open, onOpenChange }: CreateLeadDialogProps) {
  const { toast } = useToast();
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details about the lead..." />
            </div>

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
