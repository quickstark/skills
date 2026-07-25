import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { formatSkillForCodex } from "../scripts/codex-skill-format.mjs";
import {
  COLLECTION_PREFIX,
  SKILLS,
  UPSTREAM_SKILLS,
} from "../scripts/qs-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const personalRepository = "https://github.com/quickstark/skills";

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function listFiles(root, current = root) {
  const files = [];

  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    } else {
      assert.fail(`Packaged skill contains a non-regular entry: ${path}`);
    }
  }

  return files.sort();
}

test("the catalog preserves all 22 upstream skills and adds a real deployment skill", () => {
  assert.equal(UPSTREAM_SKILLS.length, 22);
  assert.equal(SKILLS.length, 23);
  assert.equal(SKILLS.filter((skill) => skill.upstreamName === null).length, 1);
  assert.ok(SKILLS.some((skill) => skill.name === "qs-deploy-release"));
});

test("skill names are unique, discoverable, and organized by purpose", () => {
  const names = SKILLS.map((skill) => skill.name);
  assert.equal(new Set(names).size, names.length);

  for (const name of names) {
    assert.match(name, new RegExp(`^${COLLECTION_PREFIX}-[a-z0-9]+(?:-[a-z0-9]+)*$`));
    assert.ok(name.length <= 64, `${name} exceeds the skill naming limit`);
  }

  for (const category of ["plan", "design", "code", "test", "review", "git", "flow", "deploy"]) {
    assert.ok(names.some((name) => name.startsWith(`${COLLECTION_PREFIX}-${category}-`)), `missing ${category} skills`);
  }
});

for (const skill of SKILLS) {
  test(`${skill.name} has matching folder, frontmatter, picker metadata, and documentation`, async () => {
    const directory = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const skillContent = await readFile(join(directory, "SKILL.md"), "utf8");
    const metadata = await readFile(join(directory, "agents", "openai.yaml"), "utf8");

    assert.match(skillContent, new RegExp(`^name:\\s*${skill.name}\\s*$`, "m"));
    assert.match(skillContent, /^description:\s*\S/m);
    assert.match(metadata, new RegExp(`display_name:\\s*${JSON.stringify(skill.displayName)}`));
    assert.match(metadata, new RegExp(`default_prompt:\\s*"Use \\$${skill.name} to `));
    assert.ok(skill.shortDescription.length >= 25 && skill.shortDescription.length <= 64);
    assert.match(metadata, new RegExp(`short_description:\\s*${JSON.stringify(skill.shortDescription)}`));

    if (skill.userInvoked) {
      assert.match(skillContent, /^disable-model-invocation:\s*true\s*$/m);
      assert.match(metadata, /^\s*allow_implicit_invocation:\s*false\s*$/m);
    } else {
      assert.doesNotMatch(skillContent, /^disable-model-invocation:\s*true\s*$/m);
      assert.doesNotMatch(metadata, /^\s*allow_implicit_invocation:\s*false\s*$/m);
    }

    const documentation = await readFile(
      join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`),
      "utf8",
    );
    assert.match(documentation, /## What it does/);
    assert.match(documentation, /## When to reach for it/);
    assert.match(documentation, /## Where it fits/);
    assert.match(documentation, new RegExp(`\\/${skill.name}(?![a-z0-9-])`));
  });
}

test("the root and bucket indexes list exactly the promoted skills", async () => {
  const rootReadme = await readFile(join(repositoryRoot, "README.md"), "utf8");

  for (const skill of SKILLS) {
    const expectedLink = `./skills/${skill.bucket}/${skill.name}/SKILL.md`;
    assert.ok(rootReadme.includes(expectedLink), `root README omits ${skill.name}`);

    const bucketReadme = await readFile(
      join(repositoryRoot, "skills", skill.bucket, "README.md"),
      "utf8",
    );
    assert.ok(bucketReadme.includes(`./${skill.name}/SKILL.md`), `${skill.bucket} README omits ${skill.name}`);
  }

  for (const bucket of ["misc", "personal", "in-progress", "deprecated"]) {
    const entries = await readdir(join(repositoryRoot, "skills", bucket), {
      withFileTypes: true,
    });

    for (const entry of entries.filter((item) => item.isDirectory())) {
      assert.ok(
        !rootReadme.includes(`./skills/${bucket}/${entry.name}/SKILL.md`),
        `non-promoted ${bucket}/${entry.name} leaked into the root index`,
      );
    }
  }
});

test("the Claude plugin exposes exactly the promoted skills with a synchronized version", async () => {
  const [plugin, marketplace, project] = await Promise.all([
    readFile(join(repositoryRoot, ".claude-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, ".claude-plugin", "marketplace.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
  ]);

  const expectedPaths = SKILLS.map((skill) => `./skills/${skill.bucket}/${skill.name}`).sort();

  assert.equal(project.name, "qs-skills");
  assert.equal(plugin.name, "qs-skills");
  assert.equal(plugin.version, project.version);
  assert.deepEqual([...plugin.skills].sort(), expectedPaths);
  assert.equal(marketplace.name, "quickstark");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "qs-skills");
});

test("the Codex marketplace and native plugin are validly connected", async () => {
  const [marketplace, plugin, project] = await Promise.all([
    readFile(join(repositoryRoot, "codex", ".agents", "plugins", "marketplace.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "codex", "plugins", "qs-skills", ".codex-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
  ]);

  assert.equal(marketplace.name, "quickstark");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "qs-skills");
  assert.equal(marketplace.plugins[0].source.source, "local");
  assert.equal(marketplace.plugins[0].source.path, "./plugins/qs-skills");
  assert.equal(marketplace.plugins[0].policy.installation, "AVAILABLE");
  assert.equal(marketplace.plugins[0].policy.authentication, "ON_INSTALL");
  assert.equal(marketplace.plugins[0].category, "Coding");
  assert.equal(plugin.name, "qs-skills");
  assert.equal(plugin.version, project.version);
  assert.equal(plugin.skills, "./skills/");
  assert.equal(plugin.interface.category, "Coding");
});

test("repository and plugin metadata point to the personal QuickStark fork", async () => {
  const [project, claudePlugin, codexPlugin, readme] = await Promise.all([
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, ".claude-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(
      join(repositoryRoot, "codex", "plugins", "qs-skills", ".codex-plugin", "plugin.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(join(repositoryRoot, "README.md"), "utf8"),
  ]);

  assert.equal(project.repository.url, personalRepository);
  assert.equal(claudePlugin.homepage, personalRepository);
  assert.equal(claudePlugin.repository, personalRepository);
  assert.equal(codexPlugin.homepage, personalRepository);
  assert.equal(codexPlugin.interface.websiteURL, personalRepository);
  assert.ok(readme.includes(`git clone ${personalRepository}.git`));
  assert.match(readme, /git fetch upstream/);
});

test("the Codex package is a curated, Codex-compatible snapshot of the canonical skills", async () => {
  const generatedRoot = join(repositoryRoot, "codex", "plugins", "qs-skills", "skills");
  const entries = await readdir(generatedRoot, { withFileTypes: true });
  const packagedNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  assert.deepEqual(packagedNames, SKILLS.map((skill) => skill.name).sort());

  for (const skill of SKILLS) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const packaged = join(generatedRoot, skill.name);
    const sourceFiles = await listFiles(source);
    const packagedFiles = await listFiles(packaged);

    assert.deepEqual(packagedFiles, sourceFiles, `${skill.name} has stale packaged files`);

    for (const file of sourceFiles) {
      const [sourceBytes, packagedBytes] = await Promise.all([
        readFile(join(source, file)),
        readFile(join(packaged, file)),
      ]);
      const expected =
        file === "SKILL.md"
          ? Buffer.from(formatSkillForCodex(sourceBytes.toString("utf8"), skill))
          : sourceBytes;

      assert.ok(expected.equals(packagedBytes), `${skill.name}/${file} is out of sync`);

      if (file === "SKILL.md" && skill.userInvoked) {
        assert.doesNotMatch(
          packagedBytes.toString("utf8"),
          /^disable-model-invocation:\s*true\s*$/m,
          `Claude-only invocation flag leaked into Codex: ${skill.name}`,
        );
      }

      if (file === "SKILL.md") {
        assert.doesNotMatch(
          packagedBytes.toString("utf8"),
          /^argument-hint:\s*/m,
          `Claude-only argument hint leaked into Codex: ${skill.name}`,
        );
      }
    }
  }
});

test("the router describes the personalized end-to-end workflow", async () => {
  const router = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-help", "SKILL.md"),
    "utf8",
  );

  for (const skill of SKILLS) {
    if (skill.name === "qs-help") continue;
    assert.ok(router.includes(`/${skill.name}`), `router omits /${skill.name}`);
  }

  for (const skill of UPSTREAM_SKILLS) {
    assert.doesNotMatch(
      router,
      new RegExp(`(?<![a-z0-9_-])\\/${skill.upstreamName}(?![a-z0-9_-])`, "i"),
      `router still invokes /${skill.upstreamName}`,
    );
  }
});

test("original promoted folder names have all been migrated", async () => {
  for (const skill of UPSTREAM_SKILLS) {
    assert.equal(
      await exists(join(repositoryRoot, "skills", skill.bucket, skill.upstreamName)),
      false,
      `old skill folder remains: ${skill.upstreamName}`,
    );
    assert.equal(
      await exists(join(repositoryRoot, "docs", skill.bucket, `${skill.upstreamName}.md`)),
      false,
      `old documentation remains: ${skill.upstreamName}`,
    );
  }
});

test("promoted skills and documentation do not invoke obsolete upstream commands", async () => {
  for (const skill of SKILLS) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const markdown = (await listFiles(source))
      .filter((file) => file.endsWith(".md"))
      .map((file) => join(source, file));

    markdown.push(
      join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`),
    );

    for (const file of markdown) {
      const content = (await readFile(file, "utf8")).replace(
        /https?:\/\/[^\s)>\]]+/g,
        "",
      );

      for (const upstream of UPSTREAM_SKILLS) {
        assert.doesNotMatch(
          content,
          new RegExp(
            `(?<![A-Za-z0-9_-])\\/${upstream.upstreamName}(?![A-Za-z0-9_-])`,
          ),
          `${relative(repositoryRoot, file)} still invokes /${upstream.upstreamName}`,
        );
      }
    }
  }
});

test("deployment remains explicit and never invents an external release workflow", async () => {
  const skill = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-deploy-release", "SKILL.md"),
    "utf8",
  );
  const metadata = await readFile(
    join(
      repositoryRoot,
      "codex",
      "plugins",
      "qs-skills",
      "skills",
      "qs-deploy-release",
      "agents",
      "openai.yaml",
    ),
    "utf8",
  );

  assert.match(skill, /^disable-model-invocation:\s*true\s*$/m);
  assert.match(metadata, /^\s*allow_implicit_invocation:\s*false\s*$/m);
  assert.match(skill, /Never invent a deployment target/);
  assert.match(skill, /Obtain explicit confirmation/);
  assert.match(skill, /documented rollback/);
});

test("Matt Pocock's upstream attribution and MIT license remain intact", async () => {
  const [license, readme] = await Promise.all([
    readFile(join(repositoryRoot, "LICENSE"), "utf8"),
    readFile(join(repositoryRoot, "README.md"), "utf8"),
  ]);

  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Matt Pocock/);
  assert.match(readme, /https:\/\/github\.com\/mattpocock\/skills/);
  assert.match(readme, /git fetch upstream/);
  assert.match(readme, /scripts\/qs-skill-catalog\.mjs/);
});
