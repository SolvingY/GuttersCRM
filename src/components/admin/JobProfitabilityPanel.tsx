import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Lock, Upload, FileText, ImageIcon, X, Loader2, Send, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface JobProfitabilityPanelProps {
  estimateId: string;
  leadId: string | null;
  quotedPrice: number;
  commission: number;
  customerName?: string;
  jobNumber?: string;
  city?: string;
  state?: string;
}

export default function JobProfitabilityPanel({
  estimateId, leadId, quotedPrice, commission,
  customerName, jobNumber, city, state,
}: JobProfitabilityPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [materialCost, setMaterialCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  const [otherCostsDescription, setOtherCostsDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceUrls, setInvoiceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["job-profitability", estimateId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("job_profitability") as any)
        .select("*")
        .eq("estimate_id", estimateId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setMaterialCost(Number(existing.material_cost) || 0);
      setLaborCost(Number(existing.labor_cost) || 0);
      setOtherCosts(Number(existing.other_costs) || 0);
      setOtherCostsDescription(existing.other_costs_description || "");
      setNotes(existing.notes || "");
      setInvoiceUrls(existing.invoice_urls || []);
    }
  }, [existing]);

  const grossProfit = useMemo(() =>
    quotedPrice - commission - materialCost - laborCost - otherCosts, [quotedPrice, commission, materialCost, laborCost, otherCosts]);

  const marginPct = useMemo(() =>
    quotedPrice > 0 ? Math.round(((grossProfit) / quotedPrice) * 10000) / 100 : 0, [grossProfit, quotedPrice]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const path = `${estimateId}/${file.name}`;
        const { error } = await supabase.storage.from("job-invoices").upload(path, file, { upsert: true });
        if (error) throw error;
        newUrls.push(path);
      }
      setInvoiceUrls(prev => [...prev, ...newUrls]);
      toast({ title: `${newUrls.length} file(s) uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from("job-invoices").remove([path]);
    setInvoiceUrls(prev => prev.filter(u => u !== path));
  };

  const buildEmailPayload = async () => {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
    return {
      estimate_id: estimateId,
      customer_name: customerName || "N/A",
      job_number: jobNumber || "N/A",
      city: city || "",
      state: state || "",
      quoted_price: quotedPrice,
      commission_paid: commission,
      material_cost: materialCost,
      labor_cost: laborCost,
      other_costs: otherCosts,
      other_costs_description: otherCosts > 0 ? otherCostsDescription : null,
      gross_profit: grossProfit,
      profit_margin_pct: marginPct,
      notes: notes || null,
      entered_by_name: profile?.full_name || "Unknown",
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        estimate_id: estimateId,
        lead_id: leadId,
        quoted_price: quotedPrice,
        commission_paid: commission,
        material_cost: materialCost,
        labor_cost: laborCost,
        other_costs: otherCosts,
        other_costs_description: otherCosts > 0 ? otherCostsDescription : null,
        invoice_urls: invoiceUrls,
        notes: notes || null,
        entered_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from("job_profitability") as any)
        .upsert(payload, { onConflict: "estimate_id" });
      if (error) throw error;

      toast({ title: "Profitability saved" });
      queryClient.invalidateQueries({ queryKey: ["job-profitability", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["job-profitability-summary", estimateId] });

      // Send to admins automatically
      const emailPayload = await buildEmailPayload();
      supabase.functions.invoke("send-profitability-summary", { body: emailPayload });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (recipientEmails.includes(email)) {
      toast({ title: "Email already added", variant: "destructive" });
      return;
    }
    setRecipientEmails(prev => [...prev, email]);
    setEmailInput("");
  };

  const handleSendReport = async () => {
    if (recipientEmails.length === 0) {
      toast({ title: "Add at least one recipient", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const emailPayload = await buildEmailPayload();
      const { error } = await supabase.functions.invoke("send-profitability-summary", {
        body: { ...emailPayload, recipient_emails: recipientEmails },
      });
      if (error) throw error;
      toast({ title: `Report sent to ${recipientEmails.length} recipient(s)` });
      setEmailDialogOpen(false);
      setRecipientEmails([]);
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const isImage = (path: string) => /\.(jpg|jpeg|png|heic|webp)$/i.test(path);
  const fileName = (path: string) => path.split("/").pop() || path;

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> This section is only visible to admins.
      </div>

      {/* Read-only fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground text-xs">Quoted Price</Label>
          <div className="text-sm font-medium mt-1">${fmt(quotedPrice)}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Commission Paid</Label>
          <div className="text-sm font-medium mt-1">${fmt(commission)}</div>
        </div>
      </div>

      {/* Cost inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="material-cost">Material Cost</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <Input id="material-cost" type="number" min={0} step="0.01" value={materialCost || ""} onChange={e => setMaterialCost(Number(e.target.value) || 0)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="labor-cost">Labor Cost</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <Input id="labor-cost" type="number" min={0} step="0.01" value={laborCost || ""} onChange={e => setLaborCost(Number(e.target.value) || 0)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="other-costs">Other Costs</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <Input id="other-costs" type="number" min={0} step="0.01" value={otherCosts || ""} onChange={e => setOtherCosts(Number(e.target.value) || 0)} className="pl-7" />
          </div>
        </div>
      </div>

      {otherCosts > 0 && (
        <div>
          <Label htmlFor="other-desc">Other Costs Description</Label>
          <Input id="other-desc" value={otherCostsDescription} onChange={e => setOtherCostsDescription(e.target.value)} className="mt-1" placeholder="e.g. Disposal, permits…" />
        </div>
      )}

      <div>
        <Label htmlFor="prof-notes">Notes</Label>
        <Textarea id="prof-notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={2} placeholder="Internal notes…" />
      </div>

      {/* Live calculation */}
      <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-1">
        <div className="flex justify-between"><span>QUOTED PRICE</span><span>${fmt(quotedPrice)}</span></div>
        <div className="flex justify-between"><span>COMMISSION</span><span className="text-destructive">-${fmt(commission)}</span></div>
        <div className="flex justify-between"><span>MATERIAL COST</span><span className="text-destructive">-${fmt(materialCost)}</span></div>
        <div className="flex justify-between"><span>LABOR COST</span><span className="text-destructive">-${fmt(laborCost)}</span></div>
        <div className="flex justify-between"><span>OTHER COSTS</span><span className="text-destructive">-${fmt(otherCosts)}</span></div>
        <hr className="border-border my-2" />
        <div className="flex justify-between font-bold">
          <span>GROSS PROFIT</span>
          <span className={cn(grossProfit >= 0 ? "text-green-600" : "text-destructive")}>${fmt(grossProfit)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>MARGIN</span>
          <span className={cn(grossProfit >= 0 ? "text-green-600" : "text-destructive")}>{marginPct}%</span>
        </div>
      </div>

      {/* Invoice upload */}
      <div>
        <Label>Contractor Invoice(s)</Label>
        <div className="mt-2 space-y-2">
          {invoiceUrls.map(url => (
            <div key={url} className="flex items-center gap-3 text-sm border border-border rounded p-2">
              {isImage(url) ? <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" /> : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
              <span className="truncate flex-1">{fileName(url)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(url)}><X className="w-3 h-3" /></Button>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload invoice"}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</> : "Save Profitability"}
      </Button>

      <Button variant="outline" onClick={() => setEmailDialogOpen(true)} className="w-full gap-2">
        <Send className="w-4 h-4" /> Send Profitability Report
      </Button>

      {/* Email Report Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Profitability Report</DialogTitle>
            <DialogDescription>Add recipient email addresses to send the profitability summary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddEmail(); } }}
              />
              <Button variant="outline" size="icon" onClick={handleAddEmail}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {recipientEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipientEmails.map(email => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button onClick={() => setRecipientEmails(prev => prev.filter(e => e !== email))} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendReport} disabled={sending || recipientEmails.length === 0}>
              {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</> : `Send to ${recipientEmails.length} recipient(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
