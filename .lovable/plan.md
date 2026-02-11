

## Fix Mobile "Apply Now" Button - Two Places

### 1. Remove "Send Your Resume", make "Apply Now" prominent (`src/components/TeamSection.tsx`)

**Lines 298-316** - Replace the entire `text-center` div:
- Remove the "Send Your Resume" mailto link completely
- Replace with a single, large "Apply Now" button
- Full width on mobile (`w-full sm:w-auto`), `text-lg`, `shadow-lg`, `px-8 py-4`
- Uses `bg-accent text-accent-foreground` styling
- Proper touch targets (`min-h-[44px]`, `touch-manipulation`)

### 2. Add "Apply Now" link in mobile hamburger menu (`src/components/Header.tsx`)

**Lines 247-255** - Insert a new "Apply Now" Link BEFORE the "Team Dashboard" link:
- Direct Link to `/apply`
- Styled with accent color background (`bg-accent/10`) to stand out from other nav items
- Briefcase icon (import from lucide-react)
- Closes mobile menu on click (`setMobileMenuOpen(false)`)

### Files

| File | Change |
|------|--------|
| `src/components/TeamSection.tsx` | Remove "Send Your Resume", make "Apply Now" large and prominent |
| `src/components/Header.tsx` | Add "Apply Now" link in mobile nav menu (add `Briefcase` import) |
