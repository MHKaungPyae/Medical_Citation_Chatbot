<!-- vibekit:pack=core-vibe-coder -->
# Bugfix And Debug Reference

## Debugging Loop

1. Reproduce the issue or localize the failure surface.
2. Gather evidence from logs, stack traces, tests, and changed files.
3. Form ranked hypotheses before editing.
4. Verify the likeliest cause.
5. Apply the smallest root-cause fix.
6. Add or update regression coverage.
7. Re-run narrow and broad verification.

## Failure-Class Prompts

- Backend failure: route, handler, service, validation, permissions, data assumptions
- Frontend failure: state transitions, null handling, effects, props, rendering conditions
- Config failure: env vars, build-time config, feature flags, deployment assumptions
- Data failure: migrations, seed data, stale records, parsing, serialization
- Test failure: outdated expectations, race conditions, fixtures, nondeterminism

## Evidence Prompts

- What exact message or symptom is visible?
- Which command, request, or user action triggers it?
- Which file path first appears in the stack trace or failing test output?
- What changed recently in the surrounding area?

## Verification Prompts

- What single test, command, or reproduction proves the fix?
- Which broader checks should run before calling the work done?
- What manual verification should be recorded if automation is missing?
