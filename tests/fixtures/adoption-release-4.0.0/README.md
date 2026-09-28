# Changesets 4.0.0 release preparation

Implementation PR44 merged as b3f8438d6acdb5c0711788f83c7ce7e1d8166eab, with a tree identical to verified52854ae. The documented Release workflow was dispatched because that merge had no push-triggered run. Run36434989719 generated82fb8245df2b2239cabe5988a3754e6b927bfde7 on changeset-release/main, updating package.json and CHANGELOG and consuming the major Changeset. It then failed because GitHub Actions is not permitted to create/approve PRs. The failure log remains unchanged. The authorized operator continues that branch and creates its PR without changing repository permissions.

The lockfile and all18active generated manifests are synchronized to4.0.0; the unchanged PS compatibility payload stays3.8.0. Native discovery was freshly repeated on4.0.0, with38commands in each isolated Codex/Pi host and relocated video/Unlazy checks across all three projections. Source behavior is unchanged from accepted implementation apart from version metadata; original behavioral failures and limitations remain.

The lockfile update changed only the root version fields. npm reported14high severity development dependency advisories, arising from transitive js-yaml CPU-exhaustion cases in the pre-existing Changesets toolchain, with no fix reported for these dependency ranges. This is not a clean vulnerability scan. No dependency versions changed; reviewed local changeset/package YAML is the input for this release, and these development dependencies are not added to generated skill runtime payloads. The audit output is retained; broad dependency upgrades are outside this adoption change.

This evidence establishes preparation, not publication or actual-machine success. The final main/tag/release/workflow and selection-preserving local transaction must be observed separately.

Initial4.0.0suite passed461/462: one historical v3test incorrectly required retainedPS to share active version. The fixture now derives every active manifest from catalogs (18) and separately asserts all3PS manifests remain3.8.0. Its21focused tests and final462full tests pass. Original failure retained in initial-version-tests.log; no runtime assertion was removed.
