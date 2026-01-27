
## Plan: Add New Metrics to Weekly Leaderboard and Create Conversion Funnel Visualization

### Overview

This plan updates the weekly canvasser leaderboard tables to include the three new metrics (Conversations Had, Not Interested, Without Damage) and adds a new canvasser conversion funnel visualization component showing the flow from Doors Knocked through to Closed leads.

---

### Part 1: Update Weekly Canvasser Leaderboard Table

#### File: `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`

**Changes:**

1. Update `WeeklyCanvasserEntry` interface (lines 5-17) to add new fields:
   ```typescript
   export interface WeeklyCanvasserEntry {
     rank: number;
     name: string;
     userId: string;
     leadsSet: number;
     leadsWithDamage: number;
     leadsWithoutDamage: number;    // NEW
     leadsClosed: number;
     conversationsHad: number;       // NEW
     notInterested: number;          // NEW
     hoursWorked: number;
     doorsKnocked: number;
     pointsEarned: number;
     contestPoints?: number;
     wagerPoints?: number;
   }
   ```

2. Update table headers (lines 46-57) to add new columns:
   ```
   | Place | Canvasser | Doors | Convos | Not Int. | Leads Set | w/ Damage | w/o Damage | Closed | Hours | Points |
   ```

3. Update table body cells to display the new data fields

---

### Part 2: Update Canvasser Leaderboard Data Fetching

#### File: `src/pages/canvasser/CanvasserLeaderboard.tsx`

**Changes to Weekly Leaderboard Fetch (lines 192-246):**

1. Update the select query (line 199) to include new fields:
   ```typescript
   .select("user_id, leads_set, leads_with_damage, leads_without_damage, leads_closed, conversations_had, not_interested, hours_worked, doors_knocked, points_earned")
   ```

2. Update the data mapping (lines 227-239) to include new fields in the entry objects

**Changes to Monthly Leaderboard Fetch (lines 248-315):**

1. Update the select query (line 259) to include new fields
2. Update the aggregation logic (lines 276-287) to sum the new metrics
3. Update the sorted array mapping to include new fields

---

### Part 3: Update Admin Leaderboards Data Fetching

#### File: `src/pages/admin/AdminLeaderboards.tsx`

**Changes:**

1. Update `WeeklyCanvasserEntry` interface (lines 64-74) to add new fields

2. Update weekly canvasser fetch query (line 453) to include new fields:
   ```typescript
   .select('user_id, leads_set, leads_with_damage, leads_without_damage, leads_closed, conversations_had, not_interested, hours_worked, doors_knocked, points_earned')
   ```

3. Update weekly data mapping (lines 474-494) to include new fields

4. Update monthly canvasser fetch query (line 503) similarly

5. Update monthly aggregation logic (lines 514-524) to sum new metrics

---

### Part 4: Create Canvasser Conversion Funnel Component

#### New File: `src/components/canvasser/CanvasserConversionFunnel.tsx`

A new visualization component showing the conversion funnel flow:

```text
Visual Design:
+------------------------------------------+
|     Canvasser Conversion Funnel          |
+------------------------------------------+
|                                          |
|  ████████████████████████████  Doors     |
|       100%  (1,200)            Knocked   |
|                                          |
|  ███████████████████████       Convos    |
|       75%   (900)              Had       |
|                                          |
|  █████████████                 Leads     |
|       40%   (480)              Set       |
|                                          |
|  ████████                      w/ Damage |
|       25%   (300)                        |
|                                          |
|  ██████                        w/o       |
|       15%   (180)              Damage    |
|                                          |
|  ████                          Closed    |
|       10%   (120)                        |
|                                          |
+------------------------------------------+
```

**Features:**
- Horizontal bar chart visualization using recharts `BarChart` with `Bar` components
- Gradient colors from primary to accent showing funnel stages
- Percentage conversion rates between each stage
- Absolute numbers displayed on bars
- Tooltip showing detailed breakdown
- Responsive design for mobile/desktop
- Works with aggregated team data or individual canvasser data

**Props:**
```typescript
interface FunnelData {
  doorsKnocked: number;
  conversationsHad: number;
  leadsSet: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  leadsClosed: number;
}

interface CanvasserConversionFunnelProps {
  data: FunnelData;
  title?: string;
}
```

---

### Part 5: Integrate Funnel into Pages

#### File: `src/pages/canvasser/CanvasserStats.tsx`

**Changes:**

1. Import the new component
2. Add a new collapsible section "Conversion Funnel" after "Key Metrics" section
3. Pass the user's personal metrics to the funnel component

```typescript
<Collapsible open={funnelOpen} onOpenChange={setFunnelOpen}>
  <CollapsibleTrigger asChild>
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
      <CardHeader className="py-4">
        <CollapsibleHeader isOpen={funnelOpen} title="Conversion Funnel" icon={GitCompare} />
      </CardHeader>
    </Card>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2">
    <CanvasserConversionFunnel 
      data={{
        doorsKnocked: metrics?.doors_knocked || 0,
        conversationsHad: metrics?.conversations_had || 0,
        leadsSet: metrics?.leads_set || 0,
        leadsWithDamage: metrics?.leads_with_damage || 0,
        leadsWithoutDamage: metrics?.leads_without_damage || 0,
        leadsClosed: metrics?.leads_closed || 0,
      }} 
    />
  </CollapsibleContent>
</Collapsible>
```

#### File: `src/pages/dashboard/AdminOverview.tsx`

**Changes:**

1. Import the new component
2. Add the funnel visualization in the Canvasser tab section showing aggregated team data:

```typescript
<CanvasserConversionFunnel 
  title="Team Conversion Funnel (YTD)"
  data={{
    doorsKnocked: totalDoorsKnocked,
    conversationsHad: totalConversationsHad,
    leadsSet: canvasserAggregates.totalLeadsSet,
    leadsWithDamage: canvasserAggregates.totalLeadsWithDamage,
    leadsWithoutDamage: totalLeadsWithoutDamage,
    leadsClosed: canvasserAggregates.totalLeadsClosed,
  }} 
/>
```

---

### Part 6: Update Admin Overview Aggregates

#### File: `src/pages/dashboard/AdminOverview.tsx`

**Changes:**

1. Update `CanvasserAggregates` interface (lines 28-34) to add new totals:
   ```typescript
   interface CanvasserAggregates {
     totalCanvassers: number;
     totalLeadsSet: number;
     totalLeadsClosed: number;
     totalLeadsWithDamage: number;
     totalLeadsWithoutDamage: number;   // NEW
     totalConversationsHad: number;      // NEW
     totalNotInterested: number;         // NEW
     totalDoorsKnocked: number;          // NEW
     totalHoursWorked: number;
   }
   ```

2. Update the aggregation reduce function (lines 355-364) to sum new fields

---

### Summary of Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Modify | Add 3 new columns to interface and table |
| `src/pages/canvasser/CanvasserLeaderboard.tsx` | Modify | Update data fetching for new fields |
| `src/pages/admin/AdminLeaderboards.tsx` | Modify | Update data fetching for new fields |
| `src/components/canvasser/CanvasserConversionFunnel.tsx` | Create | New funnel visualization component |
| `src/pages/canvasser/CanvasserStats.tsx` | Modify | Add funnel section |
| `src/pages/dashboard/AdminOverview.tsx` | Modify | Add funnel and update aggregates |

---

### Technical Implementation Details

**Funnel Visualization Approach:**
- Uses recharts `BarChart` component (already installed) with horizontal bars
- Each stage represented as a bar with width proportional to its value
- Color gradient from slate-600 (top) to emerald-500 (bottom) showing progression
- Conversion rate percentages displayed between stages
- Labels show both percentage and absolute count
- Responsive container adapts to screen size

**Data Flow:**
1. Database already has the new columns from previous migration
2. Queries updated to select new columns
3. Data aggregated at component level
4. Funnel component receives pre-aggregated data and renders visualization

**Design Considerations:**
- Matches existing card/section styling
- Uses existing color palette and typography
- Mobile-friendly with horizontal scroll for table
- Collapsible on canvasser stats page to manage screen real estate
