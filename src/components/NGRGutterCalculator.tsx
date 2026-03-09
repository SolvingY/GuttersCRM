import { useState, useMemo, useEffect, CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ngrLogo from "@/assets/ngr-logo.png";
import { buildEstimatePDF, loadLogoBase64 } from "@/lib/generateEstimatePDF";

// ── Pricing Constants (DO NOT MODIFY) ──────────────────────────────────────
const PRICES = {
  protection: {
    "Hydro Flow Mesh + Frame": { retail: 19, floor: 12 },
    "Pro Flo Mesh":            { retail: 15, floor: 9  },
    "Gutter RX Collector":     { retail: 11, floor: 7  },
    "Cheap Mesh":              { retail: 9,  floor: 7  },
  } as Record<string, { retail: number; floor: number }>,
  gutters: {
    '5"': { retail: 13, floor: 9  },
    '6"': { retail: 14, floor: 10 },
  } as Record<string, { retail: number; floor: number }>,
  downspouts: {
    '2x3 (= 5")': { retail: 13, floor: 9  },
    '3x4 (= 6")': { retail: 14, floor: 10 },
  } as Record<string, { retail: number; floor: number }>,
  elbowTypes: ["A Elbow", "B Elbow", "Offset Elbow"],
  addons: {
    "Gutter Tune-Up":        { retail: 8,    floor: 6,    unit: "ft" },
    "Drip Edge":             { retail: 4.50, floor: 3.50, unit: "ft" },
    "Flashing Into Gutters": { retail: 51,   floor: 36,   unit: "ft" },
    "Ground Spout":          { retail: 51,   floor: 26,   unit: "ea" },
    "Wedges (Add-On)":       { retail: 4,    floor: 3.50, unit: "ft" },
    "French Drain System":   { retail: 41,   floor: 33,   unit: "ft" },
  } as Record<string, { retail: number; floor: number; unit: string }>,
};

const SIDES    = ["Left Side", "Right Side", "Front", "Rear", "Garage", "Other"];
const STORIES  = ["1st", "2nd", "3rd"];
const CORNER_ADDER     = 3;
const STORY_UPCHARGE   = 1;
const PREMIUM_UPCHARGE = 2;

// ── Types ──────────────────────────────────────────────────────────────────
interface MeasurementRow {
  side: string;
  "1st": string;
  "2nd": string;
  "3rd": string;
  insideCorners: string;
  outsideCorners: string;
}

interface DownspoutEntry { type: string; qty: string; }
interface ElbowEntry { type: string; qty: string; }
interface AddonEntry { name: string; qty: string; }

interface LeadProp {
  id?: string;
  full_name?: string;
  city?: string;
  state?: string;
  reference_number?: string;
  [key: string]: unknown;
}

interface NGRGutterCalculatorProps {
  lead?: LeadProp | null;
  onSave?: (estimate: Record<string, unknown>) => void;
  existingEstimate?: any;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const emptyRows = (): MeasurementRow[] => SIDES.map(s => ({ side: s, "1st": "", "2nd": "", "3rd": "", insideCorners: "", outsideCorners: "" }));
const emptyAddons = (): AddonEntry[] => Object.keys(PRICES.addons).map(name => ({ name, qty: "" }));
const emptyElbows = (): ElbowEntry[] => PRICES.elbowTypes.map(type => ({ type, qty: "" }));
const emptyDownspouts = (): DownspoutEntry[] => Object.keys(PRICES.downspouts).map(type => ({ type, qty: "" }));

function storyUp(label: string) { return label === "2nd" ? 1 : label === "3rd" ? 2 : 0; }

function calcRowTotals(row: MeasurementRow) {
  let footage = 0, weightedUp = 0;
  STORIES.forEach(s => {
    const ft = parseFloat(row[s as keyof MeasurementRow] as string) || 0;
    footage    += ft;
    weightedUp += ft * storyUp(s);
  });
  footage += ((parseFloat(row.insideCorners) || 0) + (parseFloat(row.outsideCorners) || 0)) * CORNER_ADDER;
  return { footage, weightedUp };
}

function calcSection(rows: MeasurementRow[], baseRetail: number, baseFloor: number, premiumColor = false) {
  let totalFt = 0, totalUp = 0;
  rows.forEach(r => { const t = calcRowTotals(r); totalFt += t.footage; totalUp += t.weightedUp; });
  const colorUp = premiumColor ? PREMIUM_UPCHARGE : 0;
  const retail  = totalFt * (baseRetail + colorUp) + totalUp * STORY_UPCHARGE;
  const floor   = totalFt * (baseFloor  + colorUp) + totalUp * STORY_UPCHARGE;
  return { footage: totalFt, retail, floor };
}

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Inline styles ──────────────────────────────────────────────────────────
const cellInput: CSSProperties = {
  background: "#1c2333", border: "1px solid #2d3a52", borderRadius: 5,
  color: "#e8eaf0", padding: "5px 8px", width: "100%", fontSize: 14,
  outline: "none", textAlign: "center",
};

// ── Sub-components ─────────────────────────────────────────────────────────
function SectionHeader({ label, icon, accent }: { label: string; icon: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 1.5, textTransform: "uppercase", color: accent, margin: 0 }}>{label}</h2>
    </div>
  );
}

function SubHeader({ label }: { label: string }) {
  return <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: "uppercase", color: "#7b8bb2", marginBottom: 10, marginTop: 20 }}>{label}</h3>;
}

function SelectPill({ options, value, onChange, accent = "#e53935" }: { options: string[]; value: string; onChange: (v: string) => void; accent?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
          border: value === opt ? `2px solid ${accent}` : "2px solid #2d3a52",
          background: value === opt ? accent + "22" : "transparent",
          color: value === opt ? accent : "#7b8bb2", cursor: "pointer", transition: "all 0.15s",
        }}>{opt}</button>
      ))}
    </div>
  );
}

function StatBar({ label, value, color = "#e8eaf0", className }: { label: string; value: string; color?: string; className?: string }) {
  return <div className={className} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, minWidth: 140, gap: 8 }}><span style={{ color: "#7b8bb2", whiteSpace: "nowrap" }}>{label}</span><span style={{ color, fontWeight: 700, whiteSpace: "nowrap" }}>{value}</span></div>;
}

function MeasurementTable({ rows, onChange, baseRetail, baseFloor }: { rows: MeasurementRow[]; onChange: (rows: MeasurementRow[]) => void; baseRetail?: number; baseFloor?: number }) {
  const update = (idx: number, field: string, val: string) => onChange(rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const th: CSSProperties = { color: "#7b8bb2", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, padding: "8px 8px", textAlign: "center" };
  const showPricing = baseRetail != null && baseFloor != null;
  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left", minWidth: 100 }}>Side</th>
            <th style={th}><span>1st Story</span><br /><span style={{ fontSize: 9, color: "#4a5878" }}>0–12 ft</span></th>
            <th style={th}><span>2nd Story</span><br /><span style={{ fontSize: 9, color: "#4a5878" }}>+$1/ft</span></th>
            <th style={th}><span>3rd Story</span><br /><span style={{ fontSize: 9, color: "#4a5878" }}>+$2/ft</span></th>
            <th style={th}><span>Inside</span><br /><span style={{ fontSize: 9, color: "#4a5878" }}>Corners</span></th>
            <th style={th}><span>Outside</span><br /><span style={{ fontSize: 9, color: "#4a5878" }}>Corners</span></th>
            <th style={{ ...th, minWidth: 70 }}>Row Total</th>
            {showPricing && <th style={{ ...th, minWidth: 80 }} className="no-print">Row Retail</th>}
            {showPricing && <th style={{ ...th, minWidth: 80 }} className="no-print">Row Floor</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const { footage, weightedUp } = calcRowTotals(row);
            const rowRetail = showPricing ? footage * baseRetail! + weightedUp * STORY_UPCHARGE : 0;
            const rowFloor = showPricing ? footage * baseFloor! + weightedUp * STORY_UPCHARGE : 0;
            return (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#111827" : "transparent" }}>
                <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{row.side}</td>
                {STORIES.map(s => (
                  <td key={s} style={{ padding: "4px 4px" }}>
                    <input type="number" placeholder="0" value={row[s as keyof MeasurementRow]} onChange={e => update(idx, s, e.target.value)} style={cellInput} />
                  </td>
                ))}
                <td style={{ padding: "4px 4px" }}>
                  <input type="number" placeholder="0" value={row.insideCorners} onChange={e => update(idx, "insideCorners", e.target.value)} style={{ ...cellInput, borderColor: "#2a3d5a" }} />
                </td>
                <td style={{ padding: "4px 4px" }}>
                  <input type="number" placeholder="0" value={row.outsideCorners} onChange={e => update(idx, "outsideCorners", e.target.value)} style={{ ...cellInput, borderColor: "#2a3d5a" }} />
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: footage > 0 ? "#e53935" : "#2d3a52", fontSize: 13 }}>
                  {footage > 0 ? `${footage} ft` : "—"}
                </td>
                {showPricing && (
                  <td className="no-print" style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: footage > 0 ? "#e8eaf0" : "#2d3a52", fontSize: 13 }}>
                    {footage > 0 ? fmt(rowRetail) : "—"}
                  </td>
                )}
                {showPricing && (
                  <td className="no-print" style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: footage > 0 ? "#ffa726" : "#2d3a52", fontSize: 13 }}>
                    {footage > 0 ? fmt(rowFloor) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryRow({ label, retail, floor, quoted, commission, muted, bold }: { label: string; retail: number; floor: number; quoted?: number | null; commission?: number | null; muted?: boolean; bold?: boolean }) {
  const s: CSSProperties = bold
    ? { fontSize: 18, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }
    : { fontSize: 14 };
  return (
    <>
      {/* Desktop: 5-column grid */}
      <div className="summary-row-desktop" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid #1e2d45", opacity: muted ? 0.5 : 1 }}>
        <span style={{ ...s, color: "#e8eaf0" }}>{label}</span>
        <span style={{ ...s, textAlign: "right", color: "#e8eaf0" }}>{retail > 0 || bold ? fmt(retail) : "—"}</span>
        <span className="no-print" style={{ ...s, textAlign: "right", color: "#ffa726" }}>{floor > 0 || bold ? fmt(floor) : "—"}</span>
        <span style={{ ...s, textAlign: "right", color: "#ffffff" }}>{quoted != null ? fmt(quoted) : "—"}</span>
        <span className="no-print" style={{ ...s, color: (commission ?? 0) > 0 ? "#66bb6a" : "#4a5878", textAlign: "right" }}>{commission != null ? fmt(commission) : "—"}</span>
      </div>
      {/* Mobile: card layout */}
      <div className="summary-row-mobile" style={{ padding: "10px 12px", borderBottom: "1px solid #1e2d45", opacity: muted ? 0.5 : 1 }}>
        <div style={{ ...s, color: "#e8eaf0", marginBottom: 6, fontWeight: bold ? 800 : 600 }}>{label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
          <div style={{ fontSize: 12 }}><span style={{ color: "#7b8bb2" }}>Retail: </span><span style={{ ...s, color: "#e8eaf0" }}>{retail > 0 || bold ? fmt(retail) : "—"}</span></div>
          <div className="no-print" style={{ fontSize: 12 }}><span style={{ color: "#7b8bb2" }}>Floor: </span><span style={{ ...s, color: "#ffa726" }}>{floor > 0 || bold ? fmt(floor) : "—"}</span></div>
          <div style={{ fontSize: 12 }}><span style={{ color: "#7b8bb2" }}>Quoted: </span><span style={{ ...s, color: "#ffffff" }}>{quoted != null ? fmt(quoted) : "—"}</span></div>
          <div className="no-print" style={{ fontSize: 12 }}><span style={{ color: "#7b8bb2" }}>Comm: </span><span style={{ ...s, color: (commission ?? 0) > 0 ? "#66bb6a" : "#4a5878" }}>{commission != null ? fmt(commission) : "—"}</span></div>
        </div>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function NGRGutterCalculator({ lead = null, onSave, existingEstimate }: NGRGutterCalculatorProps) {
  const { user } = useAuth();

  const [jobInfo, setJobInfo] = useState({
    customer:  lead?.full_name || "",
    city:      lead?.city      || "",
    state:     lead?.state     || "",
    jobNumber: lead?.reference_number || "",
  });
  const [tab,         setTab]         = useState("protection");
  const [protProduct, setProtProduct] = useState("Hydro Flow Mesh + Frame");
  const [protSize,    setProtSize]    = useState<'5"' | '6"'>('5"');
  const [protRows,    setProtRows]    = useState(emptyRows());
  const [gutterSize,  setGutterSize]  = useState('5"');
  const [gutterColor, setGutterColor] = useState("Standard");
  const [gutterRows,  setGutterRows]  = useState(emptyRows());
  const [dsType,      setDsType]      = useState('2x3 (= 5")');
  const [downspouts,  setDownspouts]  = useState(emptyDownspouts());
  const [elbows,      setElbows]      = useState(emptyElbows());
  const [addons,      setAddons]      = useState(emptyAddons());
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [saving,      setSaving]      = useState(false);
  const [estimateId,  setEstimateId]  = useState<string | null>(existingEstimate?.id || null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Restore state from existingEstimate
  useEffect(() => {
    if (!existingEstimate) return;
    let d = existingEstimate.measurement_data as any;
    // Handle previously double-encoded data
    if (typeof d === "string") {
      try { d = JSON.parse(d); } catch { return; }
    }
    if (!d) return;
    if (d.protProduct) setProtProduct(d.protProduct);
    if (d.protSize) setProtSize(d.protSize);
    if (d.protRows) setProtRows(d.protRows);
    if (d.gutterSize) setGutterSize(d.gutterSize);
    if (d.gutterColor) setGutterColor(d.gutterColor);
    if (d.gutterRows) setGutterRows(d.gutterRows);
    if (d.downspouts) setDownspouts(d.downspouts);
    if (d.elbows) setElbows(d.elbows);
    if (d.addons) setAddons(d.addons);
    if (d.quotedTotal !== undefined) setQuotedTotal(d.quotedTotal);
    if (d.dsType) setDsType(d.dsType);
    if (d.discountPct !== undefined) setDiscountPct(d.discountPct);
    setJobInfo({
      customer: existingEstimate.customer_name || "",
      city: existingEstimate.city || "",
      state: existingEstimate.state || "",
      jobNumber: existingEstimate.job_number || "",
    });
  }, [existingEstimate?.id]);

  // ── Calculations ───────────────────────────────────────────────────────
  const protPrices = PRICES.protection[protProduct];
  const protSizeUpcharge = protSize === '6"' ? 2 : 0;
  const protCalc   = useMemo(() => calcSection(protRows, protPrices.retail + protSizeUpcharge, protPrices.floor + protSizeUpcharge), [protRows, protPrices, protSizeUpcharge]);
  const gutterPrices = PRICES.gutters[gutterSize];
  const isPremium    = gutterColor === "Premium (+$2/ft)";
  const gutterCalc   = useMemo(() => calcSection(gutterRows, gutterPrices.retail, gutterPrices.floor, isPremium), [gutterRows, gutterPrices, isPremium]);

  const dsCalc = useMemo(() => {
    let retail = 0, floor = 0, footage = 0;
    downspouts.forEach(ds => {
      const qty = parseFloat(ds.qty) || 0;
      const p   = PRICES.downspouts[ds.type];
      retail += qty * p.retail; floor += qty * p.floor; footage += qty;
    });
    return { retail, floor, footage };
  }, [downspouts]);

  const elbowCalc = useMemo(() => {
    const p = PRICES.downspouts[dsType];
    let retail = 0, floor = 0, qty = 0;
    elbows.forEach(e => {
      const q = parseFloat(e.qty) || 0;
      qty += q; retail += q * p.retail; floor += q * p.floor;
    });
    return { retail, floor, footage: qty };
  }, [elbows, dsType]);

  const addonCalc = useMemo(() => {
    let retail = 0, floor = 0;
    addons.forEach(a => {
      const qty = parseFloat(a.qty) || 0;
      const p   = PRICES.addons[a.name];
      retail += qty * p.retail; floor += qty * p.floor;
    });
    return { retail, floor };
  }, [addons]);

  const dsTotal       = { retail: dsCalc.retail + elbowCalc.retail, floor: dsCalc.floor + elbowCalc.floor, footage: dsCalc.footage + elbowCalc.footage };
  const totalRetail   = protCalc.retail + gutterCalc.retail + dsTotal.retail + addonCalc.retail;
  const totalFloor    = protCalc.floor  + gutterCalc.floor  + dsTotal.floor  + addonCalc.floor;
  const preDiscountQuoted = quotedTotal != null ? Math.max(totalFloor, Math.min(totalRetail, quotedTotal)) : totalRetail;
  const discountAmount = preDiscountQuoted * (discountPct / 100);
  const clampedQuoted  = Math.max(totalFloor, preDiscountQuoted - discountAmount);
  const totalCommission = clampedQuoted - totalFloor;
  const ratio         = totalRetail > totalFloor ? (clampedQuoted - totalFloor) / (totalRetail - totalFloor) : 1;
  const sliderPct     = Math.round(ratio * 100);
  const fullCommission = preDiscountQuoted - totalFloor;

  // Effective retail/floor for gutters (including premium)
  const gutterEffRetail = gutterPrices.retail + (isPremium ? PREMIUM_UPCHARGE : 0);
  const gutterEffFloor  = gutterPrices.floor  + (isPremium ? PREMIUM_UPCHARGE : 0);

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const estimatePayload = {
        lead_id:            lead?.id || null,
        job_number:         jobInfo.jobNumber,
        customer_name:      jobInfo.customer,
        city:               jobInfo.city,
        state:              jobInfo.state,
        protection_product: protProduct,
        protection_footage: protCalc.footage,
        protection_retail:  protCalc.retail,
        protection_floor:   protCalc.floor,
        gutter_size:        gutterSize,
        gutter_color:       gutterColor,
        gutter_footage:     gutterCalc.footage,
        gutter_retail:      gutterCalc.retail,
        gutter_floor:       gutterCalc.floor,
        downspout_footage:  dsCalc.footage,
        elbow_footage:      elbowCalc.footage,
        ds_elbow_retail:    dsTotal.retail,
        ds_elbow_floor:     dsTotal.floor,
        addon_retail:       addonCalc.retail,
        addon_floor:        addonCalc.floor,
        total_retail:       totalRetail,
        total_floor:        totalFloor,
        quoted_price:       clampedQuoted,
        commission:         totalCommission,
        measurement_data:   { protProduct, protSize, protRows, gutterSize, gutterColor, gutterRows, downspouts, elbows, addons, quotedTotal, dsType, discountPct },
        created_by:         user?.id,
      };

      const payload = { ...estimatePayload, ...(estimateId ? { id: estimateId } : {}) };
      const { data, error } = await supabase
        .from("gutter_estimates")
        .upsert(payload as any, { onConflict: "id" })
        .select("id")
        .single();

      if (error) throw error;
      if (data?.id) setEstimateId(data.id);

      toast.success(estimateId ? "Estimate updated!" : "Estimate saved successfully!");
      if (onSave) onSave(estimatePayload);
    } catch (err: any) {
      console.error("Save failed:", err);
      toast.error("Save failed: " + (err?.message || "Check console for details."));
    } finally {
      setSaving(false);
    }
  };

  // ── PDF Generation ─────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    const hasItems = protCalc.footage > 0 || gutterCalc.footage > 0 || dsTotal.footage > 0 || addons.some(a => (parseFloat(a.qty) || 0) > 0);
    if (!hasItems) {
      toast.error("No items entered — please complete the estimator before generating a PDF.");
      return;
    }

    setGeneratingPDF(true);
    try {
      const logoBase64 = await loadLogoBase64(ngrLogo);

      const pdfAddons = addons
        .filter(a => (parseFloat(a.qty) || 0) > 0)
        .map(a => ({ name: a.name, qty: a.qty, unit: PRICES.addons[a.name]?.unit || "ea" }));

      const gutterDsRetail = gutterCalc.retail + dsTotal.retail;
      const protRetailVal = protCalc.retail;
      const gutterDsQuoted = totalRetail > 0 ? (gutterDsRetail / totalRetail) * clampedQuoted : clampedQuoted;
      const protQuotedVal = totalRetail > 0 ? (protRetailVal / totalRetail) * clampedQuoted : 0;

      const pdf = await buildEstimatePDF({
        jobInfo,
        protProduct,
        protFootage: protCalc.footage,
        protSize,
        gutterSize,
        gutterColor,
        gutterFootage: gutterCalc.footage,
        dsTotalFootage: dsTotal.footage,
        dsType,
        addons: pdfAddons,
        clampedQuoted,
        totalRetail,
        gutterDsQuoted,
        protQuoted: protQuotedVal,
        validityDays: (lead as any)?.validity_days || 7,
        logoBase64,
      });

      const fileName = `NGG_Estimate_${(jobInfo.customer || "Customer").replace(/\s+/g, "_")}_${new Date().toLocaleDateString("en-US").replace(/\//g, "-")}.pdf`;
      pdf.save(fileName);

      if (lead?.id) {
        const pdfBlob = new Blob([pdf.output("arraybuffer")], { type: "application/pdf" });
        const storagePath = `estimates/${lead.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("lead-files")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from("lead-files").getPublicUrl(uploadData.path);
          await supabase.from("lead_files").insert({
            lead_id: lead.id,
            uploaded_by: user?.id || "",
            file_name: fileName,
            file_url: urlData.publicUrl,
            file_type: "estimate",
            file_size: pdfBlob.size,
          });
          toast.success("PDF generated and saved to lead files!");
        } else {
          toast.success("PDF downloaded! (Storage upload skipped)");
        }
      } else {
        toast.success("PDF downloaded successfully!");
      }
    } catch (error: any) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const updateDs    = (idx: number, val: string) => setDownspouts(downspouts.map((d, i) => i === idx ? { ...d, qty: val } : d));
  const updateElbow = (idx: number, val: string) => setElbows(elbows.map((e, i) => i === idx ? { ...e, qty: val } : e));
  const updateAddon = (idx: number, val: string) => setAddons(addons.map((a, i) => i === idx ? { ...a, qty: val } : a));
  const totalElbowQty = elbows.reduce((s, e) => s + (parseFloat(e.qty) || 0), 0);

  const card: CSSProperties       = { background: "#0d1424", border: "1px solid #1e2d45", borderRadius: 14, padding: 24, marginBottom: 20 };
  const statRow: CSSProperties    = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px 20px", padding: "12px 16px", background: "#111827", borderRadius: 8, marginTop: 10 };
  const tabBtn     = (t: string): CSSProperties => ({
    padding: "10px 20px", borderRadius: "10px 10px 0 0", border: "none",
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
    letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
    background: tab === t ? "#0d1424" : "#070e1a",
    color: tab === t ? "#e53935" : "#4a5878",
    borderBottom: tab === t ? "2px solid #e53935" : "2px solid transparent",
    transition: "all 0.15s",
  });
  const inputField: CSSProperties = { background: "#111827", border: "1px solid #1e2d45", borderRadius: 8, color: "#e8eaf0", padding: "9px 14px", fontSize: 14, outline: "none", width: "100%" };

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", color: "#e8eaf0", background: "#070e1a", minHeight: "100vh", padding: "24px 16px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input:focus { border-color: #e53935 !important; box-shadow: 0 0 0 2px #e5393520; }
        input::placeholder { color: #2d3a52; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #070e1a; }
        ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 3px; }
        input[type=range] { accent-color: #e53935; }
        @media (max-width: 640px) {
          .summary-row-desktop { display: none !important; }
          .summary-header-desktop { display: none !important; }
        }
        @media (min-width: 641px) {
          .summary-row-mobile { display: none !important; }
        }
      `}</style>


      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={ngrLogo} alt="NGR" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 2, textTransform: "uppercase", color: "#e8eaf0", margin: 0 }}>NEXT GENERATION GUTTERING</h1>
            <p className="no-print" style={{ fontSize: 12, color: "#4a5878", margin: 0 }}>Rep Estimating Calculator — 2026 Pricing</p>
          </div>
        </div>
        {lead && (
          <div style={{ background: "#111827", border: "1px solid #1e2d45", borderRadius: 10, padding: "8px 16px" }}>
            <p style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Assigned Lead</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", margin: 0 }}>{lead.full_name}</p>
            <p style={{ fontSize: 12, color: "#7b8bb2", margin: 0 }}>{lead.city}, {lead.state}</p>
          </div>
        )}
      </div>

      {/* JOB INFO */}
      <div style={card}>
        <SectionHeader label="Job Information" icon="📋" accent="#e53935" />
        {lead && (
          <div className="no-print" style={{ background: "#2a1215", border: "1px solid #e5393540", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 12, color: "#e53935" }}>
            ✅ Auto-filled from assigned lead — edit below if needed
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {([["Customer", "customer"], ["City", "city"], ["State", "state"], ["Job #", "jobNumber"]] as const).map(([lbl, key]) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: "#4a5878", textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</label>
              <input value={jobInfo[key]} onChange={e => setJobInfo(p => ({ ...p, [key]: e.target.value }))} style={inputField} />
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, marginBottom: 0 }} className="no-print">
        {([["protection", "🛡️ Protection"], ["gutters", "🏠 Gutters & Downspouts"], ["addons", "➕ Add-Ons"]] as const).map(([t, lbl]) => (
          <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>{lbl}</button>
        ))}
      </div>

      {/* PROTECTION TAB */}
      {tab === "protection" && (
        <div style={card}>
          <SectionHeader label="Gutter Protection" icon="🛡️" accent="#e53935" />
          <div style={{ marginBottom: 16 }}>
            <SubHeader label="Product" />
            <div className="no-print"><SelectPill options={Object.keys(PRICES.protection)} value={protProduct} onChange={setProtProduct} /></div>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#4a5878", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Gutter Size</div>
              <SelectPill options={['5"', '6"']} value={protSize} onChange={(v) => setProtSize(v as '5"' | '6"')} accent="#e53935" />
            </div>
            <div className="no-print" style={{ background: "#0a1120", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div><span style={{ color: "#4a5878", fontSize: 12 }}>Retail/ft: </span><span style={{ color: "#e8eaf0", fontWeight: 700 }}>${protPrices.retail + protSizeUpcharge}</span></div>
              <div><span style={{ color: "#4a5878", fontSize: 12 }}>Floor/ft: </span><span style={{ color: "#ffa726", fontWeight: 700 }}>${protPrices.floor + protSizeUpcharge}</span></div>
              <div><span style={{ color: "#4a5878", fontSize: 12 }}>Commission/ft: </span><span style={{ color: "#66bb6a", fontWeight: 700 }}>${protPrices.retail - protPrices.floor}</span></div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <SubHeader label="Measurements" />
            <MeasurementTable rows={protRows} onChange={setProtRows} baseRetail={protPrices.retail} baseFloor={protPrices.floor} />
          </div>
          <SubHeader label="Section Summary" />
          <div style={statRow}>
            <StatBar label="Total Footage" value={`${protCalc.footage} ft`} color="#e53935" />
            <StatBar label="Retail" value={fmt(protCalc.retail)} className="no-print" />
            <StatBar label="Floor" value={fmt(protCalc.floor)} color="#ffa726" className="no-print" />
            <StatBar label="Commission" value={fmt(protCalc.retail - protCalc.floor)} color="#66bb6a" className="no-print" />
          </div>
        </div>
      )}

      {/* GUTTERS + DOWNSPOUTS TAB */}
      {tab === "gutters" && (
        <div style={card}>
          <SectionHeader label="Gutters" icon="🏠" accent="#e53935" />
          <div className="no-print" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <SubHeader label="Gutter Size" />
              <SelectPill options={Object.keys(PRICES.gutters)} value={gutterSize} onChange={setGutterSize} />
            </div>
            <div>
              <SubHeader label="Color" />
              <SelectPill options={["Standard", "Premium (+$2/ft)"]} value={gutterColor} onChange={setGutterColor} />
            </div>
          </div>
          <div className="no-print" style={{ background: "#0a1120", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div><span style={{ color: "#4a5878", fontSize: 12 }}>Retail/ft: </span><span style={{ color: "#e8eaf0", fontWeight: 700 }}>${gutterEffRetail}</span></div>
            <div><span style={{ color: "#4a5878", fontSize: 12 }}>Floor/ft: </span><span style={{ color: "#ffa726", fontWeight: 700 }}>${gutterEffFloor}</span></div>
            <div><span style={{ color: "#4a5878", fontSize: 12 }}>Commission/ft: </span><span style={{ color: "#66bb6a", fontWeight: 700 }}>${gutterEffRetail - gutterEffFloor}</span></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <SubHeader label="Gutter Measurements" />
            <MeasurementTable rows={gutterRows} onChange={setGutterRows} baseRetail={gutterEffRetail} baseFloor={gutterEffFloor} />
            {isPremium && <StatBar label="Premium Color Upcharge" value="+$2/ft" color="#ffa726" />}
          </div>
          <SubHeader label="Gutter Section Summary" />
          <div style={statRow}>
            <StatBar label="Total Footage" value={`${gutterCalc.footage} ft`} color="#e53935" />
            <StatBar label="Retail" value={fmt(gutterCalc.retail)} className="no-print" />
            <StatBar label="Floor" value={fmt(gutterCalc.floor)} color="#ffa726" className="no-print" />
            <StatBar label="Commission" value={fmt(gutterCalc.retail - gutterCalc.floor)} color="#66bb6a" className="no-print" />
          </div>

          {/* DOWNSPOUTS */}
          <SectionHeader label="Downspouts" icon="⬇️" accent="#ab47bc" />
          <div style={{ marginBottom: 16, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(70px, 1fr))", gap: 8, alignItems: "center", marginBottom: 8, minWidth: 420 }}>
              {[{ label: "Type" }, { label: "Qty" }, { label: "Footage", color: "#e53935" }, { label: "Rate/ft", className: "no-print" }, { label: "Retail", className: "no-print" }, { label: "Floor", color: "#ffa726", className: "no-print" }].map(h => (
                <div key={h.label} className={h.className || ""} style={{ fontSize: 10, color: h.color || "#4a5878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h.label}</div>
              ))}
              {downspouts.map((ds, idx) => {
                const qty = parseFloat(ds.qty) || 0;
                const p   = PRICES.downspouts[ds.type];
                const bg  = idx % 2 === 0 ? "#111827" : "transparent";
                return [
                  <div key={`t${idx}`} style={{ background: bg, padding: "6px 8px", fontSize: 13, fontWeight: 600, color: "#e8eaf0", display: "flex", alignItems: "center" }}>{ds.type}</div>,
                  <div key={`q${idx}`} style={{ background: bg, padding: "4px", display: "flex", alignItems: "center" }}>
                    <input type="number" placeholder="0" value={ds.qty} onChange={e => updateDs(idx, e.target.value)} style={{ ...cellInput, width: 60 }} />
                  </div>,
                  <div key={`f${idx}`} style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#e53935" : "#2d3a52", fontWeight: 700, display: "flex", alignItems: "center" }}>{qty > 0 ? `${qty} ft` : "—"}</div>,
                  <div key={`r${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 12, color: "#4a5878", display: "flex", alignItems: "center" }}>${p.retail}/ft</div>,
                  <div key={`re${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#e8eaf0" : "#2d3a52", fontWeight: qty > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>{qty > 0 ? fmt(qty * p.retail) : "—"}</div>,
                  <div key={`fl${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#ffa726" : "#2d3a52", fontWeight: qty > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>{qty > 0 ? fmt(qty * p.floor) : "—"}</div>,
                ];
              })}
              <div style={{ gridColumn: "1 / 3", padding: "8px 8px", fontWeight: 800, fontSize: 12, color: "#7b8bb2", textTransform: "uppercase" }}>DS TOTAL</div>
              <div style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#e53935" }}>{dsCalc.footage > 0 ? `${dsCalc.footage} ft` : "—"}</div>
              <div className="no-print" />
              <div className="no-print" style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{dsCalc.retail > 0 ? fmt(dsCalc.retail) : "—"}</div>
              <div className="no-print" style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#ffa726" }}>{dsCalc.floor > 0 ? fmt(dsCalc.floor) : "—"}</div>
            </div>
          </div>

          {/* ELBOWS */}
          <SectionHeader label="Elbows" icon="🔄" accent="#ab47bc" />
          <div style={{ marginBottom: 12 }}>
            <SubHeader label="Elbow Pricing Rate" />
            <div className="no-print"><SelectPill options={Object.keys(PRICES.downspouts)} value={dsType} onChange={setDsType} accent="#ab47bc" /></div>
          </div>
          <div style={{ marginBottom: 16, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(70px, 1fr))", gap: 8, alignItems: "center", marginBottom: 8, minWidth: 420 }}>
              {[{ label: "Elbow Type" }, { label: "Qty" }, { label: "Footage", color: "#ab47bc" }, { label: "Rate/ft", className: "no-print" }, { label: "Retail", className: "no-print" }, { label: "Floor", color: "#ffa726", className: "no-print" }].map(h => (
                <div key={h.label} className={h.className || ""} style={{ fontSize: 10, color: h.color || "#4a5878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h.label}</div>
              ))}
              {elbows.map((el, idx) => {
                const qty = parseFloat(el.qty) || 0;
                const p   = PRICES.downspouts[dsType];
                const bg  = idx % 2 === 0 ? "#111827" : "transparent";
                return [
                  <div key={`t${idx}`} style={{ background: bg, padding: "6px 8px", fontSize: 13, fontWeight: 600, color: "#e8eaf0", display: "flex", alignItems: "center" }}>{el.type}</div>,
                  <div key={`q${idx}`} style={{ background: bg, padding: "4px", display: "flex", alignItems: "center" }}>
                    <input type="number" placeholder="0" value={el.qty} onChange={e => updateElbow(idx, e.target.value)} style={{ ...cellInput, width: 60 }} />
                  </div>,
                  <div key={`f${idx}`} style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#ab47bc" : "#2d3a52", fontWeight: 700, display: "flex", alignItems: "center" }}>{qty > 0 ? `${qty} ft` : "—"}</div>,
                  <div key={`r${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 12, color: "#4a5878", display: "flex", alignItems: "center" }}>${p.retail}/ft</div>,
                  <div key={`re${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#e8eaf0" : "#2d3a52", fontWeight: qty > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>{qty > 0 ? fmt(qty * p.retail) : "—"}</div>,
                  <div key={`fl${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#ffa726" : "#2d3a52", fontWeight: qty > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>{qty > 0 ? fmt(qty * p.floor) : "—"}</div>,
                ];
              })}
              <div style={{ gridColumn: "1 / 2", padding: "8px 8px", fontWeight: 800, fontSize: 12, color: "#7b8bb2", textTransform: "uppercase" }}>ELBOW TOTAL</div>
              <div style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#7b8bb2" }}>{totalElbowQty > 0 ? totalElbowQty : "—"}</div>
              <div style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#ab47bc" }}>{elbowCalc.footage > 0 ? `${elbowCalc.footage} ft` : "—"}</div>
              <div className="no-print" />
              <div className="no-print" style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{elbowCalc.retail > 0 ? fmt(elbowCalc.retail) : "—"}</div>
              <div className="no-print" style={{ padding: "8px 8px", fontWeight: 700, fontSize: 13, color: "#ffa726" }}>{elbowCalc.floor > 0 ? fmt(elbowCalc.floor) : "—"}</div>
            </div>
          </div>

          {/* Combined DS+Elbow */}
          <div style={{ background: "#111827", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <SubHeader label="Combined Downspout + Elbow Total" />
            <div style={statRow}>
              <StatBar label="Total Footage" value={`${dsTotal.footage} ft`} color="#ab47bc" />
              <StatBar label="Retail" value={fmt(dsTotal.retail)} className="no-print" />
              <StatBar label="Floor" value={fmt(dsTotal.floor)} color="#ffa726" className="no-print" />
            </div>
          </div>

          {/* Gutters Section Total */}
          <div style={{ background: "#0a1628", borderRadius: 8, padding: 16, border: "1px solid #1e2d45" }}>
            <SubHeader label="Gutters Section Total" />
            <div style={statRow}>
              <StatBar label="Gutter Footage" value={`${gutterCalc.footage} ft`} color="#e53935" />
              <StatBar label="Retail" value={fmt(gutterCalc.retail + dsTotal.retail)} className="no-print" />
              <StatBar label="Floor" value={fmt(gutterCalc.floor + dsTotal.floor)} color="#ffa726" className="no-print" />
            </div>
          </div>
        </div>
      )}

      {/* ADD-ONS TAB */}
      {tab === "addons" && (
        <div style={card}>
          <SectionHeader label="Add-On Services" icon="➕" accent="#66bb6a" />
          <div style={{ marginBottom: 16, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1fr", gap: 8, alignItems: "center", marginBottom: 8, minWidth: 420 }}>
              {["Service", "Qty / Footage", "Unit"].map(h => (
                <div key={h} style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
              ))}
              {["Retail", "Floor"].map(h => (
                <div key={h} className="no-print" style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
              ))}
              {addons.map((a, idx) => {
                const qty = parseFloat(a.qty) || 0;
                const p   = PRICES.addons[a.name];
                const bg  = idx % 2 === 0 ? "#111827" : "transparent";
                return [
                  <div key={`n${idx}`} style={{ background: bg, padding: "6px 8px", fontSize: 13, fontWeight: 600, color: "#e8eaf0", display: "flex", alignItems: "center" }}>{a.name}</div>,
                  <div key={`q${idx}`} style={{ background: bg, padding: "4px", display: "flex", alignItems: "center" }}>
                    <input type="number" placeholder="0" value={a.qty} onChange={e => updateAddon(idx, e.target.value)} style={{ ...cellInput, width: 90 }} />
                  </div>,
                  <div key={`u${idx}`} style={{ background: bg, padding: "6px 8px", fontSize: 12, color: "#4a5878", display: "flex", alignItems: "center" }}>{p.unit}</div>,
                  <div key={`r${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#e8eaf0" : "#2d3a52", fontWeight: qty > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>{qty > 0 ? fmt(qty * p.retail) : "—"}</div>,
                  <div key={`f${idx}`} className="no-print" style={{ background: bg, padding: "6px 8px", fontSize: 13, color: qty > 0 ? "#ffa726" : "#2d3a52", fontWeight: qty > 0 ? 700 : 400, display: "flex", alignItems: "center" }}>{qty > 0 ? fmt(qty * p.floor) : "—"}</div>,
                ];
              })}
            </div>
          </div>
          <div style={statRow}>
            <StatBar label="Add-On Retail" value={fmt(addonCalc.retail)} className="no-print" />
            <StatBar label="Add-On Floor" value={fmt(addonCalc.floor)} color="#ffa726" className="no-print" />
          </div>
        </div>
      )}

      {/* SUMMARY */}
      <div style={card}>
        <SectionHeader label="Estimate Summary" icon="📊" accent="#e53935" />
        <div className="no-print summary-header-desktop" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, textAlign: "left" }}>Section</span>
          <span style={{ fontSize: 10, color: "#e8eaf0", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, textAlign: "right" }}>Retail</span>
          <span className="no-print" style={{ fontSize: 10, color: "#ffa726", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, textAlign: "right" }}>Floor</span>
          <span style={{ fontSize: 10, color: "#ffffff", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, textAlign: "right" }}>Quoted</span>
          <span className="no-print" style={{ fontSize: 10, color: "#66bb6a", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, textAlign: "right" }}>Commission</span>
        </div>
        <div className="no-print">
          <SummaryRow label="🛡️ Protection" retail={protCalc.retail} floor={protCalc.floor} quoted={protCalc.retail > 0 ? protCalc.retail * (clampedQuoted / (totalRetail || 1)) : undefined} commission={protCalc.retail > 0 ? (protCalc.retail * (clampedQuoted / (totalRetail || 1))) - protCalc.floor : undefined} muted={protCalc.retail === 0} />
          <SummaryRow label="🏠 Gutters" retail={gutterCalc.retail} floor={gutterCalc.floor} quoted={gutterCalc.retail > 0 ? gutterCalc.retail * (clampedQuoted / (totalRetail || 1)) : undefined} commission={gutterCalc.retail > 0 ? (gutterCalc.retail * (clampedQuoted / (totalRetail || 1))) - gutterCalc.floor : undefined} muted={gutterCalc.retail === 0} />
          <SummaryRow label="⬇️ DS + Elbows" retail={dsTotal.retail} floor={dsTotal.floor} quoted={dsTotal.retail > 0 ? dsTotal.retail * (clampedQuoted / (totalRetail || 1)) : undefined} commission={dsTotal.retail > 0 ? (dsTotal.retail * (clampedQuoted / (totalRetail || 1))) - dsTotal.floor : undefined} muted={dsTotal.retail === 0} />
          <SummaryRow label="➕ Add-Ons" retail={addonCalc.retail} floor={addonCalc.floor} quoted={addonCalc.retail > 0 ? addonCalc.retail * (clampedQuoted / (totalRetail || 1)) : undefined} commission={addonCalc.retail > 0 ? (addonCalc.retail * (clampedQuoted / (totalRetail || 1))) - addonCalc.floor : undefined} muted={addonCalc.retail === 0} />
        </div>
        <div className="no-print" style={{ height: 8 }} />
        <SummaryRow label="GRAND TOTAL" retail={totalRetail} floor={totalFloor} quoted={clampedQuoted} commission={totalCommission} bold />

        {/* SLIDER */}
        <div style={{ marginTop: 24, padding: "20px 24px", background: "#111827", borderRadius: 12, border: "1px solid #1e2d45" }} className="no-print">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 1, textTransform: "uppercase", color: "#ffffff", margin: 0 }}>ADJUST QUOTED PRICE</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#4a5878", fontSize: 20 }}>$</span>
              <input
                type="number"
                value={quotedTotal ?? totalRetail}
                onChange={e => { setQuotedTotal(parseFloat(e.target.value) || totalFloor); setDiscountPct(0); }}
                style={{ background: "#111827", border: "1px solid #ffffff40", borderRadius: 8, color: "#ffffff", padding: "8px 12px", fontSize: 22, fontWeight: 800, width: 160, outline: "none", textAlign: "right" }}
              />
            </div>
          </div>
          <input type="range" min="0" max="100" value={Math.round(totalRetail > totalFloor ? (preDiscountQuoted - totalFloor) / (totalRetail - totalFloor) * 100 : 100)} onChange={e => { setQuotedTotal(totalFloor + (parseInt(e.target.value) / 100) * (totalRetail - totalFloor)); setDiscountPct(0); }} style={{ width: "100%", marginBottom: 12 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><p style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", margin: 0 }}>FLOOR (MIN)</p><p style={{ fontSize: 14, fontWeight: 700, color: "#ffa726", margin: 0 }}>{fmt(totalFloor)}</p></div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", margin: 0 }}>YOUR COMMISSION</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: discountPct > 0 ? "#ffa726" : "#66bb6a", fontFamily: "'Barlow Condensed', sans-serif", margin: 0 }}>{fmt(totalCommission)}</p>
              {discountPct > 0 && (
                <p style={{ fontSize: 11, color: "#e53935", margin: 0 }}>
                  was {fmt(fullCommission)} · −{fmt(fullCommission - totalCommission)} given up
                </p>
              )}
              <p style={{ fontSize: 11, color: "#4a5878", margin: 0 }}>{sliderPct}% of max captured</p>
            </div>
            <div style={{ textAlign: "right" }}><p style={{ fontSize: 10, color: "#4a5878", textTransform: "uppercase", margin: 0 }}>FULL RETAIL</p><p style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", margin: 0 }}>{fmt(totalRetail)}</p></div>
          </div>
          <div style={{ marginTop: 8, height: 6, background: "#1e2d45", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${sliderPct}%`, background: sliderPct > 60 ? "#66bb6a" : sliderPct > 30 ? "#ffa726" : "#e53935", borderRadius: 5, transition: "width 0.1s, background 0.3s" }} />
          </div>

          {/* DISCOUNT % */}
          <div style={{ marginTop: 16, padding: "16px 20px", background: "#0d1424", borderRadius: 10, border: "1px solid #1e2d45" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: "#e8eaf0", margin: 0 }}>DISCOUNT %</h4>
                <p style={{ fontSize: 11, color: "#4a5878", margin: "2px 0 0" }}>Reduces quoted price — floor stays fixed, commission drops</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPct || ""}
                  placeholder="0"
                  onChange={e => {
                    const v = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                    setDiscountPct(v);
                  }}
                  style={{ background: "#111827", border: "1px solid #1e2d45", borderRadius: 8, color: "#e8eaf0", padding: "8px 12px", fontSize: 18, fontWeight: 700, width: 80, outline: "none", textAlign: "center" }}
                />
                <span style={{ color: "#4a5878", fontSize: 18, fontWeight: 700 }}>%</span>
              </div>
            </div>
            {discountPct > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div><span style={{ color: "#4a5878", fontSize: 12 }}>Pre-Discount: </span><span style={{ color: "#7b8bb2", fontWeight: 700, textDecoration: "line-through" }}>{fmt(preDiscountQuoted)}</span></div>
                <div><span style={{ color: "#4a5878", fontSize: 12 }}>Discounted Price: </span><span style={{ color: "#e8eaf0", fontWeight: 700 }}>{fmt(clampedQuoted)}</span></div>
                <div><span style={{ color: "#4a5878", fontSize: 12 }}>Discount Amt: </span><span style={{ color: "#e53935", fontWeight: 700 }}>−{fmt(preDiscountQuoted - clampedQuoted)}</span></div>
                <div><span style={{ color: "#4a5878", fontSize: 12 }}>Commission Impact: </span><span style={{ color: "#e53935", fontWeight: 700 }}>−{fmt(fullCommission - totalCommission)}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* WARNING */}
        <div className="no-print" style={{ marginTop: 16, padding: "12px 16px", background: "#1a1a0d", border: "1px solid #3d3d1a", borderRadius: 8, fontSize: 12, color: "#ffa726" }}>
          ⚠️ 4th story jobs require a lift — flag for manager quote before presenting pricing to customer.
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }} className="no-print">
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, padding: "14px 24px", borderRadius: 10, border: "none", background: "#e53935", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: saving ? "wait" : "pointer", transition: "background 0.3s" }}
          >
            {saving ? "⏳ Saving..." : estimateId ? "💾 Update Estimate" : "💾 Save Estimate"}
          </button>
          <button onClick={handleGeneratePDF} disabled={generatingPDF} style={{ flex: 1, padding: "14px 24px", borderRadius: 10, border: "2px solid #1e2d45", background: "transparent", color: "#e8eaf0", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: generatingPDF ? "wait" : "pointer" }}>
            {generatingPDF ? "⏳ Generating PDF..." : "📄 Generate Customer PDF"}
          </button>
          <button
            onClick={() => {
              setJobInfo({ customer: lead?.full_name || "", city: lead?.city || "", state: lead?.state || "", jobNumber: lead?.reference_number || "" });
              setProtRows(emptyRows()); setGutterRows(emptyRows()); setDownspouts(emptyDownspouts()); setElbows(emptyElbows()); setAddons(emptyAddons()); setQuotedTotal(null);
            }}
            style={{ padding: "14px 24px", borderRadius: 10, border: "2px solid #1e2d45", background: "transparent", color: "#4a5878", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </div>
  );
}
