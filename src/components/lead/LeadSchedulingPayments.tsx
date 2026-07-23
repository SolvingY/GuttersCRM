import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, DollarSign, CheckCircle, Loader2, Plus } from "lucide-react";

interface LeadSchedulingPaymentsProps {
  lead: any;
  onLeadUpdate: () => void;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
  { value: "financing", label: "Financing" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
];

const timeWindows = [
  { value: "morning", label: "Morning (8am - 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 5pm)" },
  { value: "all_day", label: "All Day" },
];

export function LeadSchedulingPayments({ lead, onLeadUpdate }: LeadSchedulingPaymentsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Scheduling state
  const [installDate, setInstallDate] = useState(lead.install_date || "");
  const [installTimeWindow, setInstallTimeWindow] = useState(lead.install_time_window || "morning");
  const [installNotes, setInstallNotes] = useState(lead.install_notes || "");
  const [scheduling, setScheduling] = useState(false);

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Close job state
  const [closingJob, setClosingJob] = useState(false);

  const showScheduling = ["won", "scheduled", "approved", "completed"].includes(lead.status);

  // Fetch payments
  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["lead-payments", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_payments")
        .select("*")
        .eq("lead_id", lead.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch canvasser name
  const { data: canvasserName } = useQuery({
    queryKey: ["canvasser-name", lead.canvasser_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", lead.canvasser_id)
        .single();
      return data?.full_name || "Unknown";
    },
    enabled: !!lead.canvasser_id,
  });

  const quoteAmount = lead.quote_amount ?? 0;
  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const balanceDue = quoteAmount - totalPaid;
  const canCloseJob = totalPaid >= quoteAmount && quoteAmount > 0 && lead.status !== "completed";

  const handleScheduleInstall = async () => {
    if (!installDate) {
      toast({ title: "Date required", description: "Please select an installation date", variant: "destructive" });
      return;
    }
    setScheduling(true);
    try {
      const { error } = await supabase.from("quote_requests").update({
        install_date: installDate,
        install_time_window: installTimeWindow,
        install_notes: installNotes || null,
        install_scheduled_at: new Date().toISOString(),
        status: "scheduled",
      }).eq("id", lead.id);
      if (error) throw error;

      const timeLabel = timeWindows.find(t => t.value === installTimeWindow)?.label || installTimeWindow;
      const formattedDate = new Date(installDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      await supabase.from("lead_activity_log").insert({
        lead_id: lead.id,
        user_id: user?.id,
        activity_type: "schedule",
        content: `Installation scheduled for ${formattedDate} (${timeLabel})`,
      });

      // Send confirmation email
      const { error: emailError } = await supabase.functions.invoke("send-install-confirmation", {
        body: {
          clientName: lead.full_name,
          clientEmail: lead.email,
          installDate,
          timeWindow: installTimeWindow,
          address: `${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}`,
          installNotes: installNotes || null,
          referenceNumber: lead.reference_number,
        },
      });

      if (emailError) {
        toast({
          title: "Installation scheduled",
          description: "But the confirmation email failed to send — please notify the customer manually.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Installation scheduled", description: "Confirmation email sent to customer" });
      }
      onLeadUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  const handleAddPayment = async () => {
    setPaymentError("");
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Amount must be greater than $0");
      return;
    }
    if (!paymentDate) {
      setPaymentError("Payment date is required");
      return;
    }
    setAddingPayment(true);
    try {
      const { error } = await supabase.from("lead_payments").insert({
        lead_id: lead.id,
        amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: paymentRef || null,
        logged_by: user?.id,
      });
      if (error) throw error;

      const methodLabel = paymentMethods.find(m => m.value === paymentMethod)?.label || paymentMethod;
      await supabase.from("lead_activity_log").insert({
        lead_id: lead.id,
        user_id: user?.id,
        activity_type: "payment",
        content: `Payment received: $${amount.toFixed(2)} via ${methodLabel}`,
      });

      toast({ title: "Payment logged" });
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingPayment(false);
    }
  };

  const handleCloseJob = async () => {
    setClosingJob(true);
    try {
      // Fetch protection product from gutter estimates
      const { data: estimate } = await supabase
        .from("gutter_estimates")
        .select("protection_product")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const protectionProduct = estimate?.protection_product || null;
      const completedAt = new Date().toISOString();

      const { error } = await supabase.from("quote_requests").update({
        status: "completed",
        completed_at: completedAt,
      }).eq("id", lead.id);
      if (error) throw error;

      // Send warranty email
      const { error: warrantyError } = await supabase.functions.invoke("send-warranty-email", {
        body: {
          clientName: lead.full_name,
          clientEmail: lead.email,
          quoteAmount,
          referenceNumber: lead.reference_number,
          installDate: lead.install_date,
          completedAt,
          protectionProduct,
        },
      });

      await supabase.from("lead_activity_log").insert({
        lead_id: lead.id,
        user_id: user?.id,
        activity_type: "closeout",
        content: warrantyError
          ? "Job closed — warranty email FAILED to send (send manually)"
          : "Job closed — warranty documents sent to customer",
      });

      if (warrantyError) {
        toast({
          title: "Job closed",
          description: "But the warranty email failed to send — please send it to the customer manually.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Job closed!", description: "Warranty documents sent to customer." });
      }
      onLeadUpdate();
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setClosingJob(false);
    }
  };

  return (
    <>
      {/* Canvasser Badge */}
      {lead.canvasser_id && canvasserName && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-3">
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/40 hover:bg-amber-500/30">
            👋 Canvasser Lead — {canvasserName}
          </Badge>
        </div>
      )}

      {/* Completed Badge */}
      {lead.status === "completed" && (
        <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">✅ Job Complete — Warranty Sent</span>
          </div>
          {lead.completed_at && (
            <p className="text-xs text-green-600 mt-1">
              Completed: {new Date(lead.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Scheduling Section */}
      {showScheduling && lead.status !== "completed" && (
        <div className="border border-border rounded-lg p-5">
          <h2 className="font-heading text-lg uppercase mb-4 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" /> Schedule Installation
          </h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Install Date</Label>
              <Input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time Window</Label>
              <Select value={installTimeWindow} onValueChange={setInstallTimeWindow}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timeWindows.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Installation Notes</Label>
              <Textarea
                placeholder="Notes for the crew..."
                value={installNotes}
                onChange={e => setInstallNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <Button onClick={handleScheduleInstall} disabled={scheduling} className="w-full gap-2">
              {scheduling && <Loader2 className="w-4 h-4 animate-spin" />}
              📅 {lead.install_date ? "Update Schedule & Resend Confirmation" : "Save & Send Confirmation"}
            </Button>
          </div>
        </div>
      )}

      {/* Payments Section */}
      {showScheduling && (
        <div className="border border-border rounded-lg p-5">
          <h2 className="font-heading text-lg uppercase mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Payments
          </h2>

          {/* Balance Summary */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quote Total</span>
              <span className="font-medium">${quoteAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-medium text-green-600">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <span className="font-medium">Balance Due</span>
              <span className={`font-bold ${balanceDue <= 0 ? "text-green-600" : "text-destructive"}`}>
                ${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment List */}
          {payments.length > 0 && (
            <div className="space-y-2 mb-4">
              {payments.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-sm border-b border-border pb-2">
                  <div>
                    <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</span>
                    <span className="mx-2">—</span>
                    <span className="capitalize">{p.payment_method}</span>
                    {p.reference_number && <span className="text-muted-foreground ml-1">({p.reference_number})</span>}
                  </div>
                  <span className="font-medium">${Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add Payment Form */}
          {lead.status !== "completed" && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => { setPaymentAmount(e.target.value); setPaymentError(""); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reference #</Label>
                  <Input placeholder="Check # or ref" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
                </div>
              </div>
              {paymentError && <p className="text-xs text-destructive">{paymentError}</p>}
              <Button size="sm" onClick={handleAddPayment} disabled={addingPayment} className="w-full gap-1">
                {addingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Log Payment
              </Button>
            </div>
          )}

          {/* Close Job Button */}
          {canCloseJob && (
            <Button
              onClick={handleCloseJob}
              disabled={closingJob}
              className="w-full mt-4 gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {closingJob && <Loader2 className="w-4 h-4 animate-spin" />}
              ✅ Close Job & Send Warranty
            </Button>
          )}
        </div>
      )}
    </>
  );
}
