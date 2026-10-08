# 16: Delete unused onboarding, context, and CSV dependency code

**What to build:** The application keeps only the onboarding and shared state implementations it actually uses, with unused CSV packages removed.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 18.

- [ ] Recheck references throughout source, tests, configuration, documentation, and dynamic registrations before deletion.
- [ ] Remove the unused legacy onboarding controller/service and the unused standalone store-settings/UI contexts.
- [ ] Keep the active setup flow, inventory provider, integration environment service if still used, and existing CSV parser working.
- [ ] Remove the unused CSV parser package and its unused type package and update the dependency lockfile.
- [ ] Backend tests and frontend type/build checks pass after cleanup; smoke-check setup, settings, and CSV import.
- [ ] Do not introduce replacement wrappers, dependencies, or unrelated refactoring.
