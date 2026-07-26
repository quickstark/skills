import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  NEXT_SKILLS_BY_NAME,
  PERSONAL_REPOSITORY,
  SKILLS,
  SKILLS_BY_NAME,
} from "./qs-skill-catalog.mjs";

export const SKILL_OUTPUT_HEADING = "## Completion report and next steps";
export const DOCUMENTATION_OUTPUT_HEADING = "## Output and next steps";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function renderSkillOutputContract(skill) {
  const recommendations = NEXT_SKILLS_BY_NAME[skill.name];

  if (!recommendations || recommendations.length === 0) {
    throw new Error(`No next-skill guidance exists for ${skill.name}.`);
  }

  const nextSkills = recommendations
    .map((next) => `- \`/${next.name}\` — ${next.reason}`)
    .join("\n");

  return [
    SKILL_OUTPUT_HEADING,
    "",
    "Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.",
    "",
    "Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, relevant next skills, and only directly verified execution context, delivery provenance, or relationships. Generate the readout with:",
    "",
    "```bash",
    'node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"',
    "```",
    "",
    "The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its gallery provides a project library, searchable project explorer, and actual recent-activity timeline. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.",
    "",
    "The renderer automatically captures the actual execution machine and platform for every real skill run. Add `execution.deployments` only for directly observed environments, deployment states, and safe verified HTTP(S) URLs. Add `execution.files` only for repository-relative files this skill actually added, modified, deleted, or renamed, with a concise accurate change summary. Preserve unrelated existing work; never infer run-owned files from an already dirty worktree or expose secrets, `.env` files, credentials, absolute machine paths, or unverified deployment targets. Previews never claim an execution machine, deployment, or changed file.",
    "",
    "When this run actually touches GitHub, a merge, or a release, add an optional `provenance` object containing only observed `pullRequests`, `closedIssues`, `release`, and `commit`. Verify GitHub numbers, record state, HTTPS links, repository ownership, release version, and complete Git hash. Set `commit.published` only after confirming remote publication; set `closedByRelease` only after independently confirming that exact release closed the issue. Omit missing evidence entirely. Record `relationships` only between observed findings, decisions, outputs, or checks; review findings may carry their actual `standards` or `specification` axis and `P0`–`P3` priority. Previews never contain delivery provenance or observed relationships.",
    "",
    "Report the verified HTTP(S) readout URL and preserve the real HTML path. Preserve and link the skill's primary artifact when it produces one. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout exists.",
    "",
    "```text",
    "Status: Completed | Awaiting input | Blocked",
    `Skills used: /${skill.name}; /another-skill only if actually used`,
    "Outcome: What was completed, discovered, decided, or is blocking progress.",
    "Execution: Actual machine, with verified deployment and changed files when applicable.",
    "Readout: Real absolute HTML path or verified private viewer URL.",
    "Outputs: Real files, reports, decisions, or changes, when applicable.",
    "Checks: Only the tests, validations, or observations actually performed.",
    "Delivery: Verified PRs, closed issues, release, or commit, only when applicable.",
    "Next best: /qs-skill-name — why it is the best next step.",
    "```",
    "",
    "Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Next best**. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.",
    "",
    "Select at most three genuinely relevant follow-ons from:",
    "",
    nextSkills,
    "",
    "Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.",
    "",
  ].join("\n");
}

export function renderDocumentationOutputContract(skill) {
  const recommendations = NEXT_SKILLS_BY_NAME[skill.name];

  if (!recommendations || recommendations.length === 0) {
    throw new Error(`No next-skill documentation exists for ${skill.name}.`);
  }

  const nextSkills = recommendations.map((next) => {
    const target = SKILLS_BY_NAME.get(next.name);

    if (!target) {
      throw new Error(`${skill.name} recommends an unknown skill: ${next.name}.`);
    }

    const source = `${PERSONAL_REPOSITORY}/blob/main/skills/${target.bucket}/${target.name}/SKILL.md`;
    return `- [\`/${target.name}\`](${source}) — ${next.reason}`;
  });

  return [
    DOCUMENTATION_OUTPUT_HEADING,
    "",
    `\`/${skill.name}\` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared \`scripts/qs-skill-readout.mjs\` generator and defaults to the OS temporary \`quickstark-readouts\` directory. Set \`QS_READOUT_DIR=/docker/appdata/quickstark-readouts\` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.`,
    "",
    "Depending on what actually happened, the next step may be:",
    "",
    ...nextSkills,
    "",
  ].join("\n");
}

export function withSkillOutputContract(content, skill) {
  const marker = `\n${SKILL_OUTPUT_HEADING}\n`;
  const existing = content.indexOf(marker);
  const body = existing === -1 ? content : content.slice(0, existing);

  return `${body.trimEnd()}\n\n${renderSkillOutputContract(skill)}`;
}

export function withDocumentationOutputContract(content, skill) {
  const placement = "\n## Where it fits";
  const next = content.indexOf(placement);

  if (next === -1) {
    throw new Error(`Cannot find the documentation placement for ${skill.name}.`);
  }

  const prefix = content.slice(0, next);
  const marker = `\n${DOCUMENTATION_OUTPUT_HEADING}\n`;
  const existing = prefix.indexOf(marker);
  const before = existing === -1 ? prefix : prefix.slice(0, existing);

  return `${before.trimEnd()}\n\n${renderDocumentationOutputContract(skill)}${content.slice(next)}`;
}

export async function syncSkillOutputContracts({ check = false } = {}) {
  let updated = 0;

  for (const skill of SKILLS) {
    const skillPath = join(
      repositoryRoot,
      "skills",
      skill.bucket,
      skill.name,
      "SKILL.md",
    );
    const documentationPath = join(
      repositoryRoot,
      "docs",
      skill.bucket,
      `${skill.name}.md`,
    );
    const [skillContent, documentation] = await Promise.all([
      readFile(skillPath, "utf8"),
      readFile(documentationPath, "utf8"),
    ]);
    const expectedSkill = withSkillOutputContract(skillContent, skill);
    const expectedDocumentation = withDocumentationOutputContract(
      documentation,
      skill,
    );

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

  if (check) {
    console.log(`Verified output contracts and next steps for all ${SKILLS.length} skills.`);
  } else {
    console.log(`Synchronized ${updated} skill and documentation output contracts.`);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  await syncSkillOutputContracts({ check: process.argv.includes("--check") });
}
