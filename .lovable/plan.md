

# Fix Two Issues: Build Error + React Hooks Violation

## Issue 1: Build Error in `CompanyGoals.tsx` (line 1121)

**Problem**: `currentMonthIndex` is undefined. The IIFE at line 1119 uses `currentMonthIndex + 1` but that variable doesn't exist. The identical IIFE just above (line 1101) correctly uses `monthlyBreakdown.length`.

**Fix**: Replace `currentMonthIndex + 1` with `monthlyBreakdown.length` on line 1121 to match the pattern used in the sibling IIFE at line 1103.

## Issue 2: React Hooks Violation in `MyStats.tsx` (line 215)

**Problem**: `useMemo` is called on line 215, **after** the early `if (loading) return ...` on line 149. This violates React's Rules of Hooks — hooks must be called unconditionally on every render, in the same order.

**Fix**: Move the `useMemo` call (lines 215-241) to **before** the `if (loading)` early return at line 149. All the derived variables it depends on (`allWeeklyMetrics`, `yearlyGoal`) are computed after the early return currently, so those also need to move up — or the `useMemo` can use the raw state values directly since `yearlyGoal` is derived from `metrics`. Specifically:

1. Move `const latestMetric = metrics[metrics.length - 1]` and `const yearlyGoal = Number(latestMetric?.yearly_goal) || 0` to before line 149
2. Move the `useMemo` block (lines 215-241) to right after those declarations, before the `if (loading)` return
3. Keep everything else where it is (the remaining derived variables don't use hooks)

