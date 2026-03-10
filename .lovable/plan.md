

# Move "Canceled" Column Before Points on All Canvasser Leaderboards

## New Column Order

**WeeklyCanvasserLeaderboardTable** (used for Weekly, Monthly, YTD in canvasser + admin + scoreboard views):
Place → Canvasser → Doors → Convos → Not Int. → Leads Set → w/ Damage → w/o Damage → Closed → Close% → [Hours] → **Canceled** → Points

**CanvasserLeaderboardTable** (YTD standalone):
Place → Canvasser → Doors → Convos → Not Int. → Leads Set → w/ Damage → w/o Damage → Closed → Contracts Goal → % of Goal → **Canceled** → Points

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Move Canceled header/body/footer cells from after "Not Int." to just before "Points" |
| `src/components/dashboard/CanvasserLeaderboardTable.tsx` | Move Canceled header/body/footer cells from after "Not Int." to just before "Points" |

Both components are used across all three timeframes (Weekly, Monthly, YTD) in both canvasser and admin views, so this single change covers everything.

