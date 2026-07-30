import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  MODEL_GUIDANCE_BY_NAME,
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

  const firstRecommendation = recommendations[0];
  const firstTarget = SKILLS_BY_NAME.get(firstRecommendation.name);
  const firstGuidance = MODEL_GUIDANCE_BY_NAME[firstRecommendation.name];

  if (!firstTarget) {
    throw new Error(`${skill.name} recommends an unknown skill: ${firstRecommendation.name}.`);
  }

  if (!firstGuidance) {
    throw new Error(`${skill.name} recommends a skill without model guidance: ${firstRecommendation.name}.`);
  }

  const nextPrompts = recommendations
    .map((next, index) => {
      const target = SKILLS_BY_NAME.get(next.name);
      const guidance = MODEL_GUIDANCE_BY_NAME[next.name];

      if (!target) {
        throw new Error(`${skill.name} recommends an unknown skill: ${next.name}.`);
      }

      if (!guidance) {
        throw new Error(`${skill.name} recommends a skill without model guidance: ${next.name}.`);
      }

      return [
        `**${index + 1}. \`/${target.name}\`**`,
        "",
        next.reason,
        "",
        "```text",
        `Use $${target.name} to ${target.prompt}.`,
        "```",
        "",
        `> Suggested model: \`${guidance.model}\` · Suggested thinking: \`${guidance.thinking}\``,
        ">",
        `> Heuristic: ${guidance.reason}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    SKILL_OUTPUT_HEADING,
    "",
    "Finish every invocation with an architecture-quality, self-contained HTML readout and a concise in-chat completion report. Resolve the QuickStark root by walking upward from this skill's `SKILL.md`; both the canonical repository and installed Codex plugin contain `scripts/qs-skill-readout.mjs`.",
    "",
    "Write a small JSON input containing the actual skill, status, outcome, findings, decisions, real outputs, checks actually performed, and up to three relevant `nextSkills` objects containing `name`, `reason`, and a copy-ready `prompt`. Each prompt explicitly invokes its catalog-approved skill and carries forward the actual outcome, findings, decisions, outputs, and checks relevant to that follow-on. Use the Codex-native `$qs-...` skill spelling for automatically generated follow-on prompts; existing explicit `/qs-...` prompts remain supported. A resolved blue skill mention is controlled by the Codex composer and its skill picker, not by HTML, Markdown, clipboard text, or the readout viewer. Present each full prompt in its own fenced text code block. Put its suggested model and thinking level in a visually muted callout underneath. Optionally supply `model`, `thinking`, and `modelReason` when the actual remaining work justifies a more specific heuristic suggestion. Record only directly verified execution context, delivery provenance, or relationships.",
    "",
    "Include `commands` only when the user actually needs to run an installation, debugging, verification, setup, or other terminal command after the skill completes. Each recorded command must contain a concise `title`, the exact copyable `command`, and a `detail` explaining why or when the user should run it. Never present already executed checks, execution logs, or the skill's own command transcript as pending user actions. Include `keyCode` only for an actual source excerpt the user needs to inspect, using a concise `title`, exact `code`, a safe `language`, and an optional repository-relative `path` and explanatory `detail`. Render both as separate, safely escaped code blocks. Omit both sections when no user action or noteworthy code exists. Never expose secrets, credentials, tokens, private keys, sensitive files, speculative instructions, or invented code; previews cannot claim commands or recorded source.",
    "",
    "Generate the readout with:",
    "",
    "```bash",
    'node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --input "<absolute-path-to-readout.json>"',
    "```",
    "",
    "To automatically publish every actual skill report from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no securely installed profile credential is available. On Linux and Windows the renderer first uses a valid explicit token. On macOS it first securely discovers the owner-only file or named Keychain credential belonging to the current `.codex` or `.codex-demo` profile, so an inherited shared desktop token never replaces another profile's producer; the valid explicit token remains the fallback when that profile has neither credential. Standard private machine files and the legacy macOS Keychain entry remain supported. Never read another user's profile, follow a profile or credential-ancestor symlink, expose a credential, or silently replace one profile's producer identity. The reports API authenticates the token and derives the producer identity. The renderer automatically uses `https://reports.quickstark.com/api/v1/readouts`, identifies the Codex harness, and derives the project from the skill's actual working directory, using its Git origin when available or a safely fingerprinted local workspace when no remote exists. Do not configure project names, owners, producer identifiers, or harness metadata for ordinary skill runs. Token authentication, not GitHub ownership, authorizes publication; never mislabel a report as a different project or expose an absolute local path. The ordinary render command writes an immutable local report, publishes the structured result without starting a private-IP viewer, and returns the hosted reports URL only after authenticated delivery succeeds. Explicit local, LAN, or SSH viewer requests remain private. Never commit, print, reuse across security boundaries, or embed a bearer token in a report. If the private token, safe current-project identity, or hosted delivery is unavailable, preserve the local report and report the actual failure.",
    "Include an optional `observation` only for directly observed Codex or provider measurements. A clearly identified `skill-run` may display its actual model, reasoning effort, final-response token counts, and active duration in the compact Skill run metrics section immediately after Top next prompts. Display unavailable values as `Not captured`; never estimate usage, promote a suggested configuration into a measurement, or attribute thread-turn or cumulative telemetry to an individual skill. An unrun preview never displays skill-run metrics.",
    "",
    "The render command automatically starts or reuses a verified readout viewer, selects an available port, and writes a uniquely named, self-contained HTML file. Every promoted skill selects its own compact, purpose-specific report profile; accessible concept maps, evidence charts, review matrices, and check summaries visualize only actual recorded results. OS temporary `quickstark-readouts` storage remains the default. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into the durable, project-organized report library; verified Git identities automatically group immutable reports by project, year, and month. Its full-height, project-first Project Workbench integrates verified project navigation, searchable actual skill runs, and complete immutable readouts in one responsive page. On macOS or a graphical desktop the private viewer uses localhost. On a headless or SSH-connected Linux dev box it detects the private home-network IP, binds only to that address, protects the viewer with an unguessable URL, and returns a clickable report for a laptop on the same home network. Tailscale is not required. Set `QS_READOUT_ACCESS=ssh` to keep a remote viewer on localhost for explicit SSH forwarding, or `QS_READOUT_ACCESS=local` for local-only access.",
    "",
    "The renderer automatically captures the actual execution machine and platform for every real skill run. Add `execution.deployments` only for directly observed environments, deployment states, and safe verified HTTP(S) URLs. Add `execution.files` only for repository-relative files this skill actually added, modified, deleted, or renamed, with a concise accurate change summary. Preserve unrelated existing work; never infer run-owned files from an already dirty worktree or expose secrets, `.env` files, credentials, absolute machine paths, or unverified deployment targets. Previews never claim an execution machine, deployment, or changed file.",
    "",
    "When this run actually touches GitHub, a merge, or a release, add an optional `provenance` object containing only observed `pullRequests`, `closedIssues`, `release`, and `commit`. Verify GitHub numbers, record state, HTTPS links, repository ownership, release version, and complete Git hash. Set `commit.published` only after confirming remote publication; set `closedByRelease` only after independently confirming that exact release closed the issue. Omit missing evidence entirely. Record `relationships` only between observed findings, decisions, outputs, or checks; review findings may carry their actual `standards` or `specification` axis and `P0`–`P3` priority. Previews never contain delivery provenance or observed relationships.",
    "",
    "Report the verified HTTP(S) readout URL and preserve the real HTML path. When a skill produces a standalone visual artifact, publish its primary visual with `node \"<QuickStark root>/scripts/qs-skill-readout.mjs\" visual --skill \"<actual-skill>\" --input \"<absolute-path-to-visual.html>\" --json`; use the returned, independently verified HTTP(S) browser URL as the primary visual link. Never present a `/tmp` filesystem path, `file:` link, or editor-opening HTML attachment as a website. Preserve the source path as secondary evidence, not as the browser destination. Record a missing runtime, denied file access, unavailable home-network route, or failed viewer health check honestly; do not bind to every network interface, claim an unreachable URL, or pretend a readout or browser visual exists.",
    "",
    "```text",
    "Status: Completed | Awaiting input | Blocked",
    `Skills used: /${skill.name}; /another-skill only if actually used`,
    "Outcome: What was completed, discovered, decided, or is blocking progress.",
    "Execution: Actual machine, with verified deployment and changed files when applicable.",
    "Readout: Real absolute HTML path or verified private viewer URL.",
    "Outputs: Real files, reports, decisions, or changes, when applicable.",
    "Checks: Only the tests, validations, or observations actually performed.",
    "Commands: Only terminal commands the user actually needs to run, when applicable.",
    "Key code: Only actual, relevant source excerpts, when applicable.",
    "Delivery: Verified PRs, closed issues, release, or commit, only when applicable.",
    "```",
    "",
    "**Top next prompts:**",
    "",
    "**1. Recommended continuation**",
    "",
    firstRecommendation.reason,
    "",
    "```text",
    `Use $${firstTarget.name} to ${firstTarget.prompt}.`,
    "```",
    "",
    `> Suggested model: \`${firstGuidance.model}\` · Suggested thinking: \`${firstGuidance.thinking}\``,
    ">",
    `> Heuristic: ${firstGuidance.reason} Never change the active model or thinking level.`,
    "",
    "Use the same fenced-prompt and muted callout format for at most two genuinely relevant alternatives.",
    "",
    "Always include **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Top next prompts**. Make each complete, copy-ready prompt the visual focus in a fenced text code block. Place **Suggested model** and **Suggested thinking** underneath in a muted blockquote callout, label both as heuristic, and never change the active model or thinking level. These suggestions are not observed run measurements, comparative benchmarks, independently verified quality, or automatic model changes. When the readout cannot be created, state `Readout: Not created —` and the actual reason. Omit deployment details, changed files, **Outputs**, **Checks**, **Commands**, **Key code**, or **Delivery** when no corresponding evidence exists. List only skills that actually ran; suggested prompts belong under **Top next prompts**, not **Skills used**. Never claim a machine, check, changed file, artifact, issue, pull request, release, URL, or result you did not verify.",
    "",
    "Select at most three genuinely relevant, copy-ready prompt directions from:",
    "",
    nextPrompts,
    "",
    "Tailor every selected prompt to this run's actual outcome and recorded evidence; the catalog wording is a starting point, not a substitute for the accomplished work. Explain why the prompt advances the actual remaining work. If the request is finished, say `Top next prompts: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.",
    "",
  ].join("\n");
}

export function renderDocumentationOutputContract(skill) {
  const recommendations = NEXT_SKILLS_BY_NAME[skill.name];

  if (!recommendations || recommendations.length === 0) {
    throw new Error(`No next-skill documentation exists for ${skill.name}.`);
  }

  const nextPrompts = recommendations.map((next, index) => {
    const target = SKILLS_BY_NAME.get(next.name);
    const guidance = MODEL_GUIDANCE_BY_NAME[next.name];

    if (!target) {
      throw new Error(`${skill.name} recommends an unknown skill: ${next.name}.`);
    }

    if (!guidance) {
      throw new Error(`${skill.name} recommends a skill without model guidance: ${next.name}.`);
    }

    const source = `${PERSONAL_REPOSITORY}/blob/main/skills/${target.bucket}/${target.name}/SKILL.md`;
    return [
      `**${index + 1}. [\`/${target.name}\`](${source})**`,
      "",
      next.reason,
      "",
      "```text",
      `Use $${target.name} to ${target.prompt}.`,
      "```",
      "",
      `> Suggested model: \`${guidance.model}\` · Suggested thinking: \`${guidance.thinking}\``,
      ">",
      `> Heuristic: ${guidance.reason}`,
    ].join("\n");
  });

  return [
    DOCUMENTATION_OUTPUT_HEADING,
    "",
    `\`/${skill.name}\` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native \`$qs-...\` skill spelling; legacy explicit \`/qs-...\` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared \`scripts/qs-skill-readout.mjs\` generator and defaults to the OS temporary \`quickstark-readouts\` directory. Set \`QS_READOUT_DIR=/docker/appdata/quickstark-readouts\` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.`,
    "",
    "To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no owner-only profile credential is installed. Linux and Windows preserve valid explicit-token precedence. On macOS the renderer first selects the current `.codex` or `.codex-demo` profile's private file or named Keychain token so a shared desktop environment cannot replace that profile's producer; the valid explicit token remains supported when neither profile credential exists. A safely installed machine token and the legacy macOS Keychain entry remain supported. Reject user-home escapes and symbolic links in every profile or credential ancestor. The reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or private-IP viewer. Generate the immutable local report first and present the hosted `https://reports.quickstark.com/` report URL only after authenticated acceptance. Explicit local, LAN, or SSH viewers remain available. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.",
    "A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.",
    "",
    "When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.",
    "",
    "Depending on the actual completed work, tailor one to three top next prompts from:",
    "",
    nextPrompts.join("\n\n"),
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
    console.log(`Verified output contracts and top next prompts for all ${SKILLS.length} skills.`);
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
