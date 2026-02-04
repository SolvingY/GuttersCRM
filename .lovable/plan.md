

## Plan: Fix Lead-to-Close Ratio Display in Company Goals

### Problem

The Company Goals page currently shows two Lead-to-Close cards:
1. **"Sales Lead-to-Close Rate"** (lines 620-671) - Uses sales rep data with goal comparison
2. **"Canvasser Lead-to-Close Rate"** (lines 673-707) - Uses correct canvasser data but NO goal comparison

The **Target Lead-to-Close Goal%** configured in Company Goals is meant for the **Canvasser** Lead-to-Close ratio (Leads Closed / Leads Set), but the goal comparison is incorrectly applied to the Sales Rep card.

---

### Solution

1. **Remove** the "Sales Lead-to-Close Rate" card (lines 620-671)
2. **Update** the "Canvasser Lead-to-Close Rate" card to:
   - Rename to simply "Lead-to-Close Rate"
   - Add the goal comparison using `targetLeadToCloseRatio`
   - Display on target/below target indicator

---

### Changes Required

#### File: `src/pages/admin/CompanyGoals.tsx`

**Remove lines 620-671** (the Sales Lead-to-Close Rate card)

**Update lines 673-707** (Canvasser card) to include goal tracking:

```typescript
{/* Lead-to-Close Rate (Canvasser) */}
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-lg">
      <Percent className="h-5 w-5 text-primary" />
      Lead-to-Close Rate
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {(() => {
      const currentRate = progress.totalCanvasserLeadsSet > 0 
        ? (progress.totalLeadsClosed / progress.totalCanvasserLeadsSet) * 100 
        : 0;
      const targetRate = parseFloat(targetLeadToCloseRatio) || 0;
      const variance = currentRate - targetRate;
      const isOnTarget = targetRate === 0 || currentRate >= targetRate;
      
      return (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {currentRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {progress.totalLeadsClosed} closed / {progress.totalCanvasserLeadsSet} leads set
              </p>
            </div>
            {targetRate > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-xl font-semibold text-foreground">{targetRate.toFixed(1)}%</p>
              </div>
            )}
          </div>
          {targetRate > 0 && (
            <div className={`rounded-lg p-3 ${isOnTarget ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isOnTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isOnTarget ? '✓ On target' : '⚠ Below target'}
                </span>
                <span className={`text-sm font-semibold ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </>
      );
    })()}
  </CardContent>
</Card>
```

**Adjust grid layout** (line 619):
- Change `grid-cols-1 md:grid-cols-3` to `grid-cols-1 md:grid-cols-2` since we now have only 2 cards

---

### Result After Changes

The Company Goals page will show:

| Card | Data Source | Goal Comparison |
|------|-------------|-----------------|
| **Lead-to-Close Rate** | Canvasser (Leads Closed / Leads Set) | Uses Target Lead-to-Close Goal% |
| **Canvasser Cost per Lead** | Canvasser (Income / Leads Closed) | Uses Target Cost Per Lead Goal |

This correctly maps the Target Lead-to-Close Goal% to the canvasser metric as intended.

