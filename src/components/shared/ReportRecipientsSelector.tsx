import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface ReportRecipientsSelectorProps {
  selected: Recipient[];
  onChange: (recipients: Recipient[]) => void;
}

export default function ReportRecipientsSelector({ selected, onChange }: ReportRecipientsSelectorProps) {
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["report-recipients"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("report_recipients") as any)
        .select("id, name, email")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Recipient[];
    },
  });

  const toggleRecipient = (r: Recipient) => {
    const exists = selected.some((s) => s.id === r.id);
    if (exists) {
      onChange(selected.filter((s) => s.id !== r.id));
    } else {
      onChange([...selected, r]);
    }
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading recipients…</div>;
  }

  if (recipients.length === 0) {
    return <p className="text-sm text-muted-foreground">No recipients configured.</p>;
  }

  return (
    <div className="space-y-2">
      {recipients.map((r) => {
        const isSelected = selected.some((s) => s.id === r.id);
        return (
          <label key={r.id} className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
            <Checkbox checked={isSelected} onCheckedChange={() => toggleRecipient(r)} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.email}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
