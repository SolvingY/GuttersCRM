

# Commercial Roof Hail Assessment Form — Full Implementation Plan

## Overview
A multi-section inspection checklist tool with photo uploads, Google Doc linking, conditional visibility, and database persistence. Follows the ToolsHub card → dedicated page pattern used by the Gutter Estimator.

---

## Step 1 — Database Migration

Create `commercial_hail_assessments` table with metadata columns, JSONB `form_data` and `photo_paths`, RLS for user-own and admin access. Create `hail-assessment-photos` private storage bucket with 2MB limit, JPEG/PNG/WEBP only, RLS scoped by user folder path. Admin SELECT policy on storage for viewing all photos.

---

## Step 2 — Checklist Data File

**New file:** `src/data/hailAssessmentChecklist.ts`

Exports typed interfaces (`ChecklistItem`, `ChecklistSection`, `ChecklistResultOption`) and a `HAIL_ASSESSMENT_SECTIONS` constant with all 10 sections verbatim from the spec. This is the single source of truth — the form component reads from it, never hardcodes labels.

---

## Step 3 — Image Compression Utility

**New file:** `src/utils/imageCompression.ts`

Canvas-based client-side compression: max 1920px dimension, 75% JPEG quality. Returns `{ blob, previewUrl, sizeMB, name }`. Photos stay as local previews until form submits.

---

## Step 4 — Main Form Component

**New file:** `src/pages/tools/CommercialHailAssessmentForm.tsx`

1. **Meta header** — Property name, address, inspector name, inspection date, storm date
2. **Overall progress bar** — checked items / total visible items
3. **Collapsible sections** — Each with progress `(X/Y)` badge and bar in header. Section 1 defaults open, rest closed.
4. **Applicability toggles** — Sections 3/4/5/8 show Yes/No. Section 9 depends on Section 8 = Yes.
5. **Per-item layout** (when checked): photo uploader with thumbnails/remove/add → Google Doc link input with Open↗ → notes textarea. Scale-required items show amber `📏 Scale required` badge.
6. **Section 10** — Radio-style result cards with photo + doc link + notes when selected.
7. **Validation** — Red error block above submit. Required meta fields, photo requirements per checked item, minPhotos, result selection + photo.
8. **Submit flow:**
   - Validate → show errors and stop if any
   - Generate `assessmentId` client-side using `crypto.randomUUID()` — use as both the primary key insert value AND the storage path prefix `{userId}/{assessmentId}/` so photo paths are consistently organized before the row exists
   - Compress & upload all photos to `hail-assessment-photos/{userId}/{assessmentId}/{itemId}/{filename}`
   - Insert row to `commercial_hail_assessments` with the pre-generated ID, full `form_data` JSONB, and photo storage paths
   - Show success state with result badge

Back link follows GutterEstimator pattern: `← Back to Tools`.

---

## Step 5 — Route & Tools Integration

| File | Change |
|------|--------|
| `src/App.tsx` | Add lazy import, route `tools/hail-assessment` under `/dashboard` and `/production` |
| `src/pages/dashboard/ToolsHub.tsx` | Add card: Commercial Hail Assessment → `/dashboard/tools/hail-assessment` |
| `src/pages/production/ProductionToolsHub.tsx` | Add card → `/production/tools/hail-assessment` |

---

## Step 6 — Admin Submissions View

Add a "Hail Assessments" tab (4th tab) to `ContractorManagement.tsx` (currently has 3 tabs — safe to add):

- Table listing all `commercial_hail_assessments` ordered by `created_at` DESC
- Columns: Date, Inspector, Property, Address, Result (color-coded badge), Photo count
- Result badges: green (No Damage), amber (Possible), red (Confirmed)
- Click row → read-only detail drawer showing full form data, photos, doc links, notes
- Signed URLs for photos use `supabase.storage.from('hail-assessment-photos').createSignedUrl(path, 3600)` — 1 hour expiry, generated on drawer open (not page load) to avoid stale URLs on long sessions

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | New table + bucket + RLS |
| `src/data/hailAssessmentChecklist.ts` | **New** — typed checklist schema, 10 sections |
| `src/utils/imageCompression.ts` | **New** — client-side JPEG compression |
| `src/pages/tools/CommercialHailAssessmentForm.tsx` | **New** — main form component |
| `src/App.tsx` | Add 2 routes (dashboard + production) |
| `src/pages/dashboard/ToolsHub.tsx` | Add tool card |
| `src/pages/production/ProductionToolsHub.tsx` | Add tool card |
| `src/pages/admin/ContractorManagement.tsx` | Add Hail Assessments tab with list + detail drawer |

