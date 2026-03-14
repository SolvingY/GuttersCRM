

# Lead Card Enhancements + Warranty Fix + Report Settings Fix

## 5 Issues to Fix

### 1. Warranty doesn't save to card
**Root cause**: Two bugs:
- `WarrantyDocument.tsx` sends `customerName`/`customerEmail` to the edge function but it expects `clientName`/`clientEmail` — so the email silently fails and the param mismatch means the function returns 400
- Navigation after save always goes to `/dashboard/leads/${id}` even when accessed from admin at `/admin/leads/:id`
- The admin navigates to `/dashboard/leads/:id/warranty` but no admin-specific form routes exist under `/admin`

**Fix**: 
- Fix the edge function call params to use `clientName`/`clientEmail` + pass `quoteAmount`, `referenceNumber`, `completedAt` which the edge function also uses
- Detect admin vs dashboard path from `location.pathname` for back-navigation
- Add admin form routes in `App.tsx` under `/admin/leads/:id/warranty` (and other forms)
- Invalidate `lead-forms` query after save using `useQueryClient`

### 2. Completed documents displayed at top of lead card
**Fix in `LeadDetail.tsx`**: Add a compact "Completed Documents" summary row above the document action buttons showing badges for each completed form (appointment, inspection, contract, warranty) with green checkmarks.

### 3. Profitability in header
**Fix**: Move `ProfitSummaryCard` from line 780 (below Follow-up) up into the header area (after the status/priority selects, around line 540).

### 4. Progress/status bar at top
**Fix**: Add a progress bar below the header showing lead lifecycle completion percentage. Calculate based on: has estimate, has appointment, has inspection, has contract, has warranty, status progression, profitability entered.

### 5. Profitability Recipients card not showing in Reports
**Root cause**: `ProfitabilityRecipientsCard` was added to `ReportSettings.tsx` which is imported but **never rendered in any route**. The actual reports page is `NotificationRouting.tsx` at `/admin/notifications`.

**Fix**: Move `ProfitabilityRecipientsCard` from `ReportSettings.tsx` into `NotificationRouting.tsx`, placed right after `CanvasserEODCard`.

### 6. "Send warranty to homeowner" option after save
**Fix**: After saving the warranty, show a confirmation dialog asking "Send warranty documents to homeowner?" with Yes/No. If yes, invoke `send-warranty-email` with the correct params. Don't auto-fire it — let the user choose.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/dashboard/forms/WarrantyDocument.tsx` | Fix edge function params, smart navigation, query invalidation, post-save email prompt dialog |
| `src/pages/admin/LeadDetail.tsx` | Move profit summary to header, add progress bar, add completed docs summary, reorder sections |
| `src/pages/admin/NotificationRouting.tsx` | Add ProfitabilityRecipientsCard below CanvasserEODCard |
| `src/pages/admin/ReportSettings.tsx` | Remove ProfitabilityRecipientsCard (moved to NotificationRouting) |
| `src/App.tsx` | Add admin form routes (`/admin/leads/:id/warranty`, etc.) |

