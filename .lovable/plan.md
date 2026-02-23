

# Two Changes: Full Scope of Work on Contract + Fix Welcome Modal Notifications

---

## Change 1: Contract Scope of Work — Match Full Estimate PDF

**Problem:** The contract currently only shows the product line items (e.g., `5" Standard Gutters & 2x3 Downspouts — $4,345.00`). The estimate PDF includes much more detail under each line item: warranty bullets, fine print, and the "What's Included" section.

**Fix in `src/pages/dashboard/forms/GutterContract.tsx` (lines 99-116):**

Expand the auto-generated scope to include everything the estimate PDF shows:

1. **"What's Included" items** (matching `generateEstimatePDF.ts` lines 102-121):
   - All labor and installation
   - Material costs
   - Applicable taxes
   - Removal and haul-off of existing gutters
   - Job site cleanup
   - All applicable warranties as listed below
   - Note: Removal of existing gutters is included unless otherwise specified

2. **Gutter/Downspout line** with price (already done)

3. **Gutter warranties** under the gutter line:
   - Lifetime Leak-Free Guarantee -- With yearly scheduled inspection
   - 25-Year Baked-On Paint Warranty -- Applies to gutters and downspouts

4. **Protection line** with price (if applicable, already done)

5. **Protection warranty** under the protection line:
   - If "Cheap Mesh": no warranty note
   - If "Gutter RX Collector": 10-Year Manufacturer Warranty
   - Otherwise: 45-Year Manufacturer Warranty

The scope textarea will be pre-filled with all of these details as multi-line text.

---

## Change 2: Welcome Modal — Stop Notifications for Won/Scheduled/Completed Leads

**Problem:** A lead with status "scheduled" still appears in "Open Leads - Action Required", "New Lead Assigned", and "Overdue Follow-up" sections. Once a lead is won, scheduled, or completed, the rep should only see install reminders, not follow-up prompts.

**Fix in `src/components/dashboard/WelcomeModal.tsx`:**

Three query changes — filter out scheduled and completed leads from notification sections:

- **Overdue follow-ups** (line 318): Change filter from `("won","lost")` to `("won","lost","scheduled","completed")`
- **Open leads** (line 329): Change filter from `("won","lost")` to `("won","lost","scheduled","completed")`
- **Lead updates / my lead IDs** (line 344): Change filter from `("won","lost")` to `("won","lost","scheduled","completed")`

This means only leads in `new`, `contacted`, or `quoted` status will trigger action-required notifications. Scheduled leads will no longer nag the rep to "follow up to close them out."

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/dashboard/forms/GutterContract.tsx` | Expand scope of work to include What's Included, warranties, and protection warranty details |
| `src/components/dashboard/WelcomeModal.tsx` | Exclude scheduled/completed leads from overdue, open leads, and lead update queries |

