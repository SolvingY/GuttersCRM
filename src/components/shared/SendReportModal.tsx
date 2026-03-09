import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReportRecipientsSelector from "./ReportRecipientsSelector";

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface SendReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistType: "hail_assessment" | "production_checklist";
  submissionId: string;
  propertyName: string;
  inspectorName: string;
  result?: string | null;
  senderName: string;
  onSent?: () => void;
}

const resultBadge: Record<string, { label: string; className: string }> = {
  no_damage: { label: "No Damage", className: "bg-green-600 text-white" },
  possible_damage: { label: "Possible Damage", className: "bg-amber-500 text-white" },
  confirmed_damage: { label: "Confirmed Damage", className: "bg-red-600 text-white" },
};

export default function SendReportModal({
  open, onOpenChange, checklistType, submissionId,
  propertyName, inspectorName, result, senderName, onSent,
}: SendReportModalProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [sending, setSending] = useState(false);

  const badge = result ? resultBadge[result] : null;

  const handleSend = async () => {
    if (selectedRecipients.length === 0) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-checklist-report", {
        body: {
          checklistType,
          submissionId,
          recipients: selectedRecipients.map((r) => ({ name: r.name, email: r.email })),
          senderName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Report sent successfully!");
      setSelectedRecipients([]);
      onOpenChange(false);
      onSent?.();
    } catch (err: any) {
      toast.error("Failed to send report: " + (err.message || "Unknown error"));
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Inspection Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Property:</span> {propertyName}</p>
            <p><span className="text-muted-foreground">Inspector:</span> {inspectorName}</p>
            {badge && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Result:</span>
                <Badge className={badge.className}>{badge.label}</Badge>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Send report to:</p>
            <ReportRecipientsSelector selected={selectedRecipients} onChange={setSelectedRecipients} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || selectedRecipients.length === 0}>
            {sending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : <><Send className="h-4 w-4 mr-2" /> Send Report</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
