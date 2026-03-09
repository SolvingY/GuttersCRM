import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";

interface JobResult {
  id: string;
  label: string;
  address?: string;
  homeownerName?: string;
  homeownerPhone?: string;
  homeownerEmail?: string;
}

interface JobSearchInputProps {
  value: JobResult | null;
  onChange: (job: JobResult | null) => void;
  placeholder?: string;
}

export default function JobSearchInput({ value, onChange, placeholder = "Search by address or name…" }: JobSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JobResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const term = `%${query.trim()}%`;
      const { data } = await supabase
        .from("quote_requests")
        .select("id, full_name, street_address, city, phone, email")
        .or(`street_address.ilike.${term},full_name.ilike.${term}`)
        .limit(8);

      setResults(
        (data || []).map((r: any) => ({
          id: r.id,
          label: `${r.full_name || "Unknown"} — ${r.street_address || ""}${r.city ? `, ${r.city}` : ""}`,
          address: r.street_address ? `${r.street_address}${r.city ? `, ${r.city}` : ""}` : undefined,
          homeownerName: r.full_name || undefined,
          homeownerPhone: r.phone || undefined,
          homeownerEmail: r.email || undefined,
        }))
      );
      setLoading(false);
      setOpen(true);
    }, 300);
  }, [query]);

  if (value) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">Linked Job</Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="flex-1 truncate text-foreground">{value.label}</span>
          <button onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative space-y-1.5">
      <Label className="text-sm">Link to Job (optional)</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors truncate"
              onClick={() => { onChange(r); setQuery(""); setOpen(false); }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {open && loading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs text-muted-foreground">
          Searching…
        </div>
      )}
    </div>
  );
}
