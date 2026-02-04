
## Plan: Update Company Goals Terminology and Add Cost Per Lead Metric

### Summary of Changes

The Company Goals page has incorrect terminology - it says "Leads" when it's actually tracking "Contracts" (closed leads). We need to:
1. Rename "Canvasser Leads Progress" to "Canvasser Contracts Progress"
2. Rename "Canvasser Cost per Lead" to "Cost Per Contract" 
3. Add a NEW "Cost Per Lead" calculation: Total Canvasser Income ÷ Total Leads Set

---

### Change 1: Rename "Canvasser Leads Progress" Card

**Current (lines 535-537):**
```
Canvasser Leads Progress
```

**Updated:**
```
Canvasser Contracts Progress
```

**Additional text changes in this card:**
- Line 564: "Remaining to goal: X leads" → "Remaining to goal: X contracts"
- Line 424: Label "Company Leads Closed Goal" → "Company Contracts Goal"
- Line 433-434: Helper text → "Combined target for all canvassers (closed contracts)"

---

### Change 2: Rename "Cost per Lead" to "Cost Per Contract"

**Current card (lines 676-678):**
```
Canvasser Cost per Lead
```

**Updated:**
```
Cost Per Contract
```

**Additional text changes:**
- Line 698: "$X paid / Y leads" → "$X paid / Y contracts"
- Line 456: Goal input label "Target Cost per Lead ($)" → "Target Cost per Contract ($)"
- Line 466-467: Helper text → "Target cost to acquire a closed contract"

---

### Change 3: Add NEW "Cost Per Lead" Metric Card

**Calculation:** `Total Canvasser Income ÷ Total Leads Set`

This shows what you're paying to generate each lead (before they close). Add a new card in the metrics row alongside the existing Lead-to-Close Rate and Cost Per Contract cards.

**New card layout:**
```
Cost Per Lead
─────────────────────
$X,XXX        (No goal tracking for this one - informational only)
$25,157 paid / 150 leads set

(Optional comparison: vs $Y per contract)
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/CompanyGoals.tsx` | Update all terminology; add new Cost Per Lead card |

---

### Detailed Code Changes

**Line 424:** Change label
```typescript
// From:
<Label htmlFor="leadsGoal">Company Leads Closed Goal</Label>
// To:
<Label htmlFor="leadsGoal">Company Contracts Goal</Label>
```

**Lines 432-434:** Update helper text
```typescript
<p className="text-xs text-muted-foreground">
  Combined target for all canvassers (closed contracts)
</p>
```

**Line 456:** Change label
```typescript
// From:
<Label htmlFor="targetCostPerLead">Target Cost per Lead ($)</Label>
// To:
<Label htmlFor="targetCostPerLead">Target Cost per Contract ($)</Label>
```

**Lines 466-467:** Update helper text
```typescript
<p className="text-xs text-muted-foreground">
  Target cost to acquire a closed contract
</p>
```

**Lines 535-537:** Change card title
```typescript
// From:
Canvasser Leads Progress
// To:
Canvasser Contracts Progress
```

**Line 564:** Change remaining text
```typescript
// From:
{Math.max(0, leadsGoalNum - progress.totalLeadsClosed).toLocaleString()} leads
// To:
{Math.max(0, leadsGoalNum - progress.totalLeadsClosed).toLocaleString()} contracts
```

**Lines 676-678:** Change card title
```typescript
// From:
Canvasser Cost per Lead
// To:
Cost Per Contract
```

**Line 698:** Change subtitle
```typescript
// From:
{formatCurrency(progress.totalCanvasserIncome)} paid / {progress.totalLeadsClosed} leads
// To:
{formatCurrency(progress.totalCanvasserIncome)} paid / {progress.totalLeadsClosed} contracts
```

**NEW: Add Cost Per Lead Card (after the Cost Per Contract card)**
```typescript
{/* Cost Per Lead (based on leads set, not closed) */}
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-lg">
      <Calculator className="h-5 w-5 text-blue-500" />
      Cost Per Lead
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {(() => {
      const costPerLead = progress.totalCanvasserLeadsSet > 0 
        ? progress.totalCanvasserIncome / progress.totalCanvasserLeadsSet 
        : 0;
      const costPerContract = progress.totalLeadsClosed > 0 
        ? progress.totalCanvasserIncome / progress.totalLeadsClosed 
        : 0;
      
      return (
        <>
          <div>
            <p className="text-3xl font-bold text-foreground">
              {progress.totalCanvasserLeadsSet > 0 ? formatCurrency(costPerLead) : 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(progress.totalCanvasserIncome)} paid / {progress.totalCanvasserLeadsSet} leads set
            </p>
          </div>
          {progress.totalLeadsClosed > 0 && progress.totalCanvasserLeadsSet > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">vs Cost Per Contract</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(costPerContract)}
              </p>
            </div>
          )}
        </>
      );
    })()}
  </CardContent>
</Card>
```

**Update grid layout (line 619):**
Change from `md:grid-cols-2` to `md:grid-cols-3` to accommodate the third card:
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

---

### Visual Result

After implementation, the Company Goals page will show:

| Card | Value | Formula |
|------|-------|---------|
| Canvasser Contracts Progress | 5 / 1,000 goal | Leads Closed (contracts) |
| Cost Per Contract | $5,031 | Total Income ÷ Leads Closed |
| Cost Per Lead | $168 (example) | Total Income ÷ Leads Set |

**Key Distinction:**
- **Cost Per Contract** = What you pay for each closed sale
- **Cost Per Lead** = What you pay to produce each canvassed lead (before knowing if it closes)

---

### Explanation Card Update (lines 733-737)

Update the "How Company Goals Work" section to reflect new terminology:
```typescript
<ul className="list-disc list-inside space-y-1">
  <li>Set annual targets for combined sales revenue and canvasser contracts closed</li>
  <li>Progress is automatically calculated from all team members' metrics</li>
  <li>Sales reps contribute to the revenue goal, canvassers contribute to the contracts goal</li>
  <li>Track company-wide performance against targets in real-time</li>
  <li>Cost Per Lead shows acquisition cost; Cost Per Contract shows closed sale cost</li>
</ul>
```
