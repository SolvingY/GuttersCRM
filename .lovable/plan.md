

# Fix Location View Links in AdminTimeClock

## Problem
The "View" location links use OpenStreetMap URLs which are blocked by the browser (`ERR_BLOCKED_BY_RESPONSE`). Both OSM and Google Maps embed-style URLs fail from the Lovable preview domain.

## Solution
Only modify `src/pages/admin/AdminTimeClock.tsx`:

### 1. Add `Copy` icon to lucide import (line 12)

### 2. Replace `renderLocationLink` function (lines 390-404)
New version will render:
- A Google Maps link (`https://maps.google.com/maps?q=LAT,LNG`) opening in a new tab
- A "Copy" button with clipboard fallback (try/catch around `navigator.clipboard.writeText`, falling back to `document.execCommand('copy')`)
- Readable coordinates displayed as text below the link

Layout per cell:
```text
View on Maps  [Copy]
32.4521, -97.1234
```

### 3. Update geofence zone map link (line 717)
Change from OpenStreetMap URL to `https://maps.google.com/maps?q=LAT,LNG`

### 4. Update helper text (line 762)
Change "Use OpenStreetMap or Google Maps" to just "Use Google Maps"

## Technical Notes
- Clipboard copy uses try/catch with `document.execCommand('copy')` fallback for browsers that block clipboard API
- All links use `target="_blank" rel="noopener noreferrer"`
- Only `AdminTimeClock.tsx` is modified -- no other files touched
- `Copy` icon added to existing lucide-react import

