import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PUBLIC_COMMANDS,
  PUBLIC_COMMANDS_BY_NAME,
  codexPublicSkillLiteral,
  piPublicSkillLiteral,
  renderCompositeWorkflowPrompt,
} from "./skill-collection-registry.mjs";

export const SKILL_OUTPUT_HEADING = "## Completion report and next steps";
export const DOCUMENTATION_OUTPUT_HEADING = "## Output and next steps";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function renderSkillOutputContract(skill) {
  const registered = PUBLIC_COMMANDS_BY_NAME.get(skill.name) ?? skill;
  const routes = registered.continuation.normal;
  const failureRoutes = registered.continuation.failure;
  const continuations = routes.map((item) => item.name);
  const failureContinuations = failureRoutes.map((item) => item.name);
  const terminal = routes.length === 0 && failureRoutes.length === 0;
  const allRoutes = [...new Map([...routes, ...failureRoutes].map((item) => [item.name, item])).values()];
  const codexLiterals = allRoutes.map((item) => codexPublicSkillLiteral(item.name));
  const piLiterals = allRoutes.map((item) => piPublicSkillLiteral(item.name));
  const preferredCompositeWorkflow = registered.continuation.preferredCompositeWorkflow;
  return [
    SKILL_OUTPUT_HEADING,
    "",
    `This invocation has one root skill: \`/${skill.name}\`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.`,
    "",
    "Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.",
    "",
    terminal
      ? "Use `complete`, `continuation-required`, `input-required`, or `failed`. This release command is terminal and emits no next prompts. Failed required checks or actionable P0/P1 findings prohibit `complete`."
      : "Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.",
    "",
    terminal
      ? "Do not invent a follow-on workflow after release. State any release failure in this result."
      : `Default routes: ${continuations.map((name) => `\`/${name}\``).join(", ")}. Failure routes: ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}. Tailor every prompt to the completed work.${preferredCompositeWorkflow ? ` When the remaining objective fits, the preferred prompt may use this catalog-approved composite workflow: ${renderCompositeWorkflowPrompt(preferredCompositeWorkflow, { harness: "codex" })} This preserves each separate public root, must stop on a non-complete result, and does not add mutation authority.` : ""}`,
    "",
    "Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.",
    "",
    terminal
      ? "Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, and material outputs. Full adds the evidence trail. Omit empty sections and routine success detail."
      : "Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.",
    "",
    "Status: Complete | Continuation required | Input required | Failed",
    `Skills used: /${skill.name}`,
    "Outcome: Concise verified result.",
    terminal
      ? "Next prompts: None — release is terminal."
      : "Preferred next prompt: one copy-ready prompt in a fenced `text` block",
    ...(terminal ? [] : ["Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block"]),
    "",
    terminal
      ? "Never add a speculative prompt merely to keep the workflow moving."
      : `Label prompts \`Preferred next prompt:\` and \`Alternative next prompt:\`. Put each in its own fenced \`text\` block, beginning with its exact Codex literal (${codexLiterals.join(", ")}); Claude uses ${allRoutes.map((item) => `\`/${item.name}\``).join(", ")}; Pi uses ${piLiterals.map((item) => `\`${item}\``).join(", ")}. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.`,
  ].join("\n");
}

export function renderDocumentationOutputContract(skill) {
  const registered = PUBLIC_COMMANDS_BY_NAME.get(skill.name) ?? skill;
  const routes = registered.continuation.normal;
  const failureRoutes = registered.continuation.failure;
  const continuations = routes.map((item) => item.name);
  const failureContinuations = failureRoutes.map((item) => item.name);
  const terminal = routes.length === 0 && failureRoutes.length === 0;
  return [
    DOCUMENTATION_OUTPUT_HEADING,
    "",
    `\`/${skill.name}\` produces one normalized root result directly in chat. It accepts independent \`effort=quick|standard|deep\` and \`report=brief|full\` modes, defaulting to \`standard\` and \`brief\`.`,
    "",
    terminal
      ? "A completed release is terminal and emits no next prompts. Public skills are never executed automatically. Brief output shows only the decision-grade result; full output adds supporting evidence."
      : "Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief output shows the decision-grade result and all three prompts; full output adds supporting evidence without adding prompts.",
    "",
    terminal
      ? "The release command has no catalog-approved continuation."
      : `The default ranked continuations are ${continuations.map((name) => `\`/${name}\``).join(", ")}. Failed results instead rank ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}.`,
    "",
    "Every result receives the same internal clear-writing pass before presentation and stays in the current conversation. See [the shared skill-run contract](../skill-run-contract.md).",
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
  console.log(check
    ? `Verified bounded v3 output contracts for all ${PUBLIC_COMMANDS.length} public commands.`
    : `Synchronized ${updated} bounded v3 skill and documentation output contracts.`);
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) await syncSkillOutputContracts({ check: process.argv.includes("--check") });
