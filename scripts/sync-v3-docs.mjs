import { mkdir, readFile, writeFile, lstat, realpath } from "node:fs/promises";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { UPSTREAM_REPOSITORY } from "./qs-skill-catalog.mjs";
import { LEGACY_PUBLIC_COMMANDS, TARGET_PUBLIC_COMMANDS, REGISTRY_STATE } from "./skill-collection-registry.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requireCondition = (value, message) => { if (!value) throw new Error(message); };

export function renderCommandDocumentation(skill) {
  const packageName = skill.collectionId;
  const install = `codex plugin add ${packageName}@quickstark`;
  const sourcePath = skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`;
  const source = `https://github.com/quickstark/skills/blob/main/${sourcePath}/SKILL.md`;
  const upstream = skill.upstreamName
    ? ` · [Upstream inspiration](${UPSTREAM_REPOSITORY}/tree/main/skills/${skill.bucket}/${skill.upstreamName})`
    : "";

  return [
    `# ${skill.displayName}`,
    "",
    "Quickstart:",
    "",
    "```bash",
    "codex plugin marketplace add ./codex",
    install,
    "```",
    "",
    `[Source](${source})${upstream}`,
    "",
    "## What it does",
    "",
    `\`/${skill.name}\` ${skill.shortDescription[0].toLowerCase()}${skill.shortDescription.slice(1)}. Its detailed scope and safety behavior live in the canonical [skill instructions](../../${sourcePath}/SKILL.md).`,
    "",
    "## When to reach for it",
    "",
    `Use \`/${skill.name}\` when the requested primary outcome is: ${skill.prompt}. Choose another root command when that would be only an intermediate technique.`,
    "",
    ...(skill.documentationNotes?.length ? [
      "## Command behavior",
      "",
      ...skill.documentationNotes.map((note) => `- ${note}`),
      "",
    ] : []),
    "## Where it fits",
    "",
    `This is lifecycle position ${skill.lifecycle.position} in the ${skill.distribution ?? "optional PS"} projection and is installed through \`${packageName}\`. It owns one bounded root run and never starts another public skill automatically.`,
    "",
    "## Output and next steps",
    "",
    "",
  ].join("\n");
}

const packageLabels = Object.freeze([
  ["qs-skills", "Core, in lifecycle order"], ["qs-specialists", "Optional specialists"],
  ["qs-advanced", "Optional advanced workflows"], ["qs-frontend", "Optional frontend workflows"],
  ["qs-video", "Optional video workflow"], ["qs-execution", "Optional execution workflow"],
]);
const psSuccessors = Object.freeze([
  ["ps-help", "qs-help"], ["ps-how", "qs-how"], ["ps-why", "qs-why"],
  ["ps-blast-radius", "qs-blast-radius"], ["ps-runtime-forensics", "qs-runtime-forensics"],
  ["ps-trace-forensics", "qs-trace-forensics"], ["ps-create-verification-skill", "qs-create-verification-skill"],
  ["ps-maintain-verification-skill", "qs-maintain-verification-skill"], ["ps-skill-eval", "qs-skill-eval"],
  ["ps-hillclimb", "qs-hillclimb"], ["ps-visual-parity", "qs-visual-parity"],
  ["ps-pr-babysit", "qs-pr-babysit"], ["ps-worktree-cleanup", "qs-worktree-cleanup"],
]);

function validateIndexCommands(commands) {
  requireCondition(Array.isArray(commands) && commands.length > 0, "Target indexes require public commands.");
  const expected = new Map(TARGET_PUBLIC_COMMANDS.map(command => [command.name, command]));
  requireCondition(commands.length === expected.size, "Target indexes require the complete public command inventory.");
  const seen = new Set();
  for (const command of commands) {
    requireCondition(/^qs-[a-z0-9-]+$/.test(command.name) && !seen.has(command.name), "Target indexes require unique QS public identities."); seen.add(command.name);
    requireCondition(expected.get(command.name)?.bucket === command.bucket && expected.get(command.name)?.collectionId === command.collectionId, `Wrong registered public bucket or package: ${command.name}.`);
    requireCondition(["engineering", "productivity", "video"].includes(command.bucket), `Unknown public index bucket: ${command.bucket}.`);
    requireCondition(packageLabels.some(([id]) => id === command.collectionId), `Unknown public index package: ${command.collectionId}.`);
    requireCondition((command.sourcePath ?? `skills/${command.bucket}/${command.name}`) === `skills/${command.bucket}/${command.name}`, `Wrong canonical public path: ${command.name}.`);
    requireCondition((command.documentationPath ?? `docs/${command.bucket}/${command.name}.md`) === `docs/${command.bucket}/${command.name}.md`, `Wrong public documentation path: ${command.name}.`);
    requireCondition(Number.isFinite(command.lifecycle?.position), `Missing public lifecycle position: ${command.name}.`);
  }
}

export function renderTargetIndexDocuments({ commands = TARGET_PUBLIC_COMMANDS } = {}) {
  validateIndexCommands(commands);
  const byName = new Map(commands.map(command => [command.name, command]));
  const documents = new Map();
  for (const [bucket, title] of [["engineering", "Engineering"], ["productivity", "Productivity"], ["video", "Video"]]) {
    const lines = [`# ${title} commands`, "", "The default selection is the core package. Optional packages are explicit choices; their presence here does not establish installation or authorize adding them.", ""];
    for (const [packageName, heading] of packageLabels) {
      const entries = commands.filter(command => command.bucket === bucket && command.collectionId === packageName).sort((a, b) => a.lifecycle.position - b.lifecycle.position || a.name.localeCompare(b.name));
      if (!entries.length) continue;
      lines.push(`## ${heading} (\`${packageName}\`)`, "", ...entries.map(command => `- [${command.name}](./${command.name}/SKILL.md) — ${command.shortDescription}.`), "");
    }
    lines.push("Private capabilities and bundled modules support these roots. They are not commands or additional picker entries. Historical PS identities are documented only in the [migration guide](../../docs/pstack/index.md).", "", "See [skill provenance](../../docs/upstream/provenance.md) for original sources, reviewed and adopted revisions, and attribution.", "");
    documents.set(`skills/${bucket}/README.md`, lines.join("\n"));
  }
  const rows = psSuccessors.map(([original, name]) => {
    const current = byName.get(name); requireCondition(current, `Missing historical PS successor: ${name}.`);
    requireCondition(current.collectionId === (name === "qs-help" ? "qs-skills" : "qs-advanced"), `Wrong historical PS successor package: ${name}.`);
    return `| \`${original}\` | [\`${name}\`](../${current.bucket}/${name}.md) | \`${current.collectionId}\` | \`$${current.collectionId}:${name}\` |`;
  });
  documents.set("docs/pstack/index.md", [
    "# Historical PS compatibility and QS successors", "",
    "The current catalog uses QS names. The retained `ps-skills` 3.8.0 artifact exists only for verified existing consumers during migration; it is excluded from fresh/default selections and the target public catalog. Historical names below are provenance identities, not current aliases or new installation recommendations.", "",
    "Twelve distinct outcomes remain in optional `qs-advanced`; Help is owned by core `qs-help`. Optional `qs-specialists` preserves dedicated deployment-goal prompting in [qs-deploy-prompt](../engineering/qs-deploy-prompt.md) and reusable skill/prompt writing in [qs-skill-write](../productivity/qs-skill-write.md). Visual parity remains its own advanced root. Packages are independently selected; a partial selection must not silently add broader packages.", "",
    "## Original identities and current roots", "",
    "| Historical identity | Current root | Selected package | Codex literal after verified discovery |", "| --- | --- | --- | --- |", ...rows, "",
    "Claude uses `/<current-root>`; Pi uses `/skill:<current-root>`. Invoke a root only after its exact installed host literal is verified. Neither this table nor a retained marketplace entry proves current availability.", "",
    "See [using the QS successors](./using-ps-skills.md) for workflow distinctions and authority. The [package transition record](../upstream/package-transition.md) explains retained native registrations, immutable payloads, and controlled withdrawal before replacement exposure.", "",
    "## Provenance", "",
    "The historical adaptation includes Lauren Tan's Pstack material from [cursor/plugins](https://github.com/cursor/plugins/tree/63d938c2e4a165a0fec1bd0f61a8e325f0cb751e/pstack), version 0.14.1. The [provenance table](../upstream/provenance.md) and [machine-readable source records](../../config/skill-provenance.json) distinguish original identities, reviewed revisions, adopted revisions and local changes. Preserve the [MIT notices](../../THIRD_PARTY_NOTICES.md). Historical provenance is not a claim that every reviewed update was adopted.", "",
  ].join("\n"));
  documents.set("docs/pstack/using-ps-skills.md", [
    "# Using the QS successors to historical PS workflows", "",
    "This guide describes current QS roots. `ps-skills` is retained only as an immutable migration compatibility artifact for existing native consumers. Use the [successor table](./index.md) to interpret an old PS name; it does not create an alias or authorize installing the historical package.", "",
    "## Select one bounded outcome", "",
    "- `qs-how` explains observed mechanics; `qs-why` investigates attributable rationale and may report that intent is unknown. `qs-blast-radius` maps the impact of one proposed change. These are read-only results.",
    "- `qs-runtime-forensics` measures one live symptom; `qs-trace-forensics` inspects an existing artifact. Both stop at diagnosis. A product repair is a separate, explicitly selected `qs-code-debug` task.",
    "- `qs-create-verification-skill` creates a missing project-local verification driver and feature map. `qs-maintain-verification-skill` reconciles an existing driver and map. Both require a real harness and remain limited to verification assets, without changing product behavior.",
    "- `qs-skill-eval` compares a control and variant through blinded recorded trials. `qs-hillclimb` improves a declared metric through bounded measured experiments. `qs-visual-parity` is a dedicated root with an immutable visual baseline, stable capture environment, declared metric and approved tolerance. Keep failed trials and measured residuals; claims or source-text counts do not establish quality.",
    "- `qs-pr-babysit` observes one selected PR and repairs only when authorized; it never merges or enables auto-merge. `qs-worktree-cleanup` audits first and removes only exact confirmed worktrees. Neither discovery nor an earlier approval for another target authorizes destructive changes.", "",
    "The twelve PS-derived investigation, verification, evaluation and operations roots belong to optional `qs-advanced`. Core `qs-help` routes a selected outcome without executing it. `qs-deploy-prompt` generates an execution-ready deployment goal prompt without executing it; `qs-skill-write` owns reusable skill/prompt writing. Both remain dedicated roots in optional `qs-specialists`. Choosing an investigation workflow does not discard either prompt-building outcome or visual parity.", "",
    "## Inputs and authority", "",
    "Name the bounded target and required evidence. Live diagnosis needs an environment and time window; artifact analysis needs the supplied trace and capture context. Verification needs the actual harness and permitted asset scope. Experiments need a control, rubric or metric, budget, stopping rule, and retained failures. Visual parity additionally needs baseline identity, state/viewport coverage and approved tolerance. PR and worktree operations need exact identities and explicit mutation authority.", "",
    "Use only a selected package whose exact public literal is observed in the current host. Codex uses `$qs-advanced:<root>` for advanced commands; Claude uses `/<root>` and Pi `/skill:<root>`. All advanced roots are explicit-only. `effort=quick|standard|deep` controls evidence depth; `report=brief|full` controls presentation, defaulting to `standard` and `brief`. Neither expands mutation scope or publication authority.", "",
    "Every invocation has one public root and one bounded result directly in chat. Public roots do not automatically execute each other. The sixteen advanced private capabilities remain internal references, not extra commands. Consult the [shared run contract](../skill-run-contract.md) for completion and continuation rules.", "",
    "## Existing installations and provenance", "",
    "Existing PS installations require the verified [package transition](../upstream/package-transition.md), including ownership checks and withdrawal before QS replacement exposure. A retained marketplace registration is migration continuity, not a fresh-install recommendation. Keep partial selections and unrelated packages unchanged unless the user explicitly selects additions; missing ownership or acceptance evidence remains a reported conflict.", "",
    "The [successor table](./index.md), [provenance records](../upstream/provenance.md) and [third-party notices](../../THIRD_PARTY_NOTICES.md) retain original names and authorship. This historical guide does not assert adoption of unverified upstream changes.", "",
  ].join("\n"));
  return documents;
}

async function validateCanonicalSources(root, commands) {
  validateIndexCommands(commands);
  const canonicalRoot = await realpath(root);
  for (const command of commands) {
    const file = join(root, command.sourcePath ?? `skills/${command.bucket}/${command.name}`, "SKILL.md");
    const stat = await lstat(file).catch(error => { if (error.code === "ENOENT") throw new Error(`Missing canonical public source: ${command.name}.`); throw error; });
    requireCondition(stat.isFile() && !stat.isSymbolicLink() && (await realpath(file)) === file && relative(canonicalRoot, file).split(sep)[0] !== "..", `Canonical public source must be a regular local file: ${command.name}.`);
    const content = await readFile(file, "utf8");
    requireCondition(content.startsWith("---\n") && content.slice(4, content.indexOf("\n---", 4)).split("\n").includes(`name: ${command.name}`), `Wrong canonical public identity: ${command.name}.`);
  }
}

async function validateOutputPath(root, path) {
  const parts = path.split("/"); let current = root;
  for (const [index, part] of parts.entries()) {
    requireCondition(part && part !== "." && part !== "..", `Unsafe documentation path: ${path}.`); current = join(current, part);
    let stat; try { stat = await lstat(current); } catch (error) { if (error.code === "ENOENT") return; throw error; }
    requireCondition(!stat.isSymbolicLink() && (index === parts.length - 1 ? stat.isFile() : stat.isDirectory()), `Documentation path must stay in regular local entries: ${path}.`);
  }
}

export async function syncV3Documentation({ root = repositoryRoot, check = false, registryState = REGISTRY_STATE } = {}) {
  requireCondition(["legacy", "target"].includes(registryState), "Unknown documentation registry state.");
  root = resolve(root);
  const commands = registryState === "target" ? TARGET_PUBLIC_COMMANDS : LEGACY_PUBLIC_COMMANDS;
  if (registryState === "target") await validateCanonicalSources(root, commands);
  const documents = new Map(commands.map(skill => [skill.documentationPath ?? `docs/${skill.bucket}/${skill.name}.md`, { text: renderCommandDocumentation(skill), command: skill.name }]));
  if (registryState === "target") for (const [path, text] of renderTargetIndexDocuments({ commands })) documents.set(path, { text });
  // Preflight every target before writing: check mode and invalid sources are read-only.
  const changes = [];
  for (const [path, expected] of documents) {
    await validateOutputPath(root, path);
    let actual = "";
    try { actual = await readFile(join(root, path), "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const marker = actual.indexOf("## Output and next steps");
    const current = expected.command ? marker < 0 ? null : actual.slice(0, marker) + "## Output and next steps\n\n" : actual;
    if (current !== expected.text) changes.push({ path, ...expected });
  }
  if (check && changes.length) throw new Error(`v3 documentation is stale: ${changes.map(change => change.path).join(", ")}.`);
  for (const change of changes) { await mkdir(dirname(join(root, change.path)), { recursive: true }); await writeFile(join(root, change.path), change.text); }
  return { updated: changes.length, commands: commands.length, indexes: registryState === "target" ? 5 : 0, registryState };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); let root = repositoryRoot, check = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--check") check = true;
    else if (args[index] === "--root" && args[index + 1]) root = resolve(args[++index]);
    else throw new Error(`Unknown documentation argument: ${args[index]}.`);
  }
  const result = await syncV3Documentation({ root, check });
  console.log(check ? `Verified concise v3 documentation for ${result.commands} commands${result.indexes ? " and 5 target indexes" : ""}.` : result.indexes ? `Synchronized ${result.updated} concise v3 documentation pages and indexes.` : `Synchronized ${result.updated} concise v3 command documentation pages.`);
}
