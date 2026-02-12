

## Fix Header Layout, Mobile Social Links, and Sticky CTA

### Issues Identified

1. **Desktop header overlapping** -- The social icons, logo, and company name text crowd into the navigation links at certain screen widths (visible in the screenshot).
2. **Mobile social links missing** -- Social media icons are hidden below `sm` breakpoint (`hidden sm:flex`), but should remain visible in the mobile header.
3. **Sticky CTA routes to phone call** -- Should navigate to `/get-quote` instead of triggering a phone call.
4. **Sticky CTA language** -- Update text to "Get your estimate within 24 Hours".

---

### Changes

#### 1. `src/components/Header.tsx`

**Desktop overlap fix:**
- Hide the company name text ("Next Generation Roofing") at the `lg` breakpoint and only show it at `xl` to prevent it from colliding with nav links
- Reduce desktop nav gap from `gap-6` to `gap-4` for tighter spacing
- Hide social icons between `lg` and `xl` to free up space at the `lg` breakpoint where overlap occurs

**Mobile social links:**
- Change social icons container from `hidden sm:flex` to `flex` so they always show
- Make icons smaller on mobile (`w-3 h-3` at base, `w-4 h-4` at `sm`) and reduce padding to fit in the compact header

#### 2. `src/components/StickyCallCTA.tsx`

- Replace the `onClick` phone call handler with a `Link` to `/get-quote`
- Update the button text to: **"Get your estimate within 24 Hours"**
- Import `Link` from `react-router-dom`

---

### Technical Details

**Header.tsx changes:**
- Line 96: Change `hidden sm:flex` to `flex` for social icons visibility on all screens
- Line 103: Add responsive icon sizing (`w-3 h-3 sm:w-4 sm:h-4`) and smaller padding on mobile (`p-1 sm:p-2`)
- Line 118: Change `hidden lg:block` to `hidden xl:block` for the company name
- Line 126: Reduce nav gap to `gap-4`
- Line 96: Hide social icons at `lg` only, show at `xl`: `flex lg:hidden xl:flex`

**StickyCallCTA.tsx changes:**
- Remove `handleCall` function
- Wrap the button in a `Link` component pointing to `/get-quote`
- Replace all inner text spans with a single line: "Get your estimate within 24 Hours"

