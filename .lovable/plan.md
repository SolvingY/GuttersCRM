

## Update Social Media Links

The Instagram gallery and Apply Now thank-you page currently use an old Instagram handle (`nextgenroofingok`). These need to be updated to the correct URLs. The Facebook link in `index.html` also needs updating.

### Changes

**`src/components/InstagramGallery.tsx`**
- Update `INSTAGRAM_PROFILE_URL` (line 45) from `https://instagram.com/nextgenroofingok` to `https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv`
- Update all 6 post `permalink` values (lines 10, 16, 22, 28, 34, 40) to the same Instagram URL
- Update the `@nextgenroofingok` display text (line 66 area) to `@next_generation_roofing`

**`src/pages/apply/ApplicationThankYou.tsx`**
- Already uses the correct URLs -- no changes needed (Facebook: `https://www.facebook.com/profile.php?id=100064277643225`, Instagram: `https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv`)

**`index.html`**
- Update the `sameAs` structured data (lines 60-61) from:
  - `https://www.facebook.com/nextgenroofingok` to `https://www.facebook.com/profile.php?id=100064277643225`
  - `https://www.instagram.com/nextgenroofingok` to `https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv`

### Files Summary

| File | Change |
|------|--------|
| `src/components/InstagramGallery.tsx` | Update all Instagram URLs and display handle |
| `index.html` | Update structured data social links |

No changes needed to `Footer.tsx` or `ApplicationThankYou.tsx` as they already use the correct URLs.

