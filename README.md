# QuickStark Skills

QuickStark is a collection of concise skills for planning, building, reviewing,
documenting and delivering work. All 38 public commands use the `qs-` namespace
and belong to one of six packages. Fresh setup selects the twelve-command core;
add optional packages for the workflows you use. Ordinary updates preserve that
selection. See the [changelog](./CHANGELOG.md) for release history.

| Package | Public commands | Scope |
| --- | ---: | --- |
| `qs-skills` | 12 | Core lifecycle, including Help |
| `qs-specialists` | 8 | Specialists, including reusable-skill and goal-prompt authoring |
| `qs-advanced` | 12 | PS-derived evidence workflows, including dedicated visual parity |
| `qs-frontend` | 4 | Frontend code, web images/prompts, mobile images/prompts, reference-to-code |
| `qs-video` | 1 | Video operations backed by 21 private modules and workflows |
| `qs-execution` | 1 | Substantial-work gates through `qs-unlazy` |

The [collection registry](./scripts/skill-collection-registry.mjs) and its catalogs
own package membership; 38 is the current total, not a policy cap. Every public
root has one package owner; private references are not extra dropdown commands.
Help can explain optional capabilities,
but checks actual availability before offering an executable literal and never
installs or starts another root automatically.

## Install and update

Use an existing Node/npm installation and the CLI for your selected host. Keep
the repository checkout at a stable path: native package registrations refer to
it. The transactional updater supports Codex and Pi. Claude packages are generated,
but this updater does not support Claude installation or migration. The
[installation guide](./docs/install-and-update-skills.md) covers both supported hosts.

For a fresh Codex setup:

```bash
git clone https://github.com/quickstark/skills.git
cd skills
npm ci
codex plugin marketplace add ./codex
npm run skills:plan -- --json --agent codex
npm run skills:update -- --agent codex
```

Use `--agent pi` for Pi, or repeat `--agent` to select both installed hosts. Omit
the Codex marketplace command on a Pi-only machine. Register the existing local
`./codex` directory only for first-time Codex setup.
An existing marketplace identity/path mismatch needs a separate reviewed action;
these instructions do not authorize automatically repointing it.
The plan is read-only; inspect its selection and conflicts before running update.
With no selection flags, a fresh machine receives `qs-skills`; a managed machine
retains its verified or saved capability selection. The selection is saved in
`~/.config/quickstark/skills-selection.json` after a successful transaction.

For an ordinary update, refresh the checkout with `git pull --ff-only origin main`,
then run plan and update with the same hosts. The updater requires checkout HEAD
to match `origin/main` and checks ownership and release acceptance before effects.
If it reports a conflict, preserve local changes and follow the installation
guide's recovery instructions.

Add an optional package explicitly using matching plan/update flags:

```bash
npm run skills:plan -- --json --agent codex --with qs-frontend
npm run skills:update -- --agent codex --with qs-frontend
```

Repeat `--with` for other packages. New optional catalog entries never become
selected merely because an ordinary update sees them. Verify the installed
selection without rerunning the repository test suite:

```bash
node scripts/managed-skills.mjs verify --json --agent codex
```

Use the same host flags as the update. Restart the host or begin a new task to
refresh its skill catalog. A Git pull alone does not refresh cached plugins.

The [control-plane guide](./docs/personal-skills.md) explains pinned resources,
ownership checks, migration journals and recovery. Do not copy installed caches
back into Git or synchronize machines with one another.

## Use a skill

Start with Help to choose a workflow. Invoke optional commands only after their
package is installed and the host exposes them:

| Workflow | Codex | Pi |
| --- | --- | --- |
| Choose a workflow | `$qs-skills:qs-help` | `/skill:qs-help` |
| Build a deployment prompt | `$qs-specialists:qs-deploy-prompt` | `/skill:qs-deploy-prompt` |
| Match a visual reference | `$qs-advanced:qs-visual-parity` | `/skill:qs-visual-parity` |
| Create mobile images or prompts | `$qs-frontend:qs-design-image-mobile` | `/skill:qs-design-image-mobile` |

For a separately installed Claude package, use `/<command>`, such as `/qs-help`.
The [shared contract](./docs/skill-run-contract.md) defines `effort=quick|standard|deep`
and `report=brief|full`; their defaults are `standard` and `brief`.

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
It stays observable until verified withdrawal and is excluded from fresh
selection. Original PS names and contributor names remain provenance, not aliases.

The [adoption acceptance record](./docs/validation/upstream-adoption-acceptance.json)
links decisions to their evidence. Reporting compression retained the existing
baseline because the efficiency experiment did not qualify. Mobile image adoption
allows only the [explicitly reported image-font limitation](./docs/specs/quickstark-upstream-adoption-font-amendment.md);
it does not guarantee exact fonts or image dimensions.

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
The [architecture guide](./docs/architecture.md) maps catalogs and canonical
sources through the shared registry to each package's self-contained projection.

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

## Upstreams and provenance

QuickStark adapts [Matt Pocock's skills](https://github.com/mattpocock/skills),
[Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack), and
the other attributed sources below. It preserves the source identities and notices recorded in
[provenance](./docs/upstream/provenance.md) and [third-party notices](./THIRD_PARTY_NOTICES.md).
The [upstream log](./docs/upstream/README.md) distinguishes historical baselines,
reviewed sources and accepted adoption. `upstream` is read-only reference;
authorized personalized publication goes only to `origin`.
