

## Fix Canvasser Leaderboard Ranking + DNA Assessment Answer Key

### Issue 1: Canvasser Weekly/Monthly Leaderboards Sorted Wrong

Both the weekly and monthly canvasser leaderboards are currently sorting by `leadsClosed` instead of `pointsEarned`. The YTD leaderboard correctly sorts by points.

**File: `src/pages/admin/AdminLeaderboards.tsx`**

- **Line 555 (weekly sort):** Change `.sort((a, b) => b.leadsClosed - a.leadsClosed)` to `.sort((a, b) => b.pointsEarned - a.pointsEarned)`
- **Line 647 (monthly sort):** Change `.sort((a, b) => b.leadsClosed - a.leadsClosed)` to `.sort((a, b) => b.pointsEarned - a.pointsEarned)`

This ensures ranking is based on highest points, matching the YTD behavior.

---

### Issue 2: DNA Assessment -- Show Answer Key

Currently (line 312 in `ApplicantDetail.tsx`), each question only shows the answer the applicant selected. Managers need to see both options so they can understand the full context.

**File: `src/pages/admin/ApplicantDetail.tsx`**

Update the DNA breakdown section (lines 308-319) to show both options for each question:
- Display **Option A** and **Option B** labels
- Highlight which one the applicant chose (green for correct B, red for incorrect A)
- Show the "correct" answer (B) clearly so the manager can compare

The layout will change from:
```
[check] Q1: I thrive in a high-speed environment... (B)
```

To something like:
```
Q1: On Performance
  A: I prefer a steady, predictable environment...     [selected - incorrect]
  B: I thrive in a high-speed environment...            [correct answer]
```

Each question will show both options with clear visual indicators for which was selected and which is the "correct" (B) answer.

---

### Summary

| File | Change |
|---|---|
| `src/pages/admin/AdminLeaderboards.tsx` | Fix weekly sort (line 555) and monthly sort (line 647) to use `pointsEarned` |
| `src/pages/admin/ApplicantDetail.tsx` | Show both Option A and Option B in DNA breakdown with answer key indicators |
