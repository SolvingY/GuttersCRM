

# Add "Complete" Status & Flashing Indicator for New/Untouched Leads

## Changes

### 1. `src/pages/admin/Leads.tsx`
- Add `"complete"` to `statusCarouselConfig` with a checkmark icon (e.g. `CheckCircle2` or a new `CircleCheck`)
- Add `complete` entry to `statusColors`
- Change `statusSection` default from `"all"` to `null` so nothing is auto-opened on load — buttons are visible but no section is expanded until clicked

### 2. `src/components/dashboard/SectionCarousel.tsx` — Add flashing dot support
- Add optional `indicator` prop to `SectionItemProps` (e.g. `indicator?: "pulse"`)
- When `indicator === "pulse"`, render a small red flashing dot (`animate-pulse`) next to the button title
- In `Leads.tsx`, pass `indicator="pulse"` on the "New" button (status `new`, count > 0) and any status where leads have `status === "new"` or have never been contacted/touched

### 3. Implementation detail
- The `SectionCarousel` `onToggle` currently toggles open/closed. With default `null`, all sections start collapsed. Clicking a button opens it; clicking again closes it. This already works since `activeSection` starts as `null`.
- For the flashing dot: in `Leads.tsx`, determine which status buttons need the indicator based on count > 0 for `"new"` status. Pass this info through a new optional prop on `SectionCarousel.Item`.

