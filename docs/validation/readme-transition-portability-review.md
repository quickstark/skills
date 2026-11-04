# README evidence and retained transition identity re-review

## Scope and decision

This is a source/documentation review of the README change in `cebc841`, merged
at `6bed58b`, against the previously recorded AC-23 decision. It is not a new
behavior trial, native-discovery result, publication, or installed-host rollout.
No host-check decision or other acceptance criterion is promoted by this review.

`README.md` is referenced directly by AC-23 only; all six packages require that
criterion. No package host check directly references it. AC-23 remains passed
for this documentation change after reviewing the diff against the collection
registry, installation guide, shared run contract, transition documentation,
and approved image-font amendment:

- Six packages and 38 commands remain catalog-derived, with core-only fresh
  selection and explicit optional additions. Saved selection is preserved.
- Codex/Pi instructions use the existing local marketplace, read-only planning,
  ownership/acceptance checks and matching host/selection flags. Claude remains
  outside the supported native transaction adapters.
- Optional invocation examples require installation and host discovery. Help
  does not install or execute other public roots. Effort/report defaults and
  bounded in-chat results retain their shared-contract meanings.
- PS 3.8.0 remains a retained migration artifact, not a target alias or default
  selection. Original attribution and provenance remain intact.
- The retained compression baseline and narrowly approved, explicitly reported
  image-font limitation are stated without a universal font/dimension guarantee.
- Source synchronization, release and installed-host verification remain distinct:
  a pull does not refresh cached plugins and a tag does not prove host rollout.

The previous README SHA-256 was
`fd2a8673642f0d65259b18a92ff28c55d113439307f4383f711c1c35f40fe3b7`.
The reviewed current README SHA-256 is
`07e7c8c7ae4471446baedcb0a2172d433cb9cbb864e372dcbdd64b42ec5ea20b`.
The audit keeps its original AC-23 note/evidence and adds this review, updating
the current README evidence hash. Future README changes still fail closed.

The existing `tests/adoption-acceptance.test.mjs` evidence is also re-bound after
review: every prior test body is unchanged, and two additive regressions check
all recorded evidence hashes and README drift/local snapshot invalidation. Its
previous hash was `64539f6f3bbd19936e531487f13e01dfcb40a627f0fb6baf2807361e921b6919`;
the reviewed hash is `7680be871677cdb2a89c394ab3c8cb6f1b3ebb5f1ead40afed84b572903132a7`.
This additive test change does not regrade any historical trial or promote a
host acceptance result.

## 4.4 documentation alignment

This source/documentation review compares the README and Notion companion guide
against checkout `33b2f0d7def72c5a187c7581105160382b6e4b17`, the active collection
registry, `package.json`, `install.sh`, `scripts/install-skills.mjs`, the managed
argument parser, `.github/workflows/validate.yml`, the shared run contract and
canonical build/review instructions. Earlier sections above are historical
observations; their command counts and Claude limitations do not describe 4.4.

- README now includes the missing ninth specialist, `qs-repo-cleanup`, and all
  39 matching per-agent examples from the companion guide. Package ownership and
  invocation literals remain catalog-derived.
- Both guides describe the hosted installer as the ordinary macOS/Linux update,
  with the same explicit agent, optional-package, custom-home and resume examples.
  Advanced local commands first change into the managed checkout. Developer
  dependency installation and full source checks remain separate from normal
  installation and installed-state verification.
- Both explain 4.4 fresh-context delegation, serial fallback, read-only review
  axes, graph prerequisites and the explicit Git/worktree authority boundary.
  No extra public command, model-behavior result or runtime capability is implied.
- The installation guide's platform statement now matches the workflow: isolated
  native integration with pinned CLIs runs on Linux and macOS 15. A configured CI
  matrix is separate from deployment to an individual machine or installed profile.
- Notion's machine-specific deployment records remain historical evidence. This
  documentation update does not run the installer or change installed profiles.

The previous README evidence hash was
`45c8f2f600ab68cb19219c5ccdd9894fc334c2c5d01ba4b313899d1ba251c2d4`;
the previous installation-guide hash was
`3ca58490e3e54605324a425ff0a4fe0cce218b12841826ff5f0a5e6a9e6c63db`;
the previous hash of this review was
`b3e474c9c3061905401b08f35f17e8f8e7354840bd9bd231adb6846c7f7b7940`.
Refresh only these three current evidence bindings after command/catalog/link
validation and review of the documentation diff. Preserve all criterion decisions,
historical trials, source bindings and host acceptance results.

## Transition identity derivation

Transition inventory schema 2 adds `checkoutDigest` with the explicit kind
`git-content-and-executable-bits-sha256`. It uses the existing adoption digest
algorithm: ordered complete snapshot entries, normalizing directories to 0755
and files to 0755 when owner-executable, otherwise 0644. Hidden files, empty
directories, paths, sizes and file hashes remain bound. Symlinks are not allowed.
Unknown schemas or digest kinds fail closed. Schema 1 retains exact-mode checks.

All three current retained payloads match their recorded portable content digest.
Independently substituting directory mode 0775 and file mode 0664 into each
current snapshot reproduces its original `contentSha256` exactly. Substituting
0755/0644 derives the new checkout digest; no payload has an executable file.
Thus the original mismatch is a Git checkout/umask difference, not new content.
The original full-mode hashes, portable digests, source revision
`86bac7dd82fe3812c9b459cc6bfa7454df9aa3ac`, version and public inventory remain
unchanged. The old hashes are historical provenance, not silently rewritten
observations of this machine.

Normalization applies only to cross-checkout identity. Captured local snapshots
and `revalidateMigrationPath` retain exact permissions, filesystem identity and
content checks. A permission change after observation still invalidates a plan.
No migration ownership policy, selected package, native registration, installed
cache, historical payload, or acceptance behavior/discovery result is changed.

Regression coverage checks both permission layouts, preservation of original
hashes, schema-1 compatibility, fail-closed schema/kind handling, executable-bit
changes, extra hidden files and empty directories, modified/missing content,
strict local revalidation and evidence hash drift. These repository checks do
not establish installed-host acceptance.
