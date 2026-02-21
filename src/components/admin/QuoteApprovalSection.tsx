import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, DollarSign, Send, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { buildEstimatePDF, loadLogoBase64 } from "@/lib/generateEstimatePDF";
import ngrLogo from "@/assets/ngr-logo-circle.jpg";

interface QuoteApprovalSectionProps {
  lead: any;
  isAdmin: boolean;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending_approval: { label: "Pending Approval", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  approved: { label: "Approved", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function QuoteApprovalSection({ lead, isAdmin }: QuoteApprovalSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quoteAmount, setQuoteAmount] = useState(lead.quote_amount?.toString() || "");
  const [rejectReason, setRejectReason] = useState("");
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validityDays, setValidityDays] = useState("7");
  const [approving, setApproving] = useState(false);

  const updateLead = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("quote_requests").update(updates).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmitForApproval = () => {
    const amount = parseFloat(quoteAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    updateLead.mutate({
      quote_amount: amount,
      quote_status: "pending_approval",
      quote_submitted_by: user?.id,
      quote_submitted_at: new Date().toISOString(),
      quoted_at: lead.quoted_at || new Date().toISOString(),
      status: lead.status === "new" || lead.status === "contacted" ? "quoted" : lead.status,
    });
    toast({ title: "Quote submitted for approval" });
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const vDays = parseInt(validityDays) || 7;
      const approvedAt = new Date().toISOString();

      // 1. Save approval + validity_days to DB
      const { error: updateError } = await supabase.from("quote_requests").update({
        quote_status: "approved",
        quote_approved: true,
        quote_approved_by: user?.id,
        quote_approved_at: approvedAt,
        validity_days: vDays,
      }).eq("id", lead.id);
      if (updateError) throw updateError;

      // 2. Query gutter_estimates for this lead
      const { data: estimates } = await supabase
        .from("gutter_estimates")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const estimate = estimates?.[0];
      let pdfBase64: string | undefined;
      let pdfFileName: string | undefined;

      if (estimate) {
        // 3. Load logo + build PDF
        const logoBase64 = await loadLogoBase64(ngrLogo);

        // Parse addons from measurement_data
        let measurementData = estimate.measurement_data as any;
        if (typeof measurementData === "string") {
          try { measurementData = JSON.parse(measurementData); } catch { measurementData = {}; }
        }

        const ADDON_UNITS: Record<string, string> = {
          "Gutter Tune-Up": "ft", "Drip Edge": "ft", "Flashing Into Gutters": "ft",
          "Ground Spout": "ea", "Wedges (Add-On)": "ft", "French Drain System": "ft",
        };

        const addons = (measurementData?.addons || [])
          .filter((a: any) => (parseFloat(a.qty) || 0) > 0)
          .map((a: any) => ({ name: a.name, qty: a.qty, unit: ADDON_UNITS[a.name] || "ea" }));

        const estGutterDsRetail = (Number(estimate.gutter_retail) || 0) + (Number(estimate.ds_elbow_retail) || 0);
        const estProtRetail = Number(estimate.protection_retail) || 0;
        const estTotalRetail = Number(estimate.total_retail) || 0;
        const estClampedQuoted = Number(estimate.quoted_price) || Number(lead.quote_amount) || 0;
        const estGutterDsQuoted = estTotalRetail > 0 ? (estGutterDsRetail / estTotalRetail) * estClampedQuoted : estClampedQuoted;
        const estProtQuoted = estTotalRetail > 0 ? (estProtRetail / estTotalRetail) * estClampedQuoted : 0;

        const pdf = await buildEstimatePDF({
          jobInfo: {
            customer: estimate.customer_name || lead.full_name || "",
            city: estimate.city || lead.city || "",
            state: estimate.state || lead.state || "",
            jobNumber: estimate.job_number || lead.reference_number || "",
          },
          protProduct: estimate.protection_product || "",
          protFootage: Number(estimate.protection_footage) || 0,
          gutterSize: estimate.gutter_size || '5"',
          gutterColor: estimate.gutter_color || "Standard",
          gutterFootage: Number(estimate.gutter_footage) || 0,
          dsTotalFootage: (Number(estimate.downspout_footage) || 0) + (Number(estimate.elbow_footage) || 0),
          addons,
          clampedQuoted: estClampedQuoted,
          totalRetail: estTotalRetail,
          gutterDsQuoted: estGutterDsQuoted,
          protQuoted: estProtQuoted,
          validityDays: vDays,
          approvedAt,
          logoBase64,
        });

        // 4. Convert to base64 (strip data URI prefix)
        const dataUri = pdf.output("datauristring");
        pdfBase64 = dataUri.split(",")[1];
        pdfFileName = `NGG_Estimate_${(lead.full_name || "Customer").replace(/\s+/g, "_")}.pdf`;

        // 5e. Upload PDF to storage
        const pdfBlob = new Blob([pdf.output("arraybuffer")], { type: "application/pdf" });
        const storagePath = `estimates/${lead.id}/${pdfFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("lead-files")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

        // 5f. Insert into lead_files
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from("lead-files").getPublicUrl(uploadData.path);
          await supabase.from("lead_files").insert({
            lead_id: lead.id,
            uploaded_by: user?.id || "",
            file_name: pdfFileName,
            file_url: urlData.publicUrl,
            file_type: "estimate",
            file_size: pdfBlob.size,
          });
        }
      }

      // 6. Call edge function to send email
      await supabase.functions.invoke("send-quote-approval-email", {
        body: {
          clientName: lead.full_name,
          clientEmail: lead.email,
          quoteAmount: lead.quote_amount,
          validityDays: vDays,
          approvedAt,
          referenceNumber: lead.reference_number,
          pdfBase64,
          pdfFileName,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["lead-detail", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-files", lead.id] });
      toast({ title: "Quote approved and estimate emailed to customer" });
    } catch (err: any) {
      console.error("Approval failed:", err);
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({ title: "Enter a rejection reason", variant: "destructive" });
      return;
    }
    updateLead.mutate({
      quote_status: "rejected",
      quote_rejected_reason: rejectReason.trim(),
    });
    toast({ title: "Quote rejected" });
  };

  const handleSendQuote = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-quote-email", {
        body: {
          clientName: lead.full_name,
          clientEmail: lead.email,
          serviceType: lead.service_type,
          referenceNumber: lead.reference_number,
          quoteAmount: lead.quote_amount,
        },
      });
      if (error) throw error;

      const updates: Record<string, any> = {
        quote_sent_at: new Date().toISOString(),
      };
      if (data?.html) {
        updates.quote_email_snapshot = data.html;
      }
      updateLead.mutate(updates);
      toast({ title: "Quote sent to client" });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const currentStatus = lead.quote_status ? statusBadge[lead.quote_status] : null;
  const expiryPreview = new Date(Date.now() + (parseInt(validityDays || "7") * 86400000))
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg uppercase">Quote</h2>
        {currentStatus && (
          <Badge variant="outline" className={currentStatus.className}>{currentStatus.label}</Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Quote Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder="0.00"
              className="pl-8"
              disabled={lead.quote_status === "approved"}
            />
          </div>
        </div>

        {/* Submit for approval (sales reps or before approval) */}
        {(!lead.quote_status || lead.quote_status === "rejected") && (
          <Button
            size="sm"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
            onClick={handleSubmitForApproval}
            disabled={updateLead.isPending}
          >
            {updateLead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Submit for Approval
          </Button>
        )}

        {/* Admin approve/reject buttons */}
        {isAdmin && lead.quote_status === "pending_approval" && (
          <div className="space-y-2 pt-2 border-t border-border">
            {/* Validity days input */}
            <div className="space-y-1">
              <Label className="text-xs">Quote Valid For (days)</Label>
              <Input
                type="number"
                min={1}
                placeholder="7"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Quote expires: {expiryPreview}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 text-green-600 border-green-600/30 hover:bg-green-600/10"
                onClick={handleApprove}
                disabled={approving || updateLead.isPending}
              >
                {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleReject}
                disabled={updateLead.isPending || !rejectReason.trim()}
              >
                <XCircle className="w-3 h-3" /> Reject
              </Button>
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              className="text-sm min-h-[60px]"
            />
          </div>
        )}

        {/* Rejection info */}
        {lead.quote_status === "rejected" && lead.quote_rejected_reason && (
          <p className="text-xs text-destructive">Rejected: {lead.quote_rejected_reason}</p>
        )}

        {/* Send quote to client after approval */}
        {lead.quote_status === "approved" && !lead.quote_sent_at && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={handleSendQuote}
            disabled={sending}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send Quote to Client
          </Button>
        )}

        {lead.quote_sent_at && (
          <div className="space-y-2">
            <p className="text-xs text-green-600">Quote sent on {new Date(lead.quote_sent_at).toLocaleDateString()}</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="w-3 h-3" /> View Sent Quote
            </Button>
          </div>
        )}
      </div>

      {/* Quote Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Sent Quote Preview</DialogTitle>
          </DialogHeader>
          {lead.quote_email_snapshot ? (
            <iframe
              srcDoc={lead.quote_email_snapshot}
              className="w-full flex-1 min-h-[400px] border border-border rounded-md"
              sandbox="allow-same-origin"
              title="Quote Email Preview"
            />
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Preview not available for quotes sent before this update.</p>
              <p className="text-xs mt-2">
                Quote was sent on {lead.quote_sent_at ? new Date(lead.quote_sent_at).toLocaleDateString() : "unknown date"} for ${lead.quote_amount ? Number(lead.quote_amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "N/A"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
