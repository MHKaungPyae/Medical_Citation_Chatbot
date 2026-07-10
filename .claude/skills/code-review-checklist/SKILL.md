---
name: code-review-checklist
description: Review diffs, pull requests, and code changes for correctness, regressions, security, maintainability, and missing tests. Use for code review, pre-merge checks, and quality audits.
---
<!-- vibekit:pack=core-vibe-coder -->

# Code Review Checklist

Use this skill for PR review, pre-merge checks, and quality audits.

## Priorities

1. Bugs and behavior regressions
2. Security and secret leakage
3. Missing or weak tests
4. Data loss and migration risk
5. Performance issues
6. Maintainability risks

## Review Workflow

1. Gather the relevant diff, files, and surrounding context. If no diff is provided, inspect local git state when available; ask the user only when the needed code cannot be found locally.
2. Review for correctness, regressions, security, data safety, testing gaps, and maintainability.
3. Use this mapping when extra context is needed and the MCP is enabled: GitHub PR/issue/workflow context -> `mcp-github`; external API/framework docs -> `mcp-context7`; UI/browser verification -> `mcp-playwright`; production incident context -> `mcp-sentry`; design reference checks -> `mcp-figma`; second-pass reasoning on tricky changes -> `mcp-open-bridge`.
4. Verify claims using the diff, surrounding files, tests, and any enabled MCP context. If a claim cannot be verified with available evidence, label it as unverified.
5. Report findings ordered by severity with concrete remediation.
6. If no findings are present, say so explicitly and note residual risks or testing gaps.

## Review Checklist

- Correctness and edge cases
- Input validation, authorization, and secret handling
- Data safety, migrations, and rollback concerns
- Test coverage and verification gaps
- Performance, duplication, and maintainability
- User-facing regressions, accessibility, and documentation drift

## Relevant MCP Skills

- `mcp-github` for PR, issue, review, workflow, and release context
- `mcp-context7` for validating current external API usage against docs
- `mcp-playwright` for UI regression checks when visual behavior matters
- `mcp-sentry` for production-impact review when a fix targets live incidents
- `mcp-figma` for design fidelity checks on UI-heavy changes
- `mcp-open-bridge` for adversarial review of risky diffs and second-pass reasoning on edge cases

## Output

Lead with findings ordered by severity. Include file references and concrete fixes. If no findings are found, say so and note residual risk.

Use [reference.md](reference.md) for severity cues, common finding types, and review prompts when a deeper review rubric would help. If it is missing, use the severity meanings already in the skill and note the gap only if it affects confidence.
