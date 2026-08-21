# Prototype: project-aware QuickStark report gallery

> Historical record — superseded by the direct-chat completion contract in [`docs/skill-run-contract.md`](../skill-run-contract.md). No active command, package, deployment, or service implements this design.

Status: throwaway UI prototype; no DNS records, public routes, authentication policies, persistent report directories, or production renderer behavior have been changed.

## Question

Which gallery makes real QuickStark skill reports easiest to find when they belong to different projects: a project-first library, a persistent project explorer, or a cross-project activity timeline?

## Run

From the QuickStark skill repository:

```bash
npm run readouts:prototype
```

The command prints the actual capability-protected local or home-network URL. Open that exact URL; do not assume that the prototype is reachable from the public internet. The server binds to the specific trusted interface selected by the existing readout helper and never creates a DNS record or binds to all network interfaces.

Use the floating bottom bar, the left and right keyboard arrows, or the URL query parameter to select a layout:

```text
?variant=A    Project-first library
?variant=B    Split-pane project explorer
?variant=C    Cross-project activity timeline
```

Search, project selection, and the explicitly labeled preview toggle are represented as URL search parameters. All data remains read-only and in memory; the prototype does not generate, migrate, modify, or delete reports.

To evaluate an already-existing persistent report directory instead of the default temporary directory, explicitly provide it:

```bash
QS_READOUT_DIR=/docker/appdata/quickstark-readouts npm run readouts:prototype
```

This command does not create the persistent directory. If it has not already been provisioned, the prototype correctly shows an empty gallery.

## Real data and project identity

The prototype discovers actual self-contained QuickStark readouts, verifies their existing skill metadata against the catalog, and opens only recognized report filenames under the configured report root. Skill previews remain hidden by default so they cannot be mistaken for completed work.

The current project is independently derived from a sanitized Git origin. For this repository, that is `quickstark/skills`. Existing reports predate a canonical machine-readable project field, so their visible project headings are honestly labeled as legacy headings rather than quietly treated as verified repository identities. Nested reports can also be discovered without requiring migration.

## Provisional design verdict

Use **variant A** as the default landing page: project-first organization directly answers “what project am I in, and where are its reports?” Use **variant B** as the selected-project detail view: a persistent sidebar makes it practical to move between projects and read previous reports. Offer **variant C** as an optional recent-activity view rather than the primary organization model.

The prototype also confirms that production implementation must write explicit canonical project metadata into each new report; mining human-written legacy headings is insufficient to prove two reports belong to the same Git repository. Durable storage, externally authenticated hosting, and the proposed `reports.quickstark.com` remain separate, intentionally unimplemented deployment steps.
