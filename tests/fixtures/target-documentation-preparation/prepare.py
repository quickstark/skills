"""Prepare documentation replacements and a patch; never edit active documents."""
from pathlib import Path
import hashlib, json, difflib

repo = Path(__file__).resolve().parents[3]
root = Path(__file__).resolve().parent
read = lambda path: (repo / path).read_text()
sha = lambda data: hashlib.sha256(data).hexdigest()
updates = {}

old_readme = read('README.md')
retained = old_readme[old_readme.index('## Core commands'):old_readme.index('## Optional Pstack workflows')]
updates['README.md'] = '''# QuickStark Skills

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

''' + retained + '''## Advanced and creative outcomes

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

QuickStark preserves the source identities and notices recorded in
[provenance](./docs/upstream/provenance.md) and [third-party notices](./THIRD_PARTY_NOTICES.md).
The [upstream log](./docs/upstream/README.md) distinguishes historical baselines,
reviewed sources and accepted adoption. `upstream` is read-only reference;
authorized personalized publication goes only to `origin`.
'''

old_agents = read('AGENTS.md')
contract = old_agents[old_agents.index('## Root-run contract'):old_agents.index('## Upstream')]
contract = contract.replace('`skills/engineering/qs-help/SKILL.md` and `skills/pstack/commands/ps-help/SKILL.md` are collection routers.', '`skills/engineering/qs-help/SKILL.md` is the target collection router. The retained PS Help source is historical compatibility material, not a target alias.')
contract = contract.replace('Every QS and PS result', 'Every public result')
updates['CLAUDE.md'] = '''# QuickStark skill collection

The target consists of six QS packages and 38 public commands: core 12,
specialists 8, advanced 12, frontend 4, video 1 and execution 1. Core and
specialist names and membership are retained. Catalog membership is authoritative;
the total is a checked consequence, not a policy cap.

Reference material under `skills/misc/`, `skills/personal/`, `skills/in-progress/`
and `skills/deprecated/` is never promoted or packaged by implication.

## Source of truth

Collection catalogs are `scripts/qs-skill-catalog.mjs`,
`scripts/advanced-skill-catalog.mjs`, `scripts/frontend-skill-catalog.mjs`,
`scripts/video-skill-catalog.mjs` and `scripts/execution-skill-catalog.mjs`.
`scripts/skill-collection-registry.mjs` owns active identity and exact host literals.
The PS catalog preserves original identities and dispositions for provenance and
migration; it does not create QS aliases. Add or rename a root in its catalog first.

Every public command has matching canonical `SKILL.md`, display metadata, exact
package prompt, generated page and source-synchronized projection in its owning
package for each generated host. Packages include their own private closure.
Preserve all 21 video modules and the complete execution module/dependency index.
Preserve original versus derived hashes, source revisions, notices, stable migration
IDs and many-to-one provenance mappings when adapting content.

Explicit-only canonical, Claude and Pi metadata retain
`disable-model-invocation: true` and `policy.allow_implicit_invocation: false`.
Generated Codex projections omit those markers only in the existing projector
compatibility exception. Never weaken canonical policy to repair host discovery.

## Packages and installation

Fresh selection is core only. Ordinary update uses saved selection; optional
packages require explicit selection and accepted replacement evidence. A known
package, helper reference or source directory does not authorize installation.
Target native transactions support Codex and Pi only. Generated Claude packaging
does not establish a supported Claude transaction adapter.

Retain the PS 3.8.0 transition artifact, its marked marketplace visibility and exact
recorded payload while old registrations need observation and safe withdrawal.
It is excluded from target selection and active-version synchronization. Do not
regenerate, remove or rename it as if it were a current QS package.

Codex, Claude and Pi package snapshots and generated documentation are outputs.
Never edit them independently. Root package and lockfile versions must match all
active generated manifests. After source/catalog/documentation/plugin changes run:

```bash
npm run sync:codex
npm run check:codex
npm test
```

When Claude is available, validate `.`, `packages/qs-specialists`,
`packages/qs-advanced`, `packages/qs-frontend`, `packages/qs-video` and
`packages/qs-execution` using `claude plugin validate <root> --strict`.
Packaging validation is separate from native install/migration acceptance.

The current Changesets workflow versions the root and tags; it does not run the
required projection synchronization after versioning. Before any intended release,
regenerate all active versioned outputs and run required checks. Do not infer
publication, installed-host rollout or acceptance from a queued command or a tag.

''' + contract + '''## Upstream and activation evidence

`origin` is the personal fork at `https://github.com/quickstark/skills`.
`upstream` is the read-only reference at `https://github.com/mattpocock/skills`.
Preserve all recorded MIT/Apache notices, including Matt Pocock and Lauren Tan.
Push personalized changes only to `origin` when authorized.

Source-body presence, generated projection success, behavior trials, runtime checks
and installed-host acceptance prove different things. Keep unverified source/package
acceptance explicit until independently verified. Documentation preparation never
activates the registry.
'''

updates['docs/install-and-update-skills.md'] = '''# Install and update QuickStark skills

This guide describes the six-package target updater. Selection options require
the target registry; an older checkout using the legacy updater rejects
`--profile`, `--with` and `--resume`. Do not use documentation alone as
proof that a target package is accepted or installed.

The target native transaction supports Codex and Pi. Choose only installed hosts;
Pi means the coding-agent harness. Claude package projections are generated, but
the target updater rejects `--agent claude-code` until a separately verified native
transaction adapter exists. It must not silently fall back to the legacy updater.

## Selection and the repository template

Updates move from a verified repository checkout to one machine. They do not copy
installed caches back into Git, synchronize machines, or adopt upstream changes.
The six packages are core `qs-skills` (12 roots), `qs-specialists` (8),
`qs-advanced` (12), `qs-frontend` (4), `qs-video` (1) and `qs-execution` (1).

| Situation | Selection |
| --- | --- |
| Fresh machine, no selection flags | `qs-skills` only; no standalone resources |
| Saved machine, no selection flags | Saved packages and resources for each selected host |
| Previously managed machine without saved selection | Verified ownership/capability migration preview; ambiguous or expanded exposure blocks |
| `--with <package-id>` | Explicit addition to the current selection; repeat for multiple additions |
| `--profile core` | Explicit desired core selection; reduction is not deletion authority |

`--agent` selects a host independently of package selection; its default is Codex.
The implemented addition flag is `--with`, not `--with-package`. Unknown IDs and
duplicate additions fail. New optional packages do not join an ordinary update.
The selection file is `~/.config/quickstark/skills-selection.json`; it is saved
only after the transaction succeeds. Do not edit it to bypass a migration conflict.

## First setup

Use an existing supported Node/npm and the selected host CLI. Keep the checkout
at a stable path because native package bindings include that path.

```bash
git clone https://github.com/quickstark/skills.git
cd skills
npm ci
codex plugin marketplace add ./codex
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

For Codex, register the existing local marketplace directory before planning;
the production input rejects an absent marketplace. Run the bootstrap from the
checkout root, or use its absolute `/path/to/skills/codex` directory. Omit it on a
Pi-only machine. An existing QuickStark registration with a different identity or
path requires a separately reviewed correction; do not remove or repoint it blindly.

The plan is read-only. Inspect its desired selection, ownership, retirement,
acceptance and conflict evidence. Update is the mutation command and revalidates
live state. A missing accepted package receipt, modified managed content,
unexpected exposure or unsupported native state blocks mutation.

## Normal update and explicit additions

From the maintained checkout, refresh it without discarding local work, then use
the same selected hosts for plan and update:

```bash
git pull --ff-only origin main
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

This preserves saved optional selections. To add frontend explicitly:

```bash
npm run skills:plan -- --json --agent codex --with qs-frontend
npm run skills:update -- --agent codex --with qs-frontend
```

Repeat `--with` for other selected packages. Omit `--profile core` during an ordinary
update unless you deliberately intend to replace the desired selection with core.
Restart the host or begin a new task after changing discovery.

Before mutation, `skills:update` queries the current `origin/main` without fetching
or changing refs and requires exact checkout HEAD equality. A stale clean main
checkout gets a fast-forward recovery command; a dirty, detached or non-main
checkout gets an isolated-worktree recovery. Preserve local changes and use the
printed recovery. A denied freshness request is an attempted request, not proof of
zero network activity.

## Verification and recovery

`npm run skills:verify -- --agent codex --agent pi` runs repository checks/tests
and then read-only selected-state verification. `node scripts/managed-skills.mjs
verify --json --agent codex --agent pi` performs only the selected-state check.
Verification checks accepted package bindings and requires selected legacy
identities to have completed migration; a package version string alone is insufficient.

`skills:sync -- --authorize` remains the explicit review-then-authorize interface.
Update/sync use an exclusive updater lock and a transaction journal. Preserve a
failure's journal and backups. For an interrupted transaction, use its exact path:

```bash
npm run skills:update -- --agent codex --resume /absolute/path/to/transaction.json
```

Ordinary resume continues the frozen forward plan using the journal's selection;
do not add profile or package flags. Failed transactions retain their journal,
backups and residuals. Restoring a prior release or journaled effects requires
separately verified, transaction-specific recovery authority; no automatic rollback
is promised.
It must match the home, repository and release revision. A stale updater lock is
never automatically stolen; investigate the recorded owner before explicit recovery.
Never repair a conflict by deleting a cache or rewriting a lock blindly. A failed
rollback must retain its residual paths and diagnostics rather than claim success.

The old `ps-skills` 3.8.0 payload remains a [transition artifact](./upstream/package-transition.md)
while existing native registrations need observation and verified withdrawal. Its
presence is not a new selection or an alias for a QS command. Unowned, edited,
filtered or ambiguous state remains a conflict; migration does not grant arbitrary
filesystem deletion or extra optional outcomes.

Contributor curation, exact pins, portable resource placement and separately
authorized third-party Pi manager actions are documented in the
[control-plane guide](./personal-skills.md). Project video runtime/model acquisition,
paid providers, publication, native settings changes outside the transaction and
optional execution hooks require their own task authority.
'''

updates['docs/personal-skills.md'] = '''# Central skill control plane

Use the [installation guide](./install-and-update-skills.md) for normal updates.
The target updater applies a saved or explicitly selected set, not every package
and resource in the repository. Source preparation is not an installed-state claim.

## Ownership and selection

QuickStark canonical roots and private dependencies live in this repository;
generated host packages are projections. Approved third-party resources are pinned
in [the contributor manifest](../config/personal-skills.manifest.json). Installed
machine inventory is evidence, never upstream approval or authority to adopt.

[Profiles](../config/skill-profiles.json) define fresh core-only selection.
[Migrations](../config/skill-migrations.json) preserve stable original capability IDs
and map accepted replacements. Machine selection lives at
`~/.config/quickstark/skills-selection.json`. Ordinary updates preserve it;
`--with <package-id>` adds explicitly and `--profile core` starts a new desired
selection. Unknown packages, ambiguous ownership and capability expansion block.
Dropping a selected name does not authorize deletion.

Target transactions support Codex and Pi only. Claude projections and historical
inventory/link support do not constitute a verified Claude native transaction.
Do not pass Claude to the selected updater or fall back to its legacy all-package
path. Portable selected resources remain under `~/.agents/skills`; native package
state remains owned by Codex or Pi. Never copy system skills or plugin caches into
the canonical tree.

## Plan, save and recover

```bash
npm run skills:plan -- --json --agent codex --agent pi
npm run skills:update -- --agent codex --agent pi
```

The selected updater verifies the exact repository revision, active manifest
versions, package acceptance receipts, native inventory, exposed names, paths,
ownership and content identities before mutation. Update checks HEAD against a
non-mutating `origin/main` query. Plan and verification do not converge state.
The exclusive `.quickstark-skills-update.lock` protects mutation; journal and backup
directories live under `~/.local/state/quickstark/`.

Accepted replacement payloads are staged and verified before retired discovery is
withdrawn and replacements exposed. Selection and ownership state are saved only after
verification. Failed transactions retain their journal, backups and exact residuals;
they do not automatically compensate. Ordinary `--resume` continues the frozen
forward plan against its verified home/repository/revision, without new selection
flags. Restoring a prior release or journaled effects requires separately verified,
transaction-specific recovery authority; no automatic rollback is promised.
Do not steal a lock, delete an unrelated path or silently broaden packages to
bypass a conflict.

The [retained PS artifact](./upstream/package-transition.md) keeps old native
registrations observable during migration. Its pinned 3.8.0 payload is excluded
from active-version synchronization. Preserve source names, original revisions,
notices, historical dispositions and many-to-one mappings; they are provenance,
not invocation aliases.

## Contributor curation

Manifest schema 2 supports `agent-skill` and `pi-package` resources. Agent skills
bind immutable revision, license evidence, upstream tree and independent content
SHA256. Pi packages bind an exact npm version plus SHA512 integrity, or an exact
Git commit, together with license and contributed-skill path/hash evidence.
Schema 1 is accepted through lossless in-memory migration. The separate Skills CLI
installer remains integrity-pinned by [its lock](../config/personal-skills-installer-lock.json).

Inventory is read-only and reports managed, candidate, alias, conflict, ignored,
separately-managed or unresolved state. It scans supported discovery/configured
paths within the selected home, records a state token and omits unrelated settings
and credentials. Native caches and built-ins are not adoption candidates.

```bash
npm run personal-skills:inventory -- --json
```

Adoption requires one explicit live candidate and the current inventory state
token. It re-inventories, validates the immutable source/license/content and changes
only the manifest; it does not install the resource. Do not adopt a familiar name
or a stale inventory report as ownership proof. For example:

```text
npm run personal-skills:adopt -- --candidate agent-skills:example --state-token <current-token> --type agent-skill --license MIT --license-path LICENSE --agent codex --agent pi
```

Exact npm archives are staged with approved integrity and no lifecycle execution;
unsafe paths, links, special entries and oversized payloads fail. Git sources use
an immutable commit. Contributor selection is separate from provenance approval:
an approved manifest entry does not automatically join an ordinary target update.

The lower-level `personal-skills:plan`, `personal-skills:sync` and
`personal-skills:verify` operate on their selected manifest/resources and are
contributor-only tools, not a substitute for the saved-selection migration.
Do not run them as an all-resource repair of a target selection. The reconciler
replaces only clean previously managed bytes, preserves edited/unowned content,
and journals its canonical paths and exact lock before compensation.

Third-party Pi packages may carry executable extensions or lifecycle behavior.
The resource reconciler proposes an exact pinned native action but does not execute
it automatically. That action needs separate authorization; subsequent verification
checks settings pin, package identity and all contributed hashes. Ordered filters
and disabled approved skills remain explicit policy evidence, not permission to
reenable them silently.

## Boundaries

`skills:update` and authorized `skills:sync` mutate selected machine state;
`personal-skills:sync` mutates its separately reviewed contributor scope. Inventory,
plan and verify commands do not mutate discovery. Adoption changes repository
desired state only. None of these commands authorizes fleet operations, arbitrary
global packages, credentials/sessions, dotfiles, package-manager settings outside
the journaled scope, provider acquisition or publication.

The [upstream record](./upstream/README.md) distinguishes reviewed, adopted, pinned
and unknown status. New source bodies and successful fixture checks do not replace
package acceptance or installed-host verification.
'''

upstream = read('docs/upstream/README.md')
upstream = upstream.replace('tabulates every current public and private owner', 'preserves every baseline identity and tabulates target public and private owners')
upstream = upstream.replace('Proposed names and\ngroupings are not installed or implemented migrations.', 'That dated review is historical evidence; target catalogs and transaction code now exist. Their presence does not prove activation or installation.')
upstream = upstream.replace('and acceptance evidence. Its implementation remains pending.', 'and acceptance evidence. Source implementation, behavioral acceptance, activation and installed-host rollout remain distinct states.')
insert = '''## Target ownership and acceptance status

The target registry declares six packages and 38 public roots: unchanged core 12
and specialists 8, advanced 12, frontend 4, video 1 and execution 1. The advanced
mapping preserves visual parity as a dedicated root; frontend preserves separate
prompt/image/code outcomes. Video retains all 21 private modules and execution
retains the complete Unlazy module closure. Original public and contributor names
remain source records, not QS aliases.

The provenance schema keeps 71 baseline capability records and all 113 source
records, including many-to-one origins, stable migration IDs, original revisions,
notices and separate original/derived digests. Target owners are separate records.
Reviewed is not adopted; a pinned baseline is not a claim about current upstream;
unknown evidence remains unknown. Regenerate [provenance](provenance.md) from the
record rather than manually editing its tables. Preserve the dated source/review
sections below as history when recording later decisions.

Source-body and package acceptance require their own recorded evidence; this
documentation alone does not mark them complete. Local runtime evidence is bounded: HyperFrames 0.8.77
with Linux x64/Node 24.21.0/Chrome 151/FFmpeg 6.1.1 supports the recorded local
render/audio/seek and supplied-caption pipeline fixtures. It does not establish
authenticated generation, speech-model accuracy, interactive Studio or other hosts.
The CLI requires Node >=22 and an existing compatible Chromium plus full
FFmpeg/FFprobe; media-use also needs those binaries on PATH. Audio carving resolves
the separate `@hyperframes/core` 0.8.77 dependency, not the CLI's bundled copy.
The caption helper preflights the exact ONNX cache/model rather than downloading
missing resources. Denied runtime freshness/font fetch attempts remain recorded;
successful local output does not mean zero attempted requests.

The [video runtime profile](../../skills/video/qs-video/references/runtime-compatibility.md)
also records the unavailable named animate-text dependency and unpinned local voice
resolver branch. A missing selected capability blocks that outcome. The
[execution profile](../../skills/engineering/qs-unlazy/references/runtime-compatibility.md)
records Linux Node 16.20.2/24.21.0 checks against an unreleased upstream target,
definition-hash limits, process-group containment limits and opt-in hooks.
Windows integration is unverified. Definition hashes do not fingerprint every
transitive artifact used by a check, and detached processes can escape a process
group. Video browser launches retain the sandbox; the explicit isolated-fixture
opt-in never becomes an automatic fallback for ordinary users.

[PS transition metadata](../../config/skill-transition-packages.json) preserves
the observed legacy 3.8.0 package while registrations are safely withdrawn.
Its retained presence is not a seventh target package or an alias. Supported target
native transactions are Codex and Pi; generated Claude packaging alone does not
prove a supported Claude migration.

Release preparation must synchronize all active manifests/projections after the
root version changes. The current Changesets action versions and tags only;
neither versioning nor this review log proves publication or installed rollout.

'''
upstream = upstream.replace('## Source inventory\n', insert + '## Source inventory\n', 1)
upstream = upstream.replace('When Claude is\n   available, validate all three package roots with `claude plugin validate\n   <root> --strict`: `.`, `./packages/qs-specialists`, and `./packages/ps-skills`.', 'When Claude is\n   available, validate every active generated Claude package root with\n   `claude plugin validate <root> --strict`. Retained transition payloads are\n   verified separately and are not regenerated as current packages.')
updates['docs/upstream/README.md'] = upstream

files=[]
patch=[]
for prefix in ['base', 'proposed']:
    obsolete = root / prefix / 'AGENTS.md'
    if obsolete.exists():
        obsolete.unlink()  # Only our superseded draft; preserve the real symlink.
for path, proposed in updates.items():
    baseline=(repo/path).read_bytes()
    for prefix, data in [('base',baseline),('proposed',proposed.encode())]:
        destination=root/prefix/path
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(data)
    patch.extend(difflib.unified_diff(baseline.decode().splitlines(True),proposed.splitlines(True),fromfile='a/'+path,tofile='b/'+path))
    files.append({'path':path,'baseSha256':sha(baseline),'proposedSha256':sha(proposed.encode())})
(root/'target-documentation.patch').write_text(''.join(patch))
sources=['docs/specs/quickstark-upstream-adoption.md','scripts/skill-collection-registry.mjs','scripts/qs-skill-catalog.mjs','scripts/advanced-skill-catalog.mjs','scripts/frontend-skill-catalog.mjs','scripts/video-skill-catalog.mjs','scripts/execution-skill-catalog.mjs','scripts/managed-skills.mjs','scripts/managed-skill-input.mjs','scripts/migration-transaction.mjs','scripts/skill-selection.mjs','config/skill-profiles.json','config/skill-transition-packages.json','config/skill-provenance.json','package.json','.github/workflows/release.yml','.changeset/config.json','scripts/sync-v3-docs.mjs','scripts/sync-skill-output-contracts.mjs','scripts/sync-codex-plugin.mjs','scripts/sync-upstream-docs.mjs','skills/video/qs-video/references/runtime-compatibility.md','skills/engineering/qs-unlazy/references/runtime-compatibility.md']
(root/'inventory.json').write_text(json.dumps({'schemaVersion':1,'kind':'Unapplied target documentation preparation','files':files,'effectiveInstructionPath':{'requested':'AGENTS.md','symlinkTarget':'CLAUDE.md','patchTarget':'CLAUDE.md','preserveSymlink':True},'sourceBindings':{p:sha((repo/p).read_bytes()) for p in sources},'pending':['Independent parent patch review','Target source/package acceptance','User approval for 66 frontend trials','Video report repair validation','Registry activation','Version synchronization and release validation','Publication and installed-host rollout'],'activationRecheck':['Temporary pending-trial approval wording was removed from proposed shipped prose and retained only here. Reconcile this inventory to verified parent decisions at activation.','Reread runtime profiles and acceptance records; do not rewrite unknown provider paths or unreleased upstream labels as verified.','Confirm target-registry identity and every generated index/page before applying the patch.','After root versioning, synchronize all active manifests/projections; retain PS transition payload unchanged.'],'generatedOutputsExcluded':['docs/<bucket>/<registered-command>.md','docs/upstream/provenance.md','skills/**/ROUTING.md','Canonical completion sections','Codex/Claude/Pi package projections and marketplaces','Bucket and historical package indexes'],'patchSha256':sha((root/'target-documentation.patch').read_bytes())},indent=2)+'\n')
print(json.dumps({'patchFiles':len(files),'activeDocsEdited':False}))
