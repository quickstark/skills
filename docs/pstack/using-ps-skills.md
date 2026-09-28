# Using the QS successors to historical PS workflows

This guide describes current QS roots. `ps-skills` is retained only as an immutable migration compatibility artifact for existing native consumers. Use the [successor table](./index.md) to interpret an old PS name; it does not create an alias or authorize installing the historical package.

## Select one bounded outcome

- `qs-how` explains observed mechanics; `qs-why` investigates attributable rationale and may report that intent is unknown. `qs-blast-radius` maps the impact of one proposed change. These are read-only results.
- `qs-runtime-forensics` measures one live symptom; `qs-trace-forensics` inspects an existing artifact. Both stop at diagnosis. A product repair is a separate, explicitly selected `qs-code-debug` task.
- `qs-create-verification-skill` creates a missing project-local verification driver and feature map. `qs-maintain-verification-skill` reconciles an existing driver and map. Both require a real harness and remain limited to verification assets, without changing product behavior.
- `qs-skill-eval` compares a control and variant through blinded recorded trials. `qs-hillclimb` improves a declared metric through bounded measured experiments. `qs-visual-parity` is a dedicated root with an immutable visual baseline, stable capture environment, declared metric and approved tolerance. Keep failed trials and measured residuals; claims or source-text counts do not establish quality.
- `qs-pr-babysit` observes one selected PR and repairs only when authorized; it never merges or enables auto-merge. `qs-worktree-cleanup` audits first and removes only exact confirmed worktrees. Neither discovery nor an earlier approval for another target authorizes destructive changes.

The twelve PS-derived investigation, verification, evaluation and operations roots belong to optional `qs-advanced`. Core `qs-help` routes a selected outcome without executing it. `qs-deploy-prompt` generates an execution-ready deployment goal prompt without executing it; `qs-skill-write` owns reusable skill/prompt writing. Both remain dedicated roots in optional `qs-specialists`. Choosing an investigation workflow does not discard either prompt-building outcome or visual parity.

## Inputs and authority

Name the bounded target and required evidence. Live diagnosis needs an environment and time window; artifact analysis needs the supplied trace and capture context. Verification needs the actual harness and permitted asset scope. Experiments need a control, rubric or metric, budget, stopping rule, and retained failures. Visual parity additionally needs baseline identity, state/viewport coverage and approved tolerance. PR and worktree operations need exact identities and explicit mutation authority.

Use only a selected package whose exact public literal is observed in the current host. Codex uses `$qs-advanced:<root>` for advanced commands; Claude uses `/<root>` and Pi `/skill:<root>`. All advanced roots are explicit-only. `effort=quick|standard|deep` controls evidence depth; `report=brief|full` controls presentation, defaulting to `standard` and `brief`. Neither expands mutation scope or publication authority.

Every invocation has one public root and one bounded result directly in chat. Public roots do not automatically execute each other. The sixteen advanced private capabilities remain internal references, not extra commands. Consult the [shared run contract](../skill-run-contract.md) for completion and continuation rules.

## Existing installations and provenance

Existing PS installations require the verified [package transition](../upstream/package-transition.md), including ownership checks and withdrawal before QS replacement exposure. A retained marketplace registration is migration continuity, not a fresh-install recommendation. Keep partial selections and unrelated packages unchanged unless the user explicitly selects additions; missing ownership or acceptance evidence remains a reported conflict.

The [successor table](./index.md), [provenance records](../upstream/provenance.md) and [third-party notices](../../THIRD_PARTY_NOTICES.md) retain original names and authorship. This historical guide does not assert adoption of unverified upstream changes.
