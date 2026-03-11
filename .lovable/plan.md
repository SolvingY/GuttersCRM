

## Confirmed: StaleContractsWidget is OUTSIDE the SectionCarousel

Line 604 renders `<StaleContractsWidget isAdmin={true} />` and the `<SectionCarousel>` opens at line 607. They are siblings — StaleContractsWidget is definitively outside the carousel JSX boundary.

**Note 2 is correct as written.** The wrapping location at line 604 is the right place. No rewording needed.

### Updated Note 2 (minor clarification added):

> **Note 2 — StaleContractsWidget location:** `StaleContractsWidget` renders at line 604, confirmed outside and above the `SectionCarousel` which opens at line 607. They are sibling elements. The `isWidgetVisible('stale_contracts')` check wraps it at that outer position. Do not move it inside any section.

### Verdict

The plan is fully validated. No changes to the implementation steps, file list, migration SQL, registry, hook, drawer, or wrapping logic. Ready to build exactly as specified in the previous message.

