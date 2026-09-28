# QuickStark Skills

QuickStark's target catalog has six packages and 38 public commands. The twelve
core commands and eight specialists retain their names and package membership.
Advanced, frontend, video and execution packages expose distinct optional outcomes.
Fresh setup selects core only; ordinary updates preserve the saved selection.

Package acceptance, release and installed-host rollout have separate evidence.
Source presence or this document does not establish that those steps occurred.

| Package | Public commands | Scope |
| --- | ---: | --- |
| `qs-skills` | 12 | Core lifecycle, including Help |
| `qs-specialists` | 8 | Existing specialists, including reusable-skill and goal-prompt authoring |
| `qs-advanced` | 12 | PS-derived evidence workflows, including dedicated visual parity |
| `qs-frontend` | 4 | Frontend code, web images/prompts, mobile images/prompts, reference-to-code |
| `qs-video` | 1 | Video operations backed by 21 private domains and workflows |
| `qs-execution` | 1 | Substantial-work gates through `qs-unlazy` |

Catalogs own membership, not this count. Every public root has one package owner;
private references are not extra commands. Help can explain optional capabilities,
but checks actual availability before offering an executable literal and never
installs or starts another root automatically.

## Install and update

Use the [installation guide](./docs/install-and-update-skills.md) from a verified
checkout after target activation. The selected transactional updater supports
Codex and Pi. Claude projections remain generated compatibility artifacts; a
verified Claude native transaction adapter is not available.

```bash
git clone https://github.com/quickstark/skills.git
cd skills
npm ci
codex plugin marketplace add ./codex
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

Choose only installed hosts; omit the Codex bootstrap on a Pi-only machine.
Register the existing local `./codex` directory only for first-time Codex setup.
An existing marketplace identity/path mismatch needs a separate reviewed action;
these instructions do not authorize automatically repointing it.
With no selection flags, a fresh machine receives
`qs-skills`; a managed machine retains its verified or saved capability selection.
Add an optional package explicitly, for example `--with qs-frontend`, using the
same flags for plan and update. New optional catalog entries never become selected
merely because an ordinary update sees them. A Git pull does not prove a cached
plugin was refreshed; installed discovery must pass verification.

The [control-plane guide](./docs/personal-skills.md) explains pinned resources,
ownership checks, migration journals and recovery. Do not copy installed caches
back into Git or synchronize machines with one another.

## Core commands

| Order | Command | Purpose |
| ---: | --- | --- |
| 10 | [`qs-help`](./skills/engineering/qs-help/SKILL.md) | Choose one workflow. |
| 20 | [`qs-setup`](./skills/engineering/qs-setup/SKILL.md) | Prepare or verify a project. |
| 30 | [`qs-plan-clarify`](./skills/engineering/qs-plan-clarify/SKILL.md) | Resolve scope and material decisions. |
| 40 | [`qs-plan-roadmap`](./skills/engineering/qs-plan-roadmap/SKILL.md) | Sequence confirmed outcomes. |
| 50 | [`qs-plan-spec`](./skills/engineering/qs-plan-spec/SKILL.md) | Write actionable specifications or dependency-aware tickets. |
| 60 | [`qs-code-build`](./skills/engineering/qs-code-build/SKILL.md) | Implement one scoped change. |
| 70 | [`qs-code-debug`](./skills/engineering/qs-code-debug/SKILL.md) | Diagnose and repair a defect. |
| 80 | [`qs-review-code`](./skills/engineering/qs-review-code/SKILL.md) | Review, improve, or refactor selected code. |
| 90 | [`qs-git-merge`](./skills/engineering/qs-git-merge/SKILL.md) | Integrate selected Git changes safely. |
| 100 | [`qs-deploy-release`](./skills/engineering/qs-deploy-release/SKILL.md) | Validate and execute an approved release. |
| 110 | [`qs-flow-triage`](./skills/engineering/qs-flow-triage/SKILL.md) | Route incoming work. |
| 120 | [`qs-flow-handoff`](./skills/productivity/qs-flow-handoff/SKILL.md) | Preserve verified continuation state. |

## Optional specialists

| Command | Purpose |
| --- | --- |
| [`qs-plan-research`](./skills/engineering/qs-plan-research/SKILL.md) | Answer one evidence-backed question. |
| [`qs-design-prototype`](./skills/engineering/qs-design-prototype/SKILL.md) | Test one design hypothesis. |
| [`qs-code-document`](./skills/engineering/qs-code-document/SKILL.md) | Document verified behavior. |
| [`qs-test-author`](./skills/engineering/qs-test-author/SKILL.md) | Add focused tests for existing behavior. |
| [`qs-test-verify`](./skills/engineering/qs-test-verify/SKILL.md) | Run and report selected software verification. |
| [`qs-learn-teach`](./skills/productivity/qs-learn-teach/SKILL.md) | Teach one bounded subject. |
| [`qs-skill-write`](./skills/productivity/qs-skill-write/SKILL.md) | Create or improve one agent skill. |
| [`qs-deploy-prompt`](./skills/engineering/qs-deploy-prompt/SKILL.md) | Generate a scoped autonomous deployment prompt. |

## Advanced and creative outcomes

`qs-advanced` supplies `qs-how`, `qs-why`, `qs-blast-radius`,
`qs-runtime-forensics`, `qs-trace-forensics`, `qs-create-verification-skill`,
`qs-maintain-verification-skill`, `qs-skill-eval`, `qs-hillclimb`,
`qs-visual-parity`, `qs-pr-babysit` and `qs-worktree-cleanup`.
Visual parity retains its immutable reference, selected tolerance and measured
residual; it is not absorbed into general frontend implementation.

`qs-frontend` separates `qs-design-frontend`, `qs-design-image-web`,
`qs-design-image-mobile` and `qs-design-image-to-code`. Image roots also accept
prompt-only work without generation or product edits. Reference-to-code preserves
the selected visual authority. `qs-deploy-prompt` remains the separate
goal-workflow-prompt author; generating a prompt never executes it.

`qs-video` retains 21 private resources, including ten specialized workflows,
Figma input and Studio guidance. Its [runtime profile](./skills/video/qs-video/references/runtime-compatibility.md)
documents exact tested local paths and unavailable provider routes. `qs-unlazy`
has a separate [runtime profile](./skills/engineering/qs-unlazy/references/runtime-compatibility.md);
optional hooks require their own authorization.

The retained `ps-skills` 3.8.0 payload is a [migration compatibility artifact](./docs/upstream/package-transition.md).
It stays observable until verified withdrawal and is excluded from fresh target
selection. Original PS names and contributor names remain provenance, not aliases.

## Results and authority

Every invocation owns one bounded result in chat. Public roots do not start other
public roots automatically. Only an explicitly submitted authorized goal workflow
may coordinate successive roots under the [shared contract](./docs/skill-run-contract.md).
Effort controls evidence depth, not mutation or publication authority.

Tracked results retain status, specs, a compact Work summary and at most one
eligible copy-ready next-work prompt. Release is terminal. Failed required checks
and actionable P0/P1 findings prohibit completion. Private helpers do not emit
separate results or expand authority.

## Development and release

Edit canonical sources and collection catalogs; regenerate package projections,
command pages, output contracts and provenance instead of editing generated copies.

```bash
npm run sync:codex
npm run check:codex
npm test
```

The [release workflow](./.github/workflows/release.yml) currently runs
`changeset version` and `changeset tag`; it does not synchronize or validate the
generated manifests for a version bump. Before an intended release, synchronize
the root package/lockfile and every active Claude, Codex and Pi manifest/projection,
then run the checks above. Keep the pinned PS transition payload unchanged and
outside active-version synchronization. A tag is not installed-host rollout evidence.

QuickStark adapts [Matt Pocock's skills](https://github.com/mattpocock/skills),
[Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack), and
the other attributed sources below. It preserves the source identities and notices recorded in
[provenance](./docs/upstream/provenance.md) and [third-party notices](./THIRD_PARTY_NOTICES.md).
The [upstream log](./docs/upstream/README.md) distinguishes historical baselines,
reviewed sources and accepted adoption. `upstream` is read-only reference;
authorized personalized publication goes only to `origin`.
