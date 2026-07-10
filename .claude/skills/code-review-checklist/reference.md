<!-- vibekit:pack=core-vibe-coder -->
# Code Review Checklist Reference

## Severity Guide

| Severity | Meaning | Expected Action |
|----------|---------|-----------------|
| Critical | Likely bug, security issue, data loss, or broken behavior | Must fix before merge |
| Warning | Important quality, performance, or testing risk | Should fix or justify |
| Suggestion | Lower-risk improvement | Optional follow-up |

## Review Prompts

- Could this change break an existing contract, flow, or permission boundary?
- Is there a missing test for the changed behavior?
- Could this data change be unsafe or hard to roll back?
- Is there a simpler implementation that already exists elsewhere in the repo?
- Are docs, config, or operational steps now stale?

## Common Finding Types

- Missing validation or authorization checks
- Incorrect null or error-state handling
- Hidden dependency on config, env, or seed data
- Incomplete migration safety or rollback planning
- Missing regression test or weak verification
- User-facing regression in loading, empty, or failure states
