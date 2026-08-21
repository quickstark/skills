import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PS_INTERNAL_CAPABILITIES,
  PS_PUBLIC_COMMANDS,
} from "../scripts/ps-skill-catalog.mjs";
import { renderSkillOutputContract } from "../scripts/sync-skill-output-contracts.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const commandRoot = join(root, "skills", "pstack", "commands");
const publicNames = [
  "ps-help", "ps-how", "ps-why", "ps-blast-radius", "ps-runtime-forensics",
  "ps-trace-forensics", "ps-create-verification-skill", "ps-maintain-verification-skill",
  "ps-skill-eval", "ps-hillclimb", "ps-visual-parity", "ps-pr-babysit", "ps-worktree-cleanup",
];

test("PS exposes exactly thirteen ordered explicit-only commands", async () => {
  assert.deepEqual(PS_PUBLIC_COMMANDS.map((command) => command.name), publicNames);
  assert.deepEqual(PS_PUBLIC_COMMANDS.map((command) => command.lifecycle.position), Array.from({ length: 13 }, (_, index) => (index + 1) * 10));
  assert.ok(PS_PUBLIC_COMMANDS.every((command) => command.invocationPolicy === "explicit"));
  assert.ok(PS_PUBLIC_COMMANDS.every((command) => command.disableModelInvocation === true));
  assert.ok(PS_PUBLIC_COMMANDS.every((command) => command.allowImplicitInvocation === false));
  assert.deepEqual((await readdir(commandRoot)).sort(), [...publicNames].sort());
});

test("PS command and capability sources remain host-neutral and package-safe", async () => {
  const forbidden = /\.cursor|\bcursor\b|task tool|grok-|claude-[a-z0-9]|\/loop|\bgraphite\b|\bgt\s/i;
  for (const command of PS_PUBLIC_COMMANDS) {
    const content = await readFile(join(root, command.sourcePath, "SKILL.md"), "utf8");
    assert.doesNotMatch(content, forbidden, command.name);
    assert.doesNotMatch(content, /reports\.quickstark\.com|require-hosted|qs-skill-readout|hosted report/i, command.name);
    assert.match(content, /Present the result directly in chat/i);
    assert.match(content, /internal clear-writing pass/i);
  }
  for (const capability of PS_INTERNAL_CAPABILITIES) {
    const content = await readFile(join(root, capability.sourcePath), "utf8");
    assert.doesNotMatch(content, forbidden, capability.name);
    assert.doesNotMatch(content, /^---$/m, capability.name);
  }
});

test("PS direct-chat contracts retain completion modes and three ranked continuations", () => {
  for (const command of PS_PUBLIC_COMMANDS) {
    const contract = renderSkillOutputContract(command);
    assert.match(contract, /effort=quick\|standard\|deep/);
    assert.match(contract, /report=brief\|full/);
    assert.match(contract, /Present the result directly in chat/i);
    assert.match(contract, /Preferred next prompt/);
    assert.match(contract, /Alternative next prompts: two/);
    assert.equal(command.continuation.normal.length, 3);
    assert.equal(command.continuation.failure.length, 3);
    assert.equal(command.continuation.maximumPrompts, 3);
    assert.equal(command.continuation.automaticPublicSkillHops, false);
  }
});

test("PS safety boundaries remain explicit", async () => {
  const read = async (name) => readFile(join(commandRoot, name, "SKILL.md"), "utf8");
  const [evaluation, visual, babysit, cleanup, runtime, create, maintain] = await Promise.all([
    read("ps-skill-eval"), read("ps-visual-parity"), read("ps-pr-babysit"),
    read("ps-worktree-cleanup"), read("ps-runtime-forensics"),
    read("ps-create-verification-skill"), read("ps-maintain-verification-skill"),
  ]);
  assert.match(evaluation, /transcript or run-history evidence is optional/i);
  assert.match(evaluation, /explicitly selects its source and scope/i);
  assert.match(visual, /repository-declared or user-approved tolerance/i);
  assert.match(visual, /baseline is immutable/i);
  assert.match(babysit, /inspect-only: observe and report; never edit/i);
  assert.match(babysit, /never merge, enable auto-merge or merge-when-ready/i);
  assert.match(cleanup, /default scope is Git worktrees only/i);
  assert.match(cleanup, /separate exact-target confirmation/i);
  assert.match(runtime, /return `continuation-required` before changing tracked product source/i);
  assert.match(create, /do not change product behavior/i);
  assert.match(maintain, /product behavior remains outside/i);
});

test("PS Claude and Codex projections are isolated and preserve notices", async () => {
  const project = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const claude = JSON.parse(await readFile(join(root, "packages", "ps-skills", ".claude-plugin", "plugin.json"), "utf8"));
  const codex = JSON.parse(await readFile(join(root, "codex", "plugins", "ps-skills", ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(claude.version, project.version);
  assert.equal(codex.version, project.version);
  assert.deepEqual((await readdir(join(root, "packages", "ps-skills", "skills"))).sort(), [...publicNames].sort());
  assert.deepEqual((await readdir(join(root, "codex", "plugins", "ps-skills", "skills"))).sort(), [...publicNames].sort());
  assert.equal((await readdir(join(root, "packages", "ps-skills", "capabilities"))).length, 16);
  assert.equal((await readdir(join(root, "codex", "plugins", "ps-skills", "capabilities"))).length, 16);
  assert.match(await readFile(join(root, "packages", "ps-skills", "THIRD_PARTY_NOTICES.md"), "utf8"), /Lauren Tan/i);
});
