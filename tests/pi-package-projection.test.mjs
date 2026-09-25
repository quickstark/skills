import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { resolvePublicCommand, SKILL_COLLECTIONS, REGISTRY_STATE } from "../scripts/skill-collection-registry.mjs";

const runFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function directoryNames(path) {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test("Pi package projection preserves exactly the active maintained collection boundaries", async () => {
  const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.deepEqual(SKILL_COLLECTIONS.map(collection => [collection.id, collection.publicCommands.length]), REGISTRY_STATE === "target"
    ? [["qs-skills",12],["qs-specialists",8],["qs-advanced",12],["qs-frontend",4],["qs-video",1],["qs-execution",1]]
    : [["qs-skills",12],["qs-specialists",8],["ps-skills",13]]);
  for (const collection of SKILL_COLLECTIONS) {
    const root = join(repositoryRoot, collection.piPackageRoot);
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    assert.equal(manifest.name, collection.packageName);
    assert.equal(manifest.version, project.version);
    assert.equal(manifest.license, "MIT");
    assert.equal(manifest.private, true);
    assert.deepEqual(manifest.pi, { skills: ["./skills"] });
    assert.ok(manifest.keywords.includes("pi-package"));
    assert.equal(manifest.scripts, undefined);
    assert.deepEqual(await directoryNames(join(root, "skills")), [...collection.publicCommands].sort());
  }
});

test("Pi manifest projects canonical skill contents and required notices without lifecycle code", async () => {
  for (const collection of SKILL_COLLECTIONS) {
    const root = join(repositoryRoot, collection.piPackageRoot);
    for (const name of collection.publicCommands) {
      const sourceCommand = resolvePublicCommand(name);
      const sourceRoot = join(repositoryRoot, sourceCommand.sourcePath ?? `skills/${sourceCommand.bucket}/${name}`);
      assert.equal(
        await readFile(join(root, "skills", name, "SKILL.md"), "utf8"),
        (await readFile(join(sourceRoot, "SKILL.md"), "utf8"))
          .replaceAll("../../advanced/", "../../capabilities/advanced/")
          .replaceAll("../../frontend/", "../../capabilities/frontend/"),
        name,
      );
    }
    const topLevel = (await readdir(root)).sort();
    assert.deepEqual(
      topLevel,
      ({
        "qs-skills": REGISTRY_STATE === "target" ? ["capabilities", "package.json", "skills"] : ["package.json", "skills"],
        "qs-specialists": ["package.json", "skills"],
        "ps-skills": ["THIRD_PARTY_NOTICES.md", "package.json", "skills"],
        "qs-advanced": ["THIRD_PARTY_NOTICES.md", "capabilities", "package.json", "skills"],
        "qs-frontend": ["THIRD_PARTY_NOTICES.md", "capabilities", "package.json", "skills"],
        "qs-video": ["package.json", "skills"], "qs-execution": ["package.json", "skills"],
      })[collection.id],
    );
  }
});

test("Pi projection corruption is rejected by the projector entry point", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "qs-pi-projection-test-"));
  const projection = join(directory, "qs-skills");
  context.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(repositoryRoot, "pi", "packages", "qs-skills"), projection, { recursive: true });
  await writeFile(join(projection, "unexpected.txt"), "not projected\n");
  await assert.rejects(
    runFile(process.execPath, [
      "scripts/sync-codex-plugin.mjs",
      "--check",
      "--package",
      "qs-skills",
      "--root",
      projection,
      "--format",
      "pi",
    ], { cwd: repositoryRoot }),
    /unexpected top-level entries|invalid Pi package/i,
  );
});

test("target private references remain packaged and byte-identical without becoming Pi public skills", async () => {
  if (REGISTRY_STATE !== "target") {
    assert.deepEqual(SKILL_COLLECTIONS.map(collection => collection.id), ["qs-skills", "qs-specialists", "ps-skills"]);
    return; // Target-only package bytes do not exist in the legacy projection.
  }
  const walk = async base => {
    const result=[];
    for (const entry of await readdir(base,{withFileTypes:true})) {
      if(entry.isDirectory()) for(const file of await walk(join(base,entry.name))) result.push(`${entry.name}/${file}`);
      else { assert.ok(entry.isFile(),`Unexpected non-regular private entry ${entry.name}`); result.push(entry.name); }
    }
    return result.sort();
  };
  for(const [source,projected,required] of [["skills/advanced","pi/packages/qs-advanced/capabilities/advanced",16],["skills/frontend","pi/packages/qs-frontend/capabilities/frontend",9]]) {
    const sources=await walk(join(repositoryRoot,source)), copies=await walk(join(repositoryRoot,projected)); assert.deepEqual(copies,sources);
    assert.equal(sources.filter(file=>file.startsWith("internal/") && file.endsWith(".md")).length,required);
    for(const file of sources) assert.deepEqual(await readFile(join(repositoryRoot,projected,file)),await readFile(join(repositoryRoot,source,file)),file);
  }
  assert.deepEqual((await readdir(join(repositoryRoot,"pi/packages/qs-skills/capabilities"))).sort(),["domain-modeling.md","module-decomposition.md","tdd-loop.md","ticket-decomposition.md"]);
  assert.deepEqual((await readdir(join(repositoryRoot,"pi/packages/qs-video/skills/qs-video/modules"))).sort(),["embedded-captions","faceless-explainer","figma","general-video","hyperframes","hyperframes-animation","hyperframes-audio","hyperframes-cli","hyperframes-core","hyperframes-creative","hyperframes-keyframes","hyperframes-registry","hyperframes-studio","media-use","motion-graphics","music-to-video","pr-to-video","product-launch-video","remotion-to-hyperframes","slideshow","talking-head-recut"].sort());
});
