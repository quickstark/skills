import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { link, lstat, mkdir, open, readFile, readdir, realpath, unlink, writeFile } from "node:fs/promises";
import { createServer as createPortProbe } from "node:net";
import { homedir, hostname, networkInterfaces, platform, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  COLLECTION_NAME,
  LEGACY_NEXT_SKILLS_BY_NAME,
  MODEL_GUIDANCE_BY_NAME,
  READOUT_PROFILES_BY_NAME as LEGACY_READOUT_PROFILES_BY_NAME,
  READOUT_SKILLS_BY_NAME,
} from "./qs-skill-catalog.mjs";
import {
  PUBLIC_COMMANDS,
  PUBLIC_COMMANDS_BY_NAME,
  SKILL_COLLECTIONS_BY_ID,
  codexPublicSkillLiteral,
} from "./skill-collection-registry.mjs";
import {
  REPORT_PRESENTATION_STYLES,
  decodeReadoutPreferences,
  loadReadoutPreferenceSecret,
  normalizeReadoutPreferences,
  observeGitHubProject,
  renderReadoutActionableCode,
  renderReadoutGitHubIssues,
  renderReadoutNextPrompts,
  renderReadoutProjectMetadata,
  renderReadoutRunMetrics,
  renderReadoutSignalSummary,
} from "./qs-skill-report-presentation.mjs";
import {
  READOUT_PORTFOLIO_STYLES,
  buildReadoutPortfolioSnapshot,
  readReadoutPortfolioInventory,
  renderReadoutPortfolio,
} from "./qs-readout-portfolio.mjs";

export const DEFAULT_READOUT_DIRECTORY = join(tmpdir(), "quickstark-readouts");
export const DEFAULT_READOUT_HOST = "127.0.0.1";
export const DEFAULT_READOUT_PORT = 4173;
export const DEFAULT_READOUT_INGESTION_PORT = 4174;
export const DEFAULT_READOUT_INGESTION_URL = "https://reports.quickstark.com/api/v1/readouts";
export const READOUT_INGESTION_PATH = "/api/v1/readouts";
export const READOUT_VIEWER_STATE = ".quickstark-readout-viewer.json";
export const READOUT_FORMAT_VERSION = 1;

const statuses = new Set(["Completed", "Awaiting input", "Blocked", "Failed", "Preview"]);
const effortModes = new Set(["quick", "standard", "deep"]);
const reportModes = new Set(["brief", "full"]);
const completionStates = new Set([
  "complete",
  "continuation-required",
  "input-required",
  "failed",
  "preview",
]);
const observationSources = new Set([
  "provider-response",
  "codex-opentelemetry",
  "verified-harness",
  "user-reported",
]);
const observationScopes = new Set(["skill-run", "thread-turn", "thread-cumulative"]);
const observationQualitySources = new Set([
  "observed-checks",
  "user-feedback",
  "review-rubric",
  "human-calibrated-evaluation",
]);
const observationFeedback = new Set(["accepted", "needs-revision", "rejected"]);
const observationReasoningEfforts = new Set([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
]);
const suggestedThinkingLevels = new Set([
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
]);
const observationTokenFields = new Set([
  "input",
  "cachedInput",
  "cacheWrite",
  "output",
  "reasoningOutput",
  "total",
]);
const checkStatuses = new Set(["passed", "failed", "skipped", "info"]);
const reviewAxes = new Set(["standards", "specification"]);
const findingPriorities = new Set(["P0", "P1", "P2", "P3"]);
const pullRequestStates = new Set(["open", "merged", "closed"]);
const deploymentStatuses = new Set(["verified", "deployed", "failed", "pending"]);
const fileChangeTypes = new Set(["added", "modified", "deleted", "renamed"]);
const reportFilename = /^(?:qs|ps)-[a-z0-9-]+--\d{4}-\d{2}-\d{2}T[\d-]+Z--(?:[a-f0-9]{8}|[a-z0-9][a-z0-9._-]{0,95}--[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.html$/i;
const viewerToken = /^[a-f0-9]{48}$/;
const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);
const accessModes = new Set(["auto", "local", "lan", "ssh"]);
const readoutLayouts = new Set(["flat", "project"]);
const projectSources = new Set(["git-origin", "git-root", "workspace", "explicit"]);
const projectSegment = /^[a-z0-9._-]+$/i;
const reportIdentifier = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ingestionIdentifier = /^[a-z0-9][a-z0-9._-]{0,95}$/i;
const externalSkillIdentifier = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const ingestionCollection = /^[a-z0-9][a-z0-9._/-]{0,127}$/i;
const observedUtcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const ingestionMaximumBytes = 256 * 1024;
const execFileAsync = promisify(execFile);
const observedGitContexts = new Map();

function nativeCollectionIdentifier(skill) {
  return `quickstark/${skill.collectionId}`;
}

function nativeCollectionDisplayName(skill) {
  return SKILL_COLLECTIONS_BY_ID.get(skill.collectionId)?.displayName ?? COLLECTION_NAME;
}

function readoutProfileForSkill(skill) {
  return skill?.readoutProfile ?? LEGACY_READOUT_PROFILES_BY_NAME[skill?.name] ?? null;
}

async function resolveMacosReadoutKeychain(environment, profileHome, { includeLegacy = true } = {}) {
  if (
    typeof environment.USER !== "string"
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(environment.USER)
  ) {
    return null;
  }

  const services = [...new Set([
    `quickstark-readout-producer-token-${basename(profileHome)}`,
    ...(includeLegacy ? ["quickstark-readout-producer-token"] : []),
  ])];

  for (const service of services) {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password", "-a", environment.USER, "-s", service, "-w",
      ], { maxBuffer: 1024, timeout: 2_000 });
      const value = stdout.trim();

      if (!/^[A-Za-z0-9_-]{24,512}$/.test(value)) {
        throw new Error("The macOS Keychain reporting credential has an invalid format.");
      }

      return value;
    } catch (error) {
      if (/Keychain reporting credential/i.test(error.message ?? "")) throw error;
    }
  }

  return null;
}

export async function resolveReadoutProducerToken({
  environment = process.env,
  home = homedir(),
  operatingSystem = platform(),
} = {}) {
  const explicit = environment.QS_READOUT_PRODUCER_TOKEN;
  let explicitToken = null;

  if (explicit !== undefined && explicit !== null && explicit !== "") {
    if (typeof explicit !== "string" || !/^[A-Za-z0-9_-]{24,512}$/.test(explicit.trim())) {
      throw new Error("The configured reporting credential must be a valid private producer token.");
    }

    explicitToken = explicit.trim();

    if (operatingSystem !== "darwin") return explicitToken;
  }

  const userHome = resolve(home);
  const configuredProfile = environment.CODEX_HOME;
  let profileHome = join(userHome, ".codex");

  if (configuredProfile !== undefined && configuredProfile !== null && configuredProfile !== "") {
    if (typeof configuredProfile !== "string" || !isAbsolute(configuredProfile)) {
      throw new Error("The Codex profile must be a safe absolute directory in the current user home.");
    }

    profileHome = resolve(configuredProfile);

    if (profileHome === userHome || !profileHome.startsWith(`${userHome}${sep}`)) {
      throw new Error("The Codex profile must be a safe absolute directory in the current user home.");
    }
  }

  const currentUser = typeof process.getuid === "function" ? process.getuid() : null;
  const relativeProfileDirectory = relative(userHome, join(profileHome, "quickstark"));
  let profileAncestor = userHome;

  for (const segment of relativeProfileDirectory.split(sep).filter(Boolean)) {
    profileAncestor = join(profileAncestor, segment);

    let inspected;

    try {
      inspected = await lstat(profileAncestor);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw new Error("The private reporting credential directory could not be safely inspected.");
    }

    if (
      !inspected.isDirectory()
      || inspected.isSymbolicLink()
      || (currentUser !== null && inspected.uid !== currentUser)
    ) {
      throw new Error("The private reporting credential directory cannot contain a symbolic link or leave the current user home.");
    }
  }

  const candidates = [...new Set([
    join(profileHome, "quickstark", "producer.token"),
    ...(operatingSystem === "win32"
      ? [join(userHome, ".quickstark", "producer.token")]
      : []),
    join(userHome, ".config", "quickstark", "producer.token"),
  ])];
  for (const [index, candidate] of candidates.entries()) {
    if (index > 0 && operatingSystem === "darwin") {
      const profileKeychainToken = await resolveMacosReadoutKeychain(
        environment,
        profileHome,
        { includeLegacy: false },
      );

      if (profileKeychainToken) return profileKeychainToken;
      if (explicitToken) return explicitToken;
    }

    let metadata;

    try {
      metadata = await lstat(candidate);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
      throw new Error("The private reporting credential could not be safely inspected.");
    }

    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || metadata.size < 24
      || metadata.size > 513
      || (operatingSystem !== "win32" && (metadata.mode & 0o077) !== 0)
      || (currentUser !== null && metadata.uid !== currentUser)
    ) {
      throw new Error("The private reporting credential must be an owner-only regular file.");
    }

    const relativeParent = relative(userHome, dirname(candidate));

    if (
      relativeParent === ".."
      || relativeParent.startsWith(`..${sep}`)
      || isAbsolute(relativeParent)
    ) {
      throw new Error("The private reporting credential must remain inside the current user home.");
    }

    const ancestors = [];
    let ancestor = userHome;
    let missingAncestor = false;

    for (const segment of relativeParent.split(sep).filter(Boolean)) {
      ancestor = join(ancestor, segment);

      let inspected;

      try {
        inspected = await lstat(ancestor);
      } catch (error) {
        if (error.code === "ENOENT") {
          missingAncestor = true;
          break;
        }

        throw new Error("The private reporting credential directory could not be safely inspected.");
      }

      if (
        !inspected.isDirectory()
        || inspected.isSymbolicLink()
        || (operatingSystem !== "win32" && (inspected.mode & 0o022) !== 0)
        || (currentUser !== null && inspected.uid !== currentUser)
      ) {
        throw new Error("The private reporting credential directory cannot contain a symbolic link or leave the current user home.");
      }

      ancestors.push({ path: ancestor, dev: inspected.dev, ino: inspected.ino });
    }

    if (missingAncestor) continue;
    let parent;

    try {
      parent = await lstat(dirname(candidate));
    } catch {
      throw new Error("The private reporting credential directory could not be safely inspected.");
    }

    if (
      !parent.isDirectory()
      || parent.isSymbolicLink()
      || (operatingSystem !== "win32" && (parent.mode & 0o022) !== 0)
      || (currentUser !== null && parent.uid !== currentUser)
    ) {
      throw new Error("The private reporting credential must remain inside a user-owned directory.");
    }

    let resolvedHome;
    let resolvedParent;

    try {
      [resolvedHome, resolvedParent] = await Promise.all([
        realpath(userHome),
        realpath(dirname(candidate)),
      ]);
    } catch {
      throw new Error("The private reporting credential directory could not be safely resolved.");
    }

    const resolvedRelative = relative(resolvedHome, resolvedParent);

    if (
      resolvedRelative === ".."
      || resolvedRelative.startsWith(`..${sep}`)
      || isAbsolute(resolvedRelative)
    ) {
      throw new Error("The private reporting credential must remain inside the current user home.");
    }

    let handle;

    try {
      handle = await open(candidate, "r");
      const opened = await handle.stat();

      if (
        !opened.isFile()
        || opened.dev !== metadata.dev
        || opened.ino !== metadata.ino
        || opened.size !== metadata.size
        || (operatingSystem !== "win32" && (opened.mode & 0o077) !== 0)
        || (currentUser !== null && opened.uid !== currentUser)
      ) {
        throw new Error("The private reporting credential changed during secure inspection.");
      }

      for (const inspected of ancestors) {
        const unchanged = await lstat(inspected.path);

        if (
          !unchanged.isDirectory()
          || unchanged.isSymbolicLink()
          || unchanged.dev !== inspected.dev
          || unchanged.ino !== inspected.ino
          || (operatingSystem !== "win32" && (unchanged.mode & 0o022) !== 0)
          || (currentUser !== null && unchanged.uid !== currentUser)
        ) {
          throw new Error("The private reporting credential directory changed during secure inspection.");
        }
      }

      const openedParent = await realpath(dirname(candidate));

      if (openedParent !== resolvedParent) {
        throw new Error("The private reporting credential directory changed during secure inspection.");
      }

      const value = (await handle.readFile({ encoding: "utf8" })).trim();

      if (!/^[A-Za-z0-9_-]{24,512}$/.test(value)) {
        throw new Error("The installed reporting credential contains an invalid producer token.");
      }

      return value;
    } catch (error) {
      if (/private reporting credential|installed reporting credential/i.test(error.message ?? "")) {
        throw error;
      }

      throw new Error("The private reporting credential could not be safely loaded.");
    } finally {
      if (handle) await handle.close();
    }
  }

  if (explicitToken) return explicitToken;

  return operatingSystem === "darwin"
    ? resolveMacosReadoutKeychain(environment, profileHome)
    : null;
}

export function normalizeReadoutProject(remote) {
  const value = requireText(remote, "Git origin");
  let host;
  let pathname;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    const rawPath = value.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]*(\/[^?#]*)/i)?.[1] ?? "";

    for (const segment of rawPath.split("/")) {
      let decoded;

      try {
        decoded = decodeURIComponent(segment);
      } catch {
        throw new Error("Git origin contains an unsafe repository path.");
      }

      if (decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
        throw new Error("Git origin contains an unsafe repository path.");
      }
    }

    let url;

    try {
      url = new URL(value);
    } catch {
      throw new Error("Git origin must be a valid SSH or HTTPS repository URL.");
    }

    if (!new Set(["https:", "http:", "ssh:"]).has(url.protocol)) {
      throw new Error("Git origin must use SSH, HTTP, or HTTPS.");
    }

    if (
      url.password
      || (url.protocol !== "ssh:" && url.username)
      || (url.protocol === "ssh:" && url.username && !projectSegment.test(url.username))
      || url.search
      || url.hash
    ) {
      throw new Error("Git origin must not contain credentials, query parameters, or fragments.");
    }

    host = url.hostname.toLowerCase();

    const defaultPort = url.protocol === "https:"
      ? "443"
      : url.protocol === "http:"
        ? "80"
        : "22";

    if (url.port && url.port !== defaultPort) host = `${host}~${url.port}`;

    pathname = url.pathname;
  } else {
    const match = value.match(/^(?:[a-z0-9._-]+@)?([a-z0-9.-]+):([^?\s#]+)$/i);

    if (!match) {
      throw new Error("Git origin must be a valid SSH or HTTPS repository URL.");
    }

    [, host, pathname] = match;
    host = host.toLowerCase();
  }

  const segments = pathname.replace(/\.git$/i, "").split("/").filter(Boolean);

  if (!/^[a-z0-9.-]+(?:~\d{1,5})?$/i.test(host) || segments.length < 2) {
    throw new Error("Git origin must identify a safe repository host, owner, and name.");
  }

  if (segments.some((segment) => !projectSegment.test(segment) || segment === "." || segment === "..")) {
    throw new Error("Git origin contains an unsafe repository path.");
  }

  const owner = segments.slice(0, -1).join("/");
  const repository = segments.at(-1);

  return {
    host,
    owner,
    repository,
    key: `${host}/${owner}/${repository}`,
    label: `${owner}/${repository}`,
    source: "git-origin",
  };
}

function normalizeProjectIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Project identity must be a JSON object.");
  }

  const host = requireText(value.host, "Project host").toLowerCase();
  const owner = requireText(value.owner, "Project owner");
  const repository = requireText(value.repository, "Project repository");
  const source = requireText(value.source, "Project identity source");

  if (
    !/^[a-z0-9.-]+(?:~\d{1,5})?$/i.test(host)
    || owner.split("/").some((segment) => !projectSegment.test(segment) || segment === "." || segment === "..")
    || !projectSegment.test(repository)
    || repository === "."
    || repository === ".."
    || !projectSources.has(source)
  ) {
    throw new Error("Project identity contains an unsafe host, owner, repository, or source.");
  }

  const key = `${host}/${owner}/${repository}`;

  if (value.key !== undefined && value.key !== key) {
    throw new Error("Project identity key must match its canonical host, owner, and repository.");
  }

  return {
    host,
    owner,
    repository,
    key,
    label: value.label === undefined
      ? `${owner}/${repository}`
      : requireText(value.label, "Project label"),
    source,
  };
}

function normalizeReadoutGitContext(value, project) {
  if (value === undefined || value === null) return null;

  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || !project
    || project.source !== "git-origin"
    || value.projectKey !== project.key
  ) {
    throw new Error("Observed Git context must belong to the actual authorized originating Git project.");
  }

  const allowed = new Set(["projectKey", "branch", "revision", "ahead", "behind", "dirtyCount"]);

  if (Object.keys(value).some((field) => !allowed.has(field))) {
    throw new Error("Observed Git context contains an unsupported field.");
  }

  if (
    typeof value.branch !== "string"
    || (value.branch !== "Detached HEAD"
      && !/^[a-z0-9][a-z0-9._/-]{0,199}$/i.test(value.branch))
  ) {
    throw new Error("Observed Git context requires a safe originating branch.");
  }

  if (
    value.revision !== null
    && (typeof value.revision !== "string"
      || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value.revision))
  ) {
    throw new Error("Observed Git context requires a complete safe originating revision.");
  }

  for (const field of ["ahead", "behind"]) {
    if (
      value[field] !== null
      && (!Number.isSafeInteger(value[field]) || value[field] < 0)
    ) {
      throw new Error(`Observed Git context requires a safe ${field} count.`);
    }
  }

  if (!Number.isSafeInteger(value.dirtyCount) || value.dirtyCount < 0) {
    throw new Error("Observed Git context requires a safe originating worktree count.");
  }

  return {
    branch: value.branch,
    revision: value.revision,
    ahead: value.ahead,
    behind: value.behind,
    dirtyCount: value.dirtyCount,
  };
}

function localProjectIdentity(root, source) {
  const fingerprint = createHash("sha256").update(root).digest("hex").slice(0, 12);
  const label = basename(root) || "workspace";
  const slug = label.replace(/[^a-z0-9._-]/gi, "-").replace(/^-+|-+$/g, "") || "workspace";

  return normalizeProjectIdentity({
    host: "local",
    owner: source,
    repository: `${slug}-${fingerprint}`,
    label: `${label} [${fingerprint}]`,
    source,
  });
}

export async function discoverReadoutProject(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  let remote;

  try {
    remote = (await execFileAsync("git", ["-C", cwd, "config", "--get", "remote.origin.url"], {
      timeout: 5_000,
      windowsHide: true,
    })).stdout.trim();
  } catch (error) {
    if (error.code !== 1 && error.code !== 128 && error.code !== "ENOENT") throw error;
  }

  if (remote) return normalizeReadoutProject(remote);

  try {
    const root = (await execFileAsync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      timeout: 5_000,
      windowsHide: true,
    })).stdout.trim();

    return localProjectIdentity(await realpath(root), "git-root");
  } catch (error) {
    if (error.code !== 128 && error.code !== "ENOENT") throw error;
  }

  return localProjectIdentity(await realpath(cwd), "workspace");
}

async function observeReadoutGitContext(project, options = {}) {
  if (!project || project.source !== "git-origin") return null;

  const cwd = resolve(options.cwd ?? process.cwd());
  const cacheKey = `${cwd}\0${project.key}`;
  const cached = observedGitContexts.get(cacheKey);

  if (cached && Date.now() - cached.capturedAt < 2_000) return cached.result;

  const result = (async () => {
    const current = await discoverReadoutProject({ cwd }).catch(() => null);

    if (current?.key !== project.key) return null;

    const observed = (arguments_) => execFileAsync("git", ["-C", cwd, ...arguments_], {
      timeout: 3_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }).then(({ stdout }) => stdout.trim()).catch(() => "");
    const [branch, revision, tracking, changes] = await Promise.all([
      observed(["symbolic-ref", "--quiet", "--short", "HEAD"]),
      observed(["rev-parse", "HEAD"]),
      observed(["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]),
      observed(["status", "--porcelain", "--untracked-files=normal"]),
    ]);
    const [behind, ahead] = tracking.split(/\s+/).map(Number);

    return {
      branch: /^[a-z0-9][a-z0-9._/-]{0,199}$/i.test(branch)
        ? branch
        : "Detached HEAD",
      revision: /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(revision)
        ? revision.toLowerCase()
        : null,
      behind: Number.isSafeInteger(behind) && behind >= 0 ? behind : null,
      ahead: Number.isSafeInteger(ahead) && ahead >= 0 ? ahead : null,
      dirtyCount: changes ? changes.split("\n").length : 0,
    };
  })().catch(() => null);

  observedGitContexts.set(cacheKey, { capturedAt: Date.now(), result });

  return result;
}

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
}

export function discoverHomeNetworkAddress(interfaces = networkInterfaces()) {
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (/^(?:lo|docker|br-|veth|virbr|tailscale|tun|tap|zt|cali)/i.test(name)) {
      continue;
    }

    for (const address of addresses ?? []) {
      if (
        (address.family !== "IPv4" && address.family !== 4)
        || address.internal
        || !isPrivateIpv4(address.address)
      ) {
        continue;
      }

      candidates.push({
        address: address.address,
        priority: /^(?:en|eth)/i.test(name) ? 0 : 1,
        name,
      });
    }
  }

  candidates.sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
  return candidates[0]?.address ?? null;
}

export function resolveReadoutViewerHost(options = {}) {
  if (options.host !== undefined) return requireText(options.host, "Readout host");

  const access = options.access ?? process.env.QS_READOUT_ACCESS ?? "auto";

  if (!accessModes.has(access)) {
    throw new Error("Readout access must be auto, local, lan, or ssh.");
  }

  if (access === "local" || access === "ssh") return DEFAULT_READOUT_HOST;

  const interfaces = options.interfaces ?? networkInterfaces();
  const homeAddress = discoverHomeNetworkAddress(interfaces);

  if (access === "lan") {
    if (!homeAddress) throw new Error("No trusted private home-network address is available.");
    return homeAddress;
  }

  const runtimePlatform = options.runtimePlatform ?? platform();
  const environment = options.environment ?? process.env;
  const remoteLinux = runtimePlatform === "linux" && (
    Boolean(environment.SSH_CONNECTION || environment.SSH_CLIENT || environment.SSH_TTY)
    || !Boolean(environment.DISPLAY || environment.WAYLAND_DISPLAY)
  );

  return remoteLinux && homeAddress ? homeAddress : DEFAULT_READOUT_HOST;
}

const themes = Object.freeze({
  help: { accent: "#2563eb", soft: "#dbeafe", label: "Guidance" },
  setup: { accent: "#0891b2", soft: "#cffafe", label: "Setup" },
  plan: { accent: "#2563eb", soft: "#dbeafe", label: "Planning" },
  design: { accent: "#7c3aed", soft: "#ede9fe", label: "Design" },
  code: { accent: "#059669", soft: "#d1fae5", label: "Implementation" },
  test: { accent: "#0d9488", soft: "#ccfbf1", label: "Testing" },
  review: { accent: "#d97706", soft: "#fef3c7", label: "Review" },
  deploy: { accent: "#ea580c", soft: "#ffedd5", label: "Release" },
  git: { accent: "#db2777", soft: "#fce7f3", label: "Git" },
  flow: { accent: "#4f46e5", soft: "#e0e7ff", label: "Workflow" },
  learn: { accent: "#0284c7", soft: "#e0f2fe", label: "Learning" },
  skill: { accent: "#9333ea", soft: "#f3e8ff", label: "Skill authoring" },
});

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeGithubUrl(value, label, expectedSegments, projectIdentity, repositories) {
  let candidate;

  try {
    candidate = new URL(requireText(value, label));
  } catch {
    throw new Error(`${label} must be a valid HTTPS GitHub URL.`);
  }

  if (candidate.protocol !== "https:" || candidate.hostname !== "github.com" || candidate.port) {
    throw new Error(`${label} must be a valid HTTPS GitHub URL.`);
  }

  if (candidate.username || candidate.password) {
    throw new Error(`${label} must not contain credentials.`);
  }

  if (candidate.search || candidate.hash) {
    throw new Error(`${label} must not contain query parameters or fragments.`);
  }

  const segments = candidate.pathname.split("/").filter(Boolean);

  if (
    segments.length !== expectedSegments.length + 2
    || !projectSegment.test(segments[0])
    || !projectSegment.test(segments[1])
    || expectedSegments.some((segment, index) => segment !== segments[index + 2])
  ) {
    throw new Error(`${label} does not match the expected GitHub record.`);
  }

  const repository = `github.com/${segments[0]}/${segments[1]}`;

  if (
    (projectIdentity && (projectIdentity.host !== "github.com" || projectIdentity.key !== repository))
    || (repositories.size > 0 && !repositories.has(repository))
  ) {
    throw new Error(`${label} must belong to the verified project.`);
  }

  repositories.add(repository);

  return candidate.href;
}

function normalizeGithubNumber(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive GitHub record number.`);
  }

  return value;
}

function normalizeDeliveryProvenance(value, projectIdentity) {
  if (value === undefined || value === null) return null;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Delivery provenance must be a verified GitHub evidence object.");
  }

  const repositories = new Set();

  if (value.pullRequests !== undefined && !Array.isArray(value.pullRequests)) {
    throw new Error("Delivery pull requests must be an array.");
  }

  const pullRequests = (value.pullRequests ?? []).map((item, index) => {
    const label = `provenance.pullRequests[${index}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label} must be a verified pull request.`);
    }

    const number = normalizeGithubNumber(item.number, `${label}.number`);
    const url = normalizeGithubUrl(
      item.url,
      `${label} pull request number ${number}`,
      ["pull", String(number)],
      projectIdentity,
      repositories,
    );

    if (item.state !== undefined && !pullRequestStates.has(item.state)) {
      throw new Error(`${label}.state must be open, merged, or closed.`);
    }

    return {
      number,
      ...(item.title === undefined ? {} : { title: requireText(item.title, `${label}.title`) }),
      ...(item.state === undefined ? {} : { state: item.state }),
      url,
    };
  });

  if (value.closedIssues !== undefined && !Array.isArray(value.closedIssues)) {
    throw new Error("Closed GitHub issues must be an array.");
  }

  const closedIssues = (value.closedIssues ?? []).map((item, index) => {
    const label = `provenance.closedIssues[${index}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label} must be an actually closed GitHub issue.`);
    }

    if (item.state !== "closed") {
      throw new Error(`${label} must identify an actually closed GitHub issue.`);
    }

    if (item.closedByRelease !== undefined && typeof item.closedByRelease !== "boolean") {
      throw new Error(`${label}.closedByRelease must be an explicitly verified boolean.`);
    }

    const number = normalizeGithubNumber(item.number, `${label}.number`);

    return {
      number,
      ...(item.title === undefined ? {} : { title: requireText(item.title, `${label}.title`) }),
      state: "closed",
      closedByRelease: item.closedByRelease === true,
      url: normalizeGithubUrl(
        item.url,
        `${label} issue number ${number}`,
        ["issues", String(number)],
        projectIdentity,
        repositories,
      ),
    };
  });

  let release = null;

  if (value.release !== undefined && value.release !== null) {
    if (typeof value.release !== "object" || Array.isArray(value.release)) {
      throw new Error("Delivery release must be an actually verified release.");
    }

    const version = requireText(value.release.version, "provenance.release.version");

    if (!/^[a-z0-9][a-z0-9._+-]{0,127}$/i.test(version)) {
      throw new Error("Delivery release version must be a safe verified tag.");
    }

    release = {
      version,
      ...(value.release.url === undefined ? {} : {
        url: normalizeGithubUrl(
          value.release.url,
          `provenance.release release version ${version}`,
          ["releases", "tag", version],
          projectIdentity,
          repositories,
        ),
      }),
    };
  }

  if (closedIssues.some((issue) => issue.closedByRelease) && !release) {
    throw new Error("An issue closed by a release requires an actually verified release.");
  }

  let commit = null;

  if (value.commit !== undefined && value.commit !== null) {
    if (typeof value.commit !== "object" || Array.isArray(value.commit)) {
      throw new Error("Delivery commit must be a verified Git commit.");
    }

    const sha = requireText(value.commit.sha, "provenance.commit.sha");

    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(sha)) {
      throw new Error("Delivery commit must contain a complete SHA-1 or SHA-256 Git commit hash.");
    }

    if (value.commit.published !== undefined && typeof value.commit.published !== "boolean") {
      throw new Error("Commit publication must be an explicitly verified boolean.");
    }

    const published = value.commit.published === true;

    if (value.commit.url !== undefined && !published) {
      throw new Error("A GitHub commit URL requires a verified published commit.");
    }

    commit = {
      sha,
      published,
      ...(value.commit.url === undefined ? {} : {
        url: normalizeGithubUrl(
          value.commit.url,
          `provenance.commit Git commit hash ${sha}`,
          ["commit", sha],
          projectIdentity,
          repositories,
        ),
      }),
    };
  }

  if (pullRequests.length === 0 && closedIssues.length === 0 && !release && !commit) {
    throw new Error("Delivery provenance must contain actual observed evidence.");
  }

  return { pullRequests, closedIssues, release, commit };
}

function normalizeDeploymentUrl(value, label) {
  let candidate;

  try {
    candidate = new URL(requireText(value, label));
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS deployment URL.`);
  }

  if (candidate.protocol !== "http:" && candidate.protocol !== "https:") {
    throw new Error(`${label} must be a valid HTTP or HTTPS deployment URL.`);
  }

  if (candidate.username || candidate.password) {
    throw new Error(`${label} must not contain credentials.`);
  }

  if (candidate.search || candidate.hash) {
    throw new Error(`${label} must not contain query parameters or fragments.`);
  }

  return candidate.href;
}

function containsSensitiveProjectPath(segments) {
  const sensitiveDirectories = new Set([".git", ".ssh", ".aws", ".docker", ".gnupg", ".kube"]);

  return segments.some((segment) => {
    const lower = segment.toLowerCase();

    return sensitiveDirectories.has(lower)
      || /^\.env(?:\.|$)/i.test(segment)
      || /^\.(?:envrc|git-credentials|npmrc|pypirc|netrc)$/i.test(segment)
      || /^(?:id_(?:rsa|dsa|ecdsa|ed25519)|application_default_credentials|service-account)(?:\.[a-z0-9_-]+)?$/i.test(segment)
      || /^(?:credentials?|secrets?|tokens?|private[_-]?keys?)(?:\.(?:json|ya?ml|toml|ini|txt|env))?$/i.test(segment)
      || /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(segment);
  });
}

function normalizeChangedFile(item, index) {
  const label = `execution.files[${index}]`;

  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`${label} must describe an actual changed project file.`);
  }

  const path = requireText(item.path, `${label}.path`);
  const segments = path.split("/");

  if (
    isAbsolute(path)
    || /^[a-z]:/i.test(path)
    || path.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(path)
    || segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`${label}.path must be a safe relative project file.`);
  }

  if (containsSensitiveProjectPath(segments)) {
    throw new Error(`${label}.path must not disclose sensitive environment or credential files.`);
  }

  if (!fileChangeTypes.has(item.change)) {
    throw new Error(`${label}.change must describe an actual file change.`);
  }

  return {
    path,
    change: item.change,
    ...(item.summary === undefined ? {} : { summary: requireText(item.summary, `${label}.summary`) }),
  };
}

function normalizeExecutionContext(value, status) {
  if (status === "Preview") {
    if (value !== undefined && value !== null) {
      throw new Error("A catalog preview cannot claim actual execution context.");
    }

    return null;
  }

  if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
    throw new Error("Execution context must describe the actual runtime.");
  }

  const supplied = value ?? {};
  const actualMachine = { hostname: hostname(), platform: platform() };

  if (supplied.machine !== undefined) {
    if (!supplied.machine || typeof supplied.machine !== "object" || Array.isArray(supplied.machine)) {
      throw new Error("Execution context must describe the actual execution machine.");
    }

    if (requireText(supplied.machine.hostname, "execution.machine.hostname") !== actualMachine.hostname) {
      throw new Error("Execution context must identify the actual execution machine.");
    }

    if (requireText(supplied.machine.platform, "execution.machine.platform") !== actualMachine.platform) {
      throw new Error("Execution context must identify the actual execution platform.");
    }
  }

  if (supplied.deployments !== undefined && !Array.isArray(supplied.deployments)) {
    throw new Error("Execution deployments must be an array of verified observations.");
  }

  const deployments = (supplied.deployments ?? []).map((item, index) => {
    const label = `execution.deployments[${index}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label} must describe an actual deployment.`);
    }

    const environment = requireText(item.environment, `${label}.environment`);

    if (!/^[a-z0-9][a-z0-9 ._-]{0,63}$/i.test(environment)) {
      throw new Error(`${label}.environment must be a safe deployment name.`);
    }

    if (!deploymentStatuses.has(item.status)) {
      throw new Error(`${label}.status must describe an actual deployment status.`);
    }

    return {
      environment,
      status: item.status,
      ...(item.url === undefined ? {} : { url: normalizeDeploymentUrl(item.url, `${label}.url`) }),
      ...(item.summary === undefined ? {} : { summary: requireText(item.summary, `${label}.summary`) }),
    };
  });

  if (supplied.files !== undefined && !Array.isArray(supplied.files)) {
    throw new Error("Execution files must be an array of actual changed project files.");
  }

  const files = (supplied.files ?? []).map(normalizeChangedFile);

  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new Error("Execution files must not repeat an observed project path.");
  }

  return { machine: actualMachine, deployments, files };
}

function redactSensitiveEvidenceText(value) {
  return value
    .replace(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g, "[redacted private key]")
    .replace(/\b(?:gh[pousr]_[a-z0-9_]{20,}|github_pat_[a-z0-9_]{20,}|sk-(?:proj-)?[a-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/gi, "[redacted credential]")
    .replace(/\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\b\s*[:=]\s*["']?[a-z0-9][a-z0-9._~+/-]{11,}/gi, "[redacted credential]")
    .replace(/\bbearer\s+[a-z0-9][a-z0-9._~+/-]{11,}/gi, "Bearer [redacted credential]")
    .replace(/\b(https?):\/\/[^\s/@:]+:[^\s/@]{8,}@/gi, "$1://[redacted credential]@")
    .replace(/(?:\/home|\/Users|\/private|\/tmp|\/root)\/[A-Za-z0-9._/-]+/g, "[redacted path]")
    .replace(/[A-Za-z]:\\(?:Users\\[^\\\s]+|Windows\\Temp)(?:\\[^\\\s]+)*/g, "[redacted path]");
}

function normalizeEvidenceText(value, label, redactSensitiveEvidence) {
  const text = requireText(value, label);
  return redactSensitiveEvidence ? redactSensitiveEvidenceText(text) : text;
}

function normalizeItems(items, label, {
  checks = false,
  redactSensitiveEvidence = false,
} = {}) {
  if (items === undefined) return [];
  if (!Array.isArray(items)) throw new Error(`${label} must be an array.`);

  return items.map((item, index) => {
    if (typeof item === "string") {
      return {
        title: normalizeEvidenceText(item, `${label}[${index}]`, redactSensitiveEvidence),
        detail: "",
      };
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label}[${index}] must be text or an object.`);
    }

    const normalized = {
      title: normalizeEvidenceText(
        item.title ?? item.label,
        `${label}[${index}].title`,
        redactSensitiveEvidence,
      ),
      detail: item.detail === undefined
        ? ""
        : normalizeEvidenceText(item.detail, `${label}[${index}].detail`, redactSensitiveEvidence),
      href: item.href ?? item.url,
    };

    if (normalized.href !== undefined) {
      normalized.href = normalizeEvidenceText(
        normalized.href,
        `${label}[${index}].href`,
        redactSensitiveEvidence,
      );
    }

    if (item.axis !== undefined) {
      if (label !== "findings" || !reviewAxes.has(item.axis)) {
        throw new Error(`${label}[${index}].axis must be a standards or specification review axis.`);
      }

      normalized.axis = item.axis;
    }

    if (item.priority !== undefined) {
      if (label !== "findings" || !findingPriorities.has(item.priority)) {
        throw new Error(`${label}[${index}].priority must be P0, P1, P2, or P3.`);
      }

      normalized.priority = item.priority;
    }

    if (checks) {
      normalized.status = item.status ?? "info";

      if (!checkStatuses.has(normalized.status)) {
        throw new Error(`${label}[${index}].status must be passed, failed, skipped, or info.`);
      }
    }

    return normalized;
  });
}

function validateActionableEvidenceText(text, label) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    throw new Error(`${label} must not contain unsafe control characters.`);
  }

  if (
    /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(text)
    || /\b(?:gh[pousr]_[a-z0-9_]{20,}|github_pat_[a-z0-9_]{20,}|sk-(?:proj-)?[a-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/i.test(text)
    || /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\b\s*[:=]\s*["']?[a-z0-9][a-z0-9._~+/-]{11,}/i.test(text)
    || /\bbearer\s+[a-z0-9][a-z0-9._~+/-]{11,}/i.test(text)
    || /\bhttps?:\/\/[^\s/@:]+:[^\s/@]{8,}@/i.test(text)
  ) {
    throw new Error(`${label} must not contain a credential, token, or private key.`);
  }
}

function normalizeActionableCode(items, label) {
  if (items === undefined) return [];

  if (!Array.isArray(items) || items.length > 12) {
    throw new Error(`${label} must be an array of at most 12 recorded items.`);
  }

  const value = label === "commands" ? "command" : "code";
  const supportedFields = new Set(
    label === "commands"
      ? ["title", "command", "detail", "language"]
      : ["title", "code", "detail", "language", "path"],
  );
  const seen = new Set();

  return items.map((item, index) => {
    const name = `${label}[${index}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${name} must describe an explicitly recorded ${value}.`);
    }

    for (const field of Object.keys(item)) {
      if (!supportedFields.has(field)) {
        throw new Error(`${name}.${field} is not a supported recorded ${value} field.`);
      }
    }

    const title = requireText(item.title, `${name}.title`);
    const content = requireText(item[value], `${name}.${value}`);
    const language = item.language === undefined
      ? label === "commands" ? "bash" : "text"
      : requireText(item.language, `${name}.language`).toLowerCase();

    if (seen.has(title)) throw new Error(`${label} must not repeat an item title.`);
    seen.add(title);

    if (title.length > 160 || Buffer.byteLength(content, "utf8") > 12_000) {
      throw new Error(`${name} exceeds the safe recorded ${value} size.`);
    }

    if (!/^[a-z0-9][a-z0-9+#.-]{0,31}$/.test(language)) {
      throw new Error(`${name}.language must be a safe code-block language.`);
    }

    validateActionableEvidenceText(title, `${name}.title`);
    validateActionableEvidenceText(content, `${name}.${value}`);

    const detail = item.detail === undefined
      ? undefined
      : requireText(item.detail, `${name}.detail`);

    if (label === "commands" && detail === undefined) {
      throw new Error(`${name}.detail must explain why or when the user should run this command.`);
    }

    if (detail && detail.length > 1_200) {
      throw new Error(`${name}.detail exceeds the safe explanation size.`);
    }

    if (detail) validateActionableEvidenceText(detail, `${name}.detail`);

    let path;

    if (item.path !== undefined) {
      path = requireText(item.path, `${name}.path`);
      const segments = path.split("/");

      if (
        isAbsolute(path)
        || /^[a-z]:/i.test(path)
        || path.includes("\\")
        || /[\u0000-\u001f\u007f]/.test(path)
        || segments.some((segment) => segment === "" || segment === "." || segment === "..")
        || containsSensitiveProjectPath(segments)
      ) {
        throw new Error(`${name}.path must be a safe, non-sensitive relative project file.`);
      }
    }

    return {
      title,
      [value]: content,
      language,
      ...(detail === undefined ? {} : { detail }),
      ...(path === undefined ? {} : { path }),
    };
  });
}

function normalizeReportRelationships(value, items, { redactSensitiveEvidence = false } = {}) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Report relationships must be an array.");

  const observed = new Set(items.flat().map((item) => item.title));

  return value.map((item, index) => {
    const label = `relationships[${index}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label} must connect actual recorded report results.`);
    }

    const from = normalizeEvidenceText(item.from, `${label}.from`, redactSensitiveEvidence);
    const to = normalizeEvidenceText(item.to, `${label}.to`, redactSensitiveEvidence);

    if (!observed.has(from) || !observed.has(to)) {
      throw new Error(`${label} must connect actual recorded report results.`);
    }

    return {
      from,
      to,
      ...(item.label === undefined ? {} : {
        label: normalizeEvidenceText(item.label, `${label}.label`, redactSensitiveEvidence),
      }),
    };
  });
}

function hasSubstantiveCompletionSection(section, evidence) {
  if (section === "checks") {
    return evidence.checks.some((check) => check.status === "passed" && check.detail.length > 0);
  }
  return evidence[section].some((item) => item.detail.length > 0 || item.href !== undefined);
}

function validateCompletionEvidence(skillName, requirement, evidence) {
  const matches = requirement.requiredSections.map(
    (section) => hasSubstantiveCompletionSection(section, evidence),
  );
  const satisfied = requirement.sectionMode === "all"
    ? matches.every(Boolean)
    : matches.some(Boolean);

  if (!satisfied) {
    const joiner = requirement.sectionMode === "all" ? " and " : " or ";
    throw new Error(
      `/${skillName} requires substantive completion evidence in ${requirement.requiredSections.join(joiner)}.`,
    );
  }

  if (requirement.requiredCheckDetailFields.length > 0) {
    const passedEvidence = evidence.checks
      .filter((check) => check.status === "passed")
      .map((check) => `${check.title}\n${check.detail}`)
      .join("\n");
    const missing = requirement.requiredCheckDetailFields.filter(
      (field) => !new RegExp(`(?:^|[;\\s])${field}\\s*=\\s*[^;\\s]+`, "im").test(passedEvidence),
    );
    if (missing.length > 0) {
      throw new Error(
        `/${skillName} completion evidence must record ${requirement.requiredCheckDetailFields.join(", ")}.`,
      );
    }
  }
}

function normalizeReadoutProducer(value) {
  if (value === undefined || value === null) return null;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Readout producer metadata must be a validated object.");
  }

  const producer = requireText(value.producer, "Readout producer");
  const collection = requireText(value.collection, "Skill collection");
  const harness = value.harness;

  if (!ingestionIdentifier.test(producer)) {
    throw new Error("Readout producer must be a safe non-sensitive identifier.");
  }

  if (
    !ingestionCollection.test(collection)
    || collection.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Skill collection must be a safe namespaced identifier.");
  }

  if (!harness || typeof harness !== "object" || Array.isArray(harness)) {
    throw new Error("Readout harness must be a validated object.");
  }

  const name = requireText(harness.name, "Readout harness");

  if (!ingestionIdentifier.test(name)) {
    throw new Error("Readout harness must use a safe non-sensitive identifier.");
  }

  const version = harness.version === undefined
    ? null
    : requireText(harness.version, "Readout harness version");

  if (version !== null && !/^[a-z0-9][a-z0-9._+-]{0,63}$/i.test(version)) {
    throw new Error("Readout harness version must be a safe version identifier.");
  }

  return {
    producer,
    collection,
    harness: { name, ...(version === null ? {} : { version }) },
  };
}

function validateObservationObject(value, label, allowed) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(`${label} must be a plain observation object.`);
  }

  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      throw new Error(`${label} contains an unsupported observation field: ${field}.`);
    }
  }

  return value;
}

function normalizeObservationTimestamp(value, label) {
  if (typeof value !== "string" || !observedUtcTimestamp.test(value)) {
    throw new Error(`${label} must be an observed UTC timestamp.`);
  }

  const timestamp = new Date(value);

  if (
    Number.isNaN(timestamp.getTime())
    || timestamp.toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
    throw new Error(`${label} must be a valid observed UTC timestamp.`);
  }

  return value;
}

function normalizeObservationCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative safe integer.`);
  }

  return value;
}

async function discoverCodexTaskSession(threadId, sessionDirectory, now) {
  if (typeof threadId !== "string" || !reportIdentifier.test(threadId)) return null;

  const roots = sessionDirectory === undefined
    ? Array.from({ length: 3 }, (_, offset) => {
      const date = new Date(now.getTime() - offset * 86_400_000);

      return join(
        process.env.CODEX_HOME ?? join(homedir(), ".codex"),
        "sessions",
        String(date.getUTCFullYear()),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
      );
    })
    : [resolve(sessionDirectory)];
  const suffix = `-${threadId.toLowerCase()}.jsonl`;
  const candidates = [];

  for (const root of roots) {
    let entries;

    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EACCES") continue;
      return null;
    }

    if (entries.length > 512) return null;

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) {
        candidates.push(join(root, entry.name));
      }
    }
  }

  return candidates.length === 1 ? candidates[0] : null;
}

function codexProviderUsage(event) {
  const usage = event?.payload?.info?.total_token_usage;

  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;

  const fields = {
    input: usage.input_tokens,
    cachedInput: usage.cached_input_tokens,
    cacheWrite: usage.cache_write_input_tokens,
    output: usage.output_tokens,
    reasoningOutput: usage.reasoning_output_tokens,
    total: usage.total_tokens,
  };

  if (
    !Number.isSafeInteger(fields.input)
    || !Number.isSafeInteger(fields.output)
    || !Number.isSafeInteger(fields.total)
    || fields.input < 0
    || fields.output < 0
    || fields.total !== fields.input + fields.output
    || Object.values(fields).some((count) => count !== undefined
      && (!Number.isSafeInteger(count) || count < 0))
  ) {
    return null;
  }

  return fields;
}

function extractCodexTaskObservation(events, expectedSkill, now) {
  let taskStart = -1;

  for (let index = 0; index < events.length; index += 1) {
    if (events[index].type === "event_msg" && events[index].payload?.type === "task_started") {
      taskStart = index;
    }
  }

  if (taskStart < 0) return null;

  let baseline = null;

  for (let index = taskStart - 1; index >= 0; index -= 1) {
    if (events[index].type === "event_msg" && events[index].payload?.type === "token_count") {
      baseline = codexProviderUsage(events[index]);
      break;
    }
  }

  if (!baseline) return null;

  const users = [];
  const models = new Set();
  const reasoning = new Set();
  let observed = null;

  for (let index = taskStart + 1; index < events.length; index += 1) {
    const event = events[index];
    const payload = event.payload ?? {};

    if (event.type === "event_msg" && payload.type === "task_started") return null;

    if (event.type === "event_msg" && payload.type === "user_message") {
      const message = typeof payload.message === "string"
        ? payload.message
        : typeof payload.text === "string" ? payload.text : "";
      const mentionedSkills = new Set(
        [...message.matchAll(/(?:^|[\s[(])(?:\$|\/)(?:(?:qs-skills|qs-specialists|ps-skills):)?((?:qs|ps)-[a-z0-9-]+)(?![a-z0-9._:-])/gi)]
          .map((match) => match[1].toLowerCase()),
      );

      users.push(mentionedSkills.size === 1 ? [...mentionedSkills][0] : null);
      continue;
    }

    if (event.type === "turn_context") {
      if (typeof payload.model === "string") models.add(payload.model);

      const effort = payload.effort ?? payload.reasoning_effort;

      if (typeof effort === "string") reasoning.add(effort);
      continue;
    }

    if (event.type === "event_msg" && payload.type === "token_count") {
      observed = codexProviderUsage(event) ?? observed;
    }
  }

  if (
    users.length !== 1
    || users[0] !== expectedSkill
    || !observed
    || models.size > 1
    || reasoning.size > 1
  ) {
    return null;
  }

  const tokens = {};

  for (const field of ["input", "cachedInput", "cacheWrite", "output", "reasoningOutput", "total"]) {
    if (observed[field] === undefined || baseline[field] === undefined) continue;

    const difference = observed[field] - baseline[field];

    if (!Number.isSafeInteger(difference) || difference < 0) return null;

    tokens[field] = difference;
  }

  if (tokens.total !== tokens.input + tokens.output) return null;

  const startedAt = events[taskStart].timestamp;
  const started = new Date(startedAt);
  const elapsed = now.getTime() - started.getTime();

  if (!observedUtcTimestamp.test(startedAt ?? "") || !Number.isSafeInteger(elapsed) || elapsed < 0) {
    return null;
  }

  const inference = {
    ...(models.size === 1 ? { model: [...models][0] } : {}),
    ...(reasoning.size === 1 ? { reasoningEffort: [...reasoning][0] } : {}),
  };
  const observation = {
    version: 1,
    measurementSource: "verified-harness",
    attributionScope: "skill-run",
    capturedAt: now.toISOString(),
    ...(Object.keys(inference).length ? { inference } : {}),
    tokens,
    timing: { startedAt, activeDurationMs: elapsed },
  };

  try {
    return normalizeSkillObservation(observation, "Completed");
  } catch {
    return null;
  }
}

export async function captureCodexSkillObservation(skill, {
  threadId = process.env.CODEX_THREAD_ID,
  sessionDirectory = process.env.QS_READOUT_CODEX_SESSION_DIRECTORY,
  now = new Date(),
} = {}) {
  const expectedSkill = typeof skill === "string" ? skill.replace(/^\//, "").toLowerCase() : "";

  if (
    !PUBLIC_COMMANDS_BY_NAME.has(expectedSkill)
    || !(now instanceof Date)
    || Number.isNaN(now.getTime())
  ) {
    return null;
  }

  const path = await discoverCodexTaskSession(threadId, sessionDirectory, now);

  if (!path) return null;

  let handle;

  try {
    const metadata = await lstat(path);

    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size < 1) return null;

    handle = await open(path, "r");

    for (let maximum = 128 * 1024; maximum <= 64 * 1024 * 1024; maximum *= 2) {
      const length = Math.min(metadata.size, maximum);
      const position = metadata.size - length;
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, position);
      const lines = buffer.subarray(0, bytesRead).toString("utf8").split("\n");

      if (position > 0) lines.shift();

      const events = [];

      for (const line of lines) {
        if (!line) continue;

        try {
          const event = JSON.parse(line);

          if (
            event
            && typeof event === "object"
            && (event.type === "turn_context"
              || event.type === "event_msg" && ["task_started", "user_message", "token_count"].includes(event.payload?.type))
          ) {
            events.push(event);
          }
        } catch {
          // A partial or malformed session event is not evidence of a skill measurement.
        }
      }

      const observation = extractCodexTaskObservation(events, expectedSkill, now);

      if (observation) return observation;
      if (position === 0) break;
    }
  } catch {
    return null;
  } finally {
    if (handle) await handle.close();
  }

  return null;
}

function normalizeSkillObservation(value, status, checks = []) {
  if (value === undefined) return null;

  if (status === "Preview") {
    throw new Error("A catalog preview cannot claim an actual skill-run observation.");
  }

  const observation = validateObservationObject(
    value,
    "Skill observation",
    new Set([
      "version",
      "measurementSource",
      "attributionScope",
      "capturedAt",
      "inference",
      "tokens",
      "timing",
      "quality",
    ]),
  );

  if (observation.version !== 1) {
    throw new Error("Skill observation version must be 1.");
  }

  if (!observationSources.has(observation.measurementSource)) {
    throw new Error("Skill observation measurement source must be a supported observed source.");
  }

  if (!observationScopes.has(observation.attributionScope)) {
    throw new Error("Skill observation attribution scope must be skill-run, thread-turn, or thread-cumulative.");
  }

  const normalized = {
    version: 1,
    measurementSource: observation.measurementSource,
    attributionScope: observation.attributionScope,
    capturedAt: normalizeObservationTimestamp(observation.capturedAt, "Observation capturedAt"),
  };

  if (observation.inference !== undefined) {
    const inference = validateObservationObject(
      observation.inference,
      "Observation inference",
      new Set(["provider", "model", "reasoningEffort"]),
    );
    const normalizedInference = {};

    if (inference.provider !== undefined) {
      if (typeof inference.provider !== "string" || !/^[a-z][a-z0-9._-]{0,62}$/.test(inference.provider)) {
        throw new Error("Observation provider must be a safe provider identifier.");
      }

      normalizedInference.provider = inference.provider;
    }

    if (inference.model !== undefined) {
      if (
        typeof inference.model !== "string"
        || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,126}$/.test(inference.model)
      ) {
        throw new Error("Observation model must be a safe model identifier.");
      }

      normalizedInference.model = inference.model;
    }

    if (inference.reasoningEffort !== undefined) {
      if (!observationReasoningEfforts.has(inference.reasoningEffort)) {
        throw new Error("Observation reasoning effort must be a supported observed effort.");
      }

      normalizedInference.reasoningEffort = inference.reasoningEffort;
    }

    normalized.inference = normalizedInference;
  }

  if (observation.tokens !== undefined) {
    const tokens = validateObservationObject(
      observation.tokens,
      "Observation tokens",
      observationTokenFields,
    );
    const normalizedTokens = {};

    for (const field of observationTokenFields) {
      if (tokens[field] !== undefined) {
        normalizedTokens[field] = normalizeObservationCount(tokens[field], `Observation tokens.${field}`);
      }
    }

    if (normalizedTokens.input !== undefined && normalizedTokens.output !== undefined) {
      const responseTotal = normalizedTokens.input + normalizedTokens.output;

      if (!Number.isSafeInteger(responseTotal)) {
        throw new Error("Observation response token total must be a nonnegative safe integer.");
      }

      if (normalizedTokens.total !== undefined && normalizedTokens.total !== responseTotal) {
        throw new Error("Observation token total must equal the final input and output token counts.");
      }
    }

    if (normalizedTokens.total !== undefined) {
      for (const field of ["input", "cachedInput", "cacheWrite", "output", "reasoningOutput"]) {
        if (normalizedTokens[field] !== undefined && normalizedTokens[field] > normalizedTokens.total) {
          throw new Error(`Observation ${field} tokens cannot exceed the final response token total.`);
        }
      }
    }

    if (
      normalizedTokens.input !== undefined
      && normalizedTokens.cachedInput !== undefined
      && normalizedTokens.cachedInput > normalizedTokens.input
    ) {
      throw new Error("Observation cached input tokens cannot exceed input tokens.");
    }

    if (
      normalizedTokens.output !== undefined
      && normalizedTokens.reasoningOutput !== undefined
      && normalizedTokens.reasoningOutput > normalizedTokens.output
    ) {
      throw new Error("Observation reasoning output tokens cannot exceed output tokens.");
    }

    normalized.tokens = normalizedTokens;
  }

  if (observation.timing !== undefined) {
    const timing = validateObservationObject(
      observation.timing,
      "Observation timing",
      new Set(["startedAt", "finishedAt", "activeDurationMs"]),
    );
    const normalizedTiming = {};

    for (const field of ["startedAt", "finishedAt"]) {
      if (timing[field] !== undefined) {
        normalizedTiming[field] = normalizeObservationTimestamp(timing[field], `Observation timing.${field}`);
      }
    }

    if (timing.activeDurationMs !== undefined) {
      normalizedTiming.activeDurationMs = normalizeObservationCount(
        timing.activeDurationMs,
        "Observation timing.activeDurationMs",
      );
    }

    if (normalizedTiming.startedAt !== undefined && normalizedTiming.finishedAt !== undefined) {
      const elapsed = new Date(normalizedTiming.finishedAt).getTime()
        - new Date(normalizedTiming.startedAt).getTime();

      if (elapsed < 0) {
        throw new Error("Observation timing cannot finish before the observed start.");
      }

      if (normalizedTiming.activeDurationMs !== undefined && normalizedTiming.activeDurationMs > elapsed) {
        throw new Error("Observation active duration cannot exceed the observed elapsed time.");
      }
    }

    normalized.timing = normalizedTiming;
  }

  if (observation.quality !== undefined) {
    const quality = validateObservationObject(
      observation.quality,
      "Observation quality",
      new Set(["source", "passedChecks", "failedChecks", "feedback"]),
    );

    if (!observationQualitySources.has(quality.source)) {
      throw new Error("Observation quality source must identify independent observed evidence.");
    }

    const normalizedQuality = { source: quality.source };
    const observedPassed = checks.filter((check) => check.status === "passed").length;
    const observedFailed = checks.filter((check) => check.status === "failed").length;

    if (observedPassed + observedFailed > 100) {
      throw new Error("Observation quality cannot contain more than 100 independently observed checks.");
    }

    for (const [field, observed] of [
      ["passedChecks", observedPassed],
      ["failedChecks", observedFailed],
    ]) {
      if (quality[field] === undefined) continue;

      const count = normalizeObservationCount(quality[field], `Observation quality.${field}`);

      if (count > 100 || count !== observed) {
        throw new Error(`Observation quality.${field} must match independently observed check results.`);
      }

      normalizedQuality[field] = count;
    }

    if (quality.feedback !== undefined) {
      if (!observationFeedback.has(quality.feedback)) {
        throw new Error("Observation quality feedback must be accepted, needs-revision, or rejected.");
      }

      if (quality.source === "observed-checks") {
        throw new Error("Observed check evidence cannot claim independently sourced user feedback.");
      }

      normalizedQuality.feedback = quality.feedback;
    }

    if (
      quality.source === "observed-checks"
      && (observedPassed + observedFailed === 0
        || (quality.passedChecks === undefined && quality.failedChecks === undefined))
    ) {
      throw new Error("Observed quality checks require independently recorded passed or failed checks.");
    }

    if (quality.source === "user-feedback" && quality.feedback === undefined) {
      throw new Error("User-feedback quality evidence requires an explicit observed feedback outcome.");
    }

    if (
      quality.source !== "observed-checks"
      && quality.feedback === undefined
      && quality.passedChecks === undefined
      && quality.failedChecks === undefined
    ) {
      throw new Error("Observation quality requires independently observed checks or explicit feedback.");
    }

    normalized.quality = normalizedQuality;
  }

  return normalized;
}

function summarizeNextPromptText(value, maximum = 180) {
  const text = value.replace(/\s+/g, " ").trim();

  return text.length <= maximum
    ? text
    : `${text.slice(0, maximum - 1).trimEnd()}…`;
}

function finishNextPromptSentence(value) {
  return /[.!?…]$/.test(value) ? value : `${value}.`;
}

function selectNextPromptEvidence(context) {
  const candidates = [
    ["Failed check", context.checks.find((item) => item.status === "failed")],
    ["Critical finding", context.findings.find((item) => item.priority === "P0" || item.priority === "P1")],
    ["Decision", context.decisions[0]],
    ["Output", context.outputs[0]],
    ["Finding", context.findings[0]],
    ["Check", context.checks[0]],
  ];

  return candidates.find(([, item]) => item)?.map((value, index) => index
    ? summarizeNextPromptText(value.title, 80)
    : value) ?? null;
}

function createNextPrompt(recommendation, context, fallbackReason) {
  const route = typeof recommendation === "string" ? { name: recommendation } : recommendation;
  const { name } = route;
  const target = PUBLIC_COMMANDS_BY_NAME.get(name) ?? READOUT_SKILLS_BY_NAME.get(name);
  const action = (route.instruction ?? `to ${target?.prompt ?? fallbackReason ?? "continue the recorded work"}`)
    .replace(/[.!?]+$/, "")
    .trim();
  const invocation = PUBLIC_COMMANDS_BY_NAME.has(name)
    ? codexPublicSkillLiteral(name)
    : READOUT_SKILLS_BY_NAME.has(name)
      ? `$${name}`
      : `/${name}`;
  const prompt = [`Use ${invocation} ${action}.`];

  if (context.status === "Preview") return prompt[0];

  prompt.push(finishNextPromptSentence(`Context: ${summarizeNextPromptText(context.outcome, 140)}`));
  const evidence = selectNextPromptEvidence(context);
  if (evidence) {
    prompt.push(finishNextPromptSentence(`${evidence[0]}: ${evidence[1]}`));
  }

  return prompt.join(" ");
}

function normalizeNextPrompt(value, name, label) {
  const prompt = requireText(value, label);
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const invocation = PUBLIC_COMMANDS_BY_NAME.has(name)
    ? codexPublicSkillLiteral(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : null;
  const firstAction = invocation
    ? `(?:${invocation}|/${escapedName})`
    : READOUT_SKILLS_BY_NAME.has(name)
      ? `[/\\$]${escapedName}`
      : `/${escapedName}`;

  if (!new RegExp(`^use\\s+${firstAction}(?![a-z0-9._:-])(?:\\s|$)`, "i").test(prompt)) {
    const expected = PUBLIC_COMMANDS_BY_NAME.has(name)
      ? `${codexPublicSkillLiteral(name)} or /${name}`
      : `/${name}`;
    throw new Error(`${label} must explicitly invoke ${expected} as its first action.`);
  }

  return prompt;
}

function normalizeNextPromptModel(candidate, name, context, index) {
  let guidance = MODEL_GUIDANCE_BY_NAME[name] ?? {
    model: "gpt-5.6-terra",
    thinking: "medium",
    reason: "A general-purpose starting point for an independently reported follow-on.",
  };

  if (context.status !== "Preview") {
    if (context.findings.some((finding) => finding.priority === "P0")) {
      guidance = {
        model: "gpt-5.6-sol",
        thinking: "xhigh",
        reason: "A recorded P0 finding warrants deeper reasoning for the next action.",
      };
    } else if (
      context.findings.some((finding) => finding.priority === "P1")
      || context.checks.some((check) => check.status === "failed")
    ) {
      const hasFailure = context.checks.some((check) => check.status === "failed");

      guidance = {
        model: "gpt-5.6-sol",
        thinking: ["xhigh", "max", "ultra"].includes(guidance.thinking)
          ? guidance.thinking
          : "high",
        reason: hasFailure
          ? "A recorded failed check warrants deeper reasoning for the next action."
          : "A recorded P1 finding warrants deeper reasoning for the next action.",
      };
    }
  }

  const model = candidate.model === undefined
    ? guidance.model
    : requireText(candidate.model, `nextSkills[${index}].model`);

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,126}$/.test(model)) {
    throw new Error(`nextSkills[${index}].model must be a safe model identifier.`);
  }

  const thinking = candidate.thinking === undefined
    ? guidance.thinking
    : candidate.thinking;

  if (!suggestedThinkingLevels.has(thinking)) {
    throw new Error(`nextSkills[${index}].thinking must be a supported thinking level.`);
  }

  const customized = candidate.model !== undefined || candidate.thinking !== undefined;

  return {
    model,
    thinking,
    modelReason: candidate.modelReason === undefined
      ? customized
        ? "A manually selected heuristic; no comparative performance or quality is implied."
        : guidance.reason
      : requireText(candidate.modelReason, `nextSkills[${index}].modelReason`),
    modelSource: "heuristic",
  };
}

function normalizeRecommendations(skill, recommendations, context) {
  const allowed = context.v3
    ? context.completionState === "failed"
      ? skill.continuation.failure
      : skill.continuation.normal
    : LEGACY_NEXT_SKILLS_BY_NAME[skill.name];
  const available = allowed;
  const passedChecks = context.checks.some((check) => check.status === "passed")
    && !context.checks.some((check) => check.status === "failed");
  const reviewedWithoutFindings = !context.v3
    && (skill.name === "qs-review-code" || context.skillsUsed.includes("qs-review-code"))
    && context.status === "Completed"
    && context.findings.length === 0
    && passedChecks;
  const requested = context.v3
    && context.status !== "Preview"
    && Array.isArray(recommendations)
    && recommendations.length === 0
    ? undefined
    : recommendations;
  const initial = requested === undefined
    ? context.v3
      ? available
      : reviewedWithoutFindings
        ? [...allowed].sort((left, right) =>
          Number(right.name === "qs-git-merge") - Number(left.name === "qs-git-merge"))
        : allowed
    : requested;
  if (context.v3 && Array.isArray(initial) && initial.length > 3) {
    throw new Error("A v3 root run can contain at most three ranked continuations.");
  }
  const selectedNames = new Set(Array.isArray(initial) ? initial.map((item) => {
    const name = typeof item === "string" ? item : item?.name;
    return typeof name === "string" ? name.replace(/^\//, "") : null;
  }) : []);
  const selected = context.v3 && Array.isArray(initial) && initial.length > 0
    ? [
      ...initial,
      ...available.filter((item) => !selectedNames.has(item.name)),
    ].slice(0, skill.continuation.defaultPrompts)
    : initial;

  const maximum = 3;
  if (!Array.isArray(selected) || selected.length > maximum) {
    throw new Error(context.v3
      ? "A v3 root run can contain at most three ranked continuations."
      : "nextSkills must contain no more than three catalog recommendations.");
  }

  const requiredPromptCount = context.v3 ? skill.continuation.defaultPrompts : null;
  if (context.v3 && selected.length !== requiredPromptCount) {
    throw new Error(
      requiredPromptCount
        ? `/${skill.name} requires all three ranked continuation prompts.`
        : `/${skill.name} is terminal and cannot contain continuation prompts.`,
    );
  }

  const unique = new Set();

  return selected.map((recommendation, index) => {
    const candidate = typeof recommendation === "string"
      ? { name: recommendation }
      : recommendation;

    if (!candidate || typeof candidate !== "object") {
      throw new Error(`nextSkills[${index}] must be a skill name or an object.`);
    }

    const name = requireText(candidate.name, `nextSkills[${index}].name`).replace(/^\//, "");
    const catalogRecommendation = available.find((item) => item.name === name);

    if (!catalogRecommendation) {
      throw new Error(`/${name} is not an approved next step for /${skill.name}.`);
    }

    if (unique.has(name)) throw new Error(`/${name} appears more than once in nextSkills.`);
    unique.add(name);

    const reason = candidate.reason === undefined
      ? catalogRecommendation.reason
      : requireText(candidate.reason, `nextSkills[${index}].reason`);

    return {
      name,
      preferred: index === 0,
      rank: index + 1,
      reason,
      prompt: candidate.prompt === undefined
        ? createNextPrompt(catalogRecommendation, context)
        : normalizeNextPrompt(candidate.prompt, name, `nextSkills[${index}].prompt`),
      ...normalizeNextPromptModel(candidate, name, context, index),
    };
  });
}

export function normalizeSkillReadout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A skill readout requires a JSON object.");
  }

  const skillName = requireText(input.skill, "skill").replace(/^\//, "");
  // Public catalog membership selects the v3 contract. Optional result fields
  // refine that contract; their omission must never opt an active command back
  // into the retired v2 prompt graph.
  const v3 = PUBLIC_COMMANDS_BY_NAME.has(skillName);
  const skill = (v3 ? PUBLIC_COMMANDS_BY_NAME : READOUT_SKILLS_BY_NAME).get(skillName);

  if (!skill) throw new Error(`/${skillName} is not a promoted QuickStark skill.`);
  const collection = v3 ? nativeCollectionIdentifier(skill) : "quickstark/qs-skills";
  if (input.collection !== undefined && input.collection !== collection) {
    throw new Error(`/${skillName} does not match its native collection ${collection}.`);
  }

  const suppliedStatus = input.status;
  const status = suppliedStatus ?? "Completed";

  if (!statuses.has(status)) {
    throw new Error("status must be Completed, Awaiting input, Blocked, Failed, or Preview.");
  }

  const effort = input.effort ?? "standard";
  const reportMode = input.report ?? input.reportMode ?? (v3 ? "brief" : "full");
  if (!effortModes.has(effort)) throw new Error("effort must be quick, standard, or deep.");
  if (!reportModes.has(reportMode)) throw new Error("report must be brief or full.");

  const inferredCompletionState = status === "Preview"
    ? "preview"
    : status === "Awaiting input"
      ? "input-required"
      : status === "Blocked" || status === "Failed"
        ? "failed"
        : !v3 || Array.isArray(input.nextSkills) && input.nextSkills.length > 0
          ? "continuation-required"
          : "complete";
  const completionState = input.completionState ?? inferredCompletionState;
  if (!completionStates.has(completionState)) {
    throw new Error("completionState must be complete, continuation-required, input-required, failed, or preview.");
  }
  const expectedStatuses = {
    complete: ["Completed"],
    "continuation-required": ["Completed"],
    "input-required": ["Awaiting input"],
    failed: ["Blocked", "Failed"],
    preview: ["Preview"],
  };
  if (!expectedStatuses[completionState].includes(status)) {
    throw new Error(`status ${status} is incompatible with completionState ${completionState}.`);
  }

  const suppliedSkills = input.skillsUsed ?? (status === "Preview" ? [] : [skill.name]);

  if (!Array.isArray(suppliedSkills)) throw new Error("skillsUsed must be an array.");

  const used = suppliedSkills.map((name, index) => {
    const normalized = requireText(name, `skillsUsed[${index}]`).replace(/^\//, "");

    if (!(v3 ? PUBLIC_COMMANDS_BY_NAME : READOUT_SKILLS_BY_NAME).has(normalized)) {
      throw new Error(`/${normalized} is not a promoted QuickStark skill.`);
    }

    return normalized;
  });

  if (new Set(used).size !== used.length) throw new Error("skillsUsed contains a duplicate skill.");
  if (status === "Preview" && used.length !== 0) {
    throw new Error("A gallery preview cannot claim that a skill has been used.");
  }
  if (status !== "Preview" && !used.includes(skill.name)) {
    throw new Error(`skillsUsed must include the actual active skill, /${skill.name}.`);
  }
  if (v3 && status !== "Preview" && (used.length !== 1 || used[0] !== skill.name)) {
    throw new Error("A v3 run records exactly one root public skill; internal capabilities are not skillsUsed.");
  }

  const generatedAt = new Date(input.generatedAt ?? Date.now());

  if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be a valid date.");

  const projectIdentity = input.projectIdentity === undefined
    ? null
    : normalizeProjectIdentity(input.projectIdentity);
  const gitContext = normalizeReadoutGitContext(input.gitContext, projectIdentity);
  const reportId = input.reportId === undefined
    ? randomUUID()
    : requireText(input.reportId, "Report identifier");

  if (!reportIdentifier.test(reportId)) {
    throw new Error("Report identifier must be a valid UUID.");
  }

  const redactSensitiveEvidence = v3 && skill.collectionId === "ps-skills";
  const findings = normalizeItems(input.findings, "findings", { redactSensitiveEvidence });
  const decisions = normalizeItems(input.decisions, "decisions", { redactSensitiveEvidence });
  const outputs = normalizeItems(input.outputs, "outputs", { redactSensitiveEvidence });
  const checks = normalizeItems(input.checks, "checks", { checks: true, redactSensitiveEvidence });
  const commands = normalizeActionableCode(input.commands, "commands");
  const keyCode = normalizeActionableCode(input.keyCode, "keyCode");

  if (status === "Preview" && input.provenance !== undefined && input.provenance !== null) {
    throw new Error("A catalog preview cannot claim actual GitHub or release provenance.");
  }

  if (status === "Preview" && input.relationships !== undefined && input.relationships.length !== 0) {
    throw new Error("A catalog preview cannot claim actual recorded relationships.");
  }

  const execution = normalizeExecutionContext(input.execution, status);
  const observation = normalizeSkillObservation(input.observation, status, checks);
  const producer = normalizeReadoutProducer(input.ingestion);
  if (producer && producer.collection !== collection) {
    throw new Error(`/${skillName} does not match its native collection ${collection}.`);
  }
  const provenance = normalizeDeliveryProvenance(input.provenance, projectIdentity);
  const relationships = normalizeReportRelationships(input.relationships, [
    findings,
    decisions,
    outputs,
    checks,
  ], { redactSensitiveEvidence });

  if (
    status === "Preview"
    && (decisions.length > 0 || outputs.length > 0 || checks.length > 0 || commands.length > 0 || keyCode.length > 0)
  ) {
    throw new Error("A catalog preview cannot claim actual decisions, outputs, validation results, commands, or code.");
  }

  const outcome = normalizeEvidenceText(input.outcome, "outcome", redactSensitiveEvidence);

  if (
    v3 && completionState === "complete"
    && (
      checks.some((check) => check.status === "failed")
      || findings.some((finding) => finding.priority === "P0" || finding.priority === "P1")
    )
  ) {
    throw new Error("Failed required checks and actionable P0/P1 findings prohibit a complete result.");
  }

  if (v3 && completionState === "complete" && skill.completionEvidence) {
    const evidence = { findings, decisions, outputs, checks };
    validateCompletionEvidence(skillName, skill.completionEvidence, evidence);
  }

  return {
    skill,
    collection,
    status,
    effort,
    report: reportMode,
    completionState,
    outcome,
    project: input.project === undefined
      ? projectIdentity?.label ?? ""
      : requireText(input.project, "project"),
    projectIdentity,
    gitContext,
    reportId,
    formatVersion: READOUT_FORMAT_VERSION,
    skillsUsed: used,
    findings,
    decisions,
    outputs,
    checks,
    commands,
    keyCode,
    execution,
    observation,
    producer,
    provenance,
    relationships,
    nextSkills: normalizeRecommendations(skill, input.nextSkills, {
      status,
      completionState,
      v3,
      outcome,
      skillsUsed: used,
      findings,
      decisions,
      outputs,
      checks,
    }),
    generatedAt,
  };
}

function renderItem(item, { checks = false } = {}) {
  let link = "";

  if (item.href) {
    try {
      const candidate = new URL(item.href);

      if (candidate.protocol === "http:" || candidate.protocol === "https:") {
        link = `<a class="item-link" href="${escapeHtml(candidate.href)}" rel="noreferrer">Open ↗</a>`;
      }
    } catch {
      // Local artifacts remain readable as text without becoming unsafe browser links.
    }
  }

  const badge = checks
    ? `<span class="check-badge check-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>`
    : item.priority
      ? `<span class="priority-badge priority-${escapeHtml(item.priority.toLowerCase())}">${escapeHtml(item.priority)}</span>`
      : "";

  return `<article class="detail-card"><div class="detail-heading"><h3>${escapeHtml(item.title)}</h3>${badge}${link}</div>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}</article>`;
}

function renderSection(title, description, items, options = {}) {
  if (items.length === 0) return "";

  return `<section class="section"><div class="section-heading"><div><p class="eyebrow">${escapeHtml(description)}</p><h2>${escapeHtml(title)}</h2></div><span class="section-count">${items.length}</span></div><div class="detail-grid">${items.map((item) => renderItem(item, options)).join("")}</div></section>`;
}

function renderObservedRun(observation) {
  if (!observation) return "";

  const scope = observation.attributionScope === "skill-run"
    ? "Skill-run"
    : observation.attributionScope === "thread-turn"
      ? "Thread-turn"
      : "Thread-cumulative";
  const captured = (value) => value === undefined ? "Not captured" : String(value);
  const count = (value) => value === undefined
    ? "Not captured"
    : new Intl.NumberFormat("en-US").format(value);
  const inference = observation.inference ?? {};
  const tokens = observation.tokens ?? {};
  const timing = observation.timing ?? {};
  const items = [
    { title: "Measurement source", detail: observation.measurementSource },
    { title: "Attribution scope", detail: observation.attributionScope },
    { title: `${scope} provider`, detail: captured(inference.provider) },
    { title: `${scope} model`, detail: captured(inference.model) },
    { title: `${scope} reasoning effort`, detail: captured(inference.reasoningEffort) },
    {
      title: `${scope} final response tokens`,
      detail: [
        `Input: ${count(tokens.input)}`,
        `Cached input: ${count(tokens.cachedInput)}`,
        `Cache write: ${count(tokens.cacheWrite)}`,
        `Output: ${count(tokens.output)}`,
        `Reasoning output: ${count(tokens.reasoningOutput)}`,
        `Total: ${count(tokens.total)}`,
      ].join("\n"),
    },
    {
      title: `${scope} active timing`,
      detail: [
        `Started: ${captured(timing.startedAt)}`,
        `Finished: ${captured(timing.finishedAt)}`,
        `Active duration: ${timing.activeDurationMs === undefined ? "Not captured" : `${count(timing.activeDurationMs)} ms`}`,
      ].join("\n"),
    },
    { title: "Observation captured at", detail: observation.capturedAt },
  ];

  return renderSection(
    scope === "Skill-run" ? "Observed skill run" : `Observed ${scope.toLowerCase()} context`,
    "Only explicitly observed measurements at their actual attribution scope",
    items,
  );
}

function renderIndependentQuality(observation) {
  const quality = observation?.quality;
  const captured = (value) => value === undefined ? "Not captured" : String(value);

  return renderSection(
    "Independent quality evidence",
    "Only actual check outcomes or explicitly sourced independent feedback",
    [
      { title: "Quality evidence source", detail: captured(quality?.source) },
      { title: "Passed checks", detail: captured(quality?.passedChecks) },
      { title: "Failed checks", detail: captured(quality?.failedChecks) },
      { title: "Explicit feedback", detail: captured(quality?.feedback) },
    ],
  );
}

function renderObservationMetadata(observation) {
  if (!observation) return [];

  const metadata = [
    ["observation-source", observation.measurementSource],
    ["observation-scope", observation.attributionScope],
    ["observation-captured-at", observation.capturedAt],
  ];

  const prefix = observation.attributionScope === "skill-run"
    ? ""
    : `${observation.attributionScope}-`;
  const inference = observation.inference ?? {};
  const tokens = observation.tokens ?? {};
  const timing = observation.timing ?? {};

  metadata.push(
    [`${prefix}provider`, inference.provider],
    [`${prefix}model`, inference.model],
    [`${prefix}reasoning-effort`, inference.reasoningEffort],
    [`${prefix}input-tokens`, tokens.input],
    [`${prefix}cached-input-tokens`, tokens.cachedInput],
    [`${prefix}cache-write-tokens`, tokens.cacheWrite],
    [`${prefix}output-tokens`, tokens.output],
    [`${prefix}reasoning-output-tokens`, tokens.reasoningOutput],
    [`${prefix}total-tokens`, tokens.total],
    [`${prefix}started-at`, timing.startedAt],
    [`${prefix}finished-at`, timing.finishedAt],
    [`${prefix}active-duration-ms`, timing.activeDurationMs],
  );

  if (observation.quality) {
    metadata.push(
      ["quality-source", observation.quality.source],
      ["quality-passed-checks", observation.quality.passedChecks],
      ["quality-failed-checks", observation.quality.failedChecks],
      ["quality-feedback", observation.quality.feedback],
    );
  }

  return metadata
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `<meta name="quickstark:${name}" content="${escapeHtml(value)}">`);
}

const readoutSectionDescriptions = Object.freeze({
  findings: "Only observations actually recorded",
  decisions: "Only decisions actually made",
  outputs: "Only artifacts actually produced",
  checks: "Only validations actually performed",
});

const readoutSectionLabels = Object.freeze({
  findings: "Findings",
  decisions: "Decisions",
  outputs: "Outputs",
  checks: "Checks",
});

function compactLabel(value, limit = 29) {
  const characters = Array.from(String(value));
  return characters.length > limit
    ? `${characters.slice(0, limit - 1).join("")}…`
    : characters.join("");
}

function wrapMapLabel(value, limit = 42) {
  const words = String(value).trim().split(/\s+/).flatMap((word) => {
    const characters = Array.from(word);
    const segments = [];

    for (let index = 0; index < characters.length; index += limit) {
      segments.push(characters.slice(index, index + limit).join(""));
    }

    return segments;
  });
  const lines = [];

  for (const word of words) {
    const previous = lines.at(-1);

    if (previous && Array.from(`${previous} ${word}`).length <= limit) {
      lines[lines.length - 1] = `${previous} ${word}`;
    } else {
      lines.push(word);
    }
  }

  return lines.length ? lines : [""];
}

function actualReportSignals(report, profile) {
  return profile.sections
    .filter((section) => report[section].length > 0)
    .map((section) => ({
      key: section,
      label: profile.labels[section] ?? readoutSectionLabels[section],
      count: report[section].length,
      items: report[section],
    }));
}

function renderSignalSvg(label, contents, height) {
  return `<svg class="signal-svg" viewBox="0 0 760 ${height}" role="img" aria-label="${escapeHtml(label)}" preserveAspectRatio="xMidYMid meet">${contents}</svg>`;
}

function renderMapVisualization(report, profile, signals) {
  const items = signals.flatMap((signal) => signal.items.map((item) => ({
    title: item.title,
    kind: signal.label,
  }))).slice(0, 5);
  let position = 10;
  const cards = items.map((item) => {
    const titleLines = wrapMapLabel(item.title);
    const height = Math.max(49, 28 + titleLines.length * 15);
    const card = { ...item, titleLines, y: position, height };

    position += height + 8;

    return card;
  });
  const height = Math.max(110, position + 2);
  const center = Math.round(height / 2);
  const displayed = new Map(cards.map((card) => [card.title, card]));
  const verified = report.relationships.filter((relationship) =>
    displayed.has(relationship.from) && displayed.has(relationship.to));
  const links = verified.map((relationship) => {
    const source = displayed.get(relationship.from);
    const target = displayed.get(relationship.to);
    const from = source.y + source.height / 2;
    const to = target.y + target.height / 2;
    const description = relationship.label ?? `${relationship.from} to ${relationship.to}`;

    return `<path d="M377 ${from} C315 ${from},315 ${to},377 ${to}" fill="none" stroke="var(--accent)" stroke-opacity=".48" stroke-width="2"><title>${escapeHtml(description)}</title></path>`;
  }).join("");
  const nodes = cards.map((card) => {
    const lines = card.titleLines.map((line, index) =>
      `${index ? " " : ""}<tspan x="405" y="${card.y + 19 + index * 15}">${escapeHtml(line)}</tspan>`).join("");

    return `<g><rect x="378" y="${card.y}" width="364" height="${card.height}" rx="10" fill="var(--card)" stroke="var(--line)"/><circle cx="393" cy="${card.y + 16}" r="4" fill="var(--accent)"/><text fill="var(--ink)" font-size="12" font-weight="650">${lines}</text><text x="405" y="${card.y + card.height - 8}" fill="var(--muted)" font-size="10">${escapeHtml(card.kind)}</text></g>`;
  }).join("");
  const root = `<rect x="12" y="${center - 22}" width="210" height="44" rx="12" fill="var(--soft)"/><text x="27" y="${center - 2}" fill="var(--accent)" font-size="11" font-weight="750">${escapeHtml(compactLabel(profile.title, 24))}</text><text x="27" y="${center + 13}" fill="var(--muted)" font-size="10">${items.length} recorded item${items.length === 1 ? "" : "s"}</text>`;

  const relationLabel = verified.length
    ? ` and ${verified.length} verified relationship${verified.length === 1 ? "" : "s"}`
    : "";

  return renderSignalSvg(
    `${profile.title} domain concept map based on actual recorded results${relationLabel}`,
    `${links}${root}${nodes}`,
    height,
  );
}

function renderBarVisualization(profile, signals) {
  const max = Math.max(...signals.map((signal) => signal.count));
  const height = signals.length * 40 + 12;
  const rows = signals.map((signal, index) => {
    const y = index * 40 + 10;
    const width = Math.round((signal.count / max) * 450);

    return `<g><text x="8" y="${y + 16}" fill="var(--muted)" font-size="11">${escapeHtml(compactLabel(signal.label, 23))}</text><rect x="220" y="${y + 4}" width="470" height="15" rx="7" fill="var(--paper)"/><rect x="220" y="${y + 4}" width="${width}" height="15" rx="7" fill="var(--accent)"/><text x="710" y="${y + 16}" fill="var(--ink)" font-size="12" font-weight="700">${signal.count}</text></g>`;
  }).join("");

  return renderSignalSvg(`${profile.title} chart of actual recorded results`, rows, height);
}

function renderFlowVisualization(report, profile, signals) {
  const gap = 14;
  const width = Math.floor((746 - gap * (signals.length - 1)) / signals.length);
  const signalIndexes = new Map(signals.flatMap((signal, index) =>
    signal.items.map((item) => [item.title, index])));
  const verified = report.relationships.filter((relationship) =>
    signalIndexes.has(relationship.from) && signalIndexes.has(relationship.to));
  const nodes = signals.map((signal, index) => {
    const x = 7 + index * (width + gap);
    const observedConnection = verified.some((relationship) =>
      signalIndexes.get(relationship.from) === index
      && signalIndexes.get(relationship.to) === index + 1);
    const connector = index < signals.length - 1 && observedConnection
      ? `<path d="M${x + width + 3} 43 l8 0 m-3 -3 l3 3 -3 3" fill="none" stroke="var(--muted)" stroke-width="1.5"/>`
      : "";

    return `<g><rect x="${x}" y="10" width="${width}" height="65" rx="13" fill="var(--card)" stroke="var(--line)"/><circle cx="${x + 15}" cy="28" r="4" fill="var(--accent)"/><text x="${x + 27}" y="32" fill="var(--muted)" font-size="10">${escapeHtml(compactLabel(signal.label, Math.max(9, Math.floor(width / 8))))}</text><text x="${x + 14}" y="58" fill="var(--ink)" font-size="18" font-weight="750">${signal.count}</text>${connector}</g>`;
  }).join("");

  const relationLabel = verified.length
    ? ` with ${verified.length} verified relationship${verified.length === 1 ? "" : "s"}`
    : "";

  return renderSignalSvg(`${profile.title} actual recorded report results${relationLabel}`, nodes, 85);
}

function renderChecksVisualization(report, profile) {
  const descriptions = [
    ["passed", "Passed"],
    ["failed", "Failed"],
    ["skipped", "Skipped"],
    ["info", "Recorded"],
  ];
  const observed = descriptions.map(([status, label]) => ({
    status,
    label,
    count: report.checks.filter((check) => check.status === status).length,
  })).filter((entry) => entry.count > 0);

  if (observed.length === 0) return "";

  return `<div class="signal-checks" role="group" aria-label="${escapeHtml(profile.title)} based only on actual checks">${observed.map((entry) => `<div class="signal-check signal-check-${escapeHtml(entry.status)}"><span class="signal-dot" aria-hidden="true"></span><strong>${entry.count} ${escapeHtml(entry.label.toLowerCase())}</strong><span>${escapeHtml(entry.label)} checks</span></div>`).join("")}</div>`;
}

function renderMatrixVisualization(profile, signals) {
  if (profile.title === "Review findings") {
    const observedFindings = signals.find((signal) => signal.key === "findings")?.items ?? [];
    const axes = [
      ["standards", "Standards findings"],
      ["specification", "Specification findings"],
    ];

    if (observedFindings.some((finding) => finding.axis)) {
      return axes.map(([axis, heading]) => {
        const findings = observedFindings.filter((finding) => finding.axis === axis);

        if (findings.length === 0) return "";

        const rows = findings.map((finding) => {
          const priority = finding.priority
            ? `<span class="priority-badge priority-${escapeHtml(finding.priority.toLowerCase())}">${escapeHtml(finding.priority)}</span>`
            : '<span class="matrix-kind">Recorded</span>';

          return `<tr><th scope="row">${escapeHtml(finding.title)}${finding.detail ? `<span class="matrix-evidence">${escapeHtml(finding.detail)}</span>` : ""}</th><td>${priority}</td></tr>`;
        }).join("");

        return `<table class="signal-matrix"><caption>${escapeHtml(heading)} · independently assessed evidence</caption><thead><tr><th scope="col">Observed finding and evidence</th><th scope="col">Priority</th></tr></thead><tbody>${rows}</tbody></table>`;
      }).join("");
    }
  }

  const rows = signals.flatMap((signal) => signal.items.slice(0, 3).map((item) => {
    const status = item.priority
      ? `<span class="priority-badge priority-${escapeHtml(item.priority.toLowerCase())}">${escapeHtml(item.priority)}</span>`
      : signal.key === "checks"
      ? `<span class="check-badge check-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>`
      : `<span class="matrix-kind">${escapeHtml(signal.label)}</span>`;

    return `<tr><th scope="row">${escapeHtml(item.title)}</th><td>${status}</td></tr>`;
  })).slice(0, 6).join("");

  if (!rows) return "";

  return `<table class="signal-matrix"><caption>${escapeHtml(profile.title)} · actual recorded results</caption><thead><tr><th scope="col">Observed item</th><th scope="col">Signal</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderBriefVisualization(profile, signals) {
  return `<div class="signal-brief" role="group" aria-label="${escapeHtml(profile.title)} actual result summary">${signals.map((signal) => `<div class="signal-brief-item"><span class="signal-dot" aria-hidden="true"></span><strong>${signal.count}</strong><span>${escapeHtml(signal.label)}</span></div>`).join("")}</div>`;
}

function renderReadoutVisualization(report, profile) {
  if (report.status === "Preview") return "";

  const signals = actualReportSignals(report, profile);

  if (signals.length === 0) return "";

  let visual;

  switch (profile.visualization) {
    case "map":
      visual = renderMapVisualization(report, profile, signals);
      break;
    case "bars":
      visual = renderBarVisualization(profile, signals);
      break;
    case "flow":
      visual = renderFlowVisualization(report, profile, signals);
      break;
    case "matrix":
      visual = renderMatrixVisualization(profile, signals);
      break;
    case "checks":
      visual = renderChecksVisualization(report, profile);

      if (!visual) visual = renderBriefVisualization(profile, signals);
      break;
    case "brief":
      visual = renderBriefVisualization(profile, signals);
      break;
    default:
      throw new Error(`Unsupported visual report profile for /${report.skill.name}.`);
  }

  return `<figure class="signal-panel"><figcaption><span class="eyebrow">Visual summary</span><span class="signal-caption">${escapeHtml(profile.signal)}</span></figcaption>${visual}</figure>`;
}

function renderExecutionContext(report) {
  if (!report.execution) return "";

  const { machine, deployments, files } = report.execution;
  const evidence = [
    {
      title: "Execution machine",
      detail: `${machine.hostname} · ${machine.platform}`,
    },
  ];

  for (const deployment of deployments) {
    const state = deployment.status === "verified"
      ? "Verified deployment"
      : deployment.status === "deployed"
        ? "Completed deployment"
        : deployment.status === "failed"
          ? "Failed deployment"
          : "Pending deployment";

    evidence.push({
      title: `${state} · ${deployment.environment}`,
      detail: deployment.summary ?? "Directly observed deployment state.",
      ...(deployment.url ? { href: deployment.url } : {}),
    });
  }

  for (const file of files) {
    const state = `${file.change[0].toUpperCase()}${file.change.slice(1)}`;

    evidence.push({
      title: `${state} file`,
      detail: file.summary ? `${file.path}\n${file.summary}` : file.path,
    });
  }

  return renderSection(
    "Execution context",
    "Actual machine, verified deployments, and files changed by this run",
    evidence,
  );
}

function renderDeliveryEvidence(report) {
  if (!report.provenance) return "";

  const { commit, pullRequests, release, closedIssues } = report.provenance;
  const evidence = [];

  if (commit) {
    evidence.push({
      title: commit.published ? "Published commit" : "Local commit",
      detail: commit.sha,
      ...(commit.url ? { href: commit.url } : {}),
    });
  }

  for (const pullRequest of pullRequests) {
    const state = pullRequest.state === "merged"
      ? "Merged pull request"
      : pullRequest.state === "closed"
        ? "Closed pull request"
        : pullRequest.state === "open"
          ? "Open pull request"
          : "Verified pull request";

    evidence.push({
      title: `${state} #${pullRequest.number}`,
      detail: pullRequest.title ?? "Independently verified GitHub pull request.",
      href: pullRequest.url,
    });
  }

  if (release) {
    evidence.push({
      title: "Released version",
      detail: release.version,
      ...(release.url ? { href: release.url } : {}),
    });
  }

  for (const issue of closedIssues) {
    evidence.push({
      title: `${issue.closedByRelease ? "Issues verified as closed by this release" : "Verified closed issue"} · #${issue.number}`,
      detail: issue.title ?? "Independently verified GitHub issue.",
      href: issue.url,
    });
  }

  return renderSection(
    "Verified delivery evidence",
    "Only independently verified GitHub and release records",
    evidence,
  );
}

const reportStyles = `
  :root{color-scheme:light;--ink:#172033;--muted:#64748b;--paper:#f5f6fa;--card:#fff;--line:#e6e8ee;--accent:#2563eb;--soft:#dbeafe}
  *{box-sizing:border-box}html{min-height:100%;background:var(--paper)}body{margin:0;color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit}main{width:min(1080px,calc(100% - 40px));margin:0 auto;padding:48px 0 72px}.topline{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}.brand{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:750;letter-spacing:.02em}.brand-mark{display:grid;width:34px;height:34px;place-items:center;border-radius:11px;background:#172033;color:#fff;font-weight:850}.eyebrow{margin:0;color:var(--muted);font-size:11px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}.timestamp{color:var(--muted);font-size:12px}.hero{position:relative;overflow:hidden;padding:38px;border:1px solid var(--line);border-radius:24px;background:var(--card)}.hero::before{position:absolute;inset:0 0 auto;height:4px;background:var(--accent);content:""}.hero-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.hero h1{margin:12px 0 8px;font-size:clamp(32px,6vw,55px);font-weight:770;letter-spacing:-.07em;line-height:1.03}.skill-command{display:inline-block;margin-top:7px;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}.status{flex-shrink:0;border-radius:999px;padding:9px 13px;background:var(--soft);color:var(--accent);font-size:12px;font-weight:750}.status-blocked{background:#fee2e2;color:#b91c1c}.status-awaiting-input{background:#fef3c7;color:#a16207}.status-preview{background:#e9edf3;color:#475569}.outcome{max-width:72ch;margin:25px 0 0;color:#334155;font-size:17px;line-height:1.7}.preview-note{margin-top:18px;border:1px solid #dbe2eb;border-radius:13px;padding:12px 15px;background:#f8fafc;color:#475569;font-size:13px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:21px}.metric{border:1px solid var(--line);border-radius:15px;padding:15px;background:var(--card)}.metric-label{color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.metric-value{display:block;margin-top:9px;font-size:25px;font-weight:770;letter-spacing:-.04em}.section{margin-top:34px}.section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.section-heading h2{margin:6px 0 0;font-size:23px;font-weight:720;letter-spacing:-.04em}.section-count{display:grid;width:31px;height:31px;place-items:center;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:12px;font-weight:700}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.detail-card{min-width:0;border:1px solid var(--line);border-radius:16px;padding:17px;background:var(--card)}.detail-heading{display:flex;align-items:center;gap:9px}.detail-heading h3{flex:1;min-width:0;margin:0;overflow-wrap:anywhere;font-size:14px;font-weight:700}.detail-card p{margin:10px 0 0;overflow-wrap:anywhere;color:#526077;font-size:13px;line-height:1.7;white-space:pre-wrap}.item-link{flex-shrink:0;color:var(--accent);font-size:12px;font-weight:700;text-decoration:none}.check-badge{border-radius:999px;padding:5px 8px;font-size:10px;font-weight:750;text-transform:uppercase}.check-passed{background:#dcfce7;color:#15803d}.check-failed{background:#fee2e2;color:#b91c1c}.check-skipped{background:#f1f5f9;color:#475569}.check-info{background:#dbeafe;color:#1d4ed8}.skills-used{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.skill-chip{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.next-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}.next-card{display:block;border:1px solid var(--line);border-radius:16px;padding:17px;background:var(--card);text-decoration:none}.next-card:first-child{border-color:var(--accent)}.next-card .eyebrow{color:var(--accent)}.next-card h3{margin:10px 0 7px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px}.next-card p:last-child{margin:0;color:#526077;font-size:13px;line-height:1.7}.empty-next{border:1px solid var(--line);border-radius:16px;padding:17px;background:var(--card);color:#526077;font-size:13px}.footer{display:flex;justify-content:space-between;gap:12px;margin-top:39px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.dashboard-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:22px}.dashboard-card{display:block;border:1px solid var(--line);border-radius:17px;padding:18px;background:var(--card);text-decoration:none}.dashboard-card:hover{border-color:var(--accent)}.dashboard-card h2{margin:10px 0 7px;font-size:17px;letter-spacing:-.03em}.dashboard-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.dashboard-card .status{display:inline-block;margin-top:12px}.empty-gallery{margin-top:22px;border:1px dashed var(--line);border-radius:16px;padding:22px;color:var(--muted);background:var(--card)}
  .next-prompt-block{margin:11px 0 0;overflow-wrap:anywhere;border:1px solid #24334a;border-left:3px solid var(--accent);border-radius:11px;padding:14px 15px;background:#172033;color:#f8fafc;line-height:1.75;white-space:pre-wrap;word-break:break-word}.next-prompt-block code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.next-card .next-reason{margin:9px 0 0;color:var(--muted);font-size:12px;line-height:1.6}.next-model-callout{display:grid;gap:5px;margin-top:11px;border:1px solid var(--line);border-radius:10px;padding:10px 11px;background:#f8fafc}.next-model-label{color:var(--muted);font-size:11px;font-weight:600}.next-model-label strong{color:#475569;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.next-model-callout .next-model-reason{margin:3px 0 0;color:var(--muted);font-size:11px;line-height:1.6}
  .compact-readout{width:min(900px,calc(100% - 36px));padding:29px 0 43px}.compact-readout .topline{margin-bottom:16px}.compact-readout .hero{padding:23px 25px;border-radius:19px}.compact-readout .hero h1{margin:7px 0 3px;font-size:clamp(26px,5vw,39px);letter-spacing:-.055em}.compact-readout .outcome{margin:14px 0 0;font-size:14px;line-height:1.6}.compact-readout .skills-used{gap:6px;margin-top:10px}.compact-readout .skill-chip{padding:5px 8px;font-size:10px}.profile-title{margin:7px 0 0;color:var(--accent);font-size:12px;font-weight:730}.compact-readout .metrics{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin-top:12px}.compact-readout .metric{border-radius:12px;padding:11px 12px}.compact-readout .metric-label{font-size:10px}.compact-readout .metric-value{margin-top:4px;font-size:19px}.compact-readout .section{margin-top:19px}.compact-readout .section-heading{margin-bottom:9px}.compact-readout .section-heading h2{margin-top:4px;font-size:18px}.compact-readout .section-count{width:26px;height:26px;border-radius:8px;font-size:11px}.compact-readout .detail-grid{gap:9px}.compact-readout .detail-card{border-radius:12px;padding:12px}.compact-readout .detail-card p{margin-top:6px;font-size:12px;line-height:1.55}.compact-readout .footer{margin-top:23px;padding-top:12px}.compact-readout .next-grid{gap:9px}.compact-readout .next-card{border-radius:12px;padding:12px}.compact-readout .next-card h3{margin:7px 0 5px;font-size:12px}.compact-readout .next-card p:last-child{font-size:12px}.signal-panel{margin:13px 0 0;border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--card)}.signal-panel figcaption{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.signal-caption{color:var(--muted);font-size:10px}.signal-svg{display:block;width:100%;max-width:760px;height:auto}.signal-checks,.signal-brief{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.signal-check,.signal-brief-item{display:grid;grid-template-columns:8px 1fr;align-items:center;column-gap:8px;row-gap:3px;min-height:46px;border:1px solid var(--line);border-radius:10px;padding:8px 10px}.signal-dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}.signal-check strong,.signal-brief-item strong{font-size:12px}.signal-check>span:last-child,.signal-brief-item>span:last-child{grid-column:2;color:var(--muted);font-size:10px}.signal-check-passed .signal-dot{background:#16a34a}.signal-check-failed .signal-dot{background:#dc2626}.signal-check-skipped .signal-dot{background:#94a3b8}.signal-matrix{width:100%;border-collapse:collapse;text-align:left;font-size:12px}.signal-matrix caption{margin-bottom:7px;color:var(--muted);text-align:left;font-size:10px}.signal-matrix th,.signal-matrix td{border-top:1px solid var(--line);padding:8px 7px}.signal-matrix thead th{border-top:0;color:var(--muted);font-size:10px;font-weight:700}.signal-matrix tbody th{font-weight:650}.matrix-kind{color:var(--muted);font-size:10px}
  .preview-toggle{border:1px solid var(--line);border-radius:999px;padding:9px 14px;background:var(--card);font-size:12px;font-weight:700;text-decoration:none}.project-card{min-width:0;border:1px solid var(--line);border-radius:19px;padding:20px;background:var(--card)}.report-list{display:grid;gap:10px;margin-top:15px}.report-row{display:block;border:1px solid var(--line);border-radius:13px;padding:13px;background:#fff;text-decoration:none}.report-row:hover{border-color:var(--accent);color:var(--accent)}.report-row-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.report-row-title{font-size:13px;font-weight:720}.report-row .status{padding:5px 8px;font-size:10px}.report-outcome{margin:8px 0 0;color:#526077;font-size:12px;line-height:1.6}.report-time{display:block;margin-top:7px;color:var(--muted);font-size:11px}.search-form{display:flex;gap:8px;margin:15px 0}.search-input{min-width:0;flex:1;border:1px solid var(--line);border-radius:11px;padding:11px 13px;background:#fff;font:inherit;font-size:13px}.search-submit{border:1px solid var(--accent);border-radius:11px;padding:10px 14px;background:var(--accent);color:#fff;font:inherit;font-size:12px;font-weight:700}.legacy-note{margin:15px 0 0;color:var(--muted);font-size:12px;line-height:1.6}
  .report-profile{display:inline-block;margin-top:6px;border-radius:999px;padding:3px 7px;background:var(--soft);color:var(--accent);font-size:10px;font-weight:700}
  .workbench-page{width:100%;height:100dvh;min-height:100dvh;display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:16px clamp(12px,2.2vw,28px) 14px}.workbench-masthead{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:13px}.workbench-brand{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:760;text-decoration:none}.workbench-brand>span:last-child>span,.workbench-private{color:var(--muted);font-size:11px;font-weight:550}.workbench-brand-mark{display:grid;width:29px;height:29px;place-items:center;border-radius:8px;background:#163a2a;color:#fff;font-weight:850}.workbench-page .preview-toggle{padding:6px 10px;font-size:11px}
  .workbench-shell{display:grid;grid-template-columns:minmax(220px,280px) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);min-height:0;max-height:none;margin-top:12px;overflow:hidden;border:1px solid var(--line);border-radius:15px;background:var(--card)}.workbench-sidebar{grid-column:1;grid-row:1/-1;min-width:0;min-height:0;overflow-y:auto;border-right:1px solid var(--line);padding:17px 12px}.workbench-rail-heading{margin:0 0 10px;color:var(--muted);font-size:10px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}.workbench-projects{display:grid;align-content:start;gap:9px}.workbench-project{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 7px;border:1px solid transparent;border-radius:9px;padding:10px;text-decoration:none}.workbench-project:hover,.workbench-project.is-selected{border-color:var(--line);background:var(--soft)}.workbench-project-title{overflow-wrap:anywhere;font-size:12px;font-weight:690}.workbench-project-count{color:var(--muted);font-size:11px}.workbench-current{grid-column:1/-1;color:var(--accent);font-size:9px;font-weight:750;text-transform:uppercase}.workbench-project-outcome,.workbench-project-profile{grid-column:1/-1;overflow:hidden;color:var(--muted);font-size:10px;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}
  .workbench-workspace{min-width:0;padding:18px 16px}.workbench-workspace-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}.workbench-workspace-heading h1{margin:2px 0 4px;font-size:25px;font-weight:750;letter-spacing:-.06em}.workbench-scope{margin:0;color:var(--muted);font-size:11px}.workbench-run-count{flex-shrink:0;border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:var(--muted);font-size:10px}.workbench-runs{display:grid;align-content:start}.workbench-run{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 9px;border-bottom:1px solid var(--line);padding:11px 9px;text-decoration:none}.workbench-run:hover,.workbench-run.is-selected{background:var(--soft)}.workbench-run.is-selected{box-shadow:inset 2px 0 var(--accent)}.workbench-run-title{display:grid;min-width:0;gap:3px}.workbench-run-title strong{overflow:hidden;font-size:11px;font-weight:730;text-overflow:ellipsis;white-space:nowrap}.workbench-run-title>span,.workbench-run-time{color:var(--muted);font-size:10px}.workbench-run-outcome{grid-column:1/-1;overflow:hidden;color:#465366;font-size:11px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}.workbench-run-time{grid-column:1/-1}.workbench-status{display:inline-flex;align-items:center;gap:5px;align-self:start;color:#15803d;font-size:10px;font-weight:670}.workbench-status-dot{width:7px;height:7px;border-radius:50%;background:currentColor}.workbench-status-blocked{color:#b91c1c}.workbench-status-awaiting-input{color:#a16207}.workbench-status-preview{color:#64748b}
  .workbench-detail{min-width:0;border-left:1px solid var(--line);padding:17px 14px}.workbench-detail-top{display:flex;align-items:center;justify-content:space-between;gap:9px}.workbench-readonly{color:var(--muted);font-size:10px}.workbench-detail-title{margin:16px 0 4px;overflow-wrap:anywhere;font-size:20px;font-weight:740;letter-spacing:-.055em}.workbench-detail-profile{margin:0;color:var(--muted);font-size:11px}.workbench-open-report{display:inline-flex;align-items:center;gap:5px;margin-top:13px;color:var(--accent);font-size:11px;font-weight:690;text-decoration:none}.workbench-detail-section{margin-top:19px;border-top:1px solid var(--line);padding-top:12px}.workbench-detail-section h3{margin:0;font-size:12px;font-weight:710}.workbench-detail-section>p{margin:9px 0 0;overflow-wrap:anywhere;color:#465366;font-size:12px;line-height:1.7}.workbench-evidence{display:grid;grid-template-columns:minmax(86px,1fr) minmax(95px,1fr);gap:0;margin:10px 0 0}.workbench-evidence dt,.workbench-evidence dd{min-width:0;margin:0;border-bottom:1px solid var(--line);padding:8px 0;font-size:10px}.workbench-evidence dt{color:var(--muted)}.workbench-evidence dd{overflow-wrap:anywhere;font-weight:600}.workbench-empty-note,.workbench-detail-empty{color:var(--muted);font-size:11px;line-height:1.65}.workbench-detail-empty h2{color:var(--ink);font-size:15px}.workbench-footer{display:flex;justify-content:space-between;gap:12px;margin-top:15px;color:var(--muted);font-size:10px}
  .workbench-run-observation{grid-column:1/-1;overflow:hidden;color:var(--muted);font-size:10px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}
  .workbench-projects .project-card{min-width:0;border:0;border-radius:0;padding:0;background:transparent}
  .workbench-workspace{grid-column:2;grid-row:1;border-bottom:1px solid var(--line);padding:19px 24px}.workbench-workspace-heading{margin-bottom:0}.workbench-detail{grid-column:2;grid-row:2;min-height:0;overflow-y:auto;border-left:0;padding:22px 24px 32px}.workbench-detail-title{font-size:clamp(24px,4vw,34px)}.workbench-project-runs{display:grid;align-content:start;margin:5px 0 4px 9px;border-left:1px solid var(--line)}.workbench-project-runs .workbench-run{border-bottom:0;border-radius:0 8px 8px 0;padding:10px 9px}.workbench-project-runs .workbench-run.is-selected{box-shadow:inset 2px 0 var(--accent)}.workbench-projects .search-form{gap:5px;margin:9px 0 5px}.workbench-projects .search-input{padding:8px 9px;font-size:11px}.workbench-projects .search-submit{padding:8px 9px;font-size:10px}.workbench-unassigned{margin-top:17px}.workbench-unassigned .section-heading h2{font-size:15px}.workbench-unassigned .report-list{gap:8px;margin-top:10px}.workbench-sidebar-footer{margin-top:15px;padding-top:12px;border-top:1px solid var(--line)}.workbench-sidebar-footer .preview-toggle{display:inline-flex}.workbench-readout-document{min-width:0;margin-top:23px}.workbench-readout-document .section{margin-top:23px}.workbench-readout-document .detail-card,.workbench-readout-document .next-card{min-width:0}.workbench-readout-document .next-grid{grid-template-columns:repeat(auto-fit,minmax(min(215px,100%),1fr))}
  @media(max-width:980px){.workbench-shell{grid-template-columns:minmax(200px,240px) minmax(0,1fr)}.workbench-workspace{padding:15px 16px}.workbench-detail{grid-column:2;grid-row:2;padding:18px 16px 25px}}
  @media(max-width:620px){.workbench-page{width:100%;height:auto;min-height:100dvh;grid-template-rows:auto auto auto;padding:12px 12px 15px}.workbench-masthead{flex-wrap:wrap}.workbench-shell{grid-template-columns:1fr;grid-template-rows:auto auto auto;min-height:0;max-height:none}.workbench-sidebar{grid-column:1;grid-row:1;max-height:200px;overflow-y:auto;border-right:0;border-bottom:1px solid var(--line);padding:12px}.workbench-projects{display:grid;gap:6px}.workbench-project{min-width:0}.workbench-workspace{grid-column:1;grid-row:2;padding:13px 12px}.workbench-workspace-heading{flex-wrap:wrap}.workbench-detail{grid-column:1;grid-row:3;overflow:visible;padding:16px 12px 24px}.workbench-detail-title{margin-top:11px}.workbench-footer{flex-direction:column}}
  .priority-badge{display:inline-block;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:780}.priority-p0,.priority-p1{background:#fee2e2;color:#b91c1c}.priority-p2{background:#fef3c7;color:#a16207}.priority-p3{background:#dbeafe;color:#1d4ed8}.matrix-evidence{display:block;margin-top:4px;color:var(--muted);font-size:10px;font-weight:450;overflow-wrap:anywhere}.signal-matrix+.signal-matrix{margin-top:13px}
  @media(max-width:640px){main{width:calc(100% - 28px);padding-top:25px}.hero{padding:24px}.hero-heading{flex-direction:column}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr}.footer{flex-direction:column}.search-form{flex-wrap:wrap}.signal-panel figcaption{align-items:flex-start;flex-direction:column}.compact-readout{width:calc(100% - 22px);padding-top:19px}.compact-readout .hero{padding:16px}}
`;

function renderDocument({ title, body, theme, metadata = "", styles = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${metadata}
  <title>${escapeHtml(title)} · QuickStark readout</title>
  <style>${reportStyles}${REPORT_PRESENTATION_STYLES}${styles}</style>
</head>
<body style="--accent:${theme.accent};--soft:${theme.soft}">
${body}
</body>
</html>
`;
}

function formatTimestamp(date) {
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)} UTC`;
}

function renderNextPromptCard(item, label) {
  return `<article class="next-card"><p class="eyebrow">${escapeHtml(label)}</p><h3>/${escapeHtml(item.name)}</h3><pre class="next-prompt-block"><code>${escapeHtml(item.prompt)}</code></pre>${item.reason ? `<p class="next-reason">${escapeHtml(item.reason)}</p>` : ""}<aside class="next-model-callout" aria-label="Heuristic model and thinking guidance"><span class="next-model-label">Suggested model <strong>${escapeHtml(item.model)}</strong></span><span class="next-model-label">Suggested thinking <strong>${escapeHtml(item.thinking)}</strong></span><p class="next-model-reason">Heuristic suggestion · ${escapeHtml(item.modelReason)} Choosing it does not change the active model or thinking level.</p></aside></article>`;
}

export function renderSkillReadout(input) {
  return renderNormalizedSkillReadout(normalizeSkillReadout(input));
}

function renderNormalizedSkillReadout(report) {
  const family = report.skill.name.split("-")[1];
  const theme = themes[family] ?? themes.help;
  const profile = readoutProfileForSkill(report.skill);
  const collectionDisplayName = nativeCollectionDisplayName(report.skill);

  if (!profile) throw new Error(`/${report.skill.name} does not have a cataloged report profile.`);

  const statusClass = report.status.toLowerCase().replaceAll(" ", "-");
  const metadata = [
    `<meta name="quickstark:skill" content="${escapeHtml(report.skill.name)}">`,
    `<meta name="quickstark:skill-display-name" content="${escapeHtml(report.skill.displayName)}">`,
    `<meta name="quickstark:skill-collection" content="${escapeHtml(report.collection)}">`,
    `<meta name="quickstark:report-profile" content="${escapeHtml(profile.title)}">`,
    `<meta name="quickstark:status" content="${escapeHtml(report.status)}">`,
    `<meta name="quickstark:completion-state" content="${escapeHtml(report.completionState)}">`,
    `<meta name="quickstark:effort" content="${escapeHtml(report.effort)}">`,
    `<meta name="quickstark:report-mode" content="${escapeHtml(report.report)}">`,
    `<meta name="quickstark:generated-at" content="${escapeHtml(report.generatedAt.toISOString())}">`,
    `<meta name="quickstark:report-id" content="${escapeHtml(report.reportId)}">`,
    `<meta name="quickstark:format-version" content="${report.formatVersion}">`,
    ...renderObservationMetadata(report.observation),
    ...(report.projectIdentity ? [
      `<meta name="quickstark:project" content="${escapeHtml(report.projectIdentity.key)}">`,
      `<meta name="quickstark:project-label" content="${escapeHtml(report.projectIdentity.label)}">`,
      `<meta name="quickstark:project-source" content="${escapeHtml(report.projectIdentity.source)}">`,
    ] : []),
    ...(report.gitContext ? [
      `<meta name="quickstark:git-branch" content="${escapeHtml(report.gitContext.branch)}">`,
      ...(report.gitContext.revision ? [
        `<meta name="quickstark:git-revision" content="${escapeHtml(report.gitContext.revision)}">`,
      ] : []),
      ...(Number.isSafeInteger(report.gitContext.ahead) ? [
        `<meta name="quickstark:git-ahead" content="${report.gitContext.ahead}">`,
      ] : []),
      ...(Number.isSafeInteger(report.gitContext.behind) ? [
        `<meta name="quickstark:git-behind" content="${report.gitContext.behind}">`,
      ] : []),
      `<meta name="quickstark:git-dirty-count" content="${report.gitContext.dirtyCount}">`,
    ] : []),
    ...(report.github ? [
      '<meta name="quickstark:github-verified" content="true">',
      `<meta name="quickstark:github-repository" content="${escapeHtml(report.github.fullName)}">`,
      ...(report.github.defaultBranch ? [
        `<meta name="quickstark:github-default-branch" content="${escapeHtml(report.github.defaultBranch)}">`,
      ] : []),
      ...(report.github.visibility ? [
        `<meta name="quickstark:github-visibility" content="${escapeHtml(report.github.visibility)}">`,
      ] : []),
      ...(Number.isSafeInteger(report.github.openIssueCount)
        && report.github.openIssueCount >= 0 ? [
          `<meta name="quickstark:github-open-issues" content="${report.github.openIssueCount}">`,
          '<meta name="quickstark:github-open-issues-source" content="github-issue-search">',
        ] : []),
      ...(Array.isArray(report.github.issues)
        ? report.github.issues.slice(0, 8).map((issue) =>
          `<meta name="quickstark:github-issue" content="${escapeHtml(JSON.stringify(issue))}">`)
        : []),
    ] : []),
    ...(report.producer ? [
      `<meta name="quickstark:producer" content="${escapeHtml(report.producer.producer)}">`,
      `<meta name="quickstark:harness" content="${escapeHtml(report.producer.harness.name)}">`,
      ...(report.producer.harness.version ? [
        `<meta name="quickstark:harness-version" content="${escapeHtml(report.producer.harness.version)}">`,
      ] : []),
    ] : []),
    ...(report.execution ? [
      `<meta name="quickstark:machine" content="${escapeHtml(report.execution.machine.hostname)}">`,
      `<meta name="quickstark:platform" content="${escapeHtml(report.execution.machine.platform)}">`,
    ] : []),
    ...(report.execution?.deployments ?? []).flatMap((deployment) => [
      `<meta name="quickstark:deployment-environment" content="${escapeHtml(deployment.environment)}">`,
      `<meta name="quickstark:deployment-status" content="${escapeHtml(deployment.status)}">`,
      ...(deployment.url ? [
        `<meta name="quickstark:deployment-url" content="${escapeHtml(deployment.url)}">`,
      ] : []),
    ]),
    ...(report.execution?.files ?? []).flatMap((file) => [
      `<meta name="quickstark:changed-file" content="${escapeHtml(file.path)}">`,
      `<meta name="quickstark:file-change" content="${escapeHtml(file.change)}">`,
    ]),
    ...report.commands.map((command) =>
      `<meta name="quickstark:user-command" content="${escapeHtml(JSON.stringify(command))}">`),
    ...report.keyCode.map((code) =>
      `<meta name="quickstark:key-code" content="${escapeHtml(JSON.stringify(code))}">`),
    ...(report.provenance?.commit ? [
      `<meta name="quickstark:commit-sha" content="${escapeHtml(report.provenance.commit.sha)}">`,
      `<meta name="quickstark:commit-published" content="${report.provenance.commit.published}">`,
    ] : []),
    ...(report.provenance?.release ? [
      `<meta name="quickstark:release-version" content="${escapeHtml(report.provenance.release.version)}">`,
    ] : []),
    ...(report.provenance?.pullRequests ?? []).map((pullRequest) =>
      `<meta name="quickstark:pull-request" content="${pullRequest.number}">`),
    ...(report.provenance?.closedIssues ?? []).map((issue) =>
      `<meta name="quickstark:closed-issue" content="${issue.number}">`),
  ].join("\n  ");

  const used = report.skillsUsed.length
    ? `<div class="skills-used">${report.skillsUsed.map((name) => `<span class="skill-chip">/${escapeHtml(name)}</span>`).join("")}</div>`
    : "";

  const preview = report.status === "Preview"
    ? '<p class="preview-note">Catalog preview only. No skill has been run, no checks have been performed, and no project files have been changed.</p>'
    : "";

  let remainingBriefItems = 3;
  const displayReport = report.report === "full" || report.status === "Preview"
    ? report
    : {
      ...report,
      ...Object.fromEntries(["findings", "decisions"].map((section) => {
        const items = report[section].slice(0, remainingBriefItems);
        remainingBriefItems -= items.length;
        return [section, items];
      })),
      outputs: report.outputs.slice(0, 3),
      checks: report.checks.filter((check) => check.status !== "passed").slice(0, 3),
    };
  const signals = report.status === "Preview" ? [] : actualReportSignals(displayReport, profile);
  const metrics = signals.slice(0, 3).map((signal) =>
    `<div class="metric"><span class="metric-label">${escapeHtml(signal.label)}</span><span class="metric-value">${signal.count}</span></div>`).join("");
  const execution = report.report === "full" ? renderExecutionContext(report) : "";
  const evidence = renderDeliveryEvidence(report);
  const visualization = renderReadoutVisualization(displayReport, profile);
  const summary = renderReadoutSignalSummary(displayReport, profile);
  const githubIssues = renderReadoutGitHubIssues(report.github);
  const sections = report.status === "Preview"
    ? renderSection(
      "Catalog information",
      "Purpose and invocation only; no skill has been run",
      report.findings,
    )
    : profile.sections.map((section) => renderSection(
      profile.labels[section] ?? readoutSectionLabels[section],
      readoutSectionDescriptions[section],
      displayReport[section],
      { checks: section === "checks" },
    )).join("\n  ");

  const next = renderReadoutNextPrompts(report);
  const actionableCode = renderReadoutActionableCode(report);

  const body = `<main class="compact-readout">
  <div class="topline"><div class="brand"><span class="brand-mark">Q</span><span>${escapeHtml(collectionDisplayName)}</span></div><span class="timestamp">${escapeHtml(formatTimestamp(report.generatedAt))}</span></div>
  <header class="hero"><div class="hero-heading"><div><p class="eyebrow">${escapeHtml(theme.label)}${report.project ? ` · ${escapeHtml(report.project)}` : ""}</p><h1>${escapeHtml(report.skill.displayName)}</h1><p class="profile-title">${escapeHtml(profile.title)}</p><span class="skill-command">/${escapeHtml(report.skill.name)}</span></div><span class="status status-${statusClass}">${escapeHtml(report.status)}</span></div><p class="outcome">${escapeHtml(report.outcome)}</p>${preview}${used}${renderReadoutProjectMetadata(report)}</header>
  ${summary}
  <section class="section"><div class="section-heading"><div><p class="eyebrow">Continue the actual work</p><h2>Top next prompts</h2></div><span class="section-count">${report.nextSkills.length}</span></div>${next}</section>
  ${renderReadoutRunMetrics(report)}
  ${actionableCode}
  ${execution}
  ${evidence}
  ${renderObservedRun(report.observation)}
  ${report.status === "Preview" ? "" : renderIndependentQuality(report.observation)}
  ${metrics ? `<div class="metrics">${metrics}</div>` : ""}
  ${visualization}
  ${sections}
  ${githubIssues}
  <footer class="footer"><span>Generated by ${escapeHtml(collectionDisplayName)}</span><span>Self-contained HTML · no external scripts or styles</span></footer>
</main>`;

  return renderDocument({
    title: report.skill.displayName,
    body,
    theme,
    metadata,
  });
}

function normalizeBaseUrl(value) {
  if (value === undefined || value === "") return null;

  let base;

  try {
    base = new URL(value);
  } catch {
    throw new Error("baseUrl must be a valid HTTP or HTTPS URL.");
  }

  if (base.protocol !== "http:" && base.protocol !== "https:") {
    throw new Error("baseUrl must use HTTP or HTTPS.");
  }

  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return base;
}

export async function writeReadoutVisualArtifact(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A browser visual artifact requires a structured input.");
  }

  const skillName = requireText(input.skill, "Visual artifact skill").replace(/^\//, "");
  const skill = PUBLIC_COMMANDS_BY_NAME.get(skillName);

  if (!skill) {
    throw new Error("A browser visual artifact requires a promoted QuickStark skill.");
  }

  const base = normalizeBaseUrl(options.baseUrl ?? process.env.QS_READOUT_BASE_URL);

  if (!base) {
    throw new Error("A browser visual artifact requires an actual HTTP or HTTPS baseUrl.");
  }

  const source = resolve(requireText(input.source, "Visual artifact source"));
  const sourceMetadata = await lstat(source);

  if (!sourceMetadata.isFile() || sourceMetadata.isSymbolicLink()) {
    throw new Error("A browser visual artifact requires a regular, non-symbolic source file.");
  }

  if (sourceMetadata.size > 512 * 1024) {
    throw new Error("A browser visual artifact exceeds its bounded maximum document size.");
  }

  const html = await readFile(source, "utf8");

  if (
    !/^\s*<!doctype\s+html\s*>/i.test(html)
    || !/<html(?:\s[^>]*)?>/i.test(html)
    || !/<head(?:\s[^>]*)?>/i.test(html)
    || !/<\/head\s*>/i.test(html)
    || !/<body(?:\s[^>]*)?>/i.test(html)
    || !/<\/body\s*>/i.test(html)
  ) {
    throw new Error("A browser visual artifact must be a complete self-contained HTML document.");
  }

  if (
    /<\s*(?:script|iframe|frame|frameset|object|embed|base)\b/i.test(html)
    || /<\s*meta\b[^>]*\bhttp-equiv\s*=\s*["']?\s*refresh\b/i.test(html)
    || /\s+on[a-z][a-z0-9:_-]*\s*=/i.test(html)
    || /\b(?:href|src|action|formaction|data)\s*=\s*["']?\s*(?:javascript|vbscript|data):/i.test(html)
    || /<\s*meta\b[^>]*\bname\s*=\s*["']quickstark:/i.test(html)
  ) {
    throw new Error("A browser visual artifact contains unsafe executable or navigation content.");
  }

  validateActionableEvidenceText(html, "Visual artifact");

  const projectIdentity = input.projectIdentity === undefined
    ? await discoverReadoutProject({ cwd: options.cwd })
    : normalizeProjectIdentity(input.projectIdentity);
  const generatedAt = new Date(input.generatedAt ?? Date.now());

  if (Number.isNaN(generatedAt.getTime())) {
    throw new Error("A browser visual artifact requires a valid generation timestamp.");
  }

  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const layout = options.layout
    ?? process.env.QS_READOUT_LAYOUT
    ?? (process.env.QS_READOUT_DIR && options.directory === undefined ? "project" : "flat");

  if (!readoutLayouts.has(layout)) {
    throw new Error("Visual artifact layout must be flat or project.");
  }

  const timestamp = generatedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const collectionPrefix = skill.collectionId === "ps-skills" ? "ps" : "qs";
  const visualSkill = skill.name.replace(/^(?:qs|ps)-(?:design-)?/, "");
  const filename = collectionPrefix + "-visual-" + visualSkill + "--" + timestamp + "--"
    + randomUUID().slice(0, 8) + ".html";

  await mkdir(directory, { recursive: true, mode: 0o700 });

  const segments = layout === "project"
    ? [
      ...projectIdentity.key.split("/"),
      String(generatedAt.getUTCFullYear()),
      String(generatedAt.getUTCMonth() + 1).padStart(2, "0"),
    ]
    : [];
  const parent = await ensureContainedReadoutDirectory(directory, segments);
  const path = join(parent, filename);
  const relativePath = relative(directory, path).split(sep).join("/");
  const metadata = [
    '<meta name="quickstark:project" content="' + escapeHtml(projectIdentity.key) + '">',
    '<meta name="quickstark:visual-artifact" content="' + escapeHtml(skill.name) + '">',
    '<meta name="quickstark:visual-generated-at" content="' + generatedAt.toISOString() + '">',
  ].join("\n  ");
  const document = html.replace(/<head(?:\s[^>]*)?>/i, (head) => head + "\n  " + metadata);

  await writeFile(path, document, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  return {
    skill: skill.name,
    projectIdentity,
    generatedAt: generatedAt.toISOString(),
    directory,
    filename,
    relativePath,
    path,
    url: new URL(relativePath.split("/").map(encodeURIComponent).join("/"), base).href,
  };
}

export async function writeSkillReadout(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A skill readout requires a JSON object.");
  }

  const projectIdentity = input.projectIdentity === undefined
    ? await discoverReadoutProject({ cwd: options.cwd })
    : input.projectIdentity;
  const normalized = normalizeSkillReadout({ ...input, projectIdentity });
  const gitContext = normalized.gitContext ?? await observeReadoutGitContext(normalized.projectIdentity, {
    cwd: options.cwd,
  });
  const github = gitContext && normalized.projectIdentity.host === "github.com"
    ? await observeGitHubProject(normalized.projectIdentity, {
      fetcher: options.githubFetcher ?? globalThis.fetch,
    })
    : null;
  const report = { ...normalized, gitContext, github };
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const layout = options.layout
    ?? process.env.QS_READOUT_LAYOUT
    ?? (process.env.QS_READOUT_DIR && options.directory === undefined ? "project" : "flat");

  if (!readoutLayouts.has(layout)) {
    throw new Error("Readout layout must be flat or project.");
  }

  const timestamp = report.generatedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const reportSuffix = report.producer
    ? `${report.producer.producer}--${report.reportId.toLowerCase()}`
    : report.reportId.slice(0, 8);
  const filename = `${report.skill.name}--${timestamp}--${reportSuffix}.html`;
  const path = layout === "project"
    ? join(
      directory,
      ...report.projectIdentity.key.split("/"),
      String(report.generatedAt.getUTCFullYear()),
      String(report.generatedAt.getUTCMonth() + 1).padStart(2, "0"),
      filename,
    )
    : join(directory, filename);
  const relativePath = relative(directory, path).split(sep).join("/");
  const base = normalizeBaseUrl(options.baseUrl ?? process.env.QS_READOUT_BASE_URL);

  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, renderNormalizedSkillReadout(report), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  return {
    skill: report.skill.name,
    collection: report.collection,
    status: report.status,
    effort: report.effort,
    report: report.report,
    completionState: report.completionState,
    reportId: report.reportId,
    generatedAt: report.generatedAt.toISOString(),
    projectIdentity: report.projectIdentity,
    gitContext: report.gitContext,
    directory,
    filename,
    relativePath,
    path,
    url: base
      ? new URL(relativePath.split("/").map(encodeURIComponent).join("/"), base).href
      : null,
  };
}

export function normalizeExternalSkillReadout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("An external skill readout requires a structured JSON object.");
  }

  const name = requireText(input.skill, "External skill").replace(/^\//, "");

  if (!externalSkillIdentifier.test(name)) {
    throw new Error("External skill must use a safe namespaced skill identifier.");
  }

  const status = input.status ?? "Completed";

  if (!statuses.has(status) || status === "Preview") {
    throw new Error("An external report must describe an actual completed, awaiting, or blocked skill run.");
  }

  const producer = normalizeReadoutProducer(input.ingestion);

  if (!producer) throw new Error("An external skill requires verified producer and harness metadata.");

  if ([...SKILL_COLLECTIONS_BY_ID.keys()].some(
    (collectionId) => producer.collection === `quickstark/${collectionId}`,
  )) {
    throw new Error("An external skill cannot claim native QuickStark catalog membership.");
  }

  const generatedAt = new Date(input.generatedAt ?? Date.now());

  if (Number.isNaN(generatedAt.getTime())) {
    throw new Error("External skill generation time must be a valid date.");
  }

  const reportId = requireText(input.reportId, "External report identifier");

  if (!reportIdentifier.test(reportId)) {
    throw new Error("External report identifier must be a valid UUID.");
  }

  const findings = normalizeItems(input.findings, "findings");
  const decisions = normalizeItems(input.decisions, "decisions");
  const outputs = normalizeItems(input.outputs, "outputs");
  const checks = normalizeItems(input.checks, "checks", { checks: true });
  const commands = normalizeActionableCode(input.commands, "commands");
  const keyCode = normalizeActionableCode(input.keyCode, "keyCode");
  const observation = normalizeSkillObservation(input.observation, status, checks);
  const relationships = normalizeReportRelationships(input.relationships, [
    findings,
    decisions,
    outputs,
    checks,
  ]);

  if ([findings, decisions, outputs, checks, relationships].some((items) => items.length > 100)) {
    throw new Error("External skill report results exceed the allowed collection size.");
  }

  if (input.provenance !== undefined && input.provenance !== null) {
    throw new Error("External producer claims cannot be treated as independently verified delivery evidence.");
  }

  const outcome = requireText(input.outcome, "External skill outcome");
  const selected = input.nextSkills ?? [];

  if (!Array.isArray(selected) || selected.length > 3) {
    throw new Error("External next skills must contain no more than three recommendations.");
  }

  const nextSkills = selected.map((item, index) => {
    const candidate = typeof item === "string" ? { name: item } : item;

    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`nextSkills[${index}] must be a safe external skill recommendation.`);
    }

    const nextName = requireText(candidate.name, `nextSkills[${index}].name`).replace(/^\//, "");

    if (!externalSkillIdentifier.test(nextName)) {
      throw new Error(`nextSkills[${index}].name must use a safe external skill identifier.`);
    }

    const reason = candidate.reason === undefined
      ? undefined
      : requireText(candidate.reason, `nextSkills[${index}].reason`);

    return {
      name: nextName,
      ...(reason === undefined ? {} : { reason }),
      prompt: candidate.prompt === undefined
        ? createNextPrompt(nextName, {
          status,
          outcome,
          findings,
          decisions,
          outputs,
          checks,
        }, reason)
        : normalizeNextPrompt(candidate.prompt, nextName, `nextSkills[${index}].prompt`),
      ...normalizeNextPromptModel(candidate, nextName, {
        status,
        outcome,
        findings,
        decisions,
        outputs,
        checks,
      }, index),
    };
  });

  if (new Set(nextSkills.map((item) => item.name)).size !== nextSkills.length) {
    throw new Error("External skill recommendations must not be repeated.");
  }

  return {
    skill: {
      name,
      displayName: input.displayName === undefined
        ? name
        : requireText(input.displayName, "External skill display name"),
    },
    status,
    outcome,
    projectIdentity: normalizeProjectIdentity(input.projectIdentity),
    reportId,
    formatVersion: READOUT_FORMAT_VERSION,
    producer,
    findings,
    decisions,
    outputs,
    checks,
    commands,
    keyCode,
    observation,
    relationships,
    nextSkills,
    generatedAt,
  };
}

export function renderExternalSkillReadout(input) {
  const report = normalizeExternalSkillReadout(input);
  const metadata = [
    `<meta name="quickstark:skill" content="${escapeHtml(report.skill.name)}">`,
    `<meta name="quickstark:skill-display-name" content="${escapeHtml(report.skill.displayName)}">`,
    '<meta name="quickstark:report-origin" content="external">',
    '<meta name="quickstark:report-profile" content="External skill readout">',
    `<meta name="quickstark:status" content="${escapeHtml(report.status)}">`,
    `<meta name="quickstark:generated-at" content="${escapeHtml(report.generatedAt.toISOString())}">`,
    `<meta name="quickstark:report-id" content="${escapeHtml(report.reportId)}">`,
    `<meta name="quickstark:format-version" content="${report.formatVersion}">`,
    ...renderObservationMetadata(report.observation),
    `<meta name="quickstark:project" content="${escapeHtml(report.projectIdentity.key)}">`,
    `<meta name="quickstark:project-label" content="${escapeHtml(report.projectIdentity.label)}">`,
    `<meta name="quickstark:project-source" content="${escapeHtml(report.projectIdentity.source)}">`,
    `<meta name="quickstark:producer" content="${escapeHtml(report.producer.producer)}">`,
    `<meta name="quickstark:harness" content="${escapeHtml(report.producer.harness.name)}">`,
    `<meta name="quickstark:skill-collection" content="${escapeHtml(report.producer.collection)}">`,
    ...(report.producer.harness.version ? [
      `<meta name="quickstark:harness-version" content="${escapeHtml(report.producer.harness.version)}">`,
    ] : []),
    ...report.commands.map((command) =>
      `<meta name="quickstark:user-command" content="${escapeHtml(JSON.stringify(command))}">`),
    ...report.keyCode.map((code) =>
      `<meta name="quickstark:key-code" content="${escapeHtml(JSON.stringify(code))}">`),
  ].join("\n  ");
  const statusClass = report.status.toLowerCase().replaceAll(" ", "-");
  const next = report.nextSkills.length
    ? `<div class="next-grid">${report.nextSkills.map((item) => renderNextPromptCard(
      item,
      "Producer-reported prompt",
    )).join("")}</div>`
    : '<div class="empty-next">None — no external follow-on was recorded.</div>';
  const sections = [
    renderSection("Observed findings", readoutSectionDescriptions.findings, report.findings),
    renderSection("Recorded decisions", readoutSectionDescriptions.decisions, report.decisions),
    renderSection("Actual outputs", readoutSectionDescriptions.outputs, report.outputs),
    renderSection("Observed checks", readoutSectionDescriptions.checks, report.checks, { checks: true }),
  ].join("\n  ");
  const body = `<main class="compact-readout">
  <div class="topline"><div class="brand"><span class="brand-mark">Q</span><span>${escapeHtml(COLLECTION_NAME)}</span></div><span class="timestamp">${escapeHtml(formatTimestamp(report.generatedAt))}</span></div>
  <header class="hero"><div class="hero-heading"><div><p class="eyebrow">External skill · ${escapeHtml(report.projectIdentity.label)}</p><h1>${escapeHtml(report.skill.displayName)}</h1><p class="profile-title">External skill readout</p><span class="skill-command">/${escapeHtml(report.skill.name)}</span></div><span class="status status-${statusClass}">${escapeHtml(report.status)}</span></div><p class="outcome">${escapeHtml(report.outcome)}</p></header>
  ${renderObservedRun(report.observation)}
  ${renderIndependentQuality(report.observation)}
  <section class="section"><div class="section-heading"><div><p class="eyebrow">Verified submission identity</p><h2>Producer and harness</h2></div></div><div class="detail-grid"><article class="detail-card"><div class="detail-heading"><h3>Producer</h3></div><p>${escapeHtml(report.producer.producer)}</p></article><article class="detail-card"><div class="detail-heading"><h3>Harness</h3></div><p>${escapeHtml(report.producer.harness.name)}${report.producer.harness.version ? ` · ${escapeHtml(report.producer.harness.version)}` : ""}</p></article><article class="detail-card"><div class="detail-heading"><h3>Skill collection</h3></div><p>${escapeHtml(report.producer.collection)}</p></article></div></section>
  ${sections}
  <section class="section"><div class="section-heading"><div><p class="eyebrow">Continue the actual work</p><h2>Producer-reported next prompts</h2></div><span class="section-count">${report.nextSkills.length}</span></div>${next}</section>
  ${renderReadoutActionableCode(report)}
  <footer class="footer"><span>Authorized external skill readout</span><span>Self-contained HTML · no external scripts or styles</span></footer>
</main>`;

  return renderDocument({
    title: report.skill.displayName,
    body,
    theme: themes.help,
    metadata,
  });
}

export async function writeExternalSkillReadout(input, options = {}) {
  const report = normalizeExternalSkillReadout(input);
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const timestamp = report.generatedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const slug = report.skill.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  const filename = `qs-external-${slug}--${timestamp}--${report.producer.producer}--${report.reportId.toLowerCase()}.html`;
  const path = join(
    directory,
    ...report.projectIdentity.key.split("/"),
    String(report.generatedAt.getUTCFullYear()),
    String(report.generatedAt.getUTCMonth() + 1).padStart(2, "0"),
    filename,
  );
  const relativePath = relative(directory, path).split(sep).join("/");
  const base = normalizeBaseUrl(options.baseUrl ?? process.env.QS_READOUT_BASE_URL);

  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, renderExternalSkillReadout(input), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  return {
    skill: report.skill.name,
    status: report.status,
    reportId: report.reportId,
    generatedAt: report.generatedAt.toISOString(),
    projectIdentity: report.projectIdentity,
    directory,
    filename,
    relativePath,
    path,
    url: base
      ? new URL(relativePath.split("/").map(encodeURIComponent).join("/"), base).href
      : null,
  };
}

export async function writeSkillGallery(options = {}) {
  const gallerySkills = options.collection === undefined
    ? PUBLIC_COMMANDS.filter((skill) => skill.collectionId !== "ps-skills")
    : PUBLIC_COMMANDS.filter((skill) => skill.collectionId === options.collection);

  if (options.collection !== undefined && gallerySkills.length === 0) {
    throw new Error(`Unknown or empty skill collection: ${options.collection}.`);
  }

  return Promise.all(gallerySkills.map((skill) => writeSkillReadout({
    skill: skill.name,
    status: "Preview",
    outcome: `${skill.shortDescription}. This page previews the readout format; the skill has not been run.`,
    skillsUsed: [],
    findings: [
      { title: "Purpose", detail: skill.shortDescription },
      { title: "Invocation", detail: skill.invocationPolicy === "explicit" || skill.userInvoked
        ? "Run explicitly when you choose this workflow."
        : "Run explicitly or allow the agent to select it when the task fits." },
    ],
  }, options)));
}

function findMetadata(html, name) {
  const match = html.match(new RegExp(`<meta name="quickstark:${name}" content="([^"]*)">`));
  return match?.[1] ?? "";
}

function decodeHtml(value) {
  return String(value).replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  })[entity]);
}

function discoverStoredActionableCode(html, name, label) {
  const entries = [...html.matchAll(
    new RegExp(`<meta name="quickstark:${name}" content="([^\"]*)">`, "g"),
  )];

  if (entries.length === 0) return [];
  if (entries.length > 12) return null;

  try {
    return normalizeActionableCode(
      entries.map((entry) => JSON.parse(decodeHtml(entry[1]))),
      label,
    );
  } catch {
    return null;
  }
}

function discoverStoredObservation(html) {
  const measurementSource = decodeHtml(findMetadata(html, "observation-source"));

  if (!measurementSource) return null;

  try {
    const attributionScope = decodeHtml(findMetadata(html, "observation-scope"));
    const prefix = attributionScope === "skill-run" ? "" : `${attributionScope}-`;
    const observation = {
      version: 1,
      measurementSource,
      attributionScope,
      capturedAt: decodeHtml(findMetadata(html, "observation-captured-at")),
    };
    const metadataValue = (name) => {
      const value = findMetadata(html, name);
      return value === "" ? undefined : decodeHtml(value);
    };
    const metadataCount = (name) => {
      const value = metadataValue(name);

      if (value === undefined) return undefined;

      if (!/^(?:0|[1-9]\d*)$/.test(value)) {
        throw new Error("Stored observation requires a nonnegative safe integer.");
      }

      return normalizeObservationCount(Number(value), `Stored observation ${name}`);
    };
    const inference = {
      provider: metadataValue(`${prefix}provider`),
      model: metadataValue(`${prefix}model`),
      reasoningEffort: metadataValue(`${prefix}reasoning-effort`),
    };
    const tokens = {
      input: metadataCount(`${prefix}input-tokens`),
      cachedInput: metadataCount(`${prefix}cached-input-tokens`),
      cacheWrite: metadataCount(`${prefix}cache-write-tokens`),
      output: metadataCount(`${prefix}output-tokens`),
      reasoningOutput: metadataCount(`${prefix}reasoning-output-tokens`),
      total: metadataCount(`${prefix}total-tokens`),
    };
    const timing = {
      startedAt: metadataValue(`${prefix}started-at`),
      finishedAt: metadataValue(`${prefix}finished-at`),
      activeDurationMs: metadataCount(`${prefix}active-duration-ms`),
    };

    for (const [name, values] of [["inference", inference], ["tokens", tokens], ["timing", timing]]) {
      const captured = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));

      if (Object.keys(captured).length > 0) observation[name] = captured;
    }

    const qualitySource = metadataValue("quality-source");
    let checks = [];

    if (qualitySource !== undefined) {
      checks = Array.from(
        html.matchAll(/<span class="check-badge check-(passed|failed)">/g),
        (match) => ({ status: match[1] }),
      );

      if (checks.length > 100) {
        throw new Error("Stored observation contains an excessive independent quality check count.");
      }

      const quality = {
        source: qualitySource,
        passedChecks: metadataCount("quality-passed-checks"),
        failedChecks: metadataCount("quality-failed-checks"),
        feedback: metadataValue("quality-feedback"),
      };
      const passed = quality.passedChecks ?? 0;
      const failed = quality.failedChecks ?? 0;

      if (passed > 100 || failed > 100 || passed + failed > 100) {
        throw new Error("Stored observation contains an excessive independent quality check count.");
      }

      observation.quality = Object.fromEntries(
        Object.entries(quality).filter(([, value]) => value !== undefined),
      );
    }

    return normalizeSkillObservation(observation, "Completed", checks);
  } catch {
    return null;
  }
}

function discoverStoredGitContext(html) {
  const branch = decodeHtml(findMetadata(html, "git-branch"));
  const revision = decodeHtml(findMetadata(html, "git-revision"));
  const dirty = findMetadata(html, "git-dirty-count");

  if (
    (!/^[a-z0-9][a-z0-9._/-]{0,199}$/i.test(branch) && branch !== "Detached HEAD")
    || (revision && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(revision))
    || !/^(?:0|[1-9][0-9]*)$/.test(dirty)
    || !Number.isSafeInteger(Number(dirty))
  ) return null;

  const integer = (name) => {
    const value = findMetadata(html, name);

    if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return null;

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) ? parsed : null;
  };

  return {
    branch,
    revision: revision || null,
    ahead: integer("git-ahead"),
    behind: integer("git-behind"),
    dirtyCount: Number(dirty),
  };
}

function discoverStoredGitHub(html, projectKey) {
  if (findMetadata(html, "github-verified") !== "true") return null;

  const repository = decodeHtml(findMetadata(html, "github-repository"));

  if (`github.com/${repository}` !== projectKey) return null;

  const defaultBranch = decodeHtml(findMetadata(html, "github-default-branch"));
  const visibility = decodeHtml(findMetadata(html, "github-visibility"));
  const issueCount = findMetadata(html, "github-open-issues");
  const openIssueCount = findMetadata(html, "github-open-issues-source") === "github-issue-search"
    && /^(?:0|[1-9][0-9]*)$/.test(issueCount)
    && Number.isSafeInteger(Number(issueCount))
    ? Number(issueCount)
    : null;
  const capturedIssues = [...html.matchAll(
    /<meta name="quickstark:github-issue" content="([^"]*)">/g,
  )];
  let issues = null;

  if (capturedIssues.length > 0 && capturedIssues.length <= 8) {
    try {
      const seen = new Set();

      issues = capturedIssues.map((match) => {
        const issue = JSON.parse(decodeHtml(match[1]));

        if (
          !issue
          || typeof issue !== "object"
          || Array.isArray(issue)
          || !Number.isSafeInteger(issue.number)
          || issue.number <= 0
          || seen.has(issue.number)
          || typeof issue.title !== "string"
          || issue.url !== `https://github.com/${repository}/issues/${issue.number}`
          || !Array.isArray(issue.labels)
          || issue.labels.some((label) => typeof label !== "string")
        ) throw new Error("The stored GitHub issue is not independently verified.");

        seen.add(issue.number);

        return {
          number: issue.number,
          title: issue.title,
          url: issue.url,
          labels: issue.labels,
        };
      });

      if (openIssueCount !== null && issues.length > openIssueCount) issues = null;
    } catch {
      issues = null;
    }
  } else if (capturedIssues.length === 0 && openIssueCount === 0) {
    issues = [];
  }

  return {
    fullName: repository,
    url: `https://github.com/${repository}`,
    defaultBranch: /^[a-z0-9][a-z0-9._/-]{0,199}$/i.test(defaultBranch)
      ? defaultBranch
      : null,
    visibility: new Set(["public", "private", "internal"]).has(visibility)
      ? visibility
      : null,
    openIssueCount,
    issues,
  };
}

function normalizePublishedProjects(value) {
  if (value === undefined || value === null || value === "") return new Set();

  const values = Array.isArray(value) ? value : String(value).split(",");
  const projects = new Set();

  for (const item of values) {
    const key = requireText(item, "Published project");

    if (key === "*") {
      projects.add(key);
      continue;
    }

    const segments = key.split("/");
    const ownerScope = segments.at(-1) === "*";
    const identitySegments = ownerScope ? segments.slice(1, -1) : segments.slice(1);

    if (
      segments.length < 3
      || !/^[a-z0-9.-]+(?:~\d{1,5})?$/i.test(segments[0])
      || identitySegments.some((segment) => !projectSegment.test(segment) || segment === "." || segment === "..")
    ) {
      throw new Error("Published projects must use safe, canonical host/owner/repository identities.");
    }

    projects.add(key);
  }

  return projects;
}

function projectMatchesPublishedScope(projects, key) {
  if (!(projects instanceof Set) || typeof key !== "string") return false;
  if (projects.has(key)) return true;

  const segments = key.split("/");

  if (
    segments.length < 3
    || !/^[a-z0-9.-]+(?:~\d{1,5})?$/i.test(segments[0])
    || segments.slice(1).some((segment) => !projectSegment.test(segment) || segment === "." || segment === "..")
  ) {
    return false;
  }

  if (projects.has("*")) return true;

  return projects.has(`${segments.slice(0, -1).join("/")}/*`);
}

async function discoverStoredReadouts(directory, { allowedProjects = null, maxDepth = 10 } = {}) {
  const reports = [];

  async function visit(current, depth) {
    if (depth > maxDepth || reports.length >= 10_000) return;

    let entries;

    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      const path = join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        await visit(path, depth + 1);
        continue;
      }

      if (!entry.isFile() || !reportFilename.test(entry.name)) continue;

      const html = await readFile(path, "utf8");
      const skillName = decodeHtml(findMetadata(html, "skill"));
      const external = findMetadata(html, "report-origin") === "external";
      const skill = PUBLIC_COMMANDS_BY_NAME.get(skillName)
        ?? READOUT_SKILLS_BY_NAME.get(skillName)
        ?? (external && externalSkillIdentifier.test(skillName) ? {
          name: skillName,
          displayName: decodeHtml(findMetadata(html, "skill-display-name")) || skillName,
        } : null);
      const status = findMetadata(html, "status");
      const generatedAt = findMetadata(html, "generated-at");
      const projectKey = decodeHtml(findMetadata(html, "project"));

      if (!skill || !statuses.has(status) || Number.isNaN(Date.parse(generatedAt))) continue;
      if (allowedProjects !== null && !projectMatchesPublishedScope(allowedProjects, projectKey)) continue;

      const match = html.match(/<p class="outcome">([\s\S]*?)<\/p>/);

      reports.push({
        filename: entry.name,
        relativePath: relative(directory, path).split(sep).join("/"),
        document: html,
        skill,
        status,
        generatedAt,
        profileTitle: decodeHtml(findMetadata(html, "report-profile"))
          || readoutProfileForSkill(skill)?.title
          || "",
        outcome: decodeHtml(match?.[1] ?? ""),
        projectKey,
        projectLabel: decodeHtml(findMetadata(html, "project-label")),
        projectSource: findMetadata(html, "project-source"),
        gitContext: discoverStoredGitContext(html),
        github: discoverStoredGitHub(html, projectKey),
        observation: discoverStoredObservation(html),
      });
    }
  }

  await visit(directory, 0);
  reports.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt)
    || left.relativePath.localeCompare(right.relativePath));

  return reports;
}

function explicitReadoutProject(value) {
  if (value === undefined || value === null || value === "") {
    throw new Error("An explicit target project is required.");
  }

  if (typeof value === "object" && value !== null) {
    return normalizeProjectIdentity({ ...value, source: "explicit" });
  }

  const [key] = normalizePublishedProjects([value]);
  const [host, ...parts] = key.split("/");
  const repository = parts.pop();

  return normalizeProjectIdentity({
    host,
    owner: parts.join("/"),
    repository,
    source: "explicit",
  });
}

export async function migrateLegacyReadouts(options = {}) {
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const targetDirectory = resolve(options.targetDirectory ?? directory);
  const project = explicitReadoutProject(options.project);
  const apply = options.apply === true;
  const reports = (await discoverStoredReadouts(directory))
    .filter((report) => !report.projectKey);
  const results = [];
  let migrated = 0;
  let skipped = 0;

  for (const report of reports) {
    const generatedAt = new Date(report.generatedAt);
    const source = join(directory, ...report.relativePath.split("/"));
    const target = join(
      targetDirectory,
      ...project.key.split("/"),
      String(generatedAt.getUTCFullYear()),
      String(generatedAt.getUTCMonth() + 1).padStart(2, "0"),
      report.filename,
    );
    const original = await readFile(source, "utf8");
    const metadata = [
      `<meta name="quickstark:project" content="${escapeHtml(project.key)}">`,
      `<meta name="quickstark:project-label" content="${escapeHtml(project.label)}">`,
      `<meta name="quickstark:project-source" content="explicit">`,
    ].join("\n  ");

    if (!original.includes("</head>")) {
      throw new Error(`Legacy readout ${report.filename} has no safe HTML metadata location.`);
    }

    const migratedHtml = original.replace("</head>", `  ${metadata}\n</head>`);
    let existing = null;

    try {
      existing = await readFile(target, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (existing !== null) {
      if (existing !== migratedHtml) {
        throw new Error(`Migration target already exists with different report content: ${report.filename}.`);
      }

      skipped += 1;
      results.push({ source, target, status: "already migrated" });
      continue;
    }

    if (apply) {
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });

      try {
        await writeFile(target, migratedHtml, {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
      } catch (error) {
        if (error.code !== "EEXIST") throw error;

        if (await readFile(target, "utf8") !== migratedHtml) {
          throw new Error(`Migration target already exists with different report content: ${report.filename}.`);
        }

        skipped += 1;
        results.push({ source, target, status: "already migrated" });
        continue;
      }

      migrated += 1;
    }

    results.push({ source, target, status: apply ? "migrated" : "would migrate" });
  }

  return {
    dryRun: !apply,
    project: project.key,
    directory,
    targetDirectory,
    candidates: reports.length,
    migrated,
    skipped,
    reports: results,
  };
}

export async function pruneReadouts(options = {}) {
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const project = explicitReadoutProject(options.project);
  const retentionDays = Number(options.retentionDays);

  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error("Report retention requires a positive whole number of days.");
  }

  const now = new Date(options.now ?? Date.now());

  if (Number.isNaN(now.getTime())) {
    throw new Error("Report retention requires a valid current timestamp.");
  }

  const expiresBefore = now.getTime() - retentionDays * 86_400_000;
  const candidates = (await discoverStoredReadouts(directory, {
    allowedProjects: new Set([project.key]),
  })).filter((report) => Date.parse(report.generatedAt) < expiresBefore);
  const apply = options.apply === true;
  const reports = [];

  for (const report of candidates) {
    const path = join(directory, ...report.relativePath.split("/"));

    if (apply) await unlink(path);

    reports.push({
      path,
      generatedAt: report.generatedAt,
      status: apply ? "deleted" : "would delete",
    });
  }

  return {
    dryRun: !apply,
    project: project.key,
    retentionDays,
    candidates: candidates.length,
    deleted: apply ? candidates.length : 0,
    reports,
  };
}

function workbenchHref({ project, query, skill, status, previews, report } = {}) {
  const parameters = new URLSearchParams();

  if (project) parameters.set("project", project);
  if (query) parameters.set("q", query);
  if (skill) parameters.set("skill", skill);
  if (status) parameters.set("status", status);
  if (previews) parameters.set("previews", "1");
  if (report) parameters.set("report", report);

  const encoded = parameters.toString();
  return encoded ? `?${escapeHtml(encoded)}` : "./";
}

function reportHref(report) {
  return escapeHtml(report.relativePath.split("/").map(encodeURIComponent).join("/"));
}

function renderUnassignedLegacyReadout(report) {
  const statusClass = report.status.toLowerCase().replaceAll(" ", "-");
  const profile = report.profileTitle
    ? `<span class="report-profile">${escapeHtml(report.profileTitle)}</span>`
    : "";

  return `<a class="report-row" href="${reportHref(report)}"><div class="report-row-heading"><span class="report-row-title">${escapeHtml(report.skill.displayName)}</span><span class="status status-${escapeHtml(statusClass)}">${escapeHtml(report.status)}</span></div>${profile}<p class="report-outcome">${escapeHtml(report.outcome)}</p><time class="report-time" datetime="${escapeHtml(report.generatedAt)}">${escapeHtml(formatTimestamp(new Date(report.generatedAt)))}</time></a>`;
}

function groupReadoutProjects(reports) {
  const grouped = new Map();

  for (const report of reports) {
    if (!report.projectKey || !report.projectLabel) continue;

    if (!grouped.has(report.projectKey)) {
      grouped.set(report.projectKey, {
        key: report.projectKey,
        label: report.projectLabel,
        reports: [],
      });
    }

    grouped.get(report.projectKey).reports.push(report);
  }

  return [...grouped.values()].sort((left, right) =>
    right.reports[0].generatedAt.localeCompare(left.reports[0].generatedAt)
    || left.key.localeCompare(right.key));
}

function renderWorkbenchStatus(status) {
  const modifier = status.toLowerCase().replaceAll(" ", "-");

  return `<span class="workbench-status workbench-status-${escapeHtml(modifier)}"><span class="workbench-status-dot" aria-hidden="true"></span>${escapeHtml(status)}</span>`;
}

function formatWorkbenchObservation(value, { numeric = false, suffix = "" } = {}) {
  if (value === undefined) return "Not captured";

  const captured = numeric ? new Intl.NumberFormat("en-US").format(value) : String(value);

  return escapeHtml(`${captured}${suffix}`);
}

function renderWorkbenchObservationSummary(report) {
  const observation = report.observation;

  if (!observation) {
    return '<span class="workbench-run-observation" aria-label="Observed run measurements">Not captured</span>';
  }

  const scope = observation.attributionScope === "skill-run"
    ? "Skill-run"
    : observation.attributionScope === "thread-turn"
      ? "Thread-turn"
      : "Thread-cumulative";
  const inference = observation.inference ?? {};
  const tokens = observation.tokens ?? {};
  const timing = observation.timing ?? {};
  const values = [
    scope,
    formatWorkbenchObservation(observation.measurementSource),
    formatWorkbenchObservation(inference.model),
    formatWorkbenchObservation(inference.reasoningEffort),
    formatWorkbenchObservation(tokens.total, { numeric: true, suffix: " tokens" }),
    formatWorkbenchObservation(timing.activeDurationMs, { numeric: true, suffix: " ms" }),
  ];

  return `<span class="workbench-run-observation" aria-label="Observed ${escapeHtml(scope.toLowerCase())} measurements">${values.join(" · ")}</span>`;
}

function renderWorkbenchObservationDetail(report) {
  const observation = report.observation;
  const scope = observation?.attributionScope === "thread-turn"
    ? "Thread-turn"
    : observation?.attributionScope === "thread-cumulative"
      ? "Thread-cumulative"
      : "Skill-run";
  const inference = observation?.inference ?? {};
  const tokens = observation?.tokens ?? {};
  const timing = observation?.timing ?? {};
  const quality = observation?.quality ?? {};
  const title = observation
    ? `Observed ${scope.toLowerCase()} measurements`
    : "Observed run measurements";
  const measurement = [
    ["Measurement source", formatWorkbenchObservation(observation?.measurementSource)],
    ["Attribution scope", formatWorkbenchObservation(observation?.attributionScope)],
    [`${scope} provider`, formatWorkbenchObservation(inference.provider)],
    [`${scope} model`, formatWorkbenchObservation(inference.model)],
    [`${scope} reasoning effort`, formatWorkbenchObservation(inference.reasoningEffort)],
    [`${scope} input tokens`, formatWorkbenchObservation(tokens.input, { numeric: true })],
    [`${scope} cached input tokens`, formatWorkbenchObservation(tokens.cachedInput, { numeric: true })],
    [`${scope} cache write tokens`, formatWorkbenchObservation(tokens.cacheWrite, { numeric: true })],
    [`${scope} output tokens`, formatWorkbenchObservation(tokens.output, { numeric: true })],
    [`${scope} reasoning output tokens`, formatWorkbenchObservation(tokens.reasoningOutput, { numeric: true })],
    [`${scope} total tokens`, formatWorkbenchObservation(tokens.total, { numeric: true })],
    [`${scope} started`, formatWorkbenchObservation(timing.startedAt)],
    [`${scope} finished`, formatWorkbenchObservation(timing.finishedAt)],
    [`${scope} active duration`, formatWorkbenchObservation(timing.activeDurationMs, { numeric: true, suffix: " ms" })],
    ["Observation captured", formatWorkbenchObservation(observation?.capturedAt)],
  ];
  const evidence = [
    ["Quality evidence source", formatWorkbenchObservation(quality.source)],
    ["Passed checks", formatWorkbenchObservation(quality.passedChecks, { numeric: true })],
    ["Failed checks", formatWorkbenchObservation(quality.failedChecks, { numeric: true })],
    ["Explicit feedback", formatWorkbenchObservation(quality.feedback)],
  ];
  const renderValues = (entries) => entries
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`)
    .join("");

  return `<section class="workbench-detail-section" aria-label="${escapeHtml(title)}"><h3>${escapeHtml(title)}</h3><dl class="workbench-evidence">${renderValues(measurement)}</dl></section><section class="workbench-detail-section" aria-label="Independent quality evidence"><h3>Independent quality evidence</h3><dl class="workbench-evidence">${renderValues(evidence)}</dl></section>`;
}

function matchingWorkbenchRuns(project, query = "", { skill = "", status = "" } = {}) {
  if (!project) return [];

  const search = query.trim().toLowerCase();

  return project.reports.filter((report) =>
    (!skill || report.skill.name === skill)
    && (!status || report.status === status)
    && (!search || [
      project.key,
      project.label,
      report.skill.name,
      report.skill.displayName,
      report.profileTitle,
      report.outcome,
      report.status,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(search))));
}

function renderWorkbenchProjects(projects, {
  activeProject,
  selectedProject,
  selectedReport,
  query = "",
  skill = "",
  status = "",
  previews,
}) {
  if (projects.length === 0) {
    return '<p class="workbench-empty-note">No verified project reports are available.</p>';
  }

  return projects.map((project) => {
    const selected = project.key === selectedProject;
    const actualCount = project.reports.filter((report) => report.status !== "Preview").length;
    const filtered = Boolean(query.trim() || skill || status);
    const latest = selected && filtered
      ? selectedReport ?? project.reports[0]
      : project.reports[0];
    const latestReportAttribute = selected || !filtered
      ? ` data-latest-report="${escapeHtml(latest.relativePath)}"`
      : "";
    const current = project.key === activeProject;
    const currentBadge = current
      ? '<span class="workbench-current">Current project</span>'
      : "";
    const projectSummary = selected || current
      ? ""
      : `<span class="workbench-project-outcome">${escapeHtml(latest.outcome)}</span>${latest.profileTitle ? `<span class="workbench-project-profile">${escapeHtml(latest.profileTitle)}</span>` : ""}`;
    const searchForm = selected
      ? `<form class="search-form" method="get"><input type="hidden" name="project" value="${escapeHtml(project.key)}">${skill ? `<input type="hidden" name="skill" value="${escapeHtml(skill)}">` : ""}${status ? `<input type="hidden" name="status" value="${escapeHtml(status)}">` : ""}${previews ? '<input type="hidden" name="previews" value="1">' : ""}<input class="search-input" type="search" name="q" value="${escapeHtml(query)}" placeholder="Search selected project reports" aria-label="Search selected project reports"><button class="search-submit" type="submit">Search</button></form>`
      : "";
    const nestedRuns = selected
      ? `<nav class="workbench-project-runs" aria-label="Recorded skill runs">${renderWorkbenchRuns(project, selectedReport, { previews, query, skill, status })}</nav>`
      : "";

    return `<article class="project-card${current ? " current" : ""}" data-project="${escapeHtml(project.key)}"><a class="workbench-project${selected ? " is-selected" : ""}"${selected ? ' aria-current="page"' : ""}${latestReportAttribute} href="${workbenchHref({ project: project.key, previews })}"><span class="workbench-project-title">${escapeHtml(project.label)}</span><span class="workbench-project-count">${actualCount}</span>${currentBadge}${projectSummary}</a>${searchForm}${nestedRuns}</article>`;
  }).join("");
}

function renderWorkbenchRuns(project, selectedReport, {
  previews,
  query = "",
  skill = "",
  status = "",
}) {
  if (!project || project.reports.length === 0) {
    return '<p class="workbench-empty-note">No actual skill readouts are available for this verified project.</p>';
  }

  const reports = matchingWorkbenchRuns(project, query, { skill, status });

  if (reports.length === 0) {
    return `<p class="workbench-empty-note">No actual skill readouts match this project search. <a href="${workbenchHref({ project: project.key, previews })}">Clear search</a></p>`;
  }

  return reports.map((report) => {
    const selected = report.relativePath === selectedReport?.relativePath;
    const outcome = selected
      ? ""
      : `<span class="workbench-run-outcome">${escapeHtml(report.outcome)}</span>`;

    return `<a class="workbench-run${selected ? " is-selected" : ""}"${selected ? ' aria-current="true"' : ""} href="${workbenchHref({ project: project.key, query, skill, status, previews, report: report.relativePath })}"><span class="workbench-run-title"><strong>/${escapeHtml(report.skill.name)}</strong><span>${escapeHtml(report.skill.displayName)}</span>${report.profileTitle ? `<span>${escapeHtml(report.profileTitle)}</span>` : ""}</span>${renderWorkbenchStatus(report.status)}${renderWorkbenchObservationSummary(report)}${outcome}<time class="workbench-run-time" datetime="${escapeHtml(report.generatedAt)}">${escapeHtml(formatTimestamp(new Date(report.generatedAt)))}</time></a>`;
  }).join("");
}

const safeStoredReadoutElements = new Set([
  "a", "article", "aside", "br", "caption", "circle", "code", "dd", "defs",
  "desc", "div", "dl", "dt", "em", "figcaption", "figure", "g", "h2", "h3",
  "h4", "hr", "li", "line", "marker", "ol", "p", "path", "polygon", "polyline",
  "pre", "rect", "section", "small", "span", "strong", "svg", "table", "tbody",
  "td", "text", "th", "thead", "time", "title", "tr", "ul",
]);
const safeStoredReadoutAttributes = new Set([
  "class", "cx", "cy", "d", "datetime", "fill", "fill-opacity", "font-size",
  "font-weight", "height", "href", "id", "opacity", "points", "preserveaspectratio",
  "r", "rel", "role", "rx", "ry", "scope", "stroke", "stroke-dasharray",
  "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "stroke-width",
  "tabindex", "text-anchor",
  "title", "transform", "viewbox", "width", "x", "x1", "x2", "y", "y1", "y2",
]);
const voidStoredReadoutElements = new Set(["br", "hr"]);
const safeStoredReadoutRoots = new Map([
  ["section", new Set(["section", "section presentation-issue-sidebar", "section presentation-run-metrics"])],
  ["div", new Set(["metrics", "presentation-summary-panel"])],
  ["figure", new Set(["signal-panel"])],
]);

function allowedStoredReadoutSections(report) {
  const headings = new Set([
    "Top next prompts",
    "Next best skills",
  ]);
  const profile = readoutProfileForSkill(report.skill);
  const capturedProfile = findMetadata(report.document, "report-profile");
  const commands = discoverStoredActionableCode(report.document, "user-command", "commands");
  const keyCode = discoverStoredActionableCode(report.document, "key-code", "keyCode");

  if (commands?.length) headings.add("Commands to run");
  if (keyCode?.length) headings.add("Key code");

  if (report.status !== "Preview") {
    headings.add("Independent quality evidence");
    headings.add("Skill run metrics");
  }

  if (
    findMetadata(report.document, "machine")
    && findMetadata(report.document, "platform")
  ) headings.add("Execution context");

  if (report.observation?.attributionScope === "skill-run") {
    headings.add("Observed skill run");
  } else if (report.observation?.attributionScope === "thread-turn") {
    headings.add("Observed thread-turn context");
  } else if (report.observation?.attributionScope === "thread-cumulative") {
    headings.add("Observed thread-cumulative context");
  }

  if (report.status === "Preview") headings.add("Catalog information");

  if (report.github) headings.add("Relevant open issues");

  if (
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(findMetadata(report.document, "commit-sha"))
    || /^[a-z0-9][a-z0-9._+-]{0,127}$/i.test(findMetadata(report.document, "release-version"))
    || /^[1-9][0-9]{0,9}$/.test(findMetadata(report.document, "pull-request"))
    || /^[1-9][0-9]{0,9}$/.test(findMetadata(report.document, "closed-issue"))
  ) headings.add("Verified delivery evidence");

  if (profile) {
    if (capturedProfile) {
      for (const section of profile.sections) {
        headings.add(profile.labels[section] ?? readoutSectionLabels[section]);
      }
    } else {
      for (const title of Object.values(readoutSectionLabels)) headings.add(title);
    }
  } else {
    for (const heading of [
      "Producer and harness",
      "Observed findings",
      "Recorded decisions",
      "Actual outputs",
      "Observed checks",
      "Producer-reported next prompts",
      "Producer-reported next skills",
    ]) headings.add(heading);
  }

  return headings;
}

function storedReadoutEvidenceSection(report, title) {
  const profile = readoutProfileForSkill(report.skill);

  if (profile) {
    if (findMetadata(report.document, "report-profile")) {
      return profile.sections.find((section) => (
        (profile.labels[section] ?? readoutSectionLabels[section]) === title
      )) ?? null;
    }

    return Object.entries(readoutSectionLabels).find(([, label]) => label === title)?.[0] ?? null;
  }

  return {
    "Observed findings": "findings",
    "Recorded decisions": "decisions",
    "Actual outputs": "outputs",
    "Observed checks": "checks",
  }[title] ?? null;
}

function isGeneratedStoredReadoutEvidence(markup, report, section, title) {
  const generated = markup.match(
    /^<section class="section"><div class="section-heading"><div><p class="eyebrow">([^<]*)<\/p><h2>([^<]*)<\/h2><\/div><span class="section-count">([1-9][0-9]*)<\/span><\/div><div class="detail-grid">([\s\S]*)<\/div><\/section>$/,
  );
  const descriptions = new Set([readoutSectionDescriptions[section]]);

  if (!findMetadata(report.document, "report-profile")) {
    const legacyDescription = {
      findings: "What we learned",
      decisions: "What was decided",
      outputs: "Files, reports, and deliverables",
      checks: "Only validations actually performed",
    }[section];

    if (legacyDescription) descriptions.add(legacyDescription);
  }

  if (
    !generated
    || !descriptions.has(decodeHtml(generated[1]))
    || decodeHtml(generated[2]) !== title
  ) return false;

  const count = Number(generated[3]);

  if (!Number.isSafeInteger(count)) return false;

  const cards = /<article class="detail-card"><div class="detail-heading"><h3>[^<]*<\/h3>(?:<span class="(?:check-badge check-[a-z-]+|priority-badge priority-[a-z0-9-]+)">[^<]*<\/span>)?(?:<a class="item-link" href="[^"]*" rel="noreferrer">Open ↗<\/a>)?<\/div>(?:<p>[^<]*<\/p>)?<\/article>/gy;
  let observed = 0;

  while (cards.lastIndex < generated[4].length) {
    if (!cards.exec(generated[4])) return false;

    observed += 1;
  }

  return observed === count;
}

function decodeStoredReadoutAttribute(value) {
  return decodeHtml(value).replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, encoded) => {
    const codePoint = encoded[0].toLowerCase() === "x"
      ? Number.parseInt(encoded.slice(1), 16)
      : Number.parseInt(encoded, 10);

    return codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : "\uFFFD";
  });
}

function renderSafeStoredReadoutMarkup(content, report) {
  const tokenPattern = /<(?:[^"'<>]|"[^"]*"|'[^']*')*>/g;
  const attributePattern = /\s+([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giy;
  const allowedSections = allowedStoredReadoutSections(report);
  const observedSections = new Set();
  const openElements = [];
  const fragments = [];
  let cursor = 0;
  let rootStart = 0;

  for (const token of content.matchAll(tokenPattern)) {
    const text = content.slice(cursor, token.index);

    if (text.includes("<") || (openElements.length === 0 && text.trim())) return null;

    fragments.push(text);

    const closing = token[0].match(/^<\/\s*([a-z][a-z0-9:-]*)\s*>$/i);

    if (closing) {
      const name = closing[1].toLowerCase();

      if (openElements.at(-1) !== name) return null;

      openElements.pop();
      fragments.push(`</${name === "aside" ? "div" : name}>`);

      if (openElements.length === 0 && name === "section") {
        const rendered = fragments.slice(rootStart).join("");
        const heading = rendered.match(/<h2\b[^>]*>([^<]*)<\/h2>/i);
        const title = heading ? decodeHtml(heading[1]) : "";
        const evidenceSection = storedReadoutEvidenceSection(report, title);
        const actionable = title === "Commands to run"
          ? { commands: discoverStoredActionableCode(report.document, "user-command", "commands"), keyCode: [] }
          : title === "Key code"
            ? { commands: [], keyCode: discoverStoredActionableCode(report.document, "key-code", "keyCode") }
            : null;
        const observedMetrics = title === "Skill run metrics"
          ? renderReadoutRunMetrics(report)
          : null;

        if (
          !allowedSections.has(title)
          || observedSections.has(title)
          || (actionable && (
            !actionable.commands
            || !actionable.keyCode
            || rendered !== renderReadoutActionableCode(actionable)
          ))
          || (observedMetrics !== null && rendered !== observedMetrics)
          || (evidenceSection && !isGeneratedStoredReadoutEvidence(
            rendered,
            report,
            evidenceSection,
            title,
          ))
        ) return null;

        observedSections.add(title);
      }

      cursor = token.index + token[0].length;
      continue;
    }

    const opening = token[0].match(/^<([a-z][a-z0-9:-]*)([\s\S]*?)>$/i);

    if (!opening) return null;

    const name = opening[1].toLowerCase();

    if (!safeStoredReadoutElements.has(name)) return null;

    const root = openElements.length === 0;

    if (name === "section" && !root) return null;

    let source = opening[2];
    const selfClosing = /\/\s*$/.test(source);

    if (selfClosing) source = source.replace(/\/\s*$/, "");

    attributePattern.lastIndex = 0;
    let attributeCursor = 0;
    let renderedAttributes = "";
    let rootClass = "";
    let rootAttributeCount = 0;

    while (attributeCursor < source.length) {
      if (/^\s*$/.test(source.slice(attributeCursor))) break;

      attributePattern.lastIndex = attributeCursor;
      const attribute = attributePattern.exec(source);

      if (!attribute || attribute.index !== attributeCursor) return null;

      const originalName = attribute[1];
      const attributeName = originalName.toLowerCase();

      if (
        !safeStoredReadoutAttributes.has(attributeName)
        && !/^aria-[a-z0-9-]+$/.test(attributeName)
      ) return null;

      const suppliedValue = attribute[2] ?? attribute[3] ?? attribute[4];

      if (suppliedValue === undefined) return null;

      const value = decodeStoredReadoutAttribute(suppliedValue);

      if (root) {
        rootAttributeCount += 1;

        if (attributeName === "class") rootClass = value;
      }

      if (attributeName === "href") {
        let link;

        try {
          link = new URL(value, "https://quickstark.invalid/");
        } catch {
          return null;
        }

        if (
          !new Set(["http:", "https:"]).has(link.protocol)
          || link.username
          || link.password
          || /[\u0000-\u001f\u007f]/.test(value)
        ) return null;
      }

      renderedAttributes += ` ${originalName}="${escapeHtml(value)}"`;
      attributeCursor = attributePattern.lastIndex;
    }

    const outputName = name === "aside" ? "div" : name;

    if (
      root
      && (rootAttributeCount !== 1
        || !safeStoredReadoutRoots.get(name)?.has(rootClass)
        || selfClosing)
    ) return null;

    if (root) rootStart = fragments.length;

    fragments.push(`<${outputName}${renderedAttributes}${selfClosing ? "/" : ""}>`);

    if (!selfClosing && !voidStoredReadoutElements.has(name)) openElements.push(name);

    cursor = token.index + token[0].length;
  }

  const trailing = content.slice(cursor);

  if (trailing.includes("<") || trailing.trim() || openElements.length !== 0) return null;

  fragments.push(trailing);

  return fragments.join("");
}

function renderStoredReadoutContent(report) {
  if (!report?.document) return "";
  if (findMetadata(report.document, "observation-source") && !report.observation) return "";

  const main = report.document.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);

  if (!main) return "";

  const header = main[1].match(/<\/header\s*>/i);

  if (!header) return "";

  let content = main[1].slice(header.index + header[0].length);
  const footer = content.search(/<footer\b/i);

  if (footer !== -1) content = content.slice(0, footer);

  content = renderSafeStoredReadoutMarkup(content, report);

  if (content === null) return "";

  if (
    report.github
    && report.github.openIssueCount === null
    && findMetadata(report.document, "github-open-issues")
    && findMetadata(report.document, "github-open-issues-source") !== "github-issue-search"
  ) {
    content = content.replace(
      /(<span>OPEN ISSUES<\/span><strong>)(?:0|[1-9][0-9]*)(<\/strong><small>)Verified GitHub issues(<\/small>)/g,
      "$1—$2Not independently verified$3",
    );
  }

  content = content.replace(
    /<section class="section presentation-issue-sidebar">[\s\S]*?<\/section>/g,
    "",
  );

  return `<div class="workbench-readout-document" aria-label="Complete immutable skill readout">${content}</div>`;
}

function renderWorkbenchDetail(report) {
  if (!report) {
    return '<div class="workbench-detail-empty"><h2>Select a skill readout</h2><p>Choose an actual skill run to inspect its verified project and immutable outcome.</p></div>';
  }

  return `<div class="workbench-detail-top"><span class="workbench-readonly">Read-only report</span>${renderWorkbenchStatus(report.status)}</div><h2 class="workbench-detail-title">/${escapeHtml(report.skill.name)}</h2><p class="workbench-detail-profile">${escapeHtml(report.skill.displayName)}${report.profileTitle ? ` · ${escapeHtml(report.profileTitle)}` : ""}</p>${renderReadoutProjectMetadata(report)}<a class="workbench-open-report" href="${reportHref(report)}">Open immutable readout <span aria-hidden="true">↗</span></a><section class="workbench-detail-section" aria-label="Observed skill outcome"><h3>Observed outcome</h3><p>${escapeHtml(report.outcome || "The immutable report did not record an outcome.")}</p></section><section class="workbench-detail-section" aria-label="Verified run evidence"><h3>Verified run evidence</h3><dl class="workbench-evidence"><dt>Verified project</dt><dd>${escapeHtml(report.projectLabel)}</dd><dt>Primary skill</dt><dd>/${escapeHtml(report.skill.name)}</dd><dt>Recorded status</dt><dd>${escapeHtml(report.status)}</dd><dt>Generated</dt><dd><time datetime="${escapeHtml(report.generatedAt)}">${escapeHtml(formatTimestamp(new Date(report.generatedAt)))}</time></dd>${report.profileTitle ? `<dt>Report profile</dt><dd>${escapeHtml(report.profileTitle)}</dd>` : ""}</dl></section>${renderStoredReadoutContent(report)}${renderWorkbenchObservationDetail(report)}`;
}

function renderProjectWorkbench(projects, reports, {
  activeProject,
  selectedProject,
  requestedReport,
  previews,
  query = "",
  skill = "",
  status = "",
  previewLink,
  actualCount,
  preferences,
} = {}) {
  const selectedPreferences = normalizeReadoutPreferences(preferences);
  const presentation = `--presentation-feature:${selectedPreferences.featurePx}px;`
    + `--presentation-body:${selectedPreferences.promptPx}px;`
    + `--presentation-support:${Math.max(11, selectedPreferences.promptPx - 1)}px;`;
  const project = projects.find((entry) => entry.key === selectedProject) ?? null;
  const matches = matchingWorkbenchRuns(project, query, { skill, status });
  const selectedReport = matches.find((report) => report.relativePath === requestedReport)
    ?? matches[0]
    ?? null;
  const projectActualCount = project?.reports.filter((report) => report.status !== "Preview").length
    ?? 0;
  const filteredActualCount = matches.filter((report) => report.status !== "Preview").length;
  const matchingCount = project && (query.trim() || skill || status)
    ? `<span class="workbench-run-count" aria-label="Matching actual skill runs">${filteredActualCount} matching</span>`
    : "";
  const projectCount = project
    ? `<span class="workbench-run-count">${projectActualCount} actual skill run${projectActualCount === 1 ? "" : "s"}</span>`
    : "";
  const emptyRuns = project
    ? ""
    : renderWorkbenchRuns(null, null, { previews });
  const unassignedLegacy = renderUnassignedLegacyReports(reports);
  const issueSidebar = Array.isArray(selectedReport?.github?.issues)
    ? `<aside class="workbench-issues" aria-label="Relevant open GitHub issues">${renderReadoutGitHubIssues(selectedReport.github)}</aside>`
    : "";
  const shellClass = issueSidebar
    ? "workbench-shell has-issue-sidebar"
    : "workbench-shell";

  return `<main class="workbench-page" data-preference-size="${selectedPreferences.size}" data-preference-density="${selectedPreferences.density}" style="${presentation}"><header class="workbench-masthead"><a class="workbench-brand" href="./"><span class="workbench-brand-mark">Q</span><span>QuickStark <span>Reports</span></span></a><div class="workbench-masthead-actions"><span class="workbench-private">Authenticated, read-only project library</span><a class="workbench-settings-link" href="/settings">Settings</a></div></header><div class="${shellClass}"><aside class="workbench-sidebar" aria-label="Verified projects"><p class="workbench-rail-heading">Verified projects</p><nav class="workbench-projects" aria-label="Verified projects">${renderWorkbenchProjects(projects, { activeProject, selectedProject, selectedReport, previews, query, skill, status })}</nav>${unassignedLegacy}<footer class="workbench-sidebar-footer">${previewLink ?? ""}</footer></aside><section class="workbench-workspace" aria-label="Skill run readouts"><header class="workbench-workspace-heading"><div><p class="workbench-rail-heading">Project library</p><h1>Project Workbench</h1>${project ? `<p class="workbench-scope">${escapeHtml(project.label)}</p>` : ""}</div>${matchingCount}${projectCount}</header>${emptyRuns}</section><aside class="workbench-detail" aria-label="Selected skill readout">${renderWorkbenchDetail(selectedReport)}</aside>${issueSidebar}</div><footer class="workbench-footer"><span>${actualCount} actual QuickStark report${actualCount === 1 ? "" : "s"}</span><span>Verified projects · immutable readouts · no external scripts</span></footer></main>`;
}

function renderUnassignedLegacyReports(reports) {
  const legacy = reports.filter((report) => !report.projectKey);

  if (legacy.length === 0) return "";

  return `<section class="section workbench-unassigned" aria-label="Unassigned legacy reports"><div class="section-heading"><div><p class="eyebrow">Project identity not verified</p><h2>Unassigned legacy reports</h2></div><span class="section-count">${legacy.length}</span></div><p class="legacy-note">These original reports remain available, but their free-text headings do not prove repository ownership. Associate them with a project only through an explicitly reviewed migration.</p><div class="report-list">${legacy.map((report) => renderUnassignedLegacyReadout(report)).join("")}</div></section>`;
}

async function renderReadoutIndex(directory, {
  searchParams = new URLSearchParams(),
  allowedProjects = null,
  currentProject = null,
  homepage = "workbench",
  preferences,
} = {}) {
  const discovered = await discoverStoredReadouts(directory, { allowedProjects });
  const previews = searchParams.get("previews") === "1";
  const reports = discovered.filter((report) => previews || report.status !== "Preview");
  const projects = groupReadoutProjects(reports);
  let activeProject = currentProject ?? "";

  if (!activeProject) {
    try {
      activeProject = (await discoverReadoutProject()).key;
    } catch {
      // Gallery browsing must remain available when no current Git checkout exists.
    }
  }

  const explicitWorkbench = [
    "project",
    "report",
    "view",
    "previews",
    "skill",
    "status",
  ].some((key) => searchParams.has(key));

  if (homepage === "portfolio" && !explicitWorkbench) {
    const inventory = await readReadoutPortfolioInventory(directory);
    const snapshot = buildReadoutPortfolioSnapshot({
      reports: discovered,
      inventory,
      allowedProjects,
      currentProject: activeProject,
    });
    const body = renderReadoutPortfolio(snapshot, {
      query: (searchParams.get("q") ?? "").slice(0, 160),
      activeProject,
      preferences,
    });

    return renderDocument({
      title: "Portfolio overview",
      body,
      theme: themes.code,
      styles: READOUT_PORTFOLIO_STYLES,
    });
  }

  const requestedProject = searchParams.get("project");
  const projectIsVisible = requestedProject === null
    || projects.some((project) => project.key === requestedProject);
  const selectedProject = projectIsVisible && requestedProject
    ? requestedProject
    : projects.find((project) => project.key === activeProject)?.key
      ?? projects[0]?.key
      ?? "";
  const query = projectIsVisible ? (searchParams.get("q") ?? "").slice(0, 200) : "";
  const requestedSkill = projectIsVisible ? searchParams.get("skill") : null;
  const skill = requestedSkill && externalSkillIdentifier.test(requestedSkill)
    ? requestedSkill
    : "";
  const requestedStatus = projectIsVisible ? searchParams.get("status") : null;
  const status = requestedStatus && statuses.has(requestedStatus)
    ? requestedStatus
    : "";
  const requestedReport = searchParams.get("report");
  const selectedSnapshot = projects.find((project) => project.key === selectedProject) ?? null;
  const safeRequestedReport = projectIsVisible
    ? matchingWorkbenchRuns(selectedSnapshot, query, { skill, status })
      .find((report) => report.relativePath === requestedReport)?.relativePath
    : undefined;
  const actualCount = discovered.filter((report) => report.status !== "Preview").length;
  const previewState = {
    project: selectedProject,
    query,
    skill,
    status,
    report: safeRequestedReport,
  };
  const previewLink = previews
    ? `<a class="preview-toggle" href="${workbenchHref(previewState)}">Hide catalog previews</a>`
    : `<a class="preview-toggle" href="${workbenchHref({ ...previewState, previews: true })}">Show catalog previews</a>`;
  const body = renderProjectWorkbench(projects, reports, {
    activeProject,
    selectedProject,
    requestedReport: safeRequestedReport,
    previews,
    query,
    skill,
    status,
    previewLink,
    actualCount,
    preferences,
  });

  return renderDocument({ title: "Project Workbench", body, theme: themes.code });
}

function sendHtml(response, status, content, { head = false, allowForms = false } = {}) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(content),
    "Cache-Control": "no-store",
    "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action '${allowForms ? "self" : "none"}'`,
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });

  response.end(head ? undefined : content);
}

export function readoutDirectoryIdentity(directory) {
  return createHash("sha256")
    .update(resolve(directory))
    .digest("hex");
}

function sendViewerHealth(response, directory, { head = false } = {}) {
  const body = JSON.stringify({
    service: "quickstark-skill-readouts",
    version: 1,
    directory: readoutDirectoryIdentity(directory),
  });

  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });

  response.end(head ? undefined : body);
}

function tokenMatches(actual, expected) {
  if (!viewerToken.test(actual)) return false;

  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

async function handleReadoutRequest(request, response, directory, accessToken, {
  allowedProjects = null,
  currentProject = null,
  homepage = "workbench",
  trustedProxy = false,
  preferenceSecret = null,
} = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  let requestUrl;

  try {
    requestUrl = new URL(request.url ?? "/", "http://quickstark.invalid");
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid readout path");
    return;
  }

  if (accessToken) {
    const segments = pathname.split("/");

    if (segments[1] !== "r" || !tokenMatches(segments[2] ?? "", accessToken)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Readout not found");
      return;
    }

    pathname = `/${segments.slice(3).join("/")}`;
  }

  if (pathname === "/__quickstark_health") {
    sendViewerHealth(response, directory, { head: request.method === "HEAD" });
    return;
  }

  if (pathname === "/") {
    const user = trustedProxy && typeof request.headers["remote-user"] === "string"
      && /^[a-z0-9][a-z0-9._@-]{0,159}$/i.test(request.headers["remote-user"])
      ? request.headers["remote-user"]
      : null;
    const preferences = user && preferenceSecret
      ? decodeReadoutPreferences(preferenceSecret, user, request.headers.cookie)
      : normalizeReadoutPreferences();

    sendHtml(response, 200, await renderReadoutIndex(directory, {
      searchParams: requestUrl.searchParams,
      allowedProjects,
      currentProject,
      homepage,
      preferences,
    }), {
      head: request.method === "HEAD",
      allowForms: true,
    });
    return;
  }

  const requested = pathname.slice(1);
  const pathSegments = requested.split("/");
  const filename = pathSegments.at(-1);

  if (
    pathSegments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    || !reportFilename.test(filename)
  ) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Readout not found");
    return;
  }

  try {
    const path = resolve(directory, ...pathSegments);
    const relativeRoot = relative(await realpath(directory), await realpath(path));

    if (!relativeRoot || relativeRoot.startsWith(`..${sep}`) || relativeRoot === ".." || isAbsolute(relativeRoot)) {
      throw Object.assign(new Error("Not an allowed readout"), { code: "ENOENT" });
    }

    const metadata = await lstat(path);

    if (!metadata.isFile()) throw Object.assign(new Error("Not a regular file"), { code: "ENOENT" });

    const html = await readFile(path, "utf8");

    if (
      allowedProjects !== null
      && !projectMatchesPublishedScope(allowedProjects, decodeHtml(findMetadata(html, "project")))
    ) {
      throw Object.assign(new Error("Not an allowed readout"), { code: "ENOENT" });
    }

    sendHtml(response, 200, html, {
      head: request.method === "HEAD",
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Readout not found");
  }
}

function sendIngestionJson(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);

  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });

  response.end(body);
}

function normalizeIngestionProducers(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Readout ingestion requires at least one explicitly authorized producer.");
  }

  const producers = new Map();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Readout producers must be explicitly configured objects.");
    }

    const id = requireText(item.id, "Readout producer");
    const token = item.token === undefined
      ? null
      : requireText(item.token, "Readout producer credential");
    const tokenSha256 = item.tokenSha256 === undefined
      ? null
      : requireText(item.tokenSha256, "Readout producer credential digest");

    if (!ingestionIdentifier.test(id)) {
      throw new Error("Readout producer identity must be a safe non-sensitive identifier.");
    }

    if (token !== null && token.length < 24) {
      throw new Error("Readout producer credentials must contain at least 24 characters.");
    }

    if ((token === null) === (tokenSha256 === null)) {
      throw new Error("Each producer requires exactly one bearer credential or SHA-256 credential digest.");
    }

    if (tokenSha256 !== null && !/^[a-f0-9]{64}$/i.test(tokenSha256)) {
      throw new Error("Readout producer credential digest must be a complete SHA-256 value.");
    }

    if (producers.has(id)) throw new Error("Readout producer identities must be unique.");

    const projects = normalizePublishedProjects(item.projects);

    if (projects.size === 0) {
      throw new Error("Every readout producer requires at least one explicitly approved project.");
    }

    producers.set(id, {
      id,
      digest: token === null
        ? Buffer.from(tokenSha256, "hex")
        : createHash("sha256").update(token).digest(),
      projects,
    });
  }

  return producers;
}

async function loadReadoutIngestionProducers(options = {}) {
  if (options.producers !== undefined) {
    return normalizeIngestionProducers(options.producers);
  }

  const configuredPath = options.producersFile ?? process.env.QS_READOUT_PRODUCERS_FILE;

  if (!configuredPath) {
    return normalizeIngestionProducers([]);
  }

  const path = resolve(configuredPath);
  const metadata = await lstat(path);

  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 64 * 1024) {
    throw new Error("Readout producer configuration must be a bounded regular file.");
  }

  let configured;

  try {
    configured = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error("Readout producer configuration must contain valid JSON.");
  }

  if (!configured || typeof configured !== "object" || Array.isArray(configured) || configured.version !== 1) {
    throw new Error("Readout producer configuration must use the supported version.");
  }

  return normalizeIngestionProducers(configured.producers);
}

function authenticateReadoutProducer(value, producers) {
  if (typeof value !== "string" || !value.startsWith("Bearer ")) return null;

  const credential = value.slice("Bearer ".length);

  if (credential.length < 24 || credential.length > 512) return null;

  const digest = createHash("sha256").update(credential).digest();

  for (const producer of producers.values()) {
    if (timingSafeEqual(digest, producer.digest)) return producer;
  }

  return null;
}

async function readIngestionBody(request, maxBytes) {
  const declared = request.headers["content-length"];

  if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    return { error: 413, code: "payload_too_large" };
  }

  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;

    if (size > maxBytes) return { error: 413, code: "payload_too_large" };

    chunks.push(chunk);
  }

  try {
    return { value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { error: 400, code: "invalid_json" };
  }
}

function withinReadoutRateLimit(producer, limits, maxRequestsPerMinute) {
  const now = Date.now();
  const current = limits.get(producer.id);

  if (!current || current.resetAt <= now) {
    limits.set(producer.id, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }

  if (current.count >= maxRequestsPerMinute) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true };
}

function validateIngestionStructure(value, depth = 0) {
  if (depth > 12) throw new Error("Readout submission exceeds the maximum nesting depth.");

  if (typeof value === "string") {
    if (value.length > 16_384) throw new Error("Readout submission exceeds the maximum field length.");
    return;
  }

  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error("Readout submission exceeds the maximum collection size.");
    for (const item of value) validateIngestionStructure(item, depth + 1);
    return;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length > 64) throw new Error("Readout submission exceeds the maximum object size.");

    for (const [key, entry] of entries) {
      if (key.length > 128 || key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new Error("Readout submission contains an unsafe field.");
      }

      validateIngestionStructure(entry, depth + 1);
    }
  }
}

function canonicalIngestionValue(value) {
  if (Array.isArray(value)) return value.map(canonicalIngestionValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      canonicalIngestionValue(value[key]),
    ]));
  }

  return value;
}

async function withIngestionRunLock(locks, key, operation) {
  const pending = (locks.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(operation);

  locks.set(key, pending);

  try {
    return await pending;
  } finally {
    if (locks.get(key) === pending) locks.delete(key);
  }
}

async function ensureContainedReadoutDirectory(directory, segments) {
  const root = await realpath(directory);
  let current = root;

  for (const segment of segments) {
    if (
      typeof segment !== "string"
      || segment.length === 0
      || segment === "."
      || segment === ".."
      || segment.includes("/")
      || segment.includes("\\")
    ) {
      throw Object.assign(new Error("Readout storage contains an unsafe directory segment."), {
        code: "EACCES",
      });
    }

    current = join(current, segment);

    try {
      const metadata = await lstat(current);

      if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
        throw Object.assign(new Error("Readout storage must not contain a symbolic link."), {
          code: "EACCES",
        });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;

      try {
        await mkdir(current, { mode: 0o700 });
      } catch (creationError) {
        if (creationError.code !== "EEXIST") throw creationError;
      }

      const metadata = await lstat(current);

      if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
        throw Object.assign(new Error("Readout storage must not contain a symbolic link."), {
          code: "EACCES",
        });
      }
    }

    const resolved = await realpath(current);
    const fromRoot = relative(root, resolved);

    if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
      throw Object.assign(new Error("Readout storage escaped its authorized project directory."), {
        code: "EACCES",
      });
    }
  }

  return current;
}

async function writeExclusiveIngestionRecord(path, value) {
  const temporary = `${path}.${randomBytes(12).toString("hex")}.pending`;

  await writeFile(temporary, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  try {
    await link(temporary, path);
  } finally {
    try {
      await unlink(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") {
        // A committed immutable record remains valid even if staging cleanup fails.
      }
    }
  }
}

function ingestionReportIdentity(report, external) {
  const timestamp = report.generatedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const prefix = external
    ? `qs-external-${report.skill.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80)}`
    : report.skill.name;
  const filename = `${prefix}--${timestamp}--${report.producer.producer}--${report.reportId.toLowerCase()}.html`;

  return [
    ...report.projectIdentity.key.split("/"),
    String(report.generatedAt.getUTCFullYear()),
    String(report.generatedAt.getUTCMonth() + 1).padStart(2, "0"),
    filename,
  ].join("/");
}

async function ensureCommittedReadout({ directory, relativePath, stagedPath, report }) {
  const segments = relativePath.split("/");
  const filename = segments.pop();
  const parent = await ensureContainedReadoutDirectory(directory, segments);
  const destination = join(parent, filename);

  try {
    const existing = await lstat(destination);

    if (!existing.isFile() || existing.isSymbolicLink()) {
      throw Object.assign(new Error("An existing report is not a safe regular file."), {
        code: "EACCES",
      });
    }

    const html = await readFile(destination, "utf8");

    if (
      decodeHtml(findMetadata(html, "report-id")).toLowerCase() !== report.reportId.toLowerCase()
      || decodeHtml(findMetadata(html, "producer")) !== report.producer.producer
      || decodeHtml(findMetadata(html, "project")) !== report.projectIdentity.key
      || decodeHtml(findMetadata(html, "skill")) !== report.skill.name
    ) {
      throw Object.assign(new Error("An existing report does not match its authorized immutable run."), {
        code: "EEXIST",
      });
    }

    return destination;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await link(stagedPath, destination);

  try {
    await unlink(stagedPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      // The committed immutable report and recovery record remain authoritative.
    }
  }

  return destination;
}

async function acceptReadoutSubmission(envelope, {
  directory,
  baseUrl,
  producer,
  project,
  locks,
}) {
  const observedAt = typeof envelope.generatedAt === "string"
    && observedUtcTimestamp.test(envelope.generatedAt)
    ? new Date(envelope.generatedAt)
    : null;

  if (
    !reportIdentifier.test(envelope.runId ?? "")
    || !statuses.has(envelope.status)
    || envelope.status === "Preview"
    || observedAt === null
    || Number.isNaN(observedAt.getTime())
    || observedAt.toISOString().slice(0, 19) !== envelope.generatedAt.slice(0, 19)
  ) {
    return { error: 422, code: "invalid_readout" };
  }

  const reportInput = {
    skill: envelope.skill,
    status: envelope.status,
    effort: envelope.effort,
    report: envelope.report,
    completionState: envelope.completionState,
    outcome: envelope.outcome,
    generatedAt: envelope.generatedAt,
    reportId: envelope.runId.toLowerCase(),
    projectIdentity: project,
    ingestion: {
      producer: producer.id,
      harness: envelope.harness,
      collection: envelope.collection,
    },
    displayName: envelope.displayName,
    findings: envelope.findings,
    decisions: envelope.decisions,
    outputs: envelope.outputs,
    checks: envelope.checks,
    commands: envelope.commands,
    keyCode: envelope.keyCode,
    observation: envelope.observation,
    gitContext: envelope.gitContext,
    relationships: envelope.relationships,
    nextSkills: envelope.nextSkills,
  };
  const registeredNativeSkill = PUBLIC_COMMANDS_BY_NAME.get(envelope.skill);
  const legacyNativeSkill = registeredNativeSkill === undefined
    ? READOUT_SKILLS_BY_NAME.get(envelope.skill)
    : undefined;
  const expectedNativeCollection = registeredNativeSkill
    ? nativeCollectionIdentifier(registeredNativeSkill)
    : legacyNativeSkill ? "quickstark/qs-skills" : null;
  if (expectedNativeCollection && envelope.collection !== expectedNativeCollection) {
    return { error: 422, code: "invalid_readout" };
  }
  const external = expectedNativeCollection === null;
  let normalized;

  try {
    normalized = external
      ? normalizeExternalSkillReadout(reportInput)
      : normalizeSkillReadout(reportInput);
  } catch {
    return { error: 422, code: "invalid_readout" };
  }

  const runKey = `${producer.id}/${project.key}/${normalized.reportId}`;
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalIngestionValue({
      version: READOUT_FORMAT_VERSION,
      producer: normalized.producer,
      project: normalized.projectIdentity.key,
      skill: normalized.skill.name,
      displayName: external ? normalized.skill.displayName : undefined,
      reportId: normalized.reportId,
      generatedAt: normalized.generatedAt.toISOString(),
      status: normalized.status,
      effort: normalized.effort,
      report: normalized.report,
      completionState: normalized.completionState,
      outcome: normalized.outcome,
      findings: normalized.findings,
      decisions: normalized.decisions,
      outputs: normalized.outputs,
      checks: normalized.checks,
      ...(normalized.commands.length ? { commands: normalized.commands } : {}),
      ...(normalized.keyCode.length ? { keyCode: normalized.keyCode } : {}),
      ...(normalized.observation ? { observation: normalized.observation } : {}),
      ...(normalized.gitContext ? { gitContext: normalized.gitContext } : {}),
      relationships: normalized.relationships,
      nextSkills: normalized.nextSkills,
    })))
    .digest("hex");
  const expectedRelativePath = ingestionReportIdentity(normalized, external);
  const projectSegments = project.key.split("/");
  const recordSegments = [
    ".quickstark-ingestion",
    "runs",
    producer.id,
    ...projectSegments,
  ];
  const recordPath = join(
    directory,
    ...recordSegments,
    `${normalized.reportId}.json`,
  );
  const stageSegments = [
    ".quickstark-ingestion",
    "staging",
    createHash("sha256").update(runKey).digest("hex"),
  ];

  return withIngestionRunLock(locks, runKey, async () => {
    await ensureContainedReadoutDirectory(directory, projectSegments);
    await ensureContainedReadoutDirectory(directory, recordSegments);
    let existing;

    try {
      existing = JSON.parse(await readFile(recordPath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (existing) {
      if (
        existing.digest !== digest
        || existing.relativePath !== expectedRelativePath
        || existing.skill !== normalized.skill.name
      ) {
        return { error: 409, code: "run_conflict" };
      }
    }

    const stageRoot = await ensureContainedReadoutDirectory(directory, stageSegments);
    await ensureContainedReadoutDirectory(stageRoot, expectedRelativePath.split("/").slice(0, -1));
    const stagedPath = join(stageRoot, ...expectedRelativePath.split("/"));
    const finalPath = join(directory, ...expectedRelativePath.split("/"));
    let committed = false;

    try {
      const finalMetadata = await lstat(finalPath);
      committed = finalMetadata.isFile() && !finalMetadata.isSymbolicLink();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (!committed) {
      let staged = false;

      try {
        const stageMetadata = await lstat(stagedPath);
        staged = stageMetadata.isFile() && !stageMetadata.isSymbolicLink();
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      if (!staged) {
        const writeReport = external ? writeExternalSkillReadout : writeSkillReadout;
        const result = await writeReport(reportInput, {
          directory: stageRoot,
          layout: "project",
          baseUrl,
        });

        if (result.relativePath !== expectedRelativePath) {
          throw new Error("Staged readout does not match its authorized immutable identity.");
        }
      }
    }

    if (!existing) {
      await writeExclusiveIngestionRecord(recordPath, {
        digest,
        relativePath: expectedRelativePath,
        skill: normalized.skill.name,
      });
    }

    await ensureCommittedReadout({
      directory,
      relativePath: expectedRelativePath,
      stagedPath,
      report: normalized,
    });

    const url = new URL(expectedRelativePath.split("/").map(encodeURIComponent).join("/"), baseUrl).href;

    return {
      statusCode: existing ? 200 : 201,
      payload: {
        status: existing ? "existing" : "created",
        project: project.key,
        skill: normalized.skill.name,
        reportId: normalized.reportId,
        url,
      },
    };
  });
}

async function handleReadoutIngestion(request, response, {
  directory,
  baseUrl,
  producerState,
  allowedProjects,
  maxBytes,
  locks,
  rates,
  maxRequestsPerMinute,
  audit,
}) {
  let pathname;
  let auditedProducer = null;
  let auditedProject = null;
  const respond = (status, payload, headers = {}) => {
    if (typeof audit === "function") {
      try {
        audit({
          timestamp: new Date().toISOString(),
          ...(auditedProducer ? { producer: auditedProducer } : {}),
          ...(auditedProject ? { project: auditedProject } : {}),
          status,
          outcome: payload.status ?? payload.error,
        });
      } catch {
        // An optional audit adapter must not expose data or interrupt safe request handling.
      }
    }

    sendIngestionJson(response, status, payload, headers);
  };

  try {
    pathname = new URL(request.url ?? "/", "http://quickstark.invalid").pathname;
  } catch {
    respond(400, { error: "invalid_request" });
    return;
  }

  if (pathname === "/__quickstark_ingestion_health" && request.method === "GET") {
    respond(200, {
      service: "quickstark-skill-readout-ingestion",
      version: READOUT_FORMAT_VERSION,
      directory: readoutDirectoryIdentity(directory),
    });
    return;
  }

  if (pathname !== READOUT_INGESTION_PATH) {
    respond(404, { error: "not_found" });
    return;
  }

  if (request.method !== "POST") {
    respond(405, { error: "method_not_allowed" }, { Allow: "POST" });
    return;
  }

  if (producerState.producersFile) {
    try {
      producerState.current = await loadReadoutIngestionProducers({
        producersFile: producerState.producersFile,
      });
    } catch {
      respond(503, { error: "readout_unavailable" });
      return;
    }
  }

  const producer = authenticateReadoutProducer(request.headers.authorization, producerState.current);

  if (!producer) {
    respond(401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });
    return;
  }

  auditedProducer = producer.id;

  const rate = withinReadoutRateLimit(producer, rates, maxRequestsPerMinute);

  if (!rate.allowed) {
    respond(429, { error: "rate_limited" }, {
      "Retry-After": String(rate.retryAfter),
    });
    return;
  }

  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "")) {
    respond(415, { error: "unsupported_content_type" });
    return;
  }

  if (request.headers["content-encoding"] && request.headers["content-encoding"] !== "identity") {
    respond(415, { error: "unsupported_content_encoding" });
    return;
  }

  const received = await readIngestionBody(request, maxBytes);

  if (received.error) {
    respond(received.error, { error: received.code });
    return;
  }

  let envelope = received.value;

  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    respond(422, { error: "invalid_readout" });
    return;
  }

  if (envelope.producer === undefined) {
    envelope = { ...envelope, producer: producer.id };
  }

  try {
    validateIngestionStructure(envelope);
  } catch {
    respond(422, { error: "invalid_readout" });
    return;
  }

  if (envelope.version !== READOUT_FORMAT_VERSION) {
    respond(422, { error: "unsupported_readout_version" });
    return;
  }

  if (envelope.status === "Preview") {
    respond(422, { error: "invalid_readout" });
    return;
  }

  if (envelope.provenance !== undefined && envelope.provenance !== null) {
    respond(422, { error: "unverified_provenance" });
    return;
  }

  if (envelope.producer !== producer.id) {
    respond(403, { error: "publication_not_authorized" });
    return;
  }

  let project;

  try {
    const identified = typeof envelope.project === "string"
      ? normalizeReadoutProject(envelope.project)
      : normalizeProjectIdentity(envelope.project);
    project = normalizeProjectIdentity({
      ...identified,
      label: `${identified.owner}/${identified.repository}`,
    });
  } catch {
    respond(422, { error: "invalid_project" });
    return;
  }

  if (
    !projectMatchesPublishedScope(producer.projects, project.key)
    || !projectMatchesPublishedScope(allowedProjects, project.key)
  ) {
    respond(403, { error: "publication_not_authorized" });
    return;
  }

  auditedProject = project.key;

  try {
    const accepted = await acceptReadoutSubmission(envelope, {
      directory,
      baseUrl,
      producer,
      project,
      locks,
    });

    if (accepted.error) {
      respond(accepted.error, { error: accepted.code });
      return;
    }

    respond(accepted.statusCode, accepted.payload, {
      Location: accepted.payload.url,
    });
  } catch (error) {
    if (error.code === "EEXIST") {
      respond(409, { error: "run_conflict" });
      return;
    }

    respond(503, { error: "readout_unavailable" });
  }
}

export async function startReadoutIngestionServer(options = {}) {
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const host = options.host ?? DEFAULT_READOUT_HOST;
  const port = options.port ?? DEFAULT_READOUT_INGESTION_PORT;
  const base = normalizeBaseUrl(options.baseUrl ?? process.env.QS_READOUT_PUBLIC_URL);

  if (!base) throw new Error("Readout ingestion requires an explicitly configured public report URL.");

  if (typeof host !== "string" || !host.trim() || host === "0.0.0.0" || host === "::") {
    throw new Error("Bind readout ingestion to one trusted host, not every network interface.");
  }

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("Readout ingestion port must be an integer between 0 and 65535.");
  }

  const allowedProjects = normalizePublishedProjects(
    options.allowedProjects ?? process.env.QS_READOUT_ALLOWED_PROJECTS,
  );

  if (allowedProjects.size === 0) {
    throw new Error("Readout ingestion requires at least one explicitly approved published project.");
  }

  const producers = await loadReadoutIngestionProducers(options);
  const producerState = {
    current: producers,
    producersFile: options.producers === undefined
      ? options.producersFile ?? process.env.QS_READOUT_PRODUCERS_FILE ?? null
      : null,
  };
  const maxBytes = options.maxBytes ?? ingestionMaximumBytes;
  const locks = new Map();
  const rates = new Map();
  const maxRequestsPerMinute = options.maxRequestsPerMinute ?? 120;

  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > ingestionMaximumBytes) {
    throw new Error("Readout ingestion requires a safe positive maximum request size.");
  }

  if (!Number.isSafeInteger(maxRequestsPerMinute) || maxRequestsPerMinute < 1 || maxRequestsPerMinute > 10_000) {
    throw new Error("Readout ingestion requires a bounded positive per-producer request rate.");
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });

  const server = createServer((request, response) => {
    handleReadoutIngestion(request, response, {
      directory,
      baseUrl: base.href,
      producerState,
      allowedProjects,
      maxBytes,
      locks,
      rates,
      maxRequestsPerMinute,
      audit: options.audit,
    }).catch(() => {
      if (!response.headersSent) sendIngestionJson(response, 503, { error: "readout_unavailable" });
      else response.end();
    });
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;

  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => {
      server.removeListener("error", fail);
      done();
    });
  });

  const address = server.address();
  const bracketedHost = host.includes(":") ? `[${host}]` : host;

  return {
    server,
    directory,
    host,
    port: address.port,
    baseUrl: base.href,
    url: `http://${bracketedHost}:${address.port}/`,
  };
}

function normalizePublisherEndpoint(value) {
  if (value === undefined || value === null || value === "") return null;

  let endpoint;

  try {
    endpoint = new URL(requireText(value, "Readout ingestion endpoint"));
  } catch {
    throw new Error("Readout ingestion endpoint must be a valid HTTPS URL.");
  }

  if (
    (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopbackHosts.has(endpoint.hostname)))
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
    || endpoint.pathname !== READOUT_INGESTION_PATH
  ) {
    throw new Error("Readout ingestion endpoint must use the exact trusted HTTPS producer route.");
  }

  return endpoint;
}

export async function publishSkillReadout(envelope, options = {}) {
  const token = options.token ?? process.env.QS_READOUT_PRODUCER_TOKEN;
  const endpoint = normalizePublisherEndpoint(
    options.endpoint
      ?? process.env.QS_READOUT_INGESTION_URL
      ?? (typeof token === "string" && token.length >= 24
        ? DEFAULT_READOUT_INGESTION_URL
        : undefined),
  );

  if (!endpoint || typeof token !== "string" || token.length < 24) {
    return { status: "local-only", reason: "publication_not_configured" };
  }

  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("Portable report publication requires a structured skill-readout envelope.");
  }

  const configuredProjects = options.allowedProjects ?? process.env.QS_READOUT_PUBLISH_PROJECTS;
  let project;

  try {
    project = typeof envelope.project === "string"
      ? normalizeReadoutProject(envelope.project)
      : normalizeProjectIdentity(envelope.project);
  } catch {
    return { status: "local-only", reason: "project_not_authorized" };
  }

  let approved;

  if (configuredProjects === undefined || configuredProjects === null || configuredProjects === "") {
    let discovered;

    try {
      discovered = await discoverReadoutProject({ cwd: options.cwd });
    } catch {
      return { status: "local-only", reason: "project_not_authorized" };
    }

    if (discovered.key !== project.key) {
      return { status: "local-only", reason: "project_not_authorized" };
    }

    approved = new Set([discovered.key]);
  } else {
    approved = normalizePublishedProjects(configuredProjects);
  }

  if (!projectMatchesPublishedScope(approved, project.key)) {
    return { status: "local-only", reason: "project_not_authorized" };
  }

  const timeout = options.timeout ?? 5000;
  const maxAttempts = options.maxAttempts
    ?? (process.env.QS_READOUT_PUBLISH_MAX_ATTEMPTS === undefined
      ? 2
      : Number(process.env.QS_READOUT_PUBLISH_MAX_ATTEMPTS));
  const retryDelay = options.retryDelay
    ?? (process.env.QS_READOUT_PUBLISH_RETRY_DELAY === undefined
      ? 50
      : Number(process.env.QS_READOUT_PUBLISH_RETRY_DELAY));

  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 30_000) {
    throw new Error("Portable report publication requires a bounded positive timeout.");
  }

  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new Error("Portable report publication requires between one and five bounded attempts.");
  }

  if (!Number.isSafeInteger(retryDelay) || retryDelay < 0 || retryDelay > 2000) {
    throw new Error("Portable report publication requires a bounded retry delay.");
  }

  let response;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await (options.fetcher ?? fetch)(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(timeout),
        redirect: "error",
      });

      if (response.status !== 429 && response.status < 500) break;
    } catch {
      response = null;
    }

    if (attempt === maxAttempts) {
      return { status: "local-only", reason: "publication_unavailable" };
    }

    if (retryDelay > 0) {
      await new Promise((done) => setTimeout(done, retryDelay));
    }
  }

  if (response.status === 401 || response.status === 403) {
    return { status: "local-only", reason: "publication_not_authorized" };
  }

  if (response.status !== 200 && response.status !== 201) {
    return {
      status: "local-only",
      reason: response.status === 409 ? "run_conflict" : "publication_unavailable",
    };
  }

  let accepted;

  try {
    accepted = await response.json();
    const reportUrl = new URL(accepted.url);
    const configuredBase = options.reportBaseUrl ?? process.env.QS_READOUT_PUBLIC_URL;
    const reportBase = configuredBase
      ? normalizeBaseUrl(configuredBase)
      : endpoint.protocol === "https:"
        ? new URL("/", endpoint)
        : null;
    const encodedProject = project.key.split("/").map(encodeURIComponent);
    const pathname = decodeURIComponent(reportUrl.pathname);
    const expectedProject = `/${encodedProject.join("/")}/`;
    const relativePath = reportBase
      ? pathname.slice(reportBase.pathname.length - 1)
      : pathname;
    const filename = relativePath.split("/").at(-1);
    const expectedRun = String(envelope.runId ?? "").toLowerCase();

    if (
      (reportUrl.protocol !== "https:" && !(reportUrl.protocol === "http:" && loopbackHosts.has(reportUrl.hostname)))
      || reportUrl.username
      || reportUrl.password
      || reportUrl.search
      || reportUrl.hash
      || reportUrl.hostname !== (reportBase?.hostname ?? endpoint.hostname)
      || (reportBase !== null && (
        reportUrl.origin !== reportBase.origin
        || !reportUrl.pathname.startsWith(reportBase.pathname)
      ))
      || !relativePath.startsWith(expectedProject)
      || !reportFilename.test(filename)
      || !filename.toLowerCase().endsWith(`--${expectedRun}.html`)
      || accepted.project !== project.key
      || String(accepted.reportId ?? "").toLowerCase() !== expectedRun
      || accepted.skill !== envelope.skill
    ) {
      throw new Error("The accepted report does not belong to the trusted reporting host.");
    }
  } catch {
    return { status: "local-only", reason: "invalid_publication_response" };
  }

  return {
    status: "published",
    created: response.status === 201,
    project: accepted.project,
    skill: accepted.skill,
    reportId: accepted.reportId,
    url: accepted.url,
  };
}

export async function startReadoutServer(options = {}) {
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const host = options.host ?? DEFAULT_READOUT_HOST;
  const port = options.port ?? DEFAULT_READOUT_PORT;
  const homepage = options.homepage ?? process.env.QS_READOUT_HOMEPAGE ?? "workbench";

  if (homepage !== "workbench" && homepage !== "portfolio") {
    throw new Error("Readout homepage must be workbench or portfolio.");
  }

  if (typeof host !== "string" || host.trim().length === 0) {
    throw new Error("Readout host must be a non-empty hostname or IP address.");
  }

  if (host === "0.0.0.0" || host === "::") {
    throw new Error("Bind the viewer to a specific trusted home-network address, not every interface.");
  }

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("Readout port must be an integer between 0 and 65535.");
  }

  const publicationMode = options.publicationMode ?? process.env.QS_READOUT_PUBLICATION_MODE ?? "local";

  if (publicationMode !== "local" && publicationMode !== "hosted") {
    throw new Error("Readout publication mode must be local or hosted.");
  }

  const publishedProjects = normalizePublishedProjects(
    options.allowedProjects ?? process.env.QS_READOUT_ALLOWED_PROJECTS,
  );

  if (publicationMode === "hosted" && publishedProjects.size === 0) {
    throw new Error("Hosted report publication requires at least one explicitly approved project.");
  }

  const allowedProjects = publicationMode === "hosted" ? publishedProjects : null;
  const configuredCurrentProject = options.currentProject ?? process.env.QS_READOUT_CURRENT_PROJECT;
  const currentProject = configuredCurrentProject
    ? explicitReadoutProject(configuredCurrentProject).key
    : null;

  if (
    allowedProjects !== null
    && currentProject !== null
    && !projectMatchesPublishedScope(allowedProjects, currentProject)
  ) {
    throw new Error("The hosted current project must be explicitly approved for publication.");
  }

  const trustedProxy = options.trustedProxy
    ?? (process.env.QS_READOUT_TRUSTED_PROXY === "true");

  if (typeof trustedProxy !== "boolean") {
    throw new Error("Trusted reverse-proxy mode must be explicitly enabled or disabled.");
  }

  if (trustedProxy && publicationMode !== "hosted") {
    throw new Error("A trusted reverse proxy requires hosted publication and approved projects.");
  }

  const preferenceSecret = await loadReadoutPreferenceSecret({
    secret: options.preferenceSecret,
    path: options.preferenceSecretFile ?? process.env.QS_READOUT_PREFERENCE_SECRET_FILE,
  });

  const accessToken = trustedProxy
    ? null
    : options.accessToken
      ?? process.env.QS_READOUT_VIEWER_TOKEN
      ?? (loopbackHosts.has(host) ? null : randomBytes(24).toString("hex"));

  if (accessToken !== null && !viewerToken.test(accessToken)) {
    throw new Error("Readout viewer token must contain 48 lowercase hexadecimal characters.");
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });

  const server = createServer((request, response) => {
    handleReadoutRequest(request, response, directory, accessToken, {
      allowedProjects,
      currentProject,
      homepage,
      trustedProxy,
      preferenceSecret,
    }).catch(() => {
      if (!response.headersSent) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }

      response.end("Unable to load this readout");
    });
  });

  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => {
      server.removeListener("error", fail);
      done();
    });
  });

  const address = server.address();
  const bracketedHost = host.includes(":") ? `[${host}]` : host;
  const accessPath = accessToken ? `/r/${accessToken}/` : "/";

  return {
    server,
    host,
    port: address.port,
    directory,
    accessToken,
    publicationMode,
    trustedProxy,
    currentProject,
    url: `http://${bracketedHost}:${address.port}${accessPath}`,
  };
}

async function verifyReadoutViewer(baseUrl, { directory } = {}) {
  try {
    const base = normalizeBaseUrl(baseUrl);

    if (!base) return false;

    const response = await fetch(new URL("__quickstark_health", base), {
      signal: AbortSignal.timeout(1000),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return false;

    const payload = await response.json();

    return payload.service === "quickstark-skill-readouts"
      && payload.version === 1
      && (directory === undefined || payload.directory === readoutDirectoryIdentity(directory));
  } catch {
    return false;
  }
}

async function readViewerState(directory) {
  const path = join(directory, READOUT_VIEWER_STATE);

  try {
    const metadata = await lstat(path);

    if (!metadata.isFile()) return null;

    const state = JSON.parse(await readFile(path, "utf8"));

    if (!state || typeof state !== "object" || typeof state.url !== "string") {
      return null;
    }

    return state;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function readoutPortAvailable(host, port) {
  return new Promise((done, fail) => {
    const probe = createPortProbe();

    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        done(false);
        return;
      }

      fail(error);
    });

    probe.listen(port, host, () => {
      probe.close((error) => error ? fail(error) : done(true));
    });
  });
}

async function selectReadoutPort(host, first, { explicit }) {
  if (explicit) {
    if (!(await readoutPortAvailable(host, first))) {
      throw new Error(`The explicitly requested readout port ${first} is already in use.`);
    }

    return first;
  }

  for (let offset = 0; offset < 20; offset += 1) {
    const candidate = first + offset;

    if (candidate > 65_535) break;
    if (await readoutPortAvailable(host, candidate)) return candidate;
  }

  throw new Error(`No available QuickStark readout port was found starting at ${first}.`);
}

export async function ensureReadoutViewer(options = {}) {
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const host = resolveReadoutViewerHost(options);
  const explicitPort = options.port !== undefined;
  const requestedPort = explicitPort
    ? Number(options.port)
    : Number(options.defaultPort ?? DEFAULT_READOUT_PORT);

  if (!Number.isInteger(requestedPort) || requestedPort <= 0 || requestedPort > 65_535) {
    throw new Error("An automatic readout viewer requires a port between 1 and 65535.");
  }

  const configuredBase = options.baseUrl ?? process.env.QS_READOUT_BASE_URL;

  if (configuredBase) {
    const base = normalizeBaseUrl(configuredBase);

    if (!(await verifyReadoutViewer(base.href, { directory }))) {
      throw new Error(
        "The configured QuickStark readout viewer is unreachable or serves a different report directory.",
      );
    }

    return {
      directory,
      host: base.hostname,
      port: Number(base.port) || (base.protocol === "https:" ? 443 : 80),
      url: base.href,
      reused: true,
    };
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });

  const existing = await readViewerState(directory);

  if (
    existing
    && existing.host === host
    && (!explicitPort || existing.port === requestedPort)
    && await verifyReadoutViewer(existing.url, { directory })
  ) {
    return { ...existing, directory, reused: true };
  }

  if (
    existing
    && existing.host === host
    && (!explicitPort || existing.port === requestedPort)
    && existing.launcher === "systemd-transient"
    && typeof existing.unit === "string"
    && /^quickstark-readouts-[a-f0-9]{16}$/.test(existing.unit)
    && await verifyReadoutViewer(existing.url)
  ) {
    try {
      await execFileAsync("systemctl", ["--user", "stop", existing.unit], {
        timeout: 5000,
        windowsHide: true,
        maxBuffer: 64 * 1024,
      });
    } catch (error) {
      throw new Error(
        `The outdated QuickStark readout viewer could not be refreshed safely: ${error.message}`,
        { cause: error },
      );
    }
  }

  const port = await selectReadoutPort(host, requestedPort, {
    explicit: explicitPort,
  });

  const accessToken = loopbackHosts.has(host) ? null : randomBytes(24).toString("hex");
  const bracketedHost = host.includes(":") ? `[${host}]` : host;
  const accessPath = accessToken ? `/r/${accessToken}/` : "/";
  const url = `http://${bracketedHost}:${port}${accessPath}`;
  const arguments_ = [
    fileURLToPath(import.meta.url),
    "serve",
    "--host", host,
    "--port", String(port),
    "--directory", directory,
  ];
  const environment = { ...process.env };

  if (accessToken) {
    environment.QS_READOUT_VIEWER_TOKEN = accessToken;
  } else {
    delete environment.QS_READOUT_VIEWER_TOKEN;
  }

  const selectedAccess = options.access ?? process.env.QS_READOUT_ACCESS ?? "auto";
  const useManagedService = options.useManagedService
    ?? (platform() === "linux" && (!loopbackHosts.has(host) || selectedAccess === "ssh"));
  let child;
  let unit;

  if (useManagedService) {
    const fingerprint = createHash("sha256")
      .update(`${directory}\u0000${host}\u0000${port}`)
      .digest("hex")
      .slice(0, 16);

    unit = `quickstark-readouts-${fingerprint}`;

    const serviceArguments = [
      "--user",
      "--quiet",
      "--collect",
      `--unit=${unit}`,
      "--description=QuickStark on-demand skill readouts",
    ];

    if (accessToken) {
      serviceArguments.push(`--setenv=QS_READOUT_VIEWER_TOKEN=${accessToken}`);
    }

    serviceArguments.push(process.execPath, ...arguments_);

    try {
      await execFileAsync("systemd-run", serviceArguments, {
        timeout: 5000,
        windowsHide: true,
        maxBuffer: 64 * 1024,
      });
    } catch (error) {
      throw new Error(
        `The home-network readout viewer could not start as a transient user service: ${error.message}`,
        { cause: error },
      );
    }
  } else {
    child = spawn(process.execPath, arguments_, {
      detached: platform() !== "win32",
      stdio: "ignore",
      windowsHide: true,
      env: environment,
    });

    await new Promise((done, fail) => {
      child.once("error", fail);
      child.once("spawn", done);
    });

    child.unref();
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await verifyReadoutViewer(url, { directory })) {
      const state = {
        service: "quickstark-skill-readouts",
        host,
        port,
        url,
        pid: child?.pid ?? null,
        unit: unit ?? null,
        launcher: unit ? "systemd-transient" : "detached",
      };

      await writeFile(join(directory, READOUT_VIEWER_STATE), `${JSON.stringify(state, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });

      return { ...state, directory, reused: false };
    }

    await new Promise((done) => setTimeout(done, 75));
  }

  throw new Error(`The automatic QuickStark readout viewer did not become ready at ${url}.`);
}

async function verifyReportedReadout(result) {
  if (!result.url) return;

  try {
    const response = await fetch(result.url, {
      method: "HEAD",
      signal: AbortSignal.timeout(1000),
    });

    if (!response.ok || !response.headers.get("content-type")?.startsWith("text/html")) {
      throw new Error(`the viewer returned HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `The generated QuickStark readout could not be verified at its actual URL: ${error.message}`,
      { cause: error },
    );
  }
}

function parseOptions(arguments_) {
  const parsed = {};

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (["--json", "--no-serve", "--require-hosted", "--apply", "--dry-run", "--trusted-proxy"].includes(argument)) {
      const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      if (parsed[key]) throw new Error(`${argument} was specified more than once.`);
      parsed[key] = true;
      continue;
    }

    if (!["--input", "--data", "--skill", "--collection", "--directory", "--target-directory", "--base-url", "--report-base-url", "--host", "--port", "--access", "--layout", "--project", "--retention-days", "--allowed-projects", "--publication-mode", "--endpoint", "--producers-file", "--max-bytes", "--max-requests-per-minute", "--max-attempts", "--retry-delay", "--timeout"].includes(argument)) {
      throw new Error(`Unknown readout option: ${argument}`);
    }

    const value = arguments_[index + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.`);
    }

    const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (parsed[key] !== undefined) throw new Error(`${argument} was specified more than once.`);
    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function printHelp() {
  console.log(`QuickStark skill readouts

Usage:
  node scripts/qs-skill-readout.mjs render --input /absolute/readout.json
  node scripts/qs-skill-readout.mjs render --data '{"skill":"qs-help","completionState":"complete","outcome":"Selected the right workflow."}'
  node scripts/qs-skill-readout.mjs visual --skill qs-design-architecture --input /absolute/visual.html
  node scripts/qs-skill-readout.mjs gallery [--collection qs-skills|qs-specialists|ps-skills]
  node scripts/qs-skill-readout.mjs serve [--host 127.0.0.1] [--port 4173]
  node scripts/qs-skill-readout.mjs ingest --producers-file /secure/producers.json
  node scripts/qs-skill-readout.mjs publish --input /absolute/readout-envelope.json
  node scripts/qs-skill-readout.mjs migrate --project github.com/owner/repository
  node scripts/qs-skill-readout.mjs prune --project github.com/owner/repository --retention-days 90

Options:
  --skill NAME      Actual promoted skill that produced a browser visual.
  --collection NAME Generate gallery previews for one registered collection.
  --directory PATH  Store or serve reports from a specific directory.
  --target-directory PATH  Optional durable destination for legacy migration.
  --layout MODE     Use flat compatibility or durable project-organized paths.
  --access MODE     Select auto, local, lan, or ssh access.
  --base-url URL    Reuse and verify an existing HTTP(S) report viewer.
  --report-base-url URL  Verify accepted reports against the exact trusted viewer origin.
  --endpoint URL    Exact trusted HTTPS skill-readout ingestion endpoint.
  --producers-file  Versioned producer grants containing only credential digests.
  --max-bytes       Bounded maximum JSON ingestion request size.
  --max-requests-per-minute  Bounded producer submission rate.
  --max-attempts    Bounded publisher attempts; accepts only 1 through 5.
  --retry-delay     Bounded publisher retry delay in milliseconds; accepts 0 through 2000.
  --timeout         Bounded publisher request timeout in milliseconds.
  --project KEY     Explicit canonical target for migration or retention.
  --apply           Apply an explicitly reviewed migration or deletion.
  --dry-run         Explicitly request the default non-mutating preview.
  --retention-days  Project-specific retention window in whole days.
  --publication-mode MODE  Choose local or fail-closed hosted publication.
  --allowed-projects KEYS  Comma-separated canonical hosted project allowlist.
  --trusted-proxy   Accept an authenticated, private-network reverse proxy.
  --no-serve        Generate the HTML file without starting a viewer.
  --require-hosted  Require authenticated hosted publication; never fall back to a private viewer.
  --json            Print machine-readable render or gallery results.

Environment:
  QS_READOUT_DIR               Report directory; defaults to the OS temporary directory.
  QS_READOUT_HOMEPAGE          workbench or portfolio; defaults to workbench.
  QS_READOUT_LAYOUT            flat or project; persistent directories default to project.
  QS_READOUT_ACCESS            auto, local, lan, or ssh; defaults to auto.
  QS_READOUT_BASE_URL          Existing verified viewer URL for generated report links.
  QS_READOUT_PUBLICATION_MODE  local or hosted; defaults to private local access.
  QS_READOUT_ALLOWED_PROJECTS  Explicit canonical hosted project allowlist.
  QS_READOUT_CURRENT_PROJECT   Explicit canonical active project for hosted viewers.
  QS_READOUT_TRUSTED_PROXY     true only behind the authenticated private reverse proxy.
  QS_READOUT_PUBLIC_URL        Canonical public HTTPS report-library origin.
  QS_READOUT_PRODUCERS_FILE    Private versioned producer-grants JSON path.
  QS_READOUT_INGESTION_URL     Optional override for the trusted default reports API.
  QS_READOUT_PRODUCER_ID       Optional explicit producer; bearer authentication derives it.
  QS_READOUT_PRODUCER_TOKEN    Only required setting; privately configured bearer credential.
  QS_READOUT_PUBLISH_PROJECTS  Optional tighter project restriction; Git origin is inferred.
  QS_READOUT_HARNESS           Actual Codex, Claude, or other publishing harness.
  QS_READOUT_PUBLISH_MAX_ATTEMPTS  Publisher attempts; 1 through 5, defaults to 2.
  QS_READOUT_PUBLISH_RETRY_DELAY  Retry delay in milliseconds; 0 through 2000, defaults to 50.

Automatic behavior:
  Every promoted skill uses render --require-hosted and publishes its accepted
  report to https://reports.quickstark.com/ without starting a local viewer.
  Codex also securely discovers an owner-only producer credential from its
  current profile or the platform-standard private QuickStark token file.
  Separate .codex and .codex-demo profiles retain independent credentials.
  Missing credentials or rejected publication fail clearly and preserve an
  immutable private recovery report without displaying a filesystem or IP URL.
  Private localhost, home-network, and SSH viewers remain available only when
  explicitly requested; no Tailscale or always-on service is needed.

Privacy:
  Use --access ssh to keep a remote viewer on localhost for SSH port forwarding.
  Home-network viewers bind to one private IP, never every network interface.`);
}

export async function runReadoutCli(arguments_ = process.argv.slice(2)) {
  const [command, ...rest] = arguments_;

  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  const options = parseOptions(rest);

  if (options.requireHosted && command !== "render") {
    throw new Error("The --require-hosted option applies only to the render command.");
  }

  if (options.collection !== undefined && command !== "gallery") {
    throw new Error("The --collection option applies only to the gallery command.");
  }

  if (options.apply && options.dryRun) {
    throw new Error("Choose either --apply or --dry-run, not both.");
  }

  if (command === "render") {
    if (Boolean(options.input) === Boolean(options.data)) {
      throw new Error("render requires exactly one of --input or --data.");
    }

    const raw = options.input ? await readFile(resolve(options.input), "utf8") : options.data;
    const supplied = JSON.parse(raw);
    const capturedObservation = supplied.observation === undefined && supplied.status !== "Preview"
      ? await captureCodexSkillObservation(supplied.skill)
      : null;
    const input = capturedObservation
      ? { ...supplied, observation: capturedObservation }
      : supplied;
    const privateViewerExplicitlyRequested = options.access === "local"
      || options.access === "lan"
      || options.access === "ssh";

    if (options.requireHosted && privateViewerExplicitlyRequested) {
      throw new Error("Hosted QuickStark reporting cannot be combined with a local, LAN, or SSH viewer.");
    }

    let result = options.requireHosted
      ? await writeSkillReadout(input, {
        ...options,
        baseUrl: options.baseUrl,
      })
      : null;

    let requiredHostedEndpoint;

    if (options.requireHosted) {
      requiredHostedEndpoint = normalizePublisherEndpoint(
        options.endpoint
          ?? process.env.QS_READOUT_INGESTION_URL
          ?? DEFAULT_READOUT_INGESTION_URL,
      );

      if (requiredHostedEndpoint?.href !== DEFAULT_READOUT_INGESTION_URL) {
        throw new Error(
          "Hosted QuickStark reporting requires the canonical "
          + "https://reports.quickstark.com/api/v1/readouts endpoint; "
          + "the immutable local report was preserved without sending a producer credential.",
        );
      }
    }

    let producerToken;

    try {
      producerToken = privateViewerExplicitlyRequested
        ? null
        : await resolveReadoutProducerToken();
    } catch (error) {
      if (!options.requireHosted) throw error;

      throw new Error(
        "Hosted QuickStark reporting requires a valid, safe producer credential; "
        + "the immutable local report was preserved without starting a private viewer.",
        { cause: error },
      );
    }

    const hostedPublicationConfigured = typeof producerToken === "string";
    const viewer = options.noServe || options.requireHosted || hostedPublicationConfigured
      ? null
      : await ensureReadoutViewer(options);

    result ??= await writeSkillReadout(input, {
      ...options,
      baseUrl: viewer?.url ?? options.baseUrl,
    });

    if (viewer) await verifyReportedReadout(result);

    if (options.requireHosted && !hostedPublicationConfigured) {
      throw new Error(
        "Hosted QuickStark reporting requires a securely installed producer token; "
        + "the immutable local report was preserved without starting a private viewer.",
      );
    }

    const publication = hostedPublicationConfigured
      ? await publishSkillReadout({
        version: READOUT_FORMAT_VERSION,
        producer: process.env.QS_READOUT_PRODUCER_ID,
        harness: {
          name: process.env.QS_READOUT_HARNESS ?? "codex",
          ...(process.env.QS_READOUT_HARNESS_VERSION ? {
            version: process.env.QS_READOUT_HARNESS_VERSION,
          } : {}),
        },
        collection: result.collection,
        project: result.projectIdentity,
        runId: result.reportId,
        generatedAt: result.generatedAt,
        skill: result.skill,
        status: result.status,
        effort: result.effort,
        report: result.report,
        completionState: result.completionState,
        outcome: input.outcome,
        findings: input.findings,
        decisions: input.decisions,
        outputs: input.outputs,
        checks: input.checks,
        commands: input.commands,
        keyCode: input.keyCode,
        observation: input.observation,
        ...(result.gitContext ? {
          gitContext: {
            projectKey: result.projectIdentity.key,
            ...result.gitContext,
          },
        } : {}),
        relationships: input.relationships,
        nextSkills: input.nextSkills,
      }, {
        token: producerToken,
        ...(options.requireHosted ? { endpoint: requiredHostedEndpoint.href } : {}),
      })
      : null;

    if (options.requireHosted && publication?.status !== "published") {
      throw new Error(
        `Hosted QuickStark reporting failed (${publication?.reason ?? "publication_unavailable"}); `
        + "the immutable local report was preserved without starting a private viewer.",
      );
    }

    if (options.requireHosted) {
      const actualOrigin = new URL(publication.url).origin;

      if (actualOrigin !== new URL(DEFAULT_READOUT_INGESTION_URL).origin) {
        throw new Error(
          "Hosted QuickStark reporting accepted a URL outside the canonical "
          + "https://reports.quickstark.com domain; the immutable local report was preserved.",
        );
      }
    }

    if (publication?.status === "published") {
      result = { ...result, url: publication.url };
    }

    if (options.json) {
      console.log(JSON.stringify({
        ...result,
        viewerReused: viewer?.reused ?? null,
        ...(publication ? { publication } : {}),
      }));
    } else if (options.requireHosted) {
      console.log(`QuickStark readout: ${result.url}`);
    } else {
      console.log(`QuickStark readout: ${result.path}`);
      if (result.url) console.log(`Verified readout: ${result.url}`);
      if (viewer) console.log(`Readout gallery: ${viewer.url}`);
      if (publication?.status === "published") {
        console.log(`Published readout: ${publication.url}`);
      } else if (publication) {
        console.log(`Hosted publication: local only (${publication.reason})`);
      }
    }

    return;
  }

  if (command === "visual") {
    if (!options.input || !options.skill) {
      throw new Error("visual requires both --input and --skill.");
    }

    if (options.noServe && !options.baseUrl) {
      throw new Error("A browser visual requires an actual HTTP or HTTPS base URL.");
    }

    const viewer = options.baseUrl ? null : await ensureReadoutViewer(options);
    const result = await writeReadoutVisualArtifact({
      skill: options.skill,
      source: options.input,
    }, {
      ...options,
      baseUrl: viewer?.url ?? options.baseUrl,
    });

    await verifyReportedReadout(result);

    if (options.json) {
      console.log(JSON.stringify({
        ...result,
        viewerReused: viewer?.reused ?? null,
      }));
    } else {
      console.log("Browser visual: " + result.url);
      console.log("Preserved visual: " + result.path);
    }

    return;
  }

  if (command === "publish") {
    if (Boolean(options.input) === Boolean(options.data)) {
      throw new Error("publish requires exactly one of --input or --data.");
    }

    const raw = options.input ? await readFile(resolve(options.input), "utf8") : options.data;
    const result = await publishSkillReadout(JSON.parse(raw), {
      endpoint: options.endpoint,
      allowedProjects: options.allowedProjects,
      reportBaseUrl: options.reportBaseUrl,
      ...(options.maxAttempts === undefined ? {} : { maxAttempts: Number(options.maxAttempts) }),
      ...(options.retryDelay === undefined ? {} : { retryDelay: Number(options.retryDelay) }),
      ...(options.timeout === undefined ? {} : { timeout: Number(options.timeout) }),
    });

    if (options.json) {
      console.log(JSON.stringify(result));
    } else if (result.status === "published") {
      console.log(`Published readout: ${result.url}`);
    } else {
      console.log(`Hosted publication: local only (${result.reason})`);
    }

    return;
  }

  if (command === "gallery") {
    const viewer = options.noServe ? null : await ensureReadoutViewer(options);
    const results = await writeSkillGallery({
      ...options,
      baseUrl: viewer?.url ?? options.baseUrl,
    });

    if (viewer) await Promise.all(results.map(verifyReportedReadout));

    if (options.json) {
      console.log(JSON.stringify(results));
    } else {
      console.log(`Generated ${results.length} clearly labeled QuickStark skill previews.`);
      console.log(`Readout directory: ${results[0].directory}`);
      if (viewer) console.log(`Verified readout gallery: ${viewer.url}`);
    }

    return;
  }

  if (command === "ingest") {
    const port = options.port === undefined ? DEFAULT_READOUT_INGESTION_PORT : Number(options.port);
    const ingestion = await startReadoutIngestionServer({
      directory: options.directory,
      host: options.host,
      port,
      baseUrl: options.baseUrl,
      allowedProjects: options.allowedProjects,
      producersFile: options.producersFile,
      ...(options.maxBytes === undefined ? {} : { maxBytes: Number(options.maxBytes) }),
      ...(options.maxRequestsPerMinute === undefined ? {} : {
        maxRequestsPerMinute: Number(options.maxRequestsPerMinute),
      }),
      audit: (event) => process.stderr.write(`${JSON.stringify(event)}\n`),
    });

    console.log(`QuickStark readout ingestion: ${ingestion.url}`);
    console.log(`Readout directory: ${ingestion.directory}`);
    console.log("Producer submissions require explicit bearer authentication and project grants.");
    return;
  }

  if (command === "serve") {
    const port = options.port === undefined ? DEFAULT_READOUT_PORT : Number(options.port);
    const viewer = await startReadoutServer({
      directory: options.directory,
      host: options.host ?? (options.access ? resolveReadoutViewerHost(options) : DEFAULT_READOUT_HOST),
      port,
      publicationMode: options.publicationMode,
      allowedProjects: options.allowedProjects,
      trustedProxy: options.trustedProxy,
    });

    console.log(`QuickStark readout viewer: ${viewer.url}`);
    console.log(`Readout directory: ${viewer.directory}`);

    if (viewer.trustedProxy) {
      console.log("Hosted access requires the authenticated reverse proxy and explicitly approved projects.");
    } else if (!loopbackHosts.has(viewer.host)) {
      console.log("Home-network access is protected by an unguessable, report-only URL.");
    }

    return;
  }

  if (command === "migrate" || command === "prune") {
    const result = command === "migrate"
      ? await migrateLegacyReadouts(options)
      : await pruneReadouts(options);

    if (options.json) {
      console.log(JSON.stringify(result));
    } else {
      console.log(`${result.dryRun ? "Dry run" : "Applied"}: ${command} for ${result.project}`);
      console.log(`Candidate reports: ${result.candidates}`);

      for (const report of result.reports) {
        console.log(`${report.status}: ${report.source ?? report.path}${report.target ? ` -> ${report.target}` : ""}`);
      }

      if (result.dryRun) console.log("No files changed. Repeat with --apply only after reviewing the reports.");
    }

    return;
  }

  throw new Error(`Unknown readout command: ${command}`);
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    await runReadoutCli();
  } catch (error) {
    console.error(`QuickStark readout: ${error.message}`);
    process.exitCode = 1;
  }
}
