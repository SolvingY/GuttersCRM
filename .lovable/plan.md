

# Enhanced Saved Checklists: Full Report View, Job Link Display & Auto-File to Job

## What's Changing

Three additions to the existing Saved Checklists + checklist infrastructure:

1. **Full report detail in the View drawer** — show all checklist responses, photos (thumbnails with signed URLs), doc links, notes, and linked job info
2. **Show linked job in the detail drawer** — display linked job name/address with a link to the lead detail page
3. **Auto-insert a `lead_files` row when a checklist is linked to a job** — so the report appears in the job's Files section

---

## 1. Expand SavedItem Interface & Query

**File:** `src/pages/tools/SavedChecklists.tsx`

Fetch additional fields from both tables:
- Hail assessments: `checklist_data`, `result`, `report_notes`, `storm_date`, `inspection_date`, photo paths, doc links, notes
- Production checklists: `responses`, `checklist_id`, `report_notes`, `notes`

Also fetch the linked job's label when `job_id` is present (join or separate query to `quote_requests` for `full_name`, `street_address`).

Store the full submission data in a `fullData` field on `SavedItem` so the drawer can render it.

## 2. Full Report Detail Drawer

**File:** `src/pages/tools/SavedChecklists.tsx`

Replace the current minimal detail drawer with a comprehensive read-only report view:

- **Header**: Property name, type badge, result badge
- **Job Link**: If linked, show job name + address with a clickable link to `/dashboard/leads/{jobId}` or `/admin/leads/{jobId}`
- **Meta**: Address, homeowner (name/phone/email), inspector, inspection date, storm date (hail only)
- **Checklist Items**: For hail assessments — render each section's checked items. For production — render checklist items from `responses` (fetch checklist template by `checklist_id` to get labels)
- **Photos**: Fetch signed URLs for photos from `hail-assessment-photos` bucket, render as thumbnail grid
- **Doc Links**: Show any Google Doc links as clickable external links
- **Notes / Report Notes**: Display both fields
- **Send Report button** at bottom

## 3. Auto-Link Report as Lead File

When a checklist is assigned to a job (either during submission or via the "Assign to Job" action in Saved Checklists), insert a row into `lead_files`:

```
lead_id: job.id
file_name: "Hail Assessment — 123 Main St" or "Pre-Build Checklist — 123 Main St"
file_type: "checklist"
file_url: internal reference (e.g., "checklist://hail_assessment/{submissionId}")
uploaded_by: user.id
```

This makes it appear in the job's Files section. Since `lead_files` uses `file_url` for downloads, we'll need to handle the `checklist://` protocol in `LeadFilesSection` — when clicked, open the Saved Checklists detail drawer or navigate to the saved checklists page with the item pre-selected.

**Changes needed:**
- `ProductionChecklists.tsx` → after insert, if `linkedJob` is set, also insert into `lead_files`
- `CommercialHailAssessmentForm.tsx` → same after save, if job linked
- `SavedChecklists.tsx` → in `handleAssignJob`, also insert into `lead_files`
- `LeadFilesSection.tsx` → add "checklist" to `fileTypeOptions` and handle the checklist file type badge

## 4. Add "checklist" File Type

**File:** `src/components/admin/LeadFilesSection.tsx`

- Add `{ value: "checklist", label: "Checklist" }` to `fileTypeOptions`
- Add badge class for checklist type: `checklist: "bg-teal-500/10 text-teal-600 border-teal-500/30"`
- For download: if `file_url` starts with `checklist://`, parse the type and ID, navigate to saved checklists detail instead of downloading

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/tools/SavedChecklists.tsx` | Expand query to fetch full data; rich detail drawer with checklist items, photos, doc links, job link; insert `lead_files` on job assign |
| `src/pages/tools/CommercialHailAssessmentForm.tsx` | Insert `lead_files` row when saving with a linked job |
| `src/pages/production/ProductionChecklists.tsx` | Insert `lead_files` row when saving with a linked job |
| `src/components/admin/LeadFilesSection.tsx` | Add "checklist" file type; handle `checklist://` URLs for navigation |

