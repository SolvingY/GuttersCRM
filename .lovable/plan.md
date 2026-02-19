

# Phases 4-5: Admin Integration & System Integration

Implementing the Supplementers tab in admin views, report exports, company goals, hire dialog, create-user edge function, and invite users.

---

## Phase 4: Admin Integration

### 4A. AdminLeaderboards.tsx - Add Supplementers Tab

**Changes:**
- Add `SupplementerEntry` and `WeeklySupplementerEntry` interfaces
- Add state variables for supplementer data (`supplementerYtdEntries`, `supplementerWeeklyEntries`, `supplementerLoading`)
- Subscribe to realtime changes on `supplementer_metrics` and `weekly_supplementer_metrics` tables
- Add YTD fetch: query `supplementer_metrics` table, filter by active supplementer role holders, sort by `points DESC`
- Add weekly/monthly fetch: query `weekly_supplementer_metrics`, aggregate for monthly, sort by `points_earned DESC`
- Change inner `TabsList` from `grid-cols-2` to `grid-cols-3`, add "Supplementers" TabsTrigger
- Add `TabsContent value="supplementers"` with a new table showing: Rank, Name, Points (bold), RCV Increased, Money Collected, Collection Rate, Avg COC Days
- Include Team Totals footer row (consistent with sales/canvasser patterns)

### 4B. AdminOverview.tsx - Add Supplementers Tab

**Changes:**
- Add `SupplementerAggregates` interface and `SupplementerDetail` interface
- Add state for supplementer data and `EditSupplementerMetricsModal`
- In `fetchAdminData`, add query for `supplementer_metrics` joined with role/profile checks
- Change `TabsList` from `grid-cols-2` to `grid-cols-3`, add "Supplementers" tab
- Add Supplementers `TabsContent` with:
  - Stats cards: Total Supplementers, Total RCV Increased, Total Collected, Avg Collection Rate, Avg COC Days, Total Points
  - Performance table: Name, Points, RCV Increased, Collected, Collection Rate, Avg COC Days, Edit button
- Wire up `EditSupplementerMetricsModal` for editing yearly goal

### 4C. Create EditSupplementerMetricsModal.tsx

**New file:** `src/components/admin/EditSupplementerMetricsModal.tsx`

A dialog with:
- Read-only points breakdown (RCV Points + Collection Points + Speed Bonus = Total)
- Editable yearly goal input
- Read-only display of: Total RCV, Total Collected, Supplements Processed, Avg COC Days, Avg Depreciation Days, Avg Code Days, Collection Rate
- Save button updates only `yearly_goal` in `supplementer_metrics`

### 4D. RoleViewToggle.tsx - Support Supplementer Portal

**Changes:**
- Import `FileText` icon from lucide-react for supplementer
- Extend `activeView` type handling to include `'supplementer'`
- Show toggle when user has supplementer + other roles
- Add supplementer toggle option that navigates to `/supplementer`
- Handle 3-way toggle when user has sales + canvasser + supplementer

---

## Phase 5: System Integration

### 5A. Report Export (reportGenerator.ts)

**Changes:**
- Add `SupplementerData` interface: `{ name, points, rcvIncreased, supplementsProcessed, moneyCollected, collectionRate, avgCocDays, avgDepreciationDays, avgCodeDays }`
- Update `CompanySummary` with supplementer aggregates: `supplementerCount`, `totalRcvIncreased`, `totalMoneyCollected`
- Update `exportToExcel` signature to accept optional `supplementerData` parameter
  - Add "SUPPLEMENTER TEAM SUMMARY" section to CSV
  - Add supplementer table with columns: Name, Points, RCV Increased, Collected, Collection Rate, Supplements, Avg COC Days
- Update `exportToPDF` similarly with a Supplementers section in the PDF
- Update `generateEmailReportHTML` to include supplementer summary

### 5B. Company Goals (CompanyGoals.tsx)

**Changes:**
- Add `supplementerRcvGoal` state variable
- Load `supplementer_rcv_goal` from company_goals query (already exists in DB)
- Add a new input field in the goals form: "Supplementer RCV Goal ($)"
- Save `supplementer_rcv_goal` in the `handleSave` function
- Fetch supplementer RCV progress from `supplementer_metrics` (sum of `total_rcv_increased`)
- Add a progress card showing Supplementer RCV progress vs goal

### 5C. HireApplicantDialog.tsx

**Changes:**
- Add `'Supplementer': 'supplementer'` and `'Insurance Specialist': 'supplementer'` to `ROLE_MAPPING`
- Add `<SelectItem value="supplementer">Supplementer</SelectItem>` to the role dropdown

### 5D. create-user Edge Function

**Changes to `supabase/functions/create-user/index.ts`:**
- Update `RoleConfig` interface to add `createSupplementerMetrics: boolean`
- Add supplementer case to `getRoleConfig`:
  ```
  case 'supplementer':
    return { roles: ['supplementer'], createSalesMetrics: false, createCanvasserMetrics: false, createSupplementerMetrics: true };
  ```
- Update `super_admin` case to also set `createSupplementerMetrics: false` (or true if desired)
- Add supplementer metrics creation block after canvasser metrics: check/upsert `supplementer_metrics` with `user_id`, `display_name`
- Redeploy the edge function

### 5E. Invite Users (InviteUsers.tsx)

**Changes:**
- Add `'supplementer'` as an option in the invite role dropdown (`inviteRole` select)
- Add `'supplementer'` as an option in the manual create role type dropdown (`manualRoleType` select)
- When `inviteRole === 'supplementer'`, hide rank/goal fields (supplementers don't have sales ranks)

### 5F. AdminOverview Report Export Integration

**Changes:**
- In the `onExport` callback, fetch supplementer data from state and pass to `exportToExcel`/`exportToPDF`
- Add supplementer data to the `CompanySummary` object

---

## Files Summary

### New Files (1)
| File | Description |
|---|---|
| `src/components/admin/EditSupplementerMetricsModal.tsx` | Admin modal for editing supplementer yearly goal with points breakdown |

### Modified Files (8)
| File | Changes |
|---|---|
| `src/pages/admin/AdminLeaderboards.tsx` | Add Supplementers tab with YTD/weekly/monthly data fetching and realtime |
| `src/pages/dashboard/AdminOverview.tsx` | Add Supplementers tab with stats cards and performance table |
| `src/components/dashboard/RoleViewToggle.tsx` | Support supplementer portal toggle for dual/triple-role users |
| `src/lib/reportGenerator.ts` | Add SupplementerData interface, update CSV/PDF/email exports |
| `src/pages/admin/CompanyGoals.tsx` | Add supplementer RCV goal field and progress card |
| `src/components/admin/HireApplicantDialog.tsx` | Add supplementer to role mapping and dropdown |
| `supabase/functions/create-user/index.ts` | Add supplementer role config and metrics creation |
| `src/pages/dashboard/InviteUsers.tsx` | Add supplementer as invite/create role option |

