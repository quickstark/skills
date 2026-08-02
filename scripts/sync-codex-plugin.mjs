import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { formatSkillForCodex } from "./codex-skill-format.mjs";
import { V3_CORE_SKILLS, V3_SPECIALIST_SKILLS } from "./qs-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const check = process.argv.includes("--check");
const supportFiles = Object.freeze([
  "qs-readout-portfolio.mjs",
  "qs-skill-catalog.mjs",
  "qs-skill-report-presentation.mjs",
  "qs-skill-readout.mjs",
]);
const capabilityFiles = Object.freeze([
  "domain-modeling.md",
  "module-decomposition.md",
  "ticket-decomposition.md",
  "tdd-loop.md",
]);

const packages = Object.freeze([
  {
    name: "qs-skills",
    displayName: "QuickStark Skills",
    description: "QuickStark's twelve-command core engineering workflow.",
    projection: V3_CORE_SKILLS,
    codexRoot: join(repositoryRoot, "codex", "plugins", "qs-skills"),
    includeCapabilities: true,
  },
  {
    name: "qs-specialists",
    displayName: "QuickStark Specialists",
    description: "Optional QuickStark research, prototyping, documentation, testing, teaching, and skill-authoring workflows.",
    projection: V3_SPECIALIST_SKILLS,
    codexRoot: join(repositoryRoot, "codex", "plugins", "qs-specialists"),
    claudeRoot: join(repositoryRoot, "packages", "qs-specialists"),
    includeCapabilities: false,
  },
]);

if (check) await verifyAll();
else await syncAll();

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function fileList(root, current = root) {
  if (!(await exists(root))) return [];
  const files = [];

  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await fileList(root, path)));
    else if (entry.isFile()) files.push(relative(root, path));
    else throw new Error(`Generated plugins must contain regular files, not symlinks: ${path}`);
  }

  return files.sort();
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function codexManifest(pkg) {
  return {
    name: pkg.name,
    version: project.version,
    description: pkg.description,
    author: { name: "QuickStark", url: "https://github.com/quickstark" },
    homepage: "https://github.com/quickstark/skills",
    license: "MIT",
    keywords: ["quickstark", "engineering", pkg.name === "qs-skills" ? "workflow" : "specialists"],
    skills: "./skills/",
    interface: {
      displayName: pkg.displayName,
      shortDescription: pkg.description,
      longDescription: pkg.description,
      developerName: "QuickStark",
      category: "Coding",
      capabilities: ["Interactive", "Read", "Write"],
      websiteURL: "https://github.com/quickstark/skills",
      defaultPrompt: pkg.name === "qs-skills"
        ? ["Help me choose the right QuickStark workflow", "Build and review this scoped change"]
        : ["Use a focused QuickStark specialist workflow"],
    },
  };
}

function claudeManifest(pkg, generated = false) {
  return {
    name: pkg.name,
    version: project.version,
    description: pkg.description,
    author: { name: "QuickStark", url: "https://github.com/quickstark" },
    homepage: "https://github.com/quickstark/skills",
    repository: "https://github.com/quickstark/skills",
    license: "MIT",
    keywords: ["quickstark", "engineering", pkg.name === "qs-skills" ? "workflow" : "specialists"],
    skills: pkg.projection.map((skill) => generated
      ? `./skills/${skill.name}`
      : `./skills/${skill.bucket}/${skill.name}`),
  };
}

function marketplace() {
  return {
    name: "quickstark",
    owner: { name: "QuickStark", url: "https://github.com/quickstark" },
    description: "QuickStark's focused, namespaced engineering and productivity skills.",
    plugins: packages.map((pkg) => ({
      name: pkg.name,
      source: pkg.name === "qs-skills" ? "./" : "./packages/qs-specialists",
      description: pkg.description,
      category: "engineering",
      keywords: ["quickstark", "engineering", pkg.name === "qs-skills" ? "workflow" : "specialists"],
    })),
  };
}

function codexMarketplace() {
  return {
    name: "quickstark",
    interface: { displayName: "QuickStark Skills" },
    plugins: packages.map((pkg) => ({
      name: pkg.name,
      source: { source: "local", path: `./plugins/${pkg.name}` },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Coding",
    })),
  };
}

async function writeProjection(pkg, root, { codex }) {
  const skillsRoot = join(root, "skills");
  const scriptsRoot = join(root, "scripts");
  await rm(skillsRoot, { recursive: true, force: true });
  await rm(scriptsRoot, { recursive: true, force: true });
  await mkdir(skillsRoot, { recursive: true });
  await mkdir(scriptsRoot, { recursive: true });

  for (const file of supportFiles) {
    await cp(join(repositoryRoot, "scripts", file), join(scriptsRoot, file));
  }

  for (const skill of pkg.projection) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const destination = join(skillsRoot, skill.name);
    if (!(await exists(join(source, "SKILL.md")))) {
      throw new Error(`Cannot package missing promoted skill /${skill.name}.`);
    }
    await cp(source, destination, { recursive: true, dereference: true });
    if (codex && skill.userInvoked) {
      const path = join(destination, "SKILL.md");
      await writeFile(path, formatSkillForCodex(await readFile(path, "utf8"), skill));
    }
  }

  const capabilityRoot = join(root, "capabilities");
  await rm(capabilityRoot, { recursive: true, force: true });
  if (pkg.includeCapabilities) {
    await mkdir(capabilityRoot, { recursive: true });
    for (const file of capabilityFiles) {
      await cp(join(repositoryRoot, "skills", "internal", file), join(capabilityRoot, file));
    }
  }
}

async function syncAll() {
  for (const pkg of packages) {
    await writeProjection(pkg, pkg.codexRoot, { codex: true });
    await mkdir(join(pkg.codexRoot, ".codex-plugin"), { recursive: true });
    await writeFile(join(pkg.codexRoot, ".codex-plugin", "plugin.json"), json(codexManifest(pkg)));
    if (pkg.claudeRoot) {
      await writeProjection(pkg, pkg.claudeRoot, { codex: false });
      await mkdir(join(pkg.claudeRoot, ".claude-plugin"), { recursive: true });
      await writeFile(join(pkg.claudeRoot, ".claude-plugin", "plugin.json"), json(claudeManifest(pkg, true)));
    }
  }

  await writeFile(join(repositoryRoot, ".claude-plugin", "plugin.json"), json(claudeManifest(packages[0])));
  await writeFile(join(repositoryRoot, ".claude-plugin", "marketplace.json"), json(marketplace()));
  await writeFile(join(repositoryRoot, "codex", ".agents", "plugins", "marketplace.json"), json(codexMarketplace()));
  console.log("Generated isolated QuickStark v3 core and specialist package projections.");
}

async function expectedSkillFiles(pkg, { codex }) {
  const expected = [];
  for (const skill of pkg.projection) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    for (const file of await fileList(source)) expected.push(`${skill.name}/${file}`);
  }
  return expected.sort();
}

async function verifyProjection(pkg, root, { codex }) {
  const actualSkillFiles = await fileList(join(root, "skills"));
  const expected = await expectedSkillFiles(pkg, { codex });
  if (JSON.stringify(actualSkillFiles) !== JSON.stringify(expected)) {
    throw new Error(`${pkg.name} has missing, extra, or stale projected skill files.`);
  }

  for (const skill of pkg.projection) {
    const sourceRoot = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const targetRoot = join(root, "skills", skill.name);
    for (const file of await fileList(sourceRoot)) {
      const source = await readFile(join(sourceRoot, file));
      const expectedContent = codex && file === "SKILL.md"
        ? Buffer.from(formatSkillForCodex(source.toString("utf8"), skill))
        : source;
      const actual = await readFile(join(targetRoot, file));
      if (!expectedContent.equals(actual)) throw new Error(`${pkg.name} is stale: ${skill.name}/${file}.`);
    }
  }

  if (JSON.stringify(await fileList(join(root, "scripts"))) !== JSON.stringify([...supportFiles].sort())) {
    throw new Error(`${pkg.name} does not contain exactly the shared runtime support.`);
  }
  for (const file of supportFiles) {
    const [source, actual] = await Promise.all([
      readFile(join(repositoryRoot, "scripts", file)),
      readFile(join(root, "scripts", file)),
    ]);
    if (!source.equals(actual)) throw new Error(`${pkg.name} has stale runtime support: ${file}.`);
  }

  const capabilityInventory = await fileList(join(root, "capabilities"));
  const expectedCapabilities = pkg.includeCapabilities ? [...capabilityFiles].sort() : [];
  if (JSON.stringify(capabilityInventory) !== JSON.stringify(expectedCapabilities)) {
    throw new Error(`${pkg.name} has an invalid internal-capability projection.`);
  }
}

async function verifyJson(path, expected, label) {
  const actual = JSON.parse(await readFile(path, "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} is stale.`);
}

async function verifyAll() {
  for (const pkg of packages) {
    await verifyProjection(pkg, pkg.codexRoot, { codex: true });
    await verifyJson(join(pkg.codexRoot, ".codex-plugin", "plugin.json"), codexManifest(pkg), `${pkg.name} Codex manifest`);
    if (pkg.claudeRoot) {
      await verifyProjection(pkg, pkg.claudeRoot, { codex: false });
      await verifyJson(join(pkg.claudeRoot, ".claude-plugin", "plugin.json"), claudeManifest(pkg, true), `${pkg.name} Claude manifest`);
    }
  }
  await verifyJson(join(repositoryRoot, ".claude-plugin", "plugin.json"), claudeManifest(packages[0]), "core Claude manifest");
  await verifyJson(join(repositoryRoot, ".claude-plugin", "marketplace.json"), marketplace(), "Claude marketplace");
  await verifyJson(join(repositoryRoot, "codex", ".agents", "plugins", "marketplace.json"), codexMarketplace(), "Codex marketplace");
  console.log("Verified deterministic QuickStark v3 core and specialist package projections.");
}
