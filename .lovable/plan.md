

# Accordion-Style Section Buttons

## Concept
Replace the current collapsible sections with **app-style pill/button triggers** that look like tappable list items (think iOS Settings rows). Only one section open at a time — clicking a new one closes the previous. Each trigger is a compact, rounded button with an icon, title, and a chevron indicator.

## Shared Component

**`src/components/dashboard/SectionAccordion.tsx`** — A wrapper that manages single-open-at-a-time state and renders children sections.

**`src/components/dashboard/AccordionButton.tsx`** — The trigger button for each section:

```text
┌──────────────────────────────────────────┐
│  🎯  Contests                        ▸  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  ⭐  Key Metrics                      ▾  │
├──────────────────────────────────────────┤
│  (expanded content)                      │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  📊  Weekly Performance               ▸  │
└──────────────────────────────────────────┘
```

Each button: `rounded-xl`, `bg-card`, `border`, `shadow-sm`, `hover:shadow-md`, `transition-all`, padding `py-3 px-4`. Active/open state gets `border-primary/50 bg-primary/5`. Icon on left, title in the middle, chevron on right. Feels like a phone app list item.

## Architecture

Rather than managing 10+ individual `useState` booleans, each dashboard will track a single `openSection: string | null` state. Clicking a section sets it; clicking the same one toggles it closed.

```typescript
const [openSection, setOpenSection] = useState<string | null>(null);
const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id);
```

Each section rendered as:
```tsx
<AccordionButton
  id="contests"
  title="Contests"
  icon={Target}
  isOpen={openSection === "contests"}
  onToggle={toggle}
>
  <ActiveContestWidget />
</AccordionButton>
```

## Files to Update

| File | Sections | Change |
|------|----------|--------|
| **New:** `src/components/dashboard/AccordionButton.tsx` | — | Shared button component |
| `src/pages/dashboard/MyStats.tsx` | 6 sections | Replace 6 `useState` booleans + `Collapsible` blocks with single `openSection` state + `AccordionButton` |
| `src/pages/canvasser/CanvasserStats.tsx` | 10 sections | Same pattern, replace all individual states |
| `src/pages/supplementer/SupplementerDashboard.tsx` | 3 sections | Same pattern |
| `src/pages/dashboard/AdminOverview.tsx` | ~4 sections | Same pattern for contract sources, sales rep perf, canvasser sections |
| `src/pages/admin/CompanyGoals.tsx` | Multiple goal sections | Same pattern |
| `src/pages/admin/LeadflowStatistics.tsx` | 2 sections | Same pattern |
| `src/components/dashboard/GoogleCalendarWidget.tsx` | 1 section | Convert to use AccordionButton (standalone, keeps its own state since it's embedded) |

## AccordionButton Styling Details

- **Closed**: `rounded-xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200`
- **Open**: `rounded-xl bg-primary/5 border border-primary/40 shadow-md`
- **Content area**: slides in below with `rounded-b-xl` and the trigger gets `rounded-b-none` when open
- Icon: `h-5 w-5 text-primary`
- Title: `font-semibold text-sm sm:text-base`
- Chevron: `h-4 w-4 text-muted-foreground`, rotates 90° on open (animated)

