

## Add Lead Notifications to Sales Rep Welcome Modal

When sales reps log in, the Welcome Modal will now show a "My Leads" section with new lead assignments and recent lead updates (status changes, quote approvals/rejections, follow-up reminders).

### Changes (1 file)

**`src/components/dashboard/WelcomeModal.tsx`**

1. **Add new state and interfaces** for lead notifications:
   - `newLeads` -- leads assigned to this user since their last session (using `sessionStorage` timestamp or last 24 hours as fallback)
   - `leadUpdates` -- recent activity log entries on their assigned leads (quote approved/rejected, status changes) from the last 7 days
   - `overdueFollowups` -- leads with `next_followup_due` in the past

2. **Add data fetching** inside the existing `fetchData` function:
   - Query `quote_requests` where `assigned_to = user.id` and `assigned_at` is recent (last 48 hours) to find newly assigned leads
   - Query `lead_activity_log` for recent entries on the user's leads (quote_approved, quote_rejected, status_change) from last 7 days, excluding entries by the user themselves
   - Query `quote_requests` where `assigned_to = user.id` and `next_followup_due < now()` for overdue follow-ups

3. **Add new UI section** between the Active Contests and Pit Wagers sections, with three sub-sections:
   - **New Leads Assigned** (if any) -- green card showing count and list of new leads with name, service type, priority, and a link to `/dashboard/leads/:id`
   - **Overdue Follow-ups** (if any) -- red/warning card showing leads needing attention with the overdue duration
   - **Lead Updates** (if any) -- neutral card showing recent activity on their leads (e.g., "Quote approved for John Smith", "Lead status changed to scheduled")

4. **Add `ClipboardList` and `AlertCircle` icons** to the existing lucide-react import

5. **Update the "Let's Get It" button** -- when there are new leads, the button text changes to "View My Leads" and navigates to `/dashboard/my-leads` instead of just closing the modal. If no leads, it behaves as before.

### Technical Details

- No database changes needed -- all data is already available via existing tables and RLS policies
- Sales reps can already SELECT from `quote_requests` (where `assigned_to = auth.uid()`) and `lead_activity_log` (where the lead is assigned to them)
- The "last login" reference point uses `sessionStorage` key `welcome_modal_last_shown_{userId}` to track when the modal was last displayed, defaulting to 48 hours ago for first-time detection
- Lead updates query excludes the user's own activity entries (`user_id != auth.uid()`) so they only see updates from admins or system events
