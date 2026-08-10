---
name: qs-git-merge
description: "Inspect and safely integrate only explicitly selected Git and GitHub changes."
---

# Integrate selected changes

Resolve the repository root, current branch, upstream, ahead/behind state, dirty files, commits, checks, and actual pull request before choosing an operation.

## Safety

- Preserve unrelated dirty files and never stage them implicitly.
- Do not invent a feature branch or pull request when the selected commit is already on the default branch.
- Never force-push, delete, reset, or rewrite published history without explicit authorization.
- A local commit is not published until the tracked remote proves it.
- Treat the `upstream` remote as read-only and never push personalized changes to it.
- Git integration is separate from deployment and release execution.

Perform only the requested push, pull request, merge, rebase, or conflict resolution. Re-run the checks made relevant by integration and verify the remote/PR state afterward. End after Git integration; do not deploy automatically.

Distinguish the actual cases explicitly: an ahead default branch may require an explicitly requested or approved `git push origin main`, with no branch merge required; a feature branch may require a pull request; an existing pull request may require merge; diverged branches may require merge or rebase conflict resolution. Never describe one case as another.

## Completion report and next steps

This invocation has one root skill: `/qs-git-merge`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-deploy-release`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-git-merge
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one plain-text copy-ready prompt

When continuation is required, write `Top next prompt:` and place the single complete prompt beneath it as a plain Markdown paragraph beginning with the exact Codex skill literal $qs-skills:qs-deploy-release. Claude uses `/qs-deploy-release`. Never wrap the prompt in a fenced or indented code block, and do not put the prompt or skill literal in backticks. Put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
