

# One-Time Onboarding Bypass for m.beck@oknextgen.com

From the auth logs, the user ID is `cdb143f4-81bf-4d7a-bf36-5935fec2d1c7`.

The onboarding gate checks `profiles.onboarding_complete`. A single SQL update will bypass it:

```sql
UPDATE profiles
SET onboarding_complete = true, onboarding_completed_at = now()
WHERE id = 'cdb143f4-81bf-4d7a-bf36-5935fec2d1c7';
```

One database migration, no code changes. The user will be able to log in and access their dashboard immediately after.

