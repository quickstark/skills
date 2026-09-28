# Final projected discovery and private closure

`run.mjs` starts the real Codex and Pi clients in a fresh temporary home. It adds
the six generated local packages, uses Codex `skills/list` and Pi `get_commands`,
and requires exactly the 38 intended public identities. The only RPC methods are
initialization and enumeration; no model turn is sent. The temporary native home
is retained and identified in the result. Existing machine settings are untouched.

For each Claude, Codex and Pi projection, the runner copies and relocates the
video and execution skill resources. It runs the video closure verifier against
all 21 modules, 912 indexed source records, 911 retained private files and 186
relative imports. It also resolves an actual bundled SFX cue and compares its
bytes, while requiring an unknown cue to remain missing. The moved Unlazy checker
loads its imports and exercises successful evidence, stale definitions, changed
artifact reverification, restored success and abandoned-gate rejection. No hook
is installed, even in the fixture.

Bindings use the production `captureMigrationPath().contentSha256`, including
file modes and empty directories. They cover all 17 generated package trees,
the Claude core manifest and canonical sources, root version, and the actual
check helpers. Before/after equality rejects a concurrent source change.

Run from the release worktree, with an output directory that does not exist:

```sh
node tests/fixtures/adoption-final-discovery/run.mjs run /tmp/qs-final-discovery-repeat
node tests/fixtures/adoption-final-discovery/run.mjs verify /tmp/qs-final-discovery-repeat
```

Do not overwrite earlier outputs. Run again after a version/projection change;
`verify` intentionally rejects stale bindings. `result.json` includes every
subprocess command, status and output, the native evidence hash, all bindings,
the scratch directory, observed tool versions and explicit limits.

This checks native discovery and relocated projected helpers. It does not claim
model routing, actual-machine migration, fresh rendering, speech recognition,
provider readiness, Windows integration, or a new Node minimum-version test.
Those claims retain their separately recorded evidence and limitations. Unlazy
`--status` checks definitions rather than transitive input bytes; the changed
artifact control intentionally passes status and fails explicit `--reverify`.

Four passes: inspect existing native/helper implementations and runtime profiles;
prepare a bounded, source-bound check; execute and inspect complete native/helper
outputs; independently reread bindings and rerun the evidence verifier. The
parent reviews the helper before rerunning these commands for acceptance.
