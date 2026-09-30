---
name: feature-pipeline
description: Orchestrates the full delivery pipeline for a feature or fix in my-school-BE. Steps: the owner svc-* agents give context, service-creator builds, code-reviewer, security-auditor and migration-guardian check, tester runs, and release-checker gives a verdict. Use when asked to ship, build end to end, or take a feature to production-ready. Run it from the MAIN agent, because subagents cannot spawn subagents.
---

# Feature pipeline (run from the main or orchestrating agent)

Subagents in both Claude Code and Codex can't spawn further subagents. **You**, the main thread, dispatch each step and pass the outputs forward. Give each subagent a self-contained prompt that includes the previous step's output.

## Steps

1. **Scope.**
   - Identify the affected modules from the request, and from `.agents/catalog/services.json` if needed.
   - For each module, ask its `svc-<name>` agent to explain the relevant invariants and risks. Run these in parallel; they're read-heavy.
   - Collect the downstream ("Used by") agents.
2. **Build.** Dispatch `service-creator` with the brief, the owner agents' notes, and any constraints. For a change confined to one existing module, dispatching that module's `svc-<name>` agent instead is fine.
3. **Gate 1 (parallel, read-only):**
   - `code-reviewer` on the diff.
   - `security-auditor`, if auth, guards, scoping, `@Public` or personal data are touched.
   - `migration-guardian`, if `prisma/schema/**` changed.
   - `api-contract-guardian`, if controllers or DTOs changed.
4. **Fix loop.** Send BLOCKER, MAJOR and HIGH findings back to the builder (step 2 agent). Repeat Gate 1 on the new diff. Stop after 3 loops and escalate to the human.
5. **Test.** Dispatch `tester` scoped to the changed modules plus their downstream contract consumers. Send P0/P1 findings back to the builder, then re-run the tester.
6. **Downstream confirmation.** For each contract change, ask the downstream `svc-*` agents to confirm they're compatible, or to make the matching change.
7. **Knowledge.** Make sure `pnpm agents:build` was run, and that the notes of every changed module were re-verified against the code and re-stamped (`pnpm agents:stamp <module>`), or dispatch `docs-keeper`.
8. **Release gate** (only when a release is requested). Dispatch `release-checker` with all the reports above.

## Parallelism rules

- Run read-only agents in parallel.
- Run agents that write sequentially. Never run two writers on overlapping paths at the same time.
- In Codex, ask explicitly, for example: "spawn code-reviewer and security-auditor in parallel, wait for both".

## Final summary to the user

A table with each step, its agent, and its verdict. Then list the open risks, the files changed, and the next action.
