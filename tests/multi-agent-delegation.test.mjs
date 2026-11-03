import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { V3_INTERNAL_CAPABILITIES, V3_SKILL_DISPOSITIONS_BY_NAME } from "../scripts/qs-skill-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");
const body = async (path) => (await read(path)).split("## Completion report and next steps")[0];
const FRESH_CONTEXT = /start(?:ed)? (?:each|every subagent|each helper)? ?with a fresh context window, not a fork of the parent conversation|started with a fresh context window/i;

test("the run contract owns host-neutral delegation rules", async () => {
  const contract = await read("docs/skill-run-contract.md");
  const section = contract.split("## Delegation")[1]?.split("\n## ")[0];
  assert.ok(section, "skill-run contract omits its Delegation section");
  assert.match(section, /When the host provides subagents, start each with a fresh context window, not a fork of the parent conversation/);
  assert.match(section, /context pointers/);
  assert.match(section, /at most 400 words or a declared schema/);
  assert.match(section, /root alone owns synthesis, mutation serialization, verification and completion/);
  assert.match(section, /Without subagent support, perform the same units serially in the root with identical acceptance criteria/);
  assert.match(section, /`effort=quick` uses no fan-out/);
  assert.match(section, /`effort=standard` fans out only when at least two independent units exist/);
  assert.match(section, /`effort=deep` may fan out more broadly/);
  assert.match(section, /never expands mutation, Git, publication or installation authority/);
  assert.match(section, /emit no public result/);
  assert.doesNotMatch(section, /must (?:spawn|delegate|use a subagent)|do not invoke this skill|depth limit of/i);
});

test("delegation is a v3-native core capability projected into every core host package", async () => {
  const capability = V3_INTERNAL_CAPABILITIES.find((entry) => entry.name === "delegation");
  assert.deepEqual(capability?.owners, ["qs-code-build", "qs-review-code", "qs-plan-spec"]);
  assert.equal(capability.legacySkillName, null);
  assert.equal(Object.values(V3_SKILL_DISPOSITIONS_BY_NAME).some((entry) => entry.target === "delegation"), false);

  const source = await read("skills/internal/delegation.md");
  assert.match(source, FRESH_CONTEXT);
  assert.match(source, /Without subagent support, run the same units serially/);
  assert.match(source, /never expand mutation, Git, publication or installation authority/);
  assert.doesNotMatch(source, /qs-unlazy|unlazy\//, "core capability must not import the execution package");
  for (const packageRoot of ["packages/qs-skills", "codex/plugins/qs-skills", "pi/packages/qs-skills"]) {
    assert.ok((await readdir(join(root, packageRoot, "capabilities"))).includes("delegation.md"), packageRoot);
    assert.equal(await read(`${packageRoot}/capabilities/delegation.md`), source, packageRoot);
  }
});

test("review runs separate axes in parallel fresh-context reviewers without reranking", async () => {
  const review = await body("skills/engineering/qs-review-code/SKILL.md");
  const parallel = review.indexOf("## Parallel review axes");
  assert.ok(parallel > 0);
  assert.ok(review.indexOf("validate the target") > parallel, "target validation must precede fan-out");
  assert.ok(review.indexOf("validate the target") < review.indexOf("**Standards**"));
  assert.match(review, /\*\*Standards\*\*/);
  assert.match(review, /\*\*Spec\*\*/);
  assert.match(review, /\*\*Security\*\*: added at `effort=deep`/);
  assert.match(review, /parallel read-only reviewer started with a fresh context window/);
  assert.match(review, /Without subagent support, review the same axes serially/);
  assert.match(review, /Do not merge or rerank findings across axes/);
  assert.match(review, /Reviewers never edit/);
  assert.match(review, /Review is read-only/);
});

test("tickets form a frontier graph sized to one fresh context window", async () => {
  const decomposition = await read("skills/internal/ticket-decomposition.md");
  assert.match(decomposition, /explicit `Blocked by` edges/);
  assert.match(decomposition, /frontier is every open ticket whose blockers are all done/);
  assert.match(decomposition, /fit one fresh context window/);
  assert.match(decomposition, /blockers first, then wire blocking edges in a second pass once real identifiers exist/);
  assert.match(decomposition, /tracker's native blocking relationship/);
  assert.match(decomposition, /expand first/, "wide-refactor exception must remain");

  const spec = await body("skills/engineering/qs-plan-spec/SKILL.md");
  assert.match(spec, /explicit `Blocked by` edges/);
  assert.match(spec, /fit one fresh context window/);
  assert.match(spec, /Delegation when independent current-state evidence surfaces/);
});

test("research delegates reading to one background fresh-context helper and verifies sources", async () => {
  const research = await body("skills/engineering/qs-plan-research/SKILL.md");
  assert.match(research, /one background helper started with a fresh context window/);
  assert.match(research, /write its notes and claim-to-source mapping to one file/);
  assert.match(research, /returning only the file path/);
  assert.match(research, /verify every cited source/);
  assert.match(research, /Without subagent support, perform the same reading in this root/);
});

test("advanced parallel capabilities direct fresh-context helpers instead of merely permitting them", async () => {
  for (const name of ["parallel-coverage", "concurrency-ownership"]) {
    const content = await read(`skills/advanced/internal/${name}.md`);
    assert.doesNotMatch(content, /Optional helpers may/, name);
    assert.match(content, /When the host provides subagents/, name);
    assert.match(content, FRESH_CONTEXT, name);
    assert.match(content, /inherit the parent model/, name);
    assert.match(content, /Without subagent support/, name);
    assert.doesNotMatch(content, /must (?:spawn|delegate|use a subagent)|task tool/i, name);
  }
});

test("qs-code-build graph mode walks a ticket frontier inside one authorized root", async () => {
  const build = await body("skills/engineering/qs-code-build/SKILL.md");
  assert.match(build, /`mode=single\|graph` defaults to `single`/);
  assert.match(build, /end `input-required` and route to `qs-plan-spec`/);
  assert.match(build, /do not invent edges/);
  assert.match(build, /frontier is every open ticket whose blockers are all done/);
  assert.match(build, /Creating an integration branch or worktrees requires that authority in the request/);
  assert.match(build, /Without it, implement frontier tickets one at a time in the current working tree/);
  assert.match(build, /read-only exploration helper with a fresh context window that writes its notes to a file outside the repository/);
  assert.match(build, /one implementer helper with a fresh context window in its own worktree based on the integration-branch tip/);
  assert.match(build, /internal TDD loop/);
  assert.match(build, /merges the current integration-branch tip into its own branch before reporting/);
  assert.match(build, /Merge returned work into the integration branch one ticket at a time/);
  assert.match(build, /recompute the frontier and start implementers for newly unblocked tickets/);
  assert.match(build, /one internal parallel review pass/);
  assert.match(build, /not an invocation of that public skill/);
  assert.match(build, /one fresh fixer helper/);
  assert.match(build, /Remove only the worktrees this run created/);
  assert.match(build, /resumable record/);
  assert.match(build, /weighting verified tickets/);
  assert.match(build, /With commit authority but no push authority, the result is a local integration branch/);
  assert.match(build, /does not create gate ledgers or claims/);
  assert.doesNotMatch(build, /gate-check|\.unlazy\//, "graph mode must not reuse qs-unlazy machinery");

  const metadata = await read("skills/engineering/qs-code-build/agents/openai.yaml");
  assert.match(metadata, /mode=single\|graph/);
  for (const projection of ["codex/plugins/qs-skills", "packages/qs-skills", "pi/packages/qs-skills"]) {
    assert.match(await read(`${projection}/skills/qs-code-build/SKILL.md`), /## Graph mode/, projection);
  }
});

test("help routing separates graph mode from qs-unlazy and keeps delegation internal", async () => {
  const help = await body("skills/engineering/qs-help/SKILL.md");
  assert.match(help, /belongs to `\/qs-code-build` with `mode=graph`/);
  assert.match(help, /belongs to `\/qs-unlazy` in the optional `qs-execution` package/);
  assert.match(help, /Delegation is an internal capability, not a command/);
});

test("packages stay skills-only and ship no host agent declarations", async () => {
  for (const manifest of [".claude-plugin/plugin.json", "packages/qs-skills/.claude-plugin/plugin.json"]) {
    assert.equal(JSON.parse(await read(manifest)).agents, undefined, manifest);
  }
  for (const absent of ["packages/qs-skills/agents", "codex/plugins/qs-skills/agents", "codex/plugins/qs-skills/agent-roles", "pi/packages/qs-skills/agents"]) {
    await assert.rejects(readdir(join(root, absent)), { code: "ENOENT" }, absent);
  }
});

test("skills use generic subagents and documentation covers every host", async () => {
  const delegation = await read("skills/internal/delegation.md");
  assert.match(delegation, /Use the host's generic subagents; QuickStark ships no host-specific agent declarations/);
  for (const path of ["skills/internal/delegation.md", "skills/engineering/qs-code-build/SKILL.md", "skills/engineering/qs-review-code/SKILL.md", "skills/engineering/qs-plan-spec/SKILL.md", "skills/engineering/qs-setup/SKILL.md"]) {
    assert.doesNotMatch(await body(path), /qs-implementer|qs-explorer|qs-reviewer|agent-roles/, `${path} must not name a declared role`);
  }
  const docs = await read("docs/multi-agent.md");
  for (const heading of ["**Claude Code.**", "**Codex.**", "**Pi.**"]) assert.ok(docs.includes(heading), heading);
  assert.match(docs, /runs every delegated unit serially/);
  assert.match(docs, /qs-unlazy/);
});
