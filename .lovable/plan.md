
## Get Estimate Form Expansions — All 3 Service Types

No database changes are needed. All form responses are stored in the `form_data` JSONB column of `quote_requests`, so new fields are automatically captured without any schema changes.

### Files to Modify
- `src/components/quote/CommercialQuestions.tsx`
- `src/components/quote/ResidentialQuestions.tsx`
- `src/components/quote/GutterQuestions.tsx`

---

### Commercial Form — New Fields

Added after the existing "Current Roof Type" question and before "What do you need?":

1. **Retail or Insurance Job?** — 2-button radio toggle: "Retail (Out of Pocket)" / "Insurance Claim"

2. **Active Insurance Claim?** — Yes / No radio (only shown if "Insurance Claim" selected above, but also asked standalone)

3. **Insurance Company** — Free-text input (shown when Insurance Claim is selected): `<Input placeholder="e.g., State Farm, Allstate..." />`

4. **Roof Age** — Select dropdown: "Less than 5 years", "5-10 years", "10-15 years", "15-20 years", "20+ years", "Don't Know"

5. **Routine Maintenance Done on This Roof?** — Yes / No / Not Sure radio

**Placement order in form:**
```
Building Type → Square Footage → Current Roof Type
→ [NEW] Retail or Insurance Job?
→ [NEW] Active Insurance Claim? (conditional)
→ [NEW] Insurance Company (conditional, text input)
→ [NEW] Roof Age
→ [NEW] Routine Maintenance Done?
→ What do you need? → Timeline → Additional Details
```

---

### Residential Form — New Fields

Added after "Number of Stories" and before "What do you need?":

1. **Roof Age** — Select dropdown: "Less than 5 years", "5-10 years", "10-15 years", "15-20 years", "20+ years", "Don't Know"

2. **Approximate Square Footage of Home** — Radio group: "Under 1,000 sq ft", "1,000-1,500 sq ft", "1,500-2,000 sq ft", "2,000-2,500 sq ft", "2,500-3,000 sq ft", "3,000-4,000 sq ft", "4,000+ sq ft"

3. **Do you have a mortgage on this property?** — Yes / No radio

4. **Do you have an active insurance claim?** — Yes / No radio

5. **Insurance Company** — Free-text input (shown when active claim is Yes): `<Input placeholder="e.g., State Farm, Allstate..." />`

**Placement order in form:**
```
Property Type → Home Age → Current Roof Type → Number of Stories
→ [NEW] Roof Age
→ [NEW] Home Square Footage
→ [NEW] Do you have a mortgage?
→ [NEW] Active Insurance Claim?
→ [NEW] Insurance Company (conditional, text input)
→ What do you need? → Known Issues → Timeline → Additional Details
```

---

### Gutter Form — New Fields

Added after the existing "Property Type" and before "What do you need?":

1. **Gutter Type** — Radio group: "K-Style (Standard)", "Half-Round", "Box Gutters", "Fascia Gutters", "Don't Know / Not Sure"

2. **Is this an insurance-related claim?** — Yes / No radio

3. **Insurance Company** — Free-text input (shown when Yes): `<Input placeholder="e.g., State Farm, Allstate..." />`

**Placement order in form:**
```
Property Type
→ [NEW] Gutter Type
→ [NEW] Insurance Claim?
→ [NEW] Insurance Company (conditional, text input)
→ What do you need? → Linear Footage → Current Issues → Timeline → Additional Details
```

---

### Technical Implementation Notes

**Conditional rendering pattern** — Insurance company input appears only when the user selects "Insurance Claim" or "Yes" for the active claim question:
```tsx
{data.activeClaim === "Yes" && (
  <div className="space-y-2">
    <Label>Insurance Company</Label>
    <Input
      placeholder="e.g., State Farm, Allstate..."
      value={data.insuranceCompany || ""}
      onChange={(e) => update("insuranceCompany", e.target.value)}
    />
  </div>
)}
```

**Yes/No radio pattern** — Reused across all three forms for binary questions:
```tsx
<div className="flex gap-3">
  {["Yes", "No"].map((opt) => (
    <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm",
      data.FIELD === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
      <input type="radio" name="FIELD" className="sr-only"
        checked={data.FIELD === opt} onChange={() => update("FIELD", opt)} />
      {opt}
    </label>
  ))}
</div>
```

**Input import** — `CommercialQuestions.tsx` and `ResidentialQuestions.tsx` need `import { Input } from "@/components/ui/input"` added. `GutterQuestions.tsx` also needs this added.

All new field values are captured automatically through the existing `onChange` handler pattern and stored in the `form_data` JSONB field without any backend changes.
