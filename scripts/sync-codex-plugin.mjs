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
import { PS_INTERNAL_CAPABILITIES } from "./ps-skill-catalog.mjs";
import { assertGeneratedPackageRoot } from "./skill-package-projection.mjs";
import { PUBLIC_COMMANDS } from "./skill-collection-registry.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const supportFiles = Object.freeze([
  "qs-readout-portfolio.mjs",
  "ps-skill-catalog.mjs",
  "qs-skill-catalog.mjs",
  "qs-skill-report-presentation.mjs",
  "qs-skill-readout.mjs",
  "skill-collection-registry.mjs",
]);
const qsCapabilityFiles = Object.freeze([
  "domain-modeling.md",
  "module-decomposition.md",
  "ticket-decomposition.md",
  "tdd-loop.md",
]);
const psCapabilityFiles = Object.freeze(PS_INTERNAL_CAPABILITIES.map((capability) => `${capability.name}.md`));

function commandsFor(collectionId) {
  return PUBLIC_COMMANDS.filter((command) => command.collectionId === collectionId);
}

const packages = Object.freeze([
  {
    name: "qs-skills",
    displayName: "QuickStark Skills",
    description: "QuickStark's twelve-command core engineering workflow.",
    projection: commandsFor("qs-skills"),
    codexRoot: join(repositoryRoot, "codex", "plugins", "qs-skills"),
    capabilitySourceRoot: join(repositoryRoot, "skills", "internal"),
    capabilityFiles: qsCapabilityFiles,
    claudeMarketplaceSource: "./",
    defaultPrompt: ["Help me choose the right QuickStark workflow", "Build and review this scoped change"],
    keywords: ["quickstark", "engineering", "workflow"],
  },
  {
    name: "qs-specialists",
    displayName: "QuickStark Specialists",
    description: "Optional QuickStark research, prototyping, documentation, testing, teaching, and skill-authoring workflows.",
    projection: commandsFor("qs-specialists"),
    codexRoot: join(repositoryRoot, "codex", "plugins", "qs-specialists"),
    claudeRoot: join(repositoryRoot, "packages", "qs-specialists"),
    capabilityFiles: [],
    claudeMarketplaceSource: "./packages/qs-specialists",
    defaultPrompt: ["Use a focused QuickStark specialist workflow"],
    keywords: ["quickstark", "engineering", "specialists"],
  },
  {
    name: "ps-skills",
    displayName: "Pstack Skills",
    description: "Optional Cursor-neutral Pstack analysis, verification, evaluation, optimization, and operations workflows.",
    projection: commandsFor("ps-skills"),
    codexRoot: join(repositoryRoot, "codex", "plugins", "ps-skills"),
    claudeRoot: join(repositoryRoot, "packages", "ps-skills"),
    capabilitySourceRoot: join(repositoryRoot, "skills", "pstack", "internal"),
    capabilityFiles: psCapabilityFiles,
    noticeFiles: ["THIRD_PARTY_NOTICES.md"],
    claudeMarketplaceSource: "./packages/ps-skills",
    defaultPrompt: ["Use an explicit Pstack workflow for evidence-based analysis or operations"],
    keywords: ["quickstark", "pstack", "engineering", "verification"],
  },
]);

const cliArguments = process.argv.slice(2);

if (cliArguments.includes("--check")) await verifyAll(parseCheckSelection(cliArguments));
else {
  if (cliArguments.length > 0) throw new Error(`Unknown projector option: ${cliArguments[0]}`);
  await syncAll();
}

function optionValue(arguments_, name) {
  const indexes = arguments_.flatMap((argument, index) => argument === name ? [index] : []);
  if (indexes.length > 1) throw new Error(`Projector option ${name} may appear only once.`);
  if (indexes.length === 0) return undefined;
  const value = arguments_[indexes[0] + 1];
  if (!value || value.startsWith("--")) throw new Error(`Projector option ${name} requires a value.`);
  return value;
}

function parseCheckSelection(arguments_) {
  const allowed = new Set(["--check", "--package", "--root", "--format"]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!allowed.has(argument)) throw new Error(`Unknown projector option: ${argument}`);
    if (argument !== "--check") index += 1;
  }

  const packageName = optionValue(arguments_, "--package");
  const root = optionValue(arguments_, "--root");
  const format = optionValue(arguments_, "--format");
  if ([packageName, root, format].some((value) => value !== undefined)
    && [packageName, root, format].some((value) => value === undefined)) {
    throw new Error("A selected projector check requires --package, --root, and --format together.");
  }
  if (format !== undefined && format !== "claude" && format !== "codex") {
    throw new Error("Projector format must be claude or codex.");
  }
  return packageName === undefined ? null : { packageName, root: resolve(root), format };
}

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
    keywords: pkg.keywords,
    skills: "./skills/",
    interface: {
      displayName: pkg.displayName,
      shortDescription: pkg.description,
      longDescription: pkg.description,
      developerName: "QuickStark",
      category: "Coding",
      capabilities: ["Interactive", "Read", "Write"],
      websiteURL: "https://github.com/quickstark/skills",
      defaultPrompt: pkg.defaultPrompt,
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
    keywords: pkg.keywords,
    skills: pkg.projection.map((skill) => generated
      ? `./skills/${skill.name}`
      : `./${skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`}`),
  };
}

function marketplace() {
  return {
    name: "quickstark",
    owner: { name: "QuickStark", url: "https://github.com/quickstark" },
    description: "QuickStark's focused, namespaced engineering and productivity skills.",
    plugins: packages.map((pkg) => ({
      name: pkg.name,
      source: pkg.claudeMarketplaceSource,
      description: pkg.description,
      category: "engineering",
      keywords: pkg.keywords,
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
    const source = join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
    const destination = join(skillsRoot, skill.name);
    if (!(await exists(join(source, "SKILL.md")))) {
      throw new Error(`Cannot package missing promoted skill /${skill.name}.`);
    }
    await cp(source, destination, { recursive: true, dereference: true });
    if (codex && (skill.userInvoked || skill.disableModelInvocation)) {
      const path = join(destination, "SKILL.md");
      await writeFile(path, formatSkillForCodex(await readFile(path, "utf8"), skill));
    }
  }

  const capabilityRoot = join(root, "capabilities");
  await rm(capabilityRoot, { recursive: true, force: true });
  if (pkg.capabilityFiles.length > 0) {
    await mkdir(capabilityRoot, { recursive: true });
    for (const file of pkg.capabilityFiles) {
      await cp(join(pkg.capabilitySourceRoot, file), join(capabilityRoot, file));
    }
  }

  for (const file of pkg.noticeFiles ?? []) {
    await cp(join(repositoryRoot, file), join(root, file));
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
  console.log("Generated isolated QuickStark v3 core, specialist, and PS package projections.");
}

async function expectedSkillFiles(pkg, { codex }) {
  const expected = [];
  for (const skill of pkg.projection) {
    const source = join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
    for (const file of await fileList(source)) expected.push(`${skill.name}/${file}`);
  }
  return expected.sort();
}

async function verifyProjection(pkg, root, { codex }) {
  await assertGeneratedPackageRoot(root, {
    manifestDirectory: codex ? ".codex-plugin" : ".claude-plugin",
    includeCapabilities: pkg.capabilityFiles.length > 0,
    noticeFiles: pkg.noticeFiles ?? [],
  });
  const actualSkillFiles = await fileList(join(root, "skills"));
  const expected = await expectedSkillFiles(pkg, { codex });
  if (JSON.stringify(actualSkillFiles) !== JSON.stringify(expected)) {
    throw new Error(`${pkg.name} has missing, extra, or stale projected skill files.`);
  }

  for (const skill of pkg.projection) {
    const sourceRoot = join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
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
  const expectedCapabilities = [...pkg.capabilityFiles].sort();
  if (JSON.stringify(capabilityInventory) !== JSON.stringify(expectedCapabilities)) {
    throw new Error(`${pkg.name} has an invalid internal-capability projection.`);
  }
  for (const file of pkg.noticeFiles ?? []) {
    const [source, actual] = await Promise.all([
      readFile(join(repositoryRoot, file)),
      readFile(join(root, file)),
    ]);
    if (!source.equals(actual)) throw new Error(`${pkg.name} has a stale notice: ${file}.`);
  }
}

async function verifyJson(path, expected, label) {
  const actual = JSON.parse(await readFile(path, "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} is stale.`);
}

async function verifyAll(selection = null) {
  if (selection) {
    const pkg = packages.find((candidate) => candidate.name === selection.packageName);
    if (!pkg) throw new Error(`Unknown generated package: ${selection.packageName}.`);
    const codex = selection.format === "codex";
    await verifyProjection(pkg, selection.root, { codex });
    await verifyJson(
      join(selection.root, codex ? ".codex-plugin" : ".claude-plugin", "plugin.json"),
      codex ? codexManifest(pkg) : claudeManifest(pkg, true),
      `${pkg.name} ${codex ? "Codex" : "Claude"} manifest`,
    );
    console.log(`Verified deterministic ${pkg.name} ${selection.format} package projection.`);
    return;
  }
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
  console.log("Verified deterministic QuickStark v3 core, specialist, and PS package projections.");
}
