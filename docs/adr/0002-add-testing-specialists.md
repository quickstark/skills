# Add test authoring and verification specialists

QuickStark v3 will add `qs-test-author` and `qs-test-verify` to the optional `qs-specialists` package. The default `qs-skills` package remains exactly twelve commands, while the specialist package expands from five to seven commands.

`qs-test-author` owns test-focused mutation for already-established behavior. `qs-test-verify` owns read-only execution and reporting of a selected verification matrix. Keeping them separate preserves clear mutation authority, completion criteria, failure handling, and readout signals.

This decision supersedes ADR 0001 only where that ADR fixes specialist membership at five commands. Its consolidation boundaries remain in force: TDD stays an internal capability owned by `qs-code-build`, `qs-test-tdd` is not restored as a public command or alias, every run has one public root, and public skills never start another public skill automatically.
