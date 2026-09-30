@AGENTS.md

## Claude Code specifics

- Subagents live in `.claude/agents/` and skills in `.claude/skills/`. Both are **generated** from `.agents/` by `pnpm agents:build`, so edit the sources and never the generated copies.
- To delegate, use the Task tool with the agent name (for example `tester`, `svc-fees`). Put the full context in the prompt, because subagents start with a fresh context.
- For end-to-end work, invoke the `feature-pipeline` skill and dispatch each step from the main conversation.
