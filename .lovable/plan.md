

# Changes to ContractorProfileSheet and Sidebar Navigation

## 1. ContractorProfileSheet.tsx

**Add new query** (after line 264) for all active onboarding steps:
```ts
const { data: allOnboardingSteps = [] } = useQuery({
  queryKey: ["onboarding-steps"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("onboarding_steps")
      .select("id, step_key, step_name, step_type, required, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});
```

**Simplify existing onboarding progress query** (lines 252-264): Remove the join, use `select("*")` instead of `select("*, step:onboarding_steps(...)")`. Remove `.order("step(sort_order)")`.

**Update onboarding rendering** (lines 596-639):
- Change condition from `onboardingProgress.length > 0` to `allOnboardingSteps.length > 0`
- `total` = `allOnboardingSteps.length`
- `completed` = count of `allOnboardingSteps` where a matching record exists in `onboardingProgress` with `step_id === step.id && status === "completed"`
- Iterate over `allOnboardingSteps` (sorted by `sort_order`) instead of `onboardingProgress`
- Look up completion status by finding matching progress record
- Display `step.step_name` directly

## 2. Three Sidebar Files

**DashboardSidebar.tsx** (line 3): Add `ClipboardCheck` to imports. Add `{ icon: ClipboardCheck, label: "Onboarding", path: "/onboarding" }` as second item in `navItems` (after "My Stats").

**CanvasserSidebar.tsx** (line 3): Add `ClipboardCheck` to imports. Add same nav item as second entry (after "My Stats").

**SupplementerSidebar.tsx** (line 2): Add `ClipboardCheck` to imports. Add same nav item as second entry (after "My Stats").

