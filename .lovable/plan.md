

# Phase 1: Restructure Admin Sidebar Navigation

## Sidebar Structure

**📌 Scoreboard** — Direct `NavLink` to `/admin/overview` (no collapsible group, always visible at top)

**📂 Pipeline & Revenue** (Collapsible)
| Label | Route | Icon |
|---|---|---|
| Lead Management | `/admin/leads` | ClipboardList |
| Quote Requests | `/admin/leads?status=new` | FileText |
| Lead Analytics | `/admin/leadflow` | TrendingUp |

**📂 Performance & Culture** (Collapsible)
| Label | Route | Icon |
|---|---|---|
| Sales Performance | `/admin/sales-performance` | **NEW PAGE** |
| Leaderboards | `/admin/leaderboards` | BarChart3 |
| Competitions | `/admin/contests` | Trophy |
| Pit Management | `/admin/pit` | Flame |
| Company Goals | `/admin/goals` | Target |
| Announcements | `/admin/announcements` | Megaphone |
| Weekly Updates | `/admin/weekly` | Calendar |

**📂 Team Operations** (Collapsible)
| Label | Route | Icon |
|---|---|---|
| Contractor MGMT | `/admin/team` | Users |
| TimeClock | `/admin/timeclock` | Clock |
| HR / Onboarding | `/admin/applicants` | Briefcase |
| Invite Users | `/admin/invites` | UserPlus |
| User Roles | `/admin/users` | UserCog |

**📂 System Settings** (Collapsible)
| Label | Route | Icon |
|---|---|---|
| Report Settings | `/admin/reports` | BarChart3 |
| Calendar Setup | `/admin/reports` (scroll/tab to calendar section) | Calendar |
| Notifications | `/admin/notifications` | Bell |

## New: Sales Performance Page

Create `src/pages/admin/SalesPerformance.tsx` — a dashboard pulling from `weekly_user_metrics` and `quote_requests` showing:
- Total revenue (won deals), close rate, avg deal size
- Per-rep breakdown table (deals won, revenue, close rate)
- Trend chart (weekly/monthly revenue over time using Recharts)

Register route in `App.tsx` as `/admin/sales-performance`.

## Back Button Fix

The "Back to Dashboard" button in the admin header already uses `navigate('/dashboard/stats')`. The onboarding back button was already fixed to `navigate(-1)`. No further changes needed here.

## Files Changed

| File | Change |
|---|---|
| `AdminLayout.tsx` | Replace `adminNavGroups` array with new structure; add Scoreboard as a standalone NavLink above groups |
| `App.tsx` | Add `<Route path="sales-performance" element={<SalesPerformance />} />` |
| `SalesPerformance.tsx` | **New** — Sales performance dashboard page |

