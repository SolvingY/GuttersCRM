

# Fix Duplicate Error on Re-Add and Add Report Settings Tab

## Issue 1: "Email already exists" after removing and re-adding

The delete mutation invalidates the query cache, but the re-fetch may not complete before the user adds the same email back. The insert then hits the database's unique constraint because the old row hasn't been fully removed from the cache/UI yet -- or the delete itself may be failing silently.

**Fix in `src/pages/admin/NotificationRouting.tsx`:**
- Add `onMutate` optimistic update to `deleteMutation` so the entry is immediately removed from the local cache (no waiting for refetch)
- Add `onMutate` optimistic update to `addMutation` so the entry appears immediately
- Add `onError` rollback for both mutations to restore previous cache state if the operation fails
- This eliminates the race condition between delete completing and the user trying to re-add

## Issue 2: Report Settings as a tab at the top

Replace the bottom "Weekly Reports" card with a tabbed interface at the top of the page using the existing Tabs component.

**Changes to `src/pages/admin/NotificationRouting.tsx`:**
- Import `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs`
- Import `ReportSettings` component directly (lazy or inline)
- Wrap the page content in a `Tabs` component with two tabs:
  - **"Notification Routing"** -- contains the existing notification type cards
  - **"Report Settings"** -- renders the `ReportSettings` component inline
- Remove the "Weekly Reports" card at the bottom (no longer needed)

Layout:
```text
[Notification Routing]  [Report Settings]
-------------------------------------------
(tab content here)
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/admin/NotificationRouting.tsx` | Add optimistic updates to delete/add mutations; add tabbed layout with Report Settings |

