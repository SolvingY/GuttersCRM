

# Restructure Sales & Canvasser Sections with Sub-Buttons

## Problem
Contract Sources and Team Conversion Funnel were made into top-level SectionCarousel buttons, but they should be **nested inside** the Sales Reps and Canvassers sections respectively. Additionally, the detailed stats tables should also be togglable sub-buttons within each section.

## Approach
Use the existing `AccordionButton` component inside each `SectionCarousel.Item` to create collapsible sub-sections. Each parent section keeps its summary stats cards at the top, then has accordion buttons for the detail views.

## Changes to `src/pages/dashboard/AdminOverview.tsx`

1. **Remove** the standalone `<SectionCarousel.Item id="contract-sources">` and `<SectionCarousel.Item id="conversion-funnel">` items.

2. **Inside `<SectionCarousel.Item id="sales">`** — after the stats cards grid and CollectionsPipelineWidget, add two `AccordionButton` sub-sections:
   - **"Detailed Stats"** — wraps the existing sales rep performance table
   - **"Contract Sources"** — wraps the contract sources breakdown (moved back in)

3. **Inside `<SectionCarousel.Item id="canvassers">`** — after the stats cards grid, add two `AccordionButton` sub-sections:
   - **"Detailed Stats"** — wraps the existing canvasser performance table
   - **"Team Conversion Funnel"** — wraps the CanvasserConversionFunnel component (moved back in)

4. Add local state for sub-section toggles (e.g. `openSubSection` with a simple string state, or reuse individual booleans).

### Result
- Top-level buttons: Sales Reps, Canvassers, Supplementers, Sales Leaderboard, Canvasser Leaderboard
- Inside Sales Reps: summary cards → sub-buttons for "Detailed Stats" and "Contract Sources"
- Inside Canvassers: summary cards → sub-buttons for "Detailed Stats" and "Team Conversion Funnel"

