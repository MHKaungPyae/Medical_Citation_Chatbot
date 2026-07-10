---
name: bugfix-and-debug
description: Diagnose failing tests, crashes, regressions, and unexpected behavior. Use when the user asks to debug, reproduce, find root cause, patch a bug, or add regression coverage.
---
<!-- vibekit:pack=core-vibe-coder -->

# Bugfix And Debug

Use this skill for failing tests, crashes, exceptions, and unexpected behavior.

## Workflow

1. Capture the exact failure and reproduction path.
2. Form one to three ranked hypotheses.
3. If the bug needs external docs, browser evidence, GitHub context, production incident data, or a second-pass hypothesis check and the user enabled the relevant MCP, load the matching `mcp-*` skill first.
4. Verify the most likely cause using code, logs, tests, repository history, and any relevant MCP evidence.
5. Make the smallest change that fixes the root cause.
6. Add or recommend a regression test.
7. Run the narrowest relevant verification first, then broader checks if available.

## Evidence Checklist

- Exact error, failing assertion, or broken behavior
- Reproduction steps or affected entry point
- Relevant files, logs, stack traces, or data conditions
- What changed recently, if known

## Fixing Rules

- Reproduce or localize before editing when possible.
- Fix root causes, not symptoms.
- Keep the diff narrow and avoid unrelated refactors.
- If you cannot reproduce, say what evidence was missing and what you checked instead.

## Relevant MCP Skills

- `mcp-context7` for current framework or dependency behavior
- `mcp-playwright` for browser reproduction and UI validation
- `mcp-sentry` for production exceptions and release regressions
- `mcp-github` for linked issues, PR context, or CI failures
- `mcp-open-bridge` for tricky root-cause hypothesis review and focused file or diff analysis

## Output

Report with these sections:

- Bug
- Reproduction or localization evidence
- Root cause
- Fix
- Regression test
- Verification

Use [reference.md](reference.md) for debugging loops, failure-class prompts, and verification ideas.
