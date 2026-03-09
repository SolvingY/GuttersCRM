

# Fix StatsCard Values & Move Leaderboards Into Parent Sections

## Problems
1. **StatsCard values wrapping** — currency values like "$123,456" break onto two lines; the number and dollar sign need to stay on one line
2. **Leaderboards are standalone sections** — Sales Leaderboard and Canvasser Leaderboard should be nested inside the Sales Reps and Canvassers sections as AccordionButtons, not top-level SectionCarousel items

## Changes

### 1. `src/components/dashboard/StatsCard.tsx` — Keep values on one line
- Change the value `<p>` from `break-words` to `whitespace-nowrap` so dollar amounts and numbers never wrap
- Reduce mobile font size from `text-lg` to `text-base` to prevent overflow on small screens

### 2. `src/pages/dashboard/AdminOverview.tsx` — Move leaderboards inside parent sections

**Remove** these two standalone `SectionCarousel.Item` blocks:
- `<SectionCarousel.Item id="sales-leaderboard">` (lines 920-922)
- `<SectionCarousel.Item id="canvasser-leaderboard">` (lines 925-927)

**Add** them as `AccordionButton` sub-sections:

- Inside `<SectionCarousel.Item id="sales">`, after the "Contract Sources" accordion (line 803), add:
  ```
  <AccordionButton id="sales-leaderboard" title="Sales Leaderboard" icon={Trophy} ...>
    <ScoreboardSalesLeaderboard ytdUserDetails={userDetails} />
  </AccordionButton>
  ```

- Inside `<SectionCarousel.Item id="canvassers">`, after the "Team Conversion Funnel" accordion (line 907), add:
  ```
  <AccordionButton id="canvasser-leaderboard" title="Canvasser Leaderboard" icon={BarChart3} ...>
    <ScoreboardCanvasserLeaderboard ytdCanvasserDetails={canvasserDetails} />
  </AccordionButton>
  ```

### Result
- Top-level buttons: **Sales Reps**, **Canvassers**, **Supplementers**
- Inside Sales Reps: stats cards → CollectionsPipeline → Detailed Stats | Contract Sources | **Sales Leaderboard**
- Inside Canvassers: stats cards → Detailed Stats | Team Conversion Funnel | **Canvasser Leaderboard**
- All StatsCard values stay on a single line

