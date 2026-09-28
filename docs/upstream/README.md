# Upstream sources and review log

The generated [capability provenance index](provenance.md) preserves every baseline identity and tabulates target public and private owners, original source identities, reviewed and adopted revisions, licenses, and planned replacements. Its source is [`config/skill-provenance.json`](../../config/skill-provenance.json); `npm run check:upstream` checks the record and generated document. Planned replacements do not activate packages.


QuickStark keeps abbreviated, host-neutral workflows. Upstream changes are
review candidates: adapt useful behavior into existing owners, preserve our
execution contracts, and avoid adding commands for ideas an existing command
already covers.

This index covers all six skill-source repositories tracked by QuickStark:
two adapted collections and four sources for the eighteen approved contributor
skills. Harness-owned system skills and independently installed plugins remain
owned by their original managers; they are outside this repository's managed
source inventory. Ordinary npm dependencies remain in the package lockfile.

## Authoritative records

| Record | What it owns |
| --- | --- |
| [QS catalog](../../scripts/qs-skill-catalog.mjs) | Original Matt Pocock names and their QuickStark identities |
| [PS catalog](../../scripts/ps-skill-catalog.mjs) | Pstack revision, version, attribution, and candidate dispositions |
| [Contributor manifest](../../config/personal-skills.manifest.json) | Approved repository, immutable revision, upstream path, license, tree identity, and content digest for every contributor skill |
| [Installer lock](../../config/personal-skills-installer-lock.json) | Integrity-pinned Skills CLI installer |
| [Third-party notices](../../THIRD_PARTY_NOTICES.md) | Preserved notices for adapted Matt Pocock and Lauren Tan material |

The tables below are a dated review snapshot, not another configuration source.
When a pin advances, update the authoritative record and add a review entry here.
Historical [inherited changesets](./changesets/README.md) are attribution and
reference material, not an update queue.

The [per-skill review](./skill-review-2026-09-25.md) records proposed owners,
preserved capabilities, consolidation risks, and acceptance checks. It supersedes
earlier command-count proposals: frequently used workflows should have QS names;
distinct specialists need not disappear to meet an arbitrary total. Prompt
building and visual parity remain explicit capabilities. That dated review is historical evidence; target catalogs and transaction code now exist. Their presence does not prove activation or installation.

The [adoption specification](../specs/quickstark-upstream-adoption.md) defines
groups A–E, optional-package selection, capability mappings, migration safeguards
and acceptance evidence. Source implementation, behavioral acceptance, activation and installed-host rollout remain distinct states.

## Target ownership and acceptance status

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

## Source inventory

Baselines below were verified on **2026-09-25**.

| Upstream | What we use | Baseline | License |
| --- | --- | --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills) | QS engineering/productivity workflows and internal techniques; names mapped by the QS catalog | Common Git ancestor [`ed37663`](https://github.com/mattpocock/skills/commit/ed37663cc5fbef691ddfecd080dff42f7e7e350d), 2026-07-21. This is an ancestry comparison point, not proof that every later idea is absent. | MIT |
| [cursor/plugins, pstack](https://github.com/cursor/plugins/tree/main/pstack) | Thirteen PS commands, sixteen private capabilities, and selected techniques merged into QS | Pstack **0.14.1**, [`63d938c`](https://github.com/cursor/plugins/commit/63d938c2e4a165a0fec1bd0f61a8e325f0cb751e); 72 classified candidates | MIT, Lauren Tan |
| [Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy) | `unlazy`, including its scripts and references | [`754d9a6`](https://github.com/Leonxlnx/unlazy/commit/754d9a68109e39b836cc72a39fb9a823f9d6b613) | MIT |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Seven frontend and image-direction skills listed below | [`e988add`](https://github.com/Leonxlnx/taste-skill/commit/e988add20dab0fa97d7a76781c48961c8184288e) | MIT |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | Eight HyperFrames skills plus `media-use` | [`de4062a`](https://github.com/heygen-com/hyperframes/commit/de4062a93300cbe1826edfbd8d71fbc44be25cb7) | Apache-2.0 |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | `find-skills`; also the separate Skills CLI installation tool | Skill pin [`c6f69c6`](https://github.com/vercel-labs/skills/commit/c6f69c631292444cc541ac6d91e2226b0ff247da); installer pinned separately to **1.5.23** with integrity | MIT |

Contributor names do not always match their upstream folders:

| Installed name | Repository | Upstream skill file |
| --- | --- | --- |
| `unlazy` | `Leonxlnx/unlazy` | `SKILL.md` |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | `skills/taste-skill/SKILL.md` |
| `high-end-visual-design` | `Leonxlnx/taste-skill` | `skills/soft-skill/SKILL.md` |
| `image-to-code` | `Leonxlnx/taste-skill` | `skills/image-to-code-skill/SKILL.md` |
| `imagegen-frontend-mobile` | `Leonxlnx/taste-skill` | `skills/imagegen-frontend-mobile/SKILL.md` |
| `imagegen-frontend-web` | `Leonxlnx/taste-skill` | `skills/imagegen-frontend-web/SKILL.md` |
| `minimalist-ui` | `Leonxlnx/taste-skill` | `skills/minimalist-skill/SKILL.md` |
| `redesign-existing-projects` | `Leonxlnx/taste-skill` | `skills/redesign-skill/SKILL.md` |
| `hyperframes` | `heygen-com/hyperframes` | `skills/hyperframes/SKILL.md` |
| `hyperframes-animation` | `heygen-com/hyperframes` | `skills/hyperframes-animation/SKILL.md` |
| `hyperframes-audio` | `heygen-com/hyperframes` | `skills/hyperframes-audio/SKILL.md` |
| `hyperframes-cli` | `heygen-com/hyperframes` | `skills/hyperframes-cli/SKILL.md` |
| `hyperframes-core` | `heygen-com/hyperframes` | `skills/hyperframes-core/SKILL.md` |
| `hyperframes-creative` | `heygen-com/hyperframes` | `skills/hyperframes-creative/SKILL.md` |
| `hyperframes-keyframes` | `heygen-com/hyperframes` | `skills/hyperframes-keyframes/SKILL.md` |
| `hyperframes-registry` | `heygen-com/hyperframes` | `skills/hyperframes-registry/SKILL.md` |
| `media-use` | `heygen-com/hyperframes` | `skills/media-use/SKILL.md` |
| `find-skills` | `vercel-labs/skills` | `skills/find-skills/SKILL.md` |

## Review: 2026-09-25

Compared immutable baselines with fresh upstream checkouts. All eighteen local
contributor directories matched the manifest's complete content digests. That
confirms installation integrity, not upstream freshness. No skill source,
approved pin, installed skill, or package version was changed by this review.

| Source | Reviewed revision | Result |
| --- | --- | --- |
| Matt Pocock | [`c55ee46`](https://github.com/mattpocock/skills/commit/c55ee46073ed923f86ce59a5eb3b6d895095d1b7) | 158 commits after the common ancestor; selectively adapt the items below |
| Pstack | [`12d587d`](https://github.com/cursor/plugins/commit/12d587dfb20741cafc376c42c696c5f6e2a64487) (latest pstack change in repository HEAD `fadd23794c0075468eb8964b0fd93e06e09486ad`) | Version **0.15.5**; useful additions plus model/host-specific changes we should omit |
| Unlazy | [`1667149`](https://github.com/Leonxlnx/unlazy/commit/16671491f6679ad9378f52604d3bc2415b4120c7) | Evidence validation and execution hardening; upstream calls this **unreleased, target 2.1.0**, not a published release |
| Taste | [`c184364`](https://github.com/Leonxlnx/taste-skill/commit/c184364c58658b2f131b4ae8bd3d206cabb3deee) | No changes under any of our seven installed skill directories since the pin |
| HyperFrames | [`2734ee2`](https://github.com/heygen-com/hyperframes/commit/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c) | Changes in all nine managed skill directories; review as a coordinated skills/runtime update |
| Find Skills | [`7407f38`](https://github.com/vercel-labs/skills/commit/7407f3893ad4dceab546ac002c3ef806e4000c73) | No changes under `skills/find-skills`; installer release suitability was not evaluated |

### Recommended adaptations

These are pending curation candidates, not authorized installations or new
public commands.

1. **Unlazy evidence integrity.** Prioritize the upstream change that binds
   completion evidence to the actual `CHECK`, `EXPECT`, and `CWD` definition,
   rejects stale evidence, and treats abandoned work as a handoff rather than
   success. New gate linting also catches weak checks without executing them.
   Review the [source changes](https://github.com/Leonxlnx/unlazy/compare/754d9a68109e39b836cc72a39fb9a823f9d6b613...16671491f6679ad9378f52604d3bc2415b4120c7)
   and validate scripts before advancing the contributor pin. Existing runnable
   evidence may require re-verification after upgrading; definition hashes do
   not validate transitive files used by a check.
2. **Small QS improvements from Matt and pstack.** Add concise guidance to
   existing owners: redact debug artifacts in `qs-code-debug`; reassess the
   shared premise after repeated failed fixes; prefer independently derived
   expected results in test guidance; and show before/after evidence plus
   rollback impact in `qs-git-merge` PR descriptions. Sources:
   [debug redaction](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md),
   [attack the premise](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-attack-the-premise/SKILL.md),
   [behavioral tests](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-test-behavior-not-implementation/SKILL.md),
   and [PR evidence](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/pr/SKILL.md).
   Adapt the testing principle rather than copying its blanket assertion
   heuristics: valid absence checks and contract tests still need judgment.
   Matt's PR skill remains in-progress; borrow its useful evidence format
   without promoting it as another command.
3. **Keep instructions short.** Matt's `writing-great-skills` has become
   [`writing-for-agents`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md).
   Its useful additions are conditional reference pointers, keeping uncommon
   branches outside the main workflow, and removing facts cheaply discoverable
   from the environment. Incorporate these into `qs-skill-write`. Keep the
   catalog's original-name mapping as provenance rather than silently rewriting
   history. The new
   [retro guidance](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/retro/SKILL.md)
   also favors deterministic checks over more prose for mechanically enforceable
   rules. Our one-root policy and concise `ps-how` / `ps-why` already cover much
   of the upstream simplification.
4. **Update HyperFrames as a unit.** Changes include seek-safe push transitions,
   self-contained installed-script imports, audio fixes, and movement of media
   resolution from skill-local scripts into `hyperframes media-use`. Check the
   supported CLI/runtime alongside all nine pins before adopting the new
   instructions. Sources:
   [transition correction](https://github.com/heygen-com/hyperframes/commit/ff884845a),
   [installed imports](https://github.com/heygen-com/hyperframes/commit/29fc95395),
   and [media interface](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/media-use/SKILL.md).

### Keep or omit

- Keep the seven Taste skills and `find-skills` at their existing pins; repository
  activity alone is not a reason to refresh unchanged skill content.
- Preserve our abbreviated workflows, explicit invocation boundaries,
  direct-chat results, and host-neutral behavior. Current package sizes are
  implementation constraints until deliberately migrated, not a target for the
  future design. Consolidation must preserve capabilities and demonstrate useful
  routing; a smaller command count alone is not success.
- Omit pstack's new Grok Bot UI integration, fixed model selections, automatic
  public-skill chains, and mandatory multi-agent review orchestration.
- Borrow the idea of observable plan gates, not pstack's literal plan checker:
  it hardcodes its own headings, ten review lanes, and unit/live/performance
  requirements. Our evidence requirements should fit the selected task.
- Do not weaken canonical explicit-only metadata to match an upstream harness;
  our Codex projection compatibility exception stays in the projector.

## Reviewing and adopting future updates

1. Read the catalogs and contributor manifest. Resolve fresh upstream commits
   without editing canonical or installed skills. Compare paths, scripts, and
   references, not just package versions or `SKILL.md`.
2. Separate useful new behavior from existing adaptations, presentation churn,
   new dependencies, and host-specific assumptions. Record exact reviewed
   commits, local owners, compatibility constraints, and adopt/keep/omit choices.
3. For an authorized QS/PS adaptation, edit canonical sources only. A PS baseline
   change also requires reconciling its candidate inventory, dispositions,
   provenance, and tests; changing the version string alone is insufficient.
4. For an authorized contributor update, verify the revision, license, upstream
   path, tree identity, and complete content digest before updating the manifest.
   Follow the [control-plane curation workflow](../personal-skills.md). Never
   overwrite local edits or edit an installed copy as the source of truth.
5. Run `npm run sync:codex`, `npm run check:codex`, and `npm test` after repository
   skill, catalog, capability, documentation, or plugin changes. When Claude is
   available, validate every active generated Claude package root with
   `claude plugin validate <root> --strict`. Retained transition payloads are
   verified separately and are not regenerated as current packages.
6. Update this review log. Publish only to `origin` when authorized. The
   `upstream` Git remote is Matt Pocock's read-only reference. Contributor updates
   reach machines through the [installation/update workflow](../install-and-update-skills.md)
   after their pins enter the maintained template.

`skills:update` converges a machine to our approved pins. It does **not** discover
or automatically adopt the latest versions from these upstream repositories.
