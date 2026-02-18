
## Two New Features: DNA Score Trend Chart + Quarterly Performance Review Log

---

### Feature 1: Team DNA Score Trend Chart (ContractorProfileSheet)

**What it does:** Shows a line chart of how the *team's overall average DNA alignment score* has trended over time as new members completed their assessments. Each data point represents a moment in time when a member completed their assessment, with the running team average recalculated at each point.

**Data source:** The `job_applications` table already has `dna_score`, `alignment_category`, `hired_at`, and `created_user_id` for all active team members. We fetch all `status = 'hired'` records with non-null `created_user_id`, sort by `hired_at` date, and compute a running average at each point in time.

**Chart type:** A Recharts `LineChart` using the existing `ChartContainer` / `ChartTooltip` components already installed in the project. Displayed inside a new collapsible section called "Team DNA Score Trend."

**Where it lives:** Inside `ContractorProfileSheet.tsx`. Since this is team-wide data (not user-specific), it makes sense to show it here as a secondary informational panel — visible for all active team members when viewing their profile. It contextualizes their individual score against the team's historical trajectory.

**Running average logic (frontend):**
```typescript
// Sort all team assessments by hire_at date
// Compute running average at each point
const trendData = assessments
  .sort((a, b) => new Date(a.hired_at).getTime() - new Date(b.hired_at).getTime())
  .map((entry, idx, arr) => {
    const runningScores = arr.slice(0, idx + 1).map(e => e.dna_score);
    const avg = runningScores.reduce((s, v) => s + v, 0) / runningScores.length;
    return {
      date: format(new Date(entry.hired_at), "MMM ''yy"),
      avg: Math.round(avg * 10) / 10,
      memberName: entry.full_name,
    };
  });
```

**No new database query needed** — the sheet already queries `job_applications` for the current user. We add a second query inside the sheet for all hired team members (just `dna_score`, `hired_at`, `full_name`, `created_user_id`) to build the trend.

---

### Feature 2: Quarterly Performance Review Log

**Database change needed:** Create a new `performance_reviews` table:

```sql
CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,           -- the team member being reviewed
  reviewed_by uuid NOT NULL,       -- the admin who wrote the review
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  quarter text NOT NULL,           -- e.g. "Q1 2026"
  overall_rating integer,          -- 1-5 stars
  review_notes text,               -- general performance notes
  goals_set text,                  -- goals set in this review
  action_items text,               -- action items / follow-ups
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Admins only can insert/update/delete; admins can read all
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reviews"
  ON public.performance_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

**UI in ContractorProfileSheet:**
A new "Quarterly Performance Reviews" section appears below the Admin Notes section. It contains:

- **Review history log** — Existing reviews listed in reverse chronological order. Each review card shows:
  - Quarter label (e.g. "Q1 2026") + review date
  - Star rating (1–5)
  - Review notes, goals set, action items (collapsible if long)

- **"Add Review" button** — Opens an inline form (not a modal, stays in the sheet) with:
  - Quarter selector (auto-suggests current quarter, e.g. "Q2 2026")
  - Star rating (1–5 clickable stars)
  - Textarea: "Performance Notes"
  - Textarea: "Goals Set"
  - Textarea: "Action Items"
  - Save / Cancel buttons

**Quarter auto-detection logic:**
```typescript
const getCurrentQuarter = () => {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
};
```

---

### Files to Create/Modify

| File | Change |
|---|---|
| `supabase/migrations/TIMESTAMP_performance_reviews.sql` | New table + RLS |
| `src/components/admin/ContractorProfileSheet.tsx` | Add DNA trend chart section + performance review CRUD section |

**New imports needed in ContractorProfileSheet:**
- `LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer` from `recharts` (already installed)
- `ChartContainer, ChartTooltip, ChartTooltipContent` from `@/components/ui/chart`
- `PlusCircle, Star` icons (Star already imported)
- `Input` from `@/components/ui/input`

---

### Technical Architecture

**DNA Trend Chart query (added to ContractorProfileSheet):**
```typescript
const { data: allHiredApps = [] } = useQuery({
  queryKey: ["team-trend-apps"],
  enabled: !!user?.id,
  queryFn: async () => {
    const { data } = await supabase
      .from("job_applications")
      .select("dna_score, hired_at, full_name, created_user_id")
      .eq("status", "hired")
      .not("created_user_id", "is", null)
      .not("dna_score", "is", null)
      .order("hired_at", { ascending: true });
    return data ?? [];
  },
});
```

**Performance reviews query:**
```typescript
const { data: reviews = [], refetch: refetchReviews } = useQuery({
  queryKey: ["performance-reviews", user?.id],
  enabled: !!user?.id,
  queryFn: async () => {
    const { data } = await supabase
      .from("performance_reviews")
      .select("*")
      .eq("user_id", user!.id)
      .order("review_date", { ascending: false });
    return data ?? [];
  },
});
```

**RLS note:** The `profiles` table already has a policy for users to update their own profile. The new `performance_reviews` table is admin-only. No end-user access is required.

---

### Visual Layout Summary

Inside `ContractorProfileSheet`, after the DNA Assessment section and before Files:

```text
┌─────────────────────────────────────────────────┐
│  📈  Team DNA Score Trend                        │
│  Running avg as members completed assessments    │
│  [Line chart: date → avg score, 0-30 scale]     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  📋  Quarterly Performance Reviews    [+ Add]   │
│  ─────────────────────────────────────────────  │
│  Q1 2026 · Feb 18, 2026 · ★★★★☆               │
│  Notes: Strong quarter, closed 12 deals...      │
│  Goals: $180k revenue target for Q2             │
│  Actions: Complete advanced sales training       │
│  ─────────────────────────────────────────────  │
│  Q4 2025 · Dec 15, 2025 · ★★★☆☆               │
│  Notes: Needed coaching on follow-ups...        │
└─────────────────────────────────────────────────┘
```
