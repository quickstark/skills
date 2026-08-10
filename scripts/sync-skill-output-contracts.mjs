import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { codexSkillLiteral, SKILLS } from "./qs-skill-catalog.mjs";

export const SKILL_OUTPUT_HEADING = "## Completion report and next steps";
export const DOCUMENTATION_OUTPUT_HEADING = "## Output and next steps";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function renderSkillOutputContract(skill) {
  const continuation = skill.continuation.approvedSkills[0];
  const codexLiteral = codexSkillLiteral(continuation);
  return [
    SKILL_OUTPUT_HEADING,
    "",
    `This invocation has one root skill: \`/${skill.name}\`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.`,
    "",
    "Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.",
    "",
    "Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.",
    "",
    `When a distinct workflow is genuinely required, the catalog-approved continuation is \`/${continuation}\`; tailor one prompt to the actual result instead of starting it.`,
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
    "Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.",
    "",
    "Status: Complete | Continuation required | Input required | Failed",
    `Skills used: /${skill.name}`,
    "Outcome: Concise verified result.",
    "Readout: Verified https://reports.quickstark.com/ report URL only.",
    "Top next prompt: None — the requested work is complete. | one copy-ready prompt in a fenced `text` block",
    "",
    `When continuation is required, write \`Top next prompt:\` and place the single complete prompt beneath it in its own fenced \`text\` block beginning with the exact Codex skill literal ${codexLiteral}. Claude uses \`/${continuation}\`. The fence info string must be exactly \`text\` so the chat renders it as Plain text; never use \`markdown\`, \`bash\`, \`json\`, or another language. Put heuristic model/thinking guidance outside the fence in a muted blockquote beneath it. Never change the active model or reasoning setting.`,
  ].join("\n");
}

export function renderDocumentationOutputContract(skill) {
  const continuation = skill.continuation.approvedSkills[0];
  return [
    DOCUMENTATION_OUTPUT_HEADING,
    "",
    `\`/${skill.name}\` produces one normalized root result and one authenticated hosted readout. It accepts independent \`effort=quick|standard|deep\` and \`report=brief|full\` modes, defaulting to \`standard\` and \`brief\`.`,
    "",
    "Complete work emits no next prompt. A distinct required workflow or material user decision emits exactly one copy-ready continuation. Public skills are never executed automatically. Brief reports show only the decision-grade result; full reports add supporting evidence without adding continuations.",
    "",
    `The catalog-approved continuation, only when the result requires it, is \`/${continuation}\`.`,
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
  for (const skill of SKILLS) {
    const skillPath = join(repositoryRoot, "skills", skill.bucket, skill.name, "SKILL.md");
    const documentationPath = join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`);
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
    ? `Verified bounded v3 output contracts for all ${SKILLS.length} public commands.`
    : `Synchronized ${updated} bounded v3 skill and documentation output contracts.`);
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) await syncSkillOutputContracts({ check: process.argv.includes("--check") });
