import {
  cp,
  mkdir,
  lstat,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { formatMetadataForCodex, formatSkillForCodex } from "./codex-skill-format.mjs";
import { PS_INTERNAL_CAPABILITIES } from "./ps-skill-catalog.mjs";
import { assertGeneratedPackageRoot, assertGeneratedPiPackageRoot } from "./skill-package-projection.mjs";
import { PUBLIC_COMMANDS, TARGET_PUBLIC_COMMANDS, TARGET_PUBLIC_COMMANDS_BY_NAME, REGISTRY_STATE } from "./skill-collection-registry.mjs";
import { renderSkillOutputContract, renderHelpRoutingReference } from "./sync-skill-output-contracts.mjs";
import { copyTransitionPayloads, verifyTransitionPayloads } from "./skill-transition-packages.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const supportFiles = Object.freeze([
  "ps-skill-catalog.mjs",
  "qs-skill-catalog.mjs",
  "skill-collection-registry.mjs",
  "advanced-skill-catalog.mjs",
  "frontend-skill-catalog.mjs",
  "video-skill-catalog.mjs",
  "execution-skill-catalog.mjs",
  "optional-command-definition.mjs",
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

const legacyPackages = Object.freeze([
  {
    name: "qs-skills",
    displayName: "QuickStark Skills",
    description: "QuickStark's twelve-command core engineering workflow.",
    projection: commandsFor("qs-skills"),
    codexRoot: join(repositoryRoot, "codex", "plugins", "qs-skills"),
    piRoot: join(repositoryRoot, "pi", "packages", "qs-skills"),
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
    piRoot: join(repositoryRoot, "pi", "packages", "qs-specialists"),
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
    piRoot: join(repositoryRoot, "pi", "packages", "ps-skills"),
    claudeRoot: join(repositoryRoot, "packages", "ps-skills"),
    capabilitySourceRoot: join(repositoryRoot, "skills", "pstack", "internal"),
    capabilityFiles: psCapabilityFiles,
    noticeFiles: ["THIRD_PARTY_NOTICES.md"],
    claudeMarketplaceSource: "./packages/ps-skills",
    defaultPrompt: ["Use an explicit Pstack workflow for evidence-based analysis or operations"],
    keywords: ["quickstark", "pstack", "engineering", "verification"],
  },
]);

const originalArguments = process.argv.slice(2);
const candidate = originalArguments.includes("--candidate");
if (originalArguments.filter((argument) => argument === "--candidate").length > 1) throw new Error("Duplicate --candidate option.");
const output = optionValue(originalArguments, "--output-root");
if (candidate !== Boolean(output)) throw new Error("Candidate projection requires --candidate and --output-root together.");
const outputRoot = candidate ? resolve(output) : repositoryRoot;
if (candidate) {
  const temporaryRoot = resolve(tmpdir());
  if (!outputRoot.startsWith(temporaryRoot + sep) || outputRoot === repositoryRoot || outputRoot.startsWith(repositoryRoot + sep) || /(?:^|[\\/])\.(?:agents|codex|claude)(?:[\\/]|$)/.test(outputRoot)) {
    throw new Error("Candidate output must be a fresh directory under the system temporary directory, outside source and discovery roots.");
  }
  let current = dirname(outputRoot);
  while (true) {
    const metadata = await lstat(current).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    if (metadata && (!metadata.isDirectory() || metadata.isSymbolicLink())) throw new Error("Candidate output has a linked/non-directory ancestor.");
    const parent = dirname(current); if (parent === current) break; current = parent;
  }
  if (!originalArguments.includes("--check") && await exists(outputRoot)) throw new Error("Candidate projection requires a new output directory; existing evidence is never overwritten.");
}
const cliArguments = originalArguments.filter((argument, index) => argument !== "--candidate" && argument !== "--output-root" && originalArguments[index - 1] !== "--output-root");
const optionalMetadata = [
  {name:"qs-advanced",displayName:"QuickStark Advanced",description:"Optional focused analysis, verification, evaluation and operations workflows.",
    privateTrees:[{source:"skills/advanced",target:"advanced",canonical:"../../advanced/"}],noticeSource:"skills/advanced/THIRD_PARTY_NOTICES.md"},
  {name:"qs-frontend",displayName:"QuickStark Frontend",description:"Optional frontend implementation, reference images and prompt construction.",
    privateTrees:[{source:"skills/frontend",target:"frontend",canonical:"../../frontend/"}],noticeSource:"skills/frontend/THIRD_PARTY_NOTICES.md"},
  {name:"qs-video",displayName:"QuickStark Video",description:"Optional scoped video creation, editing and rendering with private HyperFrames modules.",privateTrees:[]},
  {name:"qs-execution",displayName:"QuickStark Execution",description:"Optional substantial-work acceptance gates and completion discipline.",privateTrees:[]},
];
const targetRegistry = candidate || REGISTRY_STATE === "target";
const selectedPackages = targetRegistry ? [
  ...legacyPackages.filter((pkg) => pkg.name !== "ps-skills"),
  ...optionalMetadata.map((pkg)=>({...pkg,projection:TARGET_PUBLIC_COMMANDS.filter((command)=>command.collectionId===pkg.name),capabilityFiles:[],
    codexRoot:join(repositoryRoot,"codex/plugins",pkg.name),piRoot:join(repositoryRoot,"pi/packages",pkg.name),claudeRoot:join(repositoryRoot,"packages",pkg.name),
    defaultPrompt:[pkg.description],keywords:["quickstark","optional"],claudeMarketplaceSource:`./packages/${pkg.name}`,
    ...(pkg.noticeSource ? {noticeFiles:["THIRD_PARTY_NOTICES.md"]} : {})})),
] : legacyPackages;
const packages = Object.freeze(selectedPackages.map((pkg) => candidate ? {
  ...pkg,codexRoot:join(outputRoot,"codex/plugins",pkg.name),piRoot:join(outputRoot,"pi/packages",pkg.name),
  claudeRoot:join(outputRoot,"packages",pkg.name),claudeMarketplaceSource:`./packages/${pkg.name}`,
} : pkg));

if (cliArguments.includes("--check")) await verifyAll(parseCheckSelection(cliArguments));
else {
  if (cliArguments.length > 0) throw new Error(`Unknown projector option: ${cliArguments[0]}`);
  if (candidate) await mkdir(outputRoot);
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
  if (format !== undefined && !["claude", "codex", "pi"].includes(format)) {
    throw new Error("Projector format must be claude, codex, or pi.");
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
  const metadata = await lstat(current).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (!metadata && current === root) return [];
  if (!metadata?.isDirectory() || metadata.isSymbolicLink()) throw new Error(`Projection tree must be a real directory, not a symlink: ${current}`);
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

function piManifest(pkg) {
  return {
    name: pkg.name,
    version: project.version,
    private: true,
    description: pkg.description,
    author: { name: "QuickStark", url: "https://github.com/quickstark" },
    homepage: "https://github.com/quickstark/skills",
    license: "MIT",
    keywords: [...pkg.keywords, "pi-package"],
    pi: { skills: ["./skills"] },
  };
}

function marketplace() {
  return {
    name: "quickstark",
    owner: { name: "QuickStark", url: "https://github.com/quickstark" },
    description: "QuickStark's focused, namespaced engineering and productivity skills.",
    plugins: [...packages.map((pkg) => ({
      name: pkg.name,
      source: pkg.claudeMarketplaceSource,
      description: pkg.description,
      category: "engineering",
      keywords: pkg.keywords,
    })), ...(targetRegistry ? [{ name: "ps-skills", source: "./packages/ps-skills", description: "Legacy migration compatibility only. New installations use the QS catalog; retained for existing native consumers.", category: "engineering", keywords: ["quickstark", "legacy", "migration"] }] : [])],
  };
}

function codexMarketplace() {
  return {
    name: "quickstark",
    interface: { displayName: "QuickStark Skills" },
    plugins: [...packages.map((pkg) => ({
      name: pkg.name,
      source: { source: "local", path: `./plugins/${pkg.name}` },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Coding",
    })), ...(targetRegistry ? [{ name: "ps-skills", source: { source: "local", path: "./plugins/ps-skills" }, policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Coding" }] : [])],
  };
}

async function projectedSkillContent(pkg, skill, file, { codex }) {
  const source = await readFile(join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`, file));
  let content = source;
  if (file.endsWith(".md")) {
    let text = source.toString("utf8");
    if (candidate && file === "SKILL.md") {
      const marker = "## Completion report and next steps";
      if (!text.includes(marker)) throw new Error(`Missing completion contract: ${skill.name}`);
      text = text.slice(0, text.indexOf(marker)) + renderSkillOutputContract(skill, { commandsByName: TARGET_PUBLIC_COMMANDS_BY_NAME });
    }
    if (candidate && skill.name === "qs-help" && file === "ROUTING.md") text = renderHelpRoutingReference(TARGET_PUBLIC_COMMANDS);
    for (const tree of pkg.privateTrees ?? []) text = text.replaceAll(tree.canonical, `../../capabilities/${tree.target}/`);
    if (codex && file === "SKILL.md") text = formatSkillForCodex(text, skill);
    content = Buffer.from(text);
  } else if (codex && file === join("agents", "openai.yaml")) {
    content = Buffer.from(formatMetadataForCodex(source.toString("utf8"), skill));
  }
  return content;
}

function hasCapabilities(pkg) { return pkg.capabilityFiles.length > 0 || (pkg.privateTrees?.length ?? 0) > 0; }
function noticeSource(pkg, file) { return join(repositoryRoot, pkg.noticeSource ?? file); }
async function expectedCapabilities(pkg) {
  const files = pkg.capabilityFiles.map((file) => ({ target: file, source: join(pkg.capabilitySourceRoot, file) }));
  for (const tree of pkg.privateTrees ?? []) {
    const source = join(repositoryRoot, tree.source);
    const entries = await fileList(source);
    if (!entries.length) throw new Error(`Missing required private tree: ${tree.source}`);
    for (const file of entries) files.push({ target: `${tree.target}/${file}`, source: join(source, file) });
  }
  return files.sort((left, right) => left.target.localeCompare(right.target));
}
async function writeCapabilities(pkg, root) {
  const base = join(root, "capabilities");
  await rm(base, { recursive: true, force: true });
  for (const file of await expectedCapabilities(pkg)) {
    await mkdir(dirname(join(base, file.target)), { recursive: true });
    await cp(file.source, join(base, file.target));
  }
}
async function verifyCapabilities(pkg, root) {
  const files = await expectedCapabilities(pkg);
  const actual = await fileList(join(root, "capabilities"));
  if (JSON.stringify(actual) !== JSON.stringify(files.map((file) => file.target).sort())) throw new Error(`${pkg.name} has an invalid internal-capability projection.`);
  for (const file of files) {
    if (!(await readFile(file.source)).equals(await readFile(join(root, "capabilities", file.target)))) throw new Error(`${pkg.name} has stale private content: ${file.target}.`);
  }
}
async function writeSkill(pkg, root, skill, { codex }) {
  const source = join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
  if (!(await exists(join(source, "SKILL.md")))) throw new Error(`Cannot package missing promoted skill /${skill.name}.`);
  const files = await fileList(source); // Reject links before copying any source payload.
  const destination = join(root, "skills", skill.name);
  await cp(source, destination, { recursive: true, dereference: false });
  for (const file of files) await writeFile(join(destination, file), await projectedSkillContent(pkg, skill, file, { codex }));
}

async function supportContent(file) {
  const bytes = await readFile(join(repositoryRoot, "scripts", file));
  if (!candidate || file !== "skill-collection-registry.mjs") return bytes;
  const source = bytes.toString("utf8");
  const declaration = `export const REGISTRY_STATE = "${REGISTRY_STATE}";`;
  if (source.split(declaration).length !== 2) throw new Error("Registry projection selector must occur exactly once.");
  return Buffer.from(source.replace(declaration, 'export const REGISTRY_STATE = "target";'));
}

async function writeProjection(pkg, root, { codex }) {
  const skillsRoot = join(root, "skills");
  const scriptsRoot = join(root, "scripts");
  await rm(skillsRoot, { recursive: true, force: true });
  await rm(scriptsRoot, { recursive: true, force: true });
  await mkdir(skillsRoot, { recursive: true });
  await mkdir(scriptsRoot, { recursive: true });

  for (const file of supportFiles) {
    await writeFile(join(scriptsRoot, file), await supportContent(file));
  }

  for (const skill of pkg.projection) await writeSkill(pkg, root, skill, { codex });
  await writeCapabilities(pkg, root);

  for (const file of pkg.noticeFiles ?? []) {
    await cp(noticeSource(pkg, file), join(root, file));
  }
}

async function writePiProjection(pkg) {
  await rm(pkg.piRoot, { recursive: true, force: true });
  const skillsRoot = join(pkg.piRoot, "skills");
  await mkdir(skillsRoot, { recursive: true });
  for (const skill of pkg.projection) await writeSkill(pkg, pkg.piRoot, skill, { codex: false });
  if (targetRegistry) await writeCapabilities(pkg, pkg.piRoot);
  for (const file of pkg.noticeFiles ?? []) await cp(noticeSource(pkg, file), join(pkg.piRoot, file));
  await writeFile(join(pkg.piRoot, "package.json"), json(piManifest(pkg)));
}

function coreClaudeManifest() {
  if (!candidate) return claudeManifest(packages[0]);
  const manifest = claudeManifest(packages[0], true);
  return { ...manifest, skills: manifest.skills.map((path) => `./packages/qs-skills/${path.slice(2)}`) };
}

async function syncAll() {
  if (targetRegistry && !candidate) await verifyTransitionPayloads(repositoryRoot);
  await mkdir(join(outputRoot, ".claude-plugin"), { recursive: true });
  await mkdir(join(outputRoot, "codex", ".agents", "plugins"), { recursive: true });
  for (const pkg of packages) {
    await writeProjection(pkg, pkg.codexRoot, { codex: true });
    await mkdir(join(pkg.codexRoot, ".codex-plugin"), { recursive: true });
    await writeFile(join(pkg.codexRoot, ".codex-plugin", "plugin.json"), json(codexManifest(pkg)));
    if (pkg.claudeRoot) {
      await writeProjection(pkg, pkg.claudeRoot, { codex: false });
      await mkdir(join(pkg.claudeRoot, ".claude-plugin"), { recursive: true });
      await writeFile(join(pkg.claudeRoot, ".claude-plugin", "plugin.json"), json(claudeManifest(pkg, true)));
    }
    await writePiProjection(pkg);
  }

  if (targetRegistry && candidate) await copyTransitionPayloads(repositoryRoot, outputRoot);
  await writeFile(join(outputRoot, ".claude-plugin", "plugin.json"), json(coreClaudeManifest()));
  await writeFile(join(outputRoot, ".claude-plugin", "marketplace.json"), json(marketplace()));
  await writeFile(join(outputRoot, "codex", ".agents", "plugins", "marketplace.json"), json(codexMarketplace()));
  console.log(`Generated ${candidate ? "isolated candidate" : "active"} projections for ${packages.length} packages across Codex, Claude, and Pi.`);
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
    includeCapabilities: hasCapabilities(pkg),
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
      const expectedContent = await projectedSkillContent(pkg, skill, file, { codex });
      const actual = await readFile(join(targetRoot, file));
      if (!expectedContent.equals(actual)) throw new Error(`${pkg.name} is stale: ${skill.name}/${file}.`);
    }
  }

  if (JSON.stringify(await fileList(join(root, "scripts"))) !== JSON.stringify([...supportFiles].sort())) {
    throw new Error(`${pkg.name} does not contain exactly the shared runtime support.`);
  }
  for (const file of supportFiles) {
    const [source, actual] = await Promise.all([
      supportContent(file),
      readFile(join(root, "scripts", file)),
    ]);
    if (!source.equals(actual)) throw new Error(`${pkg.name} has stale runtime support: ${file}.`);
  }

  await verifyCapabilities(pkg, root);
  for (const file of pkg.noticeFiles ?? []) {
    const [source, actual] = await Promise.all([
      readFile(noticeSource(pkg, file)),
      readFile(join(root, file)),
    ]);
    if (!source.equals(actual)) throw new Error(`${pkg.name} has a stale notice: ${file}.`);
  }
}

async function verifyPiProjection(pkg, root) {
  await assertGeneratedPiPackageRoot(root, { noticeFiles: pkg.noticeFiles ?? [], includeCapabilities: targetRegistry && hasCapabilities(pkg) });
  const actualSkillFiles = await fileList(join(root, "skills"));
  const expected = await expectedSkillFiles(pkg, { codex: false });
  if (JSON.stringify(actualSkillFiles) !== JSON.stringify(expected)) {
    throw new Error(`${pkg.name} has missing, extra, or stale projected Pi skill files.`);
  }
  for (const skill of pkg.projection) {
    const sourceRoot = join(repositoryRoot, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
    const targetRoot = join(root, "skills", skill.name);
    for (const file of await fileList(sourceRoot)) {
      const [source, actual] = await Promise.all([
        projectedSkillContent(pkg, skill, file, { codex: false }),
        readFile(join(targetRoot, file)),
      ]);
      if (!source.equals(actual)) throw new Error(`${pkg.name} Pi projection is stale: ${skill.name}/${file}.`);
    }
  }
  if (targetRegistry) await verifyCapabilities(pkg, root);
  for (const file of pkg.noticeFiles ?? []) {
    const [source, actual] = await Promise.all([
      readFile(noticeSource(pkg, file)),
      readFile(join(root, file)),
    ]);
    if (!source.equals(actual)) throw new Error(`${pkg.name} has a stale Pi notice: ${file}.`);
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
    if (selection.format === "pi") {
      await verifyPiProjection(pkg, selection.root);
      await verifyJson(join(selection.root, "package.json"), piManifest(pkg), `${pkg.name} Pi manifest`);
    } else {
      const codex = selection.format === "codex";
      await verifyProjection(pkg, selection.root, { codex });
      await verifyJson(
        join(selection.root, codex ? ".codex-plugin" : ".claude-plugin", "plugin.json"),
        codex ? codexManifest(pkg) : claudeManifest(pkg, true),
        `${pkg.name} ${codex ? "Codex" : "Claude"} manifest`,
      );
    }
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
    await verifyPiProjection(pkg, pkg.piRoot);
    await verifyJson(join(pkg.piRoot, "package.json"), piManifest(pkg), `${pkg.name} Pi manifest`);
  }
  if (targetRegistry) await verifyTransitionPayloads(repositoryRoot, outputRoot);
  await verifyJson(join(outputRoot, ".claude-plugin", "plugin.json"), coreClaudeManifest(), "core Claude manifest");
  await verifyJson(join(outputRoot, ".claude-plugin", "marketplace.json"), marketplace(), "Claude marketplace");
  await verifyJson(join(outputRoot, "codex", ".agents", "plugins", "marketplace.json"), codexMarketplace(), "Codex marketplace");
  console.log(`Verified deterministic ${candidate ? "candidate" : "active"} projections for ${packages.length} packages across Codex, Claude, and Pi.`);
}
