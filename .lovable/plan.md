
## Contractor Management: DNA Heat Map + Login Fix + Assessment Routing Clarification

### Summary of Changes

Three distinct problems to fix, plus one new feature:

1. **Fix login tracking** — The RPC fires on every render cycle because the `useEffect` dependency `user?.id` triggers whenever auth state refreshes. Add a `sessionStorage` guard so the increment only fires once per browser session per user.

2. **DNA Heat Map** — Add a team-wide DNA intelligence panel at the top of the Active tab in Contractor Management, showing score distribution as a color-coded heat display.

3. **Assessment routing is already correct** — The `FutureTeamMates` page receives applications from `/apply` (external candidates). The `InternalAssessment` page (via the login prompt) creates a `job_applications` record with `created_user_id` set, which is how the system links assessments to existing users. The Active tab in Contractor Management already shows DNA scores pulled from `job_applications` via `created_user_id` matching. No routing changes needed — just need to confirm the InternalAssessment page correctly creates the record with `status = 'hired'` and `created_user_id`. We'll verify this file.

4. **Minor UX** — Ensure the "Assign Assessment" button is also available on users who are in Onboarding (even if they already have `dnaPending = true` shown as a badge, admins should be able to re-assign).

---

### Fix 1: Login Count Deduplication (Critical)

**Root cause:** Both `DashboardLayout.tsx` and `CanvasserLayout.tsx` call `supabase.rpc('increment_login_count', { uid: user.id })` inside a `useEffect` with `[user?.id]` as the dependency. Auth state can update multiple times per session (token refresh, role fetch completion), causing `user?.id` to re-trigger the effect many times.

**Fix:** Use `sessionStorage` to set a flag `login_counted_{userId}` after the first increment. If the flag already exists for this session, skip the RPC call.

```typescript
useEffect(() => {
  if (!user) return;
  const sessionKey = `login_counted_${user.id}`;
  if (sessionStorage.getItem(sessionKey)) return; // already counted this session
  sessionStorage.setItem(sessionKey, '1');
  void supabase.rpc('increment_login_count', { uid: user.id });
}, [user?.id]);
```

**Files modified:**
- `src/pages/dashboard/DashboardLayout.tsx`
- `src/pages/canvasser/CanvasserLayout.tsx`

---

### Fix 2: DNA Heat Map Display

Add a new collapsible "Team DNA Intelligence" panel above the user cards grid on the Active tab. It shows:

**Panel header:** "Team DNA Intelligence" with a summary stat (e.g., "Average Score: 22.4/30 — Strong Fit")

**Heat map grid:** Each active team member who has a DNA assessment gets a colored tile showing their name and score. Color coding follows the existing `getScoreBarColor` function:
- Green (`bg-green-500`) = Excellent Fit (24–30)
- Yellow (`bg-yellow-500`) = Strong Fit (18–23)
- Orange (`bg-orange-500`) = Moderate Fit (12–17)
- Red (`bg-red-500`) = Low/Marginal Fit (< 12)

**Distribution bar:** Shows percentage breakdown of each alignment category (Excellent / Strong / Moderate / Marginal / Low) as a stacked horizontal bar.

**Category breakdown table:** Shows count per alignment category with color indicators.

This entire panel only renders when `tab === "active"` and there are users with DNA scores.

**Files modified:**
- `src/pages/admin/ContractorManagement.tsx` — add the heat map section inline (no new component needed, kept in same file for simplicity)

---

### Fix 3: Verify InternalAssessment Creates Correct Records

Read `InternalAssessment.tsx` to confirm it saves with `status = 'hired'` and `created_user_id`. If not, fix it so assessments for existing users go into `job_applications` with the right status, which is what the Contractor Management page queries to display DNA scores.

---

### Technical Details

**Heat map data computation (added to existing `useMemo`):**

```typescript
const teamDNAStats = useMemo(() => {
  const activeMembersWithDNA = users.filter(
    u => !u.isArchived && u.hasAssessment && !u.dnaPending && u.dnaScore !== null
  );
  if (activeMembersWithDNA.length === 0) return null;
  
  const scores = activeMembersWithDNA.map(u => u.dnaScore as number);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const distribution = {
    excellent: activeMembersWithDNA.filter(u => (u.dnaScore ?? 0) >= 24).length,
    strong: activeMembersWithDNA.filter(u => (u.dnaScore ?? 0) >= 18 && (u.dnaScore ?? 0) < 24).length,
    moderate: activeMembersWithDNA.filter(u => (u.dnaScore ?? 0) >= 12 && (u.dnaScore ?? 0) < 18).length,
    marginal: activeMembersWithDNA.filter(u => (u.dnaScore ?? 0) >= 6 && (u.dnaScore ?? 0) < 12).length,
    low: activeMembersWithDNA.filter(u => (u.dnaScore ?? 0) < 6).length,
  };
  
  return { avg, distribution, members: activeMembersWithDNA, total: activeMembersWithDNA.length };
}, [users]);
```

**Heat tile per member:**
```tsx
<div
  key={member.id}
  className={`rounded p-2 text-white text-center cursor-pointer ${getScoreBarColor(member.dnaScore)}`}
  onClick={() => handleOpenProfile(member)}
  title={`${member.name}: ${member.dnaScore}/30`}
>
  <p className="text-xs font-bold truncate">{member.name.split(' ')[0]}</p>
  <p className="text-lg font-heading font-black">{member.dnaScore}</p>
</div>
```

---

### Files to Modify

| File | Change |
|---|---|
| `src/pages/dashboard/DashboardLayout.tsx` | Add `sessionStorage` guard to login tracking effect |
| `src/pages/canvasser/CanvasserLayout.tsx` | Same sessionStorage guard |
| `src/pages/admin/ContractorManagement.tsx` | Add DNA heat map panel above the cards grid (Active tab only) |
| `src/pages/dashboard/InternalAssessment.tsx` | Verify/fix that submission creates `job_applications` with `status='hired'` and `created_user_id = user.id` |

No database changes needed — all columns and functions already exist.
