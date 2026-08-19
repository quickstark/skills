import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PUBLIC_COMMANDS,
  PUBLIC_COMMANDS_BY_NAME,
  codexPublicSkillLiteral,
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
  return [
    SKILL_OUTPUT_HEADING,
    "",
    `This invocation has one root skill: \`/${skill.name}\`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.`,
    "",
    "Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.",
    "",
    terminal
      ? "Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. This release command is terminal and emits no next prompts. Failed required checks or actionable P0/P1 findings prohibit `complete`."
      : "Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.",
    "",
    terminal
      ? "Do not invent a follow-on workflow after release. Report any release failure directly in this result."
      : `The default ranked continuations are ${continuations.map((name) => `\`/${name}\``).join(", ")}. A failed result instead ranks ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}. Tailor each prompt to the actual result instead of starting it.`,
    "",
    "Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.",
    "",
    "Render the one authenticated report:",
    "",
    "```bash",
    'node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"',
    "```",
    "",
    "Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.",
    "",
    terminal
      ? "Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and Readout. Full adds the evidence trail. Omit empty sections and routine successful detail."
      : "Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.",
    "",
    "Status: Complete | Continuation required | Input required | Failed",
    `Skills used: /${skill.name}`,
    "Outcome: Concise verified result.",
    "Readout: Verified https://reports.quickstark.com/ report URL only.",
    terminal
      ? "Next prompts: None — release is terminal."
      : "Preferred next prompt: one copy-ready prompt in a fenced `text` block",
    ...(terminal ? [] : ["Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block"]),
    "",
    terminal
      ? "Never add a speculative prompt merely to keep the workflow moving."
      : `Present prompts in normalized rank order. Label the first \`Preferred next prompt:\` and the remaining two \`Alternative next prompt:\`. Put each complete prompt in its own fenced \`text\` block beginning with its exact Codex skill literal (${codexLiterals.join(", ")}); Claude uses ${allRoutes.map((item) => `\`/${item.name}\``).join(", ")}. The fence info string must be exactly \`text\` so the chat renders it as Plain text; never use \`markdown\`, \`bash\`, \`json\`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.`,
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
    `\`/${skill.name}\` produces one normalized root result and one authenticated hosted readout. It accepts independent \`effort=quick|standard|deep\` and \`report=brief|full\` modes, defaulting to \`standard\` and \`brief\`.`,
    "",
    terminal
      ? "A completed release is terminal and emits no next prompts. Public skills are never executed automatically. Brief reports show only the decision-grade result; full reports add supporting evidence."
      : "Every result emits three ranked copy-ready continuations: one preferred prompt and two alternatives. Public skills are never executed automatically. Brief reports show the decision-grade result and all three prompts; full reports add supporting evidence without adding prompts.",
    "",
    terminal
      ? "The release command has no catalog-approved continuation."
      : `The default ranked continuations are ${continuations.map((name) => `\`/${name}\``).join(", ")}. Failed results instead rank ${failureContinuations.map((name) => `\`/${name}\``).join(", ")}.`,
    "",
    "The hosted and in-chat views consume the same normalized result. Ordinary runs return only an authenticated `https://reports.quickstark.com/` URL; local viewers remain explicit diagnostic tools. See [the shared skill-run contract](../skill-run-contract.md).",
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
