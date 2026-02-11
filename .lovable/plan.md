

## Fix Header Tablet Overlap

The problem: At tablet widths (768px-1023px), the header tries to display social icons + logo + company name text AND the "Get an Estimate" + phone CTA buttons simultaneously. The desktop nav links are correctly hidden (they only show at `lg`/1024px+), but the company name and CTA buttons both appear at `md`/768px, causing them to overlap and clip.

### Changes (1 file)

**`src/components/Header.tsx`**

1. **Hide the company name text until `lg` breakpoint** -- Change `hidden md:block` to `hidden lg:block` on the "Next Generation Roofing" text span (line 118). This prevents the long company name from competing for space with the CTA buttons at tablet width.

2. **Hide CTA buttons until `lg` breakpoint** -- Change `hidden md:flex` to `hidden lg:flex` on both the "Get an Estimate" link (line 197) and the phone number link (line 203). At tablet sizes, these will be accessible via the hamburger menu instead.

3. **Hide social icons at small tablet sizes** -- Change the social icons container to use `hidden sm:flex` (line 96) so on very narrow tablets they collapse, giving more room to the logo and menu button.

These three changes ensure the header elements never compete for the same space at tablet widths. Users on tablets will still access all links via the mobile hamburger menu, which is already fully functional with "Get an Estimate," "Apply Now," and the phone call button.

