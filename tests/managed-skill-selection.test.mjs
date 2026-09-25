import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, symlink, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildManagedSelectionPlan, validateMaintainedPackages } from "../scripts/managed-skills.mjs";
import { inferManagedSelection } from "../scripts/managed-skill-selection.mjs";
import { saveSelectionRecord, selectionRecordPath } from "../scripts/skill-selection.mjs";
import { calculatePortableDirectoryHash } from "../scripts/personal-skills/filesystem.mjs";
import { writeAgentSkillLock } from "../scripts/personal-skills/lock.mjs";
import { execute as executePersonalSkills, loadManifest, selectManifestResources } from "../scripts/sync-personal-skills.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const maintained = await validateMaintainedPackages({ repositoryRoot });
const packages = maintained.packages;
const packageEntry = (name, agent = "codex", overrides = {}) => ({
  name, pluginId: `${name}@quickstark`, marketplaceName: "quickstark", installed: true, enabled: true,
  version: maintained.version,
  source: agent === "pi" ? join(repositoryRoot, `pi/packages/${name}`)
    : { source: "local", path: join(repositoryRoot, `codex/plugins/${name}`) },
  ...overrides,
});
const selected = (names, resources = []) => ({ packages: names, resources, profile: null, additions: [] });
async function fixture(t) {
  const homeDirectory = await mkdtemp(join(tmpdir(), "qs-managed-selection-"));
  t.after(() => rm(homeDirectory, { recursive: true, force: true }));
  return { repositoryRoot, homeDirectory, agents: ["codex"], inspectManagedPackages: async () => ({ installed: [] }) };
}

test("selection-bound plan proposes only core on a fresh home and writes nothing", async (t) => {
  const options = await fixture(t);
  const plan = await buildManagedSelectionPlan(options);
  assert.deepEqual(plan.selections.codex.selection.packages, ["qs-skills"]);
  assert.deepEqual(plan.selections.codex.selection.resources, []);
  assert.deepEqual(plan.managerActions.filter((item) => item.package).map((item) => item.package), ["qs-skills"]);
  assert.equal(plan.personalPlans.codex.operationCount, 0);
  assert.deepEqual(await readdir(options.homeDirectory), []);
});

test("observed legacy packages remain per host and exclude newly available packages", async (t) => {
  const options = await fixture(t);
  const plan = await buildManagedSelectionPlan({ ...options, agents: ["codex", "pi"],
    inspectManagedPackages: async (agent) => ({ installed: [packageEntry(agent === "pi" ? "qs-specialists" : "ps-skills", agent)] }) });
  assert.deepEqual(plan.selections.codex.selection.packages, ["ps-skills"]);
  assert.deepEqual(plan.selections.pi.selection.packages, ["qs-specialists"]);
  assert.deepEqual(plan.managerActions.filter((item) => item.package).map((item) => [item.agent, item.package]), [
    ["codex", "ps-skills"], ["pi", "qs-specialists"],
  ]);
});

test("saved selection drives reinstall without opting in other packages", async (t) => {
  const options = await fixture(t);
  const path = selectionRecordPath(options.homeDirectory);
  const record = { schemaVersion: 1, targets: { codex: selected(["qs-specialists"]) }, templateRevision: null, lastSuccessfulTransaction: null };
  await saveSelectionRecord(path, record, { expectedFingerprint: null });
  const before = await readFile(path);
  const plan = await buildManagedSelectionPlan(options);
  assert.equal(plan.selections.codex.basis, "saved");
  assert.deepEqual(plan.managerActions.filter((item) => item.package).map((item) => item.package), ["qs-specialists"]);
  assert.deepEqual(await readFile(path), before);
});

test("explicit profile and addition produce retirement preview without deleting legacy state", async (t) => {
  const options = await fixture(t);
  const plan = await buildManagedSelectionPlan({ ...options, profile: "core", withPackages: ["qs-specialists"],
    inspectManagedPackages: async () => ({ installed: [packageEntry("ps-skills")] }) });
  assert.deepEqual(plan.selections.codex.selection.packages, ["qs-skills", "qs-specialists"]);
  assert.deepEqual(plan.selections.codex.retirements.packages, ["ps-skills"]);
  assert.deepEqual(await readdir(options.homeDirectory), []);
});

test("disabled, unknown, duplicate and conflicting owned packages cannot become a fresh reset", async (t) => {
  const options = await fixture(t);
  for (const installed of [
    [packageEntry("qs-skills", "codex", { enabled: false })],
    [packageEntry("qs-unknown")],
    [packageEntry("qs-skills"), packageEntry("qs-skills")],
    [packageEntry("qs-skills", "codex", { marketplaceName: "vendor" })],
    [packageEntry("qs-skills", "codex", { source: { source: "local", path: "/different/checkout" } })],
    [{ name: "qs-skills", version: maintained.version }],
  ]) await assert.rejects(buildManagedSelectionPlan({ ...options, inspectManagedPackages: async () => ({ installed }) }), /ambiguous/);
  assert.deepEqual(await readdir(options.homeDirectory), []);
});

test("foreign package ownership is never appropriated", () => {
  const inventory = { installed: [packageEntry("qs-skills", "codex", { marketplaceName: "vendor", pluginId: "qs-skills@vendor" })] };
  assert.deepEqual(inferManagedSelection({ agent: "codex", inventory, machine: { resources: [] }, packages, resources: [], repositoryRoot }),
    { packages: [], resources: [], conflicts: [] });
});

async function installedResource(options) {
  const canonical = join(options.homeDirectory, ".agents", "skills", "example-skill");
  await mkdir(canonical, { recursive: true });
  await writeFile(join(canonical, "SKILL.md"), "---\nname: example-skill\ndescription: Fixture only\n---\nObserved content.\n");
  const manifest = await loadManifest();
  const resource = { ...manifest.resources[0], name: "example-skill", source: {
    ...manifest.resources[0].source, upstreamPath: "skills/example-skill/SKILL.md", contentSha256: await calculatePortableDirectoryHash(canonical),
  } };
  const manifestPath = join(options.homeDirectory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({ ...manifest, resources: [resource] }));
  await writeAgentSkillLock(join(options.homeDirectory, ".agents", ".skill-lock.json"), [resource]);
  return { canonical, manifestPath };
}

test("verified canonical resources preserve Codex/Pi exposure without opting Claude in", async (t) => {
  const options = await fixture(t);
  const { canonical, manifestPath } = await installedResource(options);
  const plan = await buildManagedSelectionPlan({ ...options, manifestPath, agents: ["codex", "pi", "claude-code"] });
  assert.deepEqual(plan.selections.codex.selection.resources, ["example-skill"]);
  assert.deepEqual(plan.selections.pi.selection.resources, ["example-skill"]);
  assert.deepEqual(plan.selections["claude-code"].selection.resources, []);
  const aliases = join(options.homeDirectory, ".claude", "skills");
  await mkdir(aliases, { recursive: true });
  await symlink(canonical, join(aliases, "example-skill"));
  const next = await buildManagedSelectionPlan({ ...options, manifestPath, agents: ["claude-code"] });
  assert.deepEqual(next.selections["claude-code"].selection.resources, ["example-skill"]);
});

test("changed canonical content blocks adoption and remains byte-preserved", async (t) => {
  const options = await fixture(t);
  const { canonical, manifestPath } = await installedResource(options);
  const path = join(canonical, "SKILL.md");
  const changed = `${await readFile(path, "utf8")}Local change.\n`;
  await writeFile(path, changed);
  await assert.rejects(buildManagedSelectionPlan({ ...options, manifestPath }), /ambiguous.*Installed content differs/);
  assert.equal(await readFile(path, "utf8"), changed);
});

test("personal reconciliation can verify an empty selected set without installing manifest resources", async (t) => {
  const options = await fixture(t);
  const result = await executePersonalSkills({ action: "verify", homeDirectory: options.homeDirectory,
    agents: ["codex"], resourceNames: [], json: true }, { write: () => {} });
  assert.equal(result.operationCount, 0);
  assert.deepEqual(await readdir(options.homeDirectory), []);
  const manifest = await loadManifest();
  const first = manifest.resources[0].name;
  assert.deepEqual(selectManifestResources(manifest, [first]).resources.map((item) => item.name), [first]);
  assert.throws(() => selectManifestResources(manifest, [first, first]), /duplicate/);
  assert.throws(() => selectManifestResources(manifest, ["unapproved"]), /unknown/);
});
