

## Fix Desktop Header Text Overlap

### Problem
At the `xl` breakpoint (1280px), the company name "Next Generation Roofing" appears alongside social icons, logo, nav links, and CTA buttons -- there is not enough horizontal space and the text overlaps with navigation links (visible in screenshot).

### Solution
Hide the company name text entirely on desktop. The circular logo is always visible and provides sufficient branding. The company name text only adds clutter at these widths and causes the overlap.

Additionally, hide social icons at the `lg` breakpoint (they currently show at `xl`) to give navigation links more breathing room. Social icons remain visible on mobile/tablet and can be accessed in the footer on desktop.

### Changes (1 file)

**`src/components/Header.tsx`**

1. **Hide company name text completely** -- Change `hidden xl:block` to `hidden 2xl:block` (or remove it entirely). Since 2xl is 1536px+, only very wide screens will show it. This eliminates the overlap at 1280px-1535px.

2. **Hide social icons on desktop nav sizes** -- Keep current `flex lg:hidden xl:flex` but change to `flex lg:hidden 2xl:flex` so social icons only reappear at 2xl (1536px+), freeing up space at xl for nav links and CTAs.

These two changes ensure no elements compete for space between 1024px and 1536px.
