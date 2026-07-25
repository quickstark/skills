Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review)

## What it does

`qs-review-code` reviews the diff between `HEAD` and a fixed point you supply — a commit, branch, tag, or merge-base — along two separate axes: **Standards** (does the code follow this repo's documented conventions?) and **Spec** (does it implement what the originating issue or spec asked for?). It runs each axis as its own parallel sub-agent and reports them side by side. It never merges or re-ranks the two sets of findings — keeping them separate is the whole point, because a change can pass one axis and fail the other, and a single blended verdict lets one mask the other.

## When to reach for it

Type `/qs-review-code`, or the agent reaches for it automatically when you ask to review a branch, a PR, work-in-progress changes, or anything "since X".

Reach for this when there is a diff to judge against a known-good point and you want the two questions — *is it built right?* and *is it the right thing?* — answered independently. It runs at the end of the build loop; for actually writing the code test-first, use [qs-test-tdd](https://aihero.dev/skills-tdd), and for building a whole spec into code use [qs-code-build](https://aihero.dev/skills-implement), which runs its own `/qs-review-code` pass before committing.

## Prerequisites

The **Spec** axis needs somewhere to find the originating spec — an issue reference in the commit messages, a path you pass in, or a spec under `docs/`/`specs/`. That issue-tracker wiring comes from [qs-setup](https://aihero.dev/skills-setup-matt-pocock-skills); without a spec the Spec axis simply skips and says so. The **Standards** axis needs nothing set up — it always carries a built-in Fowler smell baseline even in a repo that documents no conventions.

## Two axes, never merged

The defining idea is the **two axes**. **Standards** asks whether the diff conforms to how this repo writes code — its `CODING_STANDARDS.md` or `CONTRIBUTING.md`, plus a fixed baseline of ~12 Fowler code smells (Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, …). Two rules keep the baseline safe: a documented repo standard always overrides it, and every smell is a judgement call, never a hard violation. **Spec** asks the orthogonal question — does the code do what the issue or spec actually asked, without missing requirements or smuggling in scope creep?

They run as parallel sub-agents so neither pollutes the other's context, and the final report presents them under separate `## Standards` and `## Spec` headings with a per-axis summary. There is deliberately no single winner across axes.

## It's working if

- It pins and confirms the fixed point first (`git rev-parse`), failing fast on a bad ref or empty diff rather than inside the sub-agents.
- Standards and Spec findings arrive in two distinct blocks, each citing its source — a repo standard or baseline smell for one, a quoted spec line for the other.
- When no spec can be found, the Spec axis reports "no spec available" instead of inventing requirements.

## Output and next steps

`/qs-review-code` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator, stays in the OS temporary `quickstark-readouts` directory, and does not claim that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md) — Address actionable findings before the change is considered complete.
- [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md) — Add missing regression coverage revealed by the review.
- [`/qs-deploy-release`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-deploy-release/SKILL.md) — Release an approved change after all required checks pass.

## Where it fits

`qs-review-code` is the review step at the tail of the main build chain:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

Its closest neighbour is [qs-code-build](https://aihero.dev/skills-implement), which drives the build and calls this as its own review pass before committing; upstream, the spec it checks against is produced by [qs-plan-spec](https://aihero.dev/skills-to-spec) and [qs-plan-tickets](https://aihero.dev/skills-to-tickets). When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
