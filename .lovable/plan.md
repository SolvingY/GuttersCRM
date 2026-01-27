

## Plan: Add Certification Badges and Instagram Gallery Section

### Overview
This plan adds certification badges under the logo on the homepage hero section and creates a new Instagram Gallery section with manually managed posts that you can update periodically.

---

### Part 1: Add Certification Badges to Hero Section

#### Files to Create/Modify

**1. Copy uploaded badge images to project assets**

Copy the 3 certification badge images to `src/assets/`:
- `user-uploads://8e6afa40ca54f627df7698cf9a122ef6eeebd18c-602e3757d9ced200045a579b.png` to `src/assets/badge-bbb.png`
- `user-uploads://Certified_Plus.png` to `src/assets/badge-gaf.png`
- `user-uploads://IICRC-Logo-web.png` to `src/assets/badge-iicrc.png`

**2. Modify `src/components/Hero.tsx`**

Add a certification badges row directly under the hero logo:

```typescript
import bbbBadge from "@/assets/badge-bbb.png";
import gafBadge from "@/assets/badge-gaf.png";
import iicrcBadge from "@/assets/badge-iicrc.png";

// Inside the Hero component, after the logo div:
<div className="flex justify-center items-center gap-4 sm:gap-6 mt-4 lg:mt-2">
  <img 
    src={bbbBadge} 
    alt="BBB Accredited Business" 
    className="h-12 sm:h-14 md:h-16 w-auto object-contain bg-white/90 rounded-lg p-2"
  />
  <img 
    src={gafBadge} 
    alt="GAF Certified Plus Residential Roofing Contractor" 
    className="h-12 sm:h-14 md:h-16 w-auto object-contain"
  />
  <img 
    src={iicrcBadge} 
    alt="IICRC Certified" 
    className="h-10 sm:h-12 md:h-14 w-auto object-contain bg-white rounded-lg p-1"
  />
</div>
```

**Design Notes:**
- Badges will appear in a horizontal row centered under the logo
- Responsive sizing: smaller on mobile, larger on desktop
- White/light backgrounds added to badges that need contrast against the dark hero overlay
- Proper alt text for accessibility and SEO

---

### Part 2: Create Instagram Gallery Section

#### Files to Create

**1. Create `src/components/InstagramGallery.tsx`**

A new component for displaying manually managed Instagram posts:

```text
Structure:
+-------------------------------------------+
|         Follow Us On Instagram            |
|            @nextgenroofingok              |
+-------------------------------------------+
|  [Post 1]  [Post 2]  [Post 3]  [Post 4]   |
|   Image     Image     Image     Image     |
|   Hover     Hover     Hover     Hover     |
|   Effect    Effect    Effect    Effect    |
+-------------------------------------------+
|       [Follow Us on Instagram]            |
+-------------------------------------------+
```

**Features:**
- Grid layout showing 4-6 recent Instagram posts (configurable)
- Each post displays the image with hover overlay
- Clicking a post opens the Instagram post in a new tab
- Responsive: 2 columns on mobile, 4 columns on desktop
- Instagram icon and branding
- "Follow Us" CTA button linking to your Instagram profile

**Configuration Array (easy to update):**
```typescript
const instagramPosts = [
  {
    id: '1',
    imageUrl: '/instagram/post1.jpg', // You'll add images to public/instagram/
    permalink: 'https://instagram.com/p/POSTID1',
    caption: 'Check out this beautiful roof installation...'
  },
  // ... more posts
];
```

**2. Add to `src/pages/Index.tsx`**

Import and add the InstagramGallery component after the Testimonials section:

```typescript
import { InstagramGallery } from "@/components/InstagramGallery";

// In the return statement, add before ContactSection:
<section id="instagram">
  <InstagramGallery />
</section>
```

---

### Part 3: Project Structure for Instagram Images

**Create directory structure:**
```text
public/
  instagram/
    post1.jpg
    post2.jpg
    post3.jpg
    post4.jpg
    post5.jpg
    post6.jpg
```

You can update these images anytime by replacing the files in the `public/instagram/` folder or by uploading new images through chat.

---

### Technical Details

**Instagram Gallery Component Features:**
- Section background using the `section-alt` color for visual separation
- Instagram brand gradient accent on hover
- Lazy loading for images (better performance)
- Smooth hover animations with scale effect
- Caption preview on hover
- Responsive grid: 2 cols (mobile) / 3 cols (tablet) / 4 or 6 cols (desktop)

**Styling Approach:**
- Uses existing Tailwind classes and design system
- Consistent with site's Oswald heading font
- Matches the professional roofing company aesthetic
- Dark mode compatible (inherits from theme)

---

### Implementation Steps

1. Copy badge images to `src/assets/`
2. Update `Hero.tsx` to display certification badges
3. Create `InstagramGallery.tsx` component
4. Create placeholder images in `public/instagram/`
5. Update `Index.tsx` to include the Instagram section
6. Provide instructions for updating Instagram content

---

### How to Update Instagram Posts (After Implementation)

When you want to update the Instagram gallery:
1. Take screenshots of your latest Instagram posts (or download the images)
2. Upload the new images through chat
3. Ask me to replace the old posts with the new ones
4. Update the permalink URLs to point to the actual Instagram posts

Alternatively, you can edit the `instagramPosts` array in `InstagramGallery.tsx` directly if you have access to the code editor.

---

### Files Changed Summary

| File | Action |
|------|--------|
| `src/assets/badge-bbb.png` | Create (copy from upload) |
| `src/assets/badge-gaf.png` | Create (copy from upload) |
| `src/assets/badge-iicrc.png` | Create (copy from upload) |
| `src/components/Hero.tsx` | Modify (add badges) |
| `src/components/InstagramGallery.tsx` | Create (new component) |
| `src/pages/Index.tsx` | Modify (add Instagram section) |
| `public/instagram/` | Create directory with placeholder images |

