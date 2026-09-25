import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PUBLIC_COMMANDS,
  PUBLIC_COMMANDS_BY_NAME,
  codexPublicSkillLiteral,
  piPublicSkillLiteral,
} from "./skill-collection-registry.mjs";

import { PUBLIC_PROGRESS_CONTRACT, syncProgressContracts } from "./progress-reporting-contract.mjs";

export const SKILL_OUTPUT_HEADING = "## Completion report and next steps";
export const DOCUMENTATION_OUTPUT_HEADING = "## Output and next steps";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function renderSkillOutputContract(skill, { commandsByName = PUBLIC_COMMANDS_BY_NAME } = {}) {
  const registered = commandsByName.get(skill.name) ?? skill;
  const routes = registered.continuation.normal;
  const failureRoutes = registered.continuation.failure;
  const continuations = routes.map((item) => item.name);
  const failureContinuations = failureRoutes.map((item) => item.name);
  const terminal = routes.length === 0 && failureRoutes.length === 0;
  const allRoutes = [...new Map([...routes, ...failureRoutes].map((item) => [item.name, item])).values()];
  const codexLiterals = allRoutes.map((item) => {
    const command = commandsByName.get(item.name);
    if (!command) throw new Error(`Unknown continuation: ${item.name}.`);
    return command.codexLiteral;
  });
  const piLiterals = allRoutes.map((item) => `/skill:${item.name}`);
  const reportsSpecProgress = registered.resultContext?.specProgress === true;
  const goalPrompt = registered.outputKind === "goal-workflow-prompt";
  const primaryHelp = registered.primaryRouting?.kind === "available-public-command";
  return [
    SKILL_OUTPUT_HEADING,
    "",
    PUBLIC_PROGRESS_CONTRACT,
    "A user-submitted explicit goal workflow may coordinate successive authorized roots after verified completion. Each root retains its report and authority. Suppress redundant continuation prompts only for work already scheduled by that coordinator; ordinary invocations never start another public skill automatically.",
    "",
    `This invocation has one root skill: \`/${skill.name}\`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.`,
    "",
    "Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.",
    "",
    ...(reportsSpecProgress ? [
      "Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.",
      "Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`",
      "",
    ] : []),
    terminal
      ? "Use `complete`, `continuation-required`, `input-required`, or `failed`. This release command is terminal and emits no next prompts. Failed required checks or actionable P0/P1 findings prohibit `complete`."
      : "Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.",
    "",
    terminal
      ? "Do not invent a follow-on workflow after release. State any release failure in this result."
      : primaryHelp
        ? `Primary Help routing may select any actually available registered public root. Read [${registered.primaryRouting.referenceFile}](${registered.primaryRouting.referenceFile}) for registry-generated descriptions and exact Codex/Claude/Pi literals; verify the selected literal in the active host before emitting it. This primary recommendation is separate from ordinary continuation eligibility. Ordinary continuation routes: ${continuations.map((name) => `\`/${name}\``).join(", ")}. Failure routes: ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}. Emit at most one prompt overall and never execute the selected root or install a missing package. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.`
      : `Eligible next routes: ${continuations.map((name) => `\`/${name}\``).join(", ") || "None — primary deliverable is the goal prompt"}. Failure routes: ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.`,
    "",
    "Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.",
    "",
    terminal
      ? "Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, and material outputs. Full adds the evidence trail. Omit empty sections and routine success detail."
      : reportsSpecProgress
        ? "Brief output always contains status, outcome, specs, the compact work summary with Finished and Next entries, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required readout fields."
        : "Brief output always contains status, outcome, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required result fields.",
    "",
    "Status: Complete | Continuation required | Input required | Failed",
    `Skills used: /${skill.name}`,
    "Outcome: Concise verified result.",
    ...(reportsSpecProgress ? [
      "Specs: verified specification link(s) | Not located",
      "Work summary:",
      "- Finished — exact bounded outcome, meaningful validation, and material outputs",
      "- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources",
    ] : []),
    terminal
      ? "Next prompts: None — release is terminal."
      : "Next work prompt: None | one copy-ready prompt in a fenced `text` block",
    "",
    goalPrompt
      ? `Always write \`Next work prompt:\`. On success, write exactly one fenced \`text\` block containing the execution prompt under Next work prompt: beginning with the instruction to establish or resume the scoped goal before mutations. Include exact selected skill literals, scope, evidence, authorization, stage checks and deployment evidence. This is the primary deliverable, not an ordinary continuation; emit no second prompt. State: Prompt generated; execution has not started. On missing material inputs, use Input required and do not emit an executable deployment prompt; at most one eligible recovery prompt is allowed (${codexLiterals.join(", ")}); Claude uses ${allRoutes.map((item) => `\`/${item.name}\``).join(", ")}; Pi uses ${piLiterals.map((item) => `\`${item}\``).join(", ")}. The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Do not replace the fenced block with inline prose. Name the exact verified ticket, specification, issue, or grouped work item.`
      : terminal
      ? "Never add a speculative prompt merely to keep the workflow moving."
      : primaryHelp
        ? `Always write \`Next work prompt:\`. For one verified actionable request and an available primary destination, put exactly one fenced \`text\` block beneath it beginning with the destination's exact installed literal from [${registered.primaryRouting.referenceFile}](${registered.primaryRouting.referenceFile}). Name the requested work and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. A missing or unverified destination produces Input required with its precise package/discovery prerequisite and no executable prompt for that destination; do not claim no follow-on is needed. When there is no verified remaining actionable work, write \`Next work prompt: None — no follow-on needed.\` Ordinary continuation literals also require verified availability: Codex ${codexLiterals.join(", ")}; Claude uses ${allRoutes.map((item) => `\`/${item.name}\``).join(", ")}; Pi uses ${piLiterals.map((item) => `\`${item}\``).join(", ")}. The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.`
      : `Always write \`Next work prompt:\`. When a distinct verified actionable item exists, put one fenced \`text\` block beneath it beginning with its exact Codex literal (${codexLiterals.join(", ")}); Claude uses ${allRoutes.map((item) => `\`/${item.name}\``).join(", ")}; Pi uses ${piLiterals.map((item) => `\`${item}\``).join(", ")}. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. ${reportsSpecProgress ? "When `Next` lists a pending or blocked actionable item and an eligible route owns it, the fenced `text` prompt is required even when the current root is complete. " : ""}Only when no eligible actionable item remains, write \`Next work prompt: None — no follow-on needed.\` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.`,
  ].join("\n");
}

export function renderDocumentationOutputContract(skill) {
  const registered = PUBLIC_COMMANDS_BY_NAME.get(skill.name) ?? skill;
  const routes = registered.continuation.normal;
  const failureRoutes = registered.continuation.failure;
  const continuations = routes.map((item) => item.name);
  const failureContinuations = failureRoutes.map((item) => item.name);
  const terminal = routes.length === 0 && failureRoutes.length === 0;
  const reportsSpecProgress = registered.resultContext?.specProgress === true;
  const goalPrompt = registered.outputKind === "goal-workflow-prompt";
  const primaryHelp = registered.primaryRouting?.kind === "available-public-command";
  return [
    DOCUMENTATION_OUTPUT_HEADING,
    "",
    `\`/${skill.name}\` produces one normalized root result directly in chat. It accepts independent \`effort=quick|standard|deep\` and \`report=brief|full\` modes, defaulting to \`standard\` and \`brief\`.`,
    "",
    terminal
      ? "A completed release is terminal and emits no next prompts. Public skills are never executed automatically. Brief output shows only the decision-grade result; full output adds supporting evidence."
      : "A result emits at most one copy-ready next-work prompt when a distinct actionable item remains. A complete result with no verified remaining work emits none. Public skills are never executed automatically. Brief output shows the decision-grade result and optional prompt; full output adds supporting evidence without adding prompts.",
    "",
    terminal
      ? "The release command has no catalog-approved continuation."
      : goalPrompt
        ? `The primary output is one goal execution prompt. Failure routes are ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}; missing prerequisites prevent execution-ready output.`
      : primaryHelp
        ? `Primary Help routing may select any registered public root whose exact literal is verified in the active host. Generated private routing metadata supplies descriptions and Codex/Claude/Pi literals without importing public skill bodies. Missing availability produces a package/discovery prerequisite, not an executable prompt or automatic installation. Ordinary continuations remain ${continuations.map((name) => `\`/${name}\``).join(", ")}; failure routes remain ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}. Choose at most one prompt overall and never execute the selected root.`
      : `Eligible normal routes are ${continuations.map((name) => `\`/${name}\``).join(", ")}. Failure routes are ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}. Select at most one route that owns verified unfinished work.`,
    "",
    ...(reportsSpecProgress ? [
      "The result always links every verified governing specification and presents a compact work readout with what finished and what is next. It summarizes verified done, pending, and blocked work from explicit input, available task history, repository specifications or ticket plans, and a configured tracker. It outlines up to three exact linked work items with state and next action. If no governing specification or remaining work can be located, it says so instead of inventing a link or backlog.",
      "",
    ] : []),
    "Every run keeps a conversation checklist and reports its current stage, estimated stage and overall completion, observed progress or waiting, and needed input at the start, transitions, blockers, resumption, completion, and roughly every sixty seconds when control returns. Overall covers the root task or, in a submitted goal workflow, the entire authorized goal. Weight estimates by remaining effort and verified milestones, explain recalibration, retain defensible estimates while waiting, and reserve 100% for verified completion. Helpers contribute evidence only to their parent without double-counting. Finish with changes, checks, and remaining work.",
    "",
    ...(goalPrompt ? ["Successful generation produces exactly one self-contained goal execution prompt, beginning with goal establishment before mutations. It does not start a goal or deploy. Missing material inputs prevent execution-ready output; submission authorizes only the named sequence and operations within host controls.", ""] : []),
    "Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).",
  ].join("\n");
}

export function renderHelpRoutingReference(commands = PUBLIC_COMMANDS) {
  const cell = (value) => String(value).replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  return [
    "# QuickStark primary routing metadata",
    "",
    "Generated from the collection registry. This is a private reference, not a command or proof of installation.",
    "",
    "Use inside qs-help only when choosing its primary recommendation. Match the requested outcome, then verify the exact destination literal in the active host's available-command catalog. Package configuration alone is insufficient: disabled, stale or undiscoverable commands are unavailable. For an unavailable destination, report its owning package and the missing discovery/installation prerequisite without emitting its executable prompt. Do not install, enable or execute it automatically. Never import another public skill body to route.",
    "",
    "Select one route and one copy-ready prompt at most. A primary Help recommendation may use any verified available row below; ordinary continuation restrictions for other roots remain unchanged. Codex uses the Codex column, Claude the Claude column, and Pi the Pi column. Unrelated vendor commands and unknown names are outside this registry.",
    "",
    "| Command | Package | Outcome | Codex | Claude | Pi |",
    "| --- | --- | --- | --- | --- | --- |",
    ...commands.map((command) => `| ${cell(command.name)} | ${cell(command.collectionId)} | ${cell(command.shortDescription)} | \`${command.codexLiteral}\` | \`${command.claudeLiteral}\` | \`/skill:${command.name}\` |`),
    "",
  ].join("\n");
}

function replaceSection(content, heading, replacement) {
  const start = content.indexOf(heading);
  if (start < 0) return `${content.trimEnd()}\n\n${replacement}\n`;
  return `${content.slice(0, start).trimEnd()}\n\n${replacement}\n`;
}

export function withSkillOutputContract(content, skill) {
  return replaceSection(content, SKILL_OUTPUT_HEADING, renderSkillOutputContract(skill));
}

export function withDocumentationOutputContract(content, skill) {
  return replaceSection(content, DOCUMENTATION_OUTPUT_HEADING, renderDocumentationOutputContract(skill));
}

export async function syncSkillOutputContracts({ check = false } = {}) {
  await syncProgressContracts({ check });
  let updated = 0;
  for (const skill of PUBLIC_COMMANDS) {
    const skillPath = join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`, "SKILL.md");
    const documentationPath = join(repositoryRoot, skill.documentationPath ?? `docs/${skill.bucket}/${skill.name}.md`);
    const [skillContent, documentation] = await Promise.all([
      readFile(skillPath, "utf8"),
      readFile(documentationPath, "utf8"),
    ]);
    const expectedSkill = withSkillOutputContract(skillContent, skill);
    const expectedDocumentation = withDocumentationOutputContract(documentation, skill);
    if (skillContent !== expectedSkill) {
      if (check) throw new Error(`Output contract is out of date: ${skill.name}/SKILL.md.`);
      await writeFile(skillPath, expectedSkill);
      updated += 1;
    }
    if (documentation !== expectedDocumentation) {
      if (check) throw new Error(`Output documentation is out of date: ${skill.name}.md.`);
      await writeFile(documentationPath, expectedDocumentation);
      updated += 1;
    }
  }
  const help = PUBLIC_COMMANDS_BY_NAME.get("qs-help");
  if (help?.primaryRouting) {
    const referencePath = join(repositoryRoot, help.sourcePath ?? `skills/${help.bucket}/${help.name}`, help.primaryRouting.referenceFile);
    const expectedReference = renderHelpRoutingReference();
    const currentReference = await readFile(referencePath, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (currentReference !== expectedReference) {
      if (check) throw new Error("Primary Help routing metadata is out of date: qs-help/ROUTING.md.");
      await writeFile(referencePath, expectedReference);
      updated += 1;
    }
  }
  console.log(check
    ? `Verified bounded v3 output contracts for all ${PUBLIC_COMMANDS.length} public commands.`
    : `Synchronized ${updated} bounded v3 skill and documentation output contracts.`);
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) await syncSkillOutputContracts({ check: process.argv.includes("--check") });
