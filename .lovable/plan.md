

# Admin Navigation Consolidation: 4 Collapsible Groups

## Overview

Replace the flat 13-item admin sidebar with 4 collapsible accordion groups using `@radix-ui/react-collapsible` (already installed). This is a UI-only change to `AdminLayout.tsx` -- no routes, pages, or content change.

## New Navigation Structure

```text
ADMIN MENU

v Master Overview          [group icon: BarChart3]
    Master Overview
    Leaderboards
    Company Goals
    Weekly Updates
    Announcements

v HR Management             [group icon: UserCog]
    Invite Users
    User Roles
    Contractor Mgmt
    Future Team Mates        [red badge: count]

v Leads & Sales             [group icon: ClipboardList]
    Leads                    [red badge: count]

v Competitions & Tracking   [group icon: Trophy]
    Contests
    Pit Management
    Report Settings
```

## Behavior

- **Auto-expand**: On page load, the group containing the current route is open. All others start collapsed.
- **Multi-open**: Multiple groups can be open simultaneously (each group has independent open/closed state).
- **Group header badges**: If a group contains items with notification counts, the total count displays on the group header (e.g., "HR Management" shows the applicant count, "Leads & Sales" shows the leads count). Visible even when the group is collapsed.
- **Collapsed sidebar (icon-only mode)**: Show only the 4 group icons vertically. Clicking a group icon navigates to its first item. No accordion behavior in collapsed mode.
- **Mobile sidebar**: Same grouped accordion structure inside the existing slide-out panel.
- **Active item**: White background highlight on the current route's nav item (same styling as today).

## Technical Approach

### Data structure

Replace the flat `adminNavItems` array with `adminNavGroups`:

```typescript
const adminNavGroups = [
  {
    label: 'Master Overview',
    icon: BarChart3,
    items: [
      { icon: Users, label: 'Master Overview', path: '/admin/overview' },
      { icon: BarChart3, label: 'Leaderboards', path: '/admin/leaderboards' },
      { icon: Target, label: 'Company Goals', path: '/admin/goals' },
      { icon: Calendar, label: 'Weekly Updates', path: '/admin/weekly' },
      { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
    ],
  },
  {
    label: 'HR Management',
    icon: UserCog,
    items: [
      { icon: UserPlus, label: 'Invite Users', path: '/admin/invites' },
      { icon: UserCog, label: 'User Roles', path: '/admin/users' },
      { icon: Users, label: 'Contractor Mgmt', path: '/admin/team' },
      { icon: Briefcase, label: 'Future Team Mates', path: '/admin/applicants' },
    ],
  },
  {
    label: 'Leads & Sales',
    icon: ClipboardList,
    items: [
      { icon: ClipboardList, label: 'Leads', path: '/admin/leads' },
    ],
  },
  {
    label: 'Competitions & Tracking',
    icon: Trophy,
    items: [
      { icon: Trophy, label: 'Contests', path: '/admin/contests' },
      { icon: Flame, label: 'Pit Management', path: '/admin/pit' },
      { icon: BarChart3, label: 'Report Settings', path: '/admin/reports' },
    ],
  },
];
```

### Rendering (desktop sidebar)

For each group, use the already-installed `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` from `@radix-ui/react-collapsible`. Each group manages its own `open` state initialized from whether its items contain the active route.

The group header row shows:
- A chevron indicator (rotates on open)
- The group icon
- The group label (hidden when sidebar collapsed)
- A badge count if any child items have notifications (summed)

Inside `CollapsibleContent`, render the child `NavLink` items with the same styling as today but slightly indented (`pl-8`).

### Rendering (collapsed sidebar)

When `collapsed === true`, skip the `Collapsible` wrapper entirely. Instead render one icon button per group that navigates to the group's first item path on click. Show a badge dot on the icon if the group has notifications.

### Rendering (mobile sidebar)

Same grouped accordion structure. Each group trigger closes/opens independently. Clicking a nav item calls `setMobileMenuOpen(false)` as before.

### Badge count helper

```typescript
const getGroupBadge = (group) => {
  let count = 0;
  for (const item of group.items) {
    if (item.path === '/admin/applicants') count += newCount;
    if (item.path === '/admin/leads') count += newLeadsCount;
  }
  return count;
};
```

## File Modified

| File | Change |
|------|--------|
| `src/pages/admin/AdminLayout.tsx` | Replace flat `adminNavItems` with `adminNavGroups`. Rewrite desktop and mobile nav sections to use `Collapsible` groups with auto-expand, badge counts on headers, and collapsed-mode icon-only view. |

No new files. No route changes. No page content changes. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from lucide (already imported pattern).

