

# Make Contract Sources and Team Conversion Funnel into SectionCarousel Buttons

## Problem
The "Contract Sources" widget and "Team Conversion Funnel (YTD)" are currently rendered as static content inside the Sales Reps and Canvassers sections respectively. The user wants them to be their own top-level collapsible buttons in the `SectionCarousel`.

## Changes

### `src/pages/dashboard/AdminOverview.tsx`

1. **Extract "Contract Sources"** from inside the `<SectionCarousel.Item id="sales">` block (lines 619-672) and place it as its own `<SectionCarousel.Item id="contract-sources" title="Contract Sources" icon={GitCompare}>` after the Sales Reps item.

2. **Extract "Team Conversion Funnel"** from inside the `<SectionCarousel.Item id="canvassers">` block (lines 817-828) and place it as its own `<SectionCarousel.Item id="conversion-funnel" title="Team Conversion Funnel" icon={Target}>` after the Canvassers item.

The resulting button order will be:
- Sales Reps → **Contract Sources** → Canvassers → **Team Conversion Funnel** → Supplementers → Sales Leaderboard → Canvasser Leaderboard

No new files or components needed — just rearranging existing content into their own `SectionCarousel.Item` wrappers.

