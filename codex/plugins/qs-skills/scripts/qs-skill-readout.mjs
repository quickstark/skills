import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { lstat, mkdir, readFile, readdir, realpath, unlink, writeFile } from "node:fs/promises";
import { createServer as createPortProbe } from "node:net";
import { networkInterfaces, platform, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  COLLECTION_NAME,
  NEXT_SKILLS_BY_NAME,
  SKILLS,
  SKILLS_BY_NAME,
} from "./qs-skill-catalog.mjs";

export const DEFAULT_READOUT_DIRECTORY = join(tmpdir(), "quickstark-readouts");
export const DEFAULT_READOUT_HOST = "127.0.0.1";
export const DEFAULT_READOUT_PORT = 4173;
export const READOUT_VIEWER_STATE = ".quickstark-readout-viewer.json";
export const READOUT_FORMAT_VERSION = 1;

const statuses = new Set(["Completed", "Awaiting input", "Blocked", "Preview"]);
const checkStatuses = new Set(["passed", "failed", "skipped", "info"]);
const reportFilename = /^qs-[a-z0-9-]+--\d{4}-\d{2}-\d{2}T[\d-]+Z--[a-f0-9]{8}\.html$/;
const viewerToken = /^[a-f0-9]{48}$/;
const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);
const accessModes = new Set(["auto", "local", "lan", "ssh"]);
const readoutLayouts = new Set(["flat", "project"]);
const projectSources = new Set(["git-origin", "git-root", "workspace", "explicit"]);
const projectSegment = /^[a-z0-9._-]+$/i;
const reportIdentifier = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const execFileAsync = promisify(execFile);

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

function normalizeItems(items, label, { checks = false } = {}) {
  if (items === undefined) return [];
  if (!Array.isArray(items)) throw new Error(`${label} must be an array.`);

  return items.map((item, index) => {
    if (typeof item === "string") {
      return { title: requireText(item, `${label}[${index}]`), detail: "" };
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label}[${index}] must be text or an object.`);
    }

    const normalized = {
      title: requireText(item.title ?? item.label, `${label}[${index}].title`),
      detail: item.detail === undefined ? "" : requireText(item.detail, `${label}[${index}].detail`),
      href: item.href ?? item.url,
    };

    if (normalized.href !== undefined) {
      normalized.href = requireText(normalized.href, `${label}[${index}].href`);
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

function normalizeRecommendations(skill, recommendations) {
  const allowed = NEXT_SKILLS_BY_NAME[skill.name];
  const selected = recommendations === undefined ? allowed : recommendations;

  if (!Array.isArray(selected) || selected.length > 3) {
    throw new Error("nextSkills must contain no more than three catalog recommendations.");
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
    const catalogRecommendation = allowed.find((item) => item.name === name);

    if (!catalogRecommendation) {
      throw new Error(`/${name} is not an approved next step for /${skill.name}.`);
    }

    if (unique.has(name)) throw new Error(`/${name} appears more than once in nextSkills.`);
    unique.add(name);

    return {
      name,
      reason: candidate.reason === undefined
        ? catalogRecommendation.reason
        : requireText(candidate.reason, `nextSkills[${index}].reason`),
    };
  });
}

export function normalizeSkillReadout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A skill readout requires a JSON object.");
  }

  const skillName = requireText(input.skill, "skill").replace(/^\//, "");
  const skill = SKILLS_BY_NAME.get(skillName);

  if (!skill) throw new Error(`/${skillName} is not a promoted QuickStark skill.`);

  const status = input.status ?? "Completed";

  if (!statuses.has(status)) {
    throw new Error("status must be Completed, Awaiting input, Blocked, or Preview.");
  }

  const suppliedSkills = input.skillsUsed ?? (status === "Preview" ? [] : [skill.name]);

  if (!Array.isArray(suppliedSkills)) throw new Error("skillsUsed must be an array.");

  const used = suppliedSkills.map((name, index) => {
    const normalized = requireText(name, `skillsUsed[${index}]`).replace(/^\//, "");

    if (!SKILLS_BY_NAME.has(normalized)) {
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

  const generatedAt = new Date(input.generatedAt ?? Date.now());

  if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be a valid date.");

  const projectIdentity = input.projectIdentity === undefined
    ? null
    : normalizeProjectIdentity(input.projectIdentity);
  const reportId = input.reportId === undefined
    ? randomUUID()
    : requireText(input.reportId, "Report identifier");

  if (!reportIdentifier.test(reportId)) {
    throw new Error("Report identifier must be a valid UUID.");
  }

  return {
    skill,
    status,
    outcome: requireText(input.outcome, "outcome"),
    project: input.project === undefined
      ? projectIdentity?.label ?? ""
      : requireText(input.project, "project"),
    projectIdentity,
    reportId,
    formatVersion: READOUT_FORMAT_VERSION,
    skillsUsed: used,
    findings: normalizeItems(input.findings, "findings"),
    decisions: normalizeItems(input.decisions, "decisions"),
    outputs: normalizeItems(input.outputs, "outputs"),
    checks: normalizeItems(input.checks, "checks", { checks: true }),
    nextSkills: normalizeRecommendations(skill, input.nextSkills),
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
    : "";

  return `<article class="detail-card"><div class="detail-heading"><h3>${escapeHtml(item.title)}</h3>${badge}${link}</div>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}</article>`;
}

function renderSection(title, description, items, options = {}) {
  if (items.length === 0) return "";

  return `<section class="section"><div class="section-heading"><div><p class="eyebrow">${escapeHtml(description)}</p><h2>${escapeHtml(title)}</h2></div><span class="section-count">${items.length}</span></div><div class="detail-grid">${items.map((item) => renderItem(item, options)).join("")}</div></section>`;
}

const reportStyles = `
  :root{color-scheme:light;--ink:#172033;--muted:#64748b;--paper:#f5f6fa;--card:#fff;--line:#e6e8ee;--accent:#2563eb;--soft:#dbeafe}
  *{box-sizing:border-box}html{min-height:100%;background:var(--paper)}body{margin:0;color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit}main{width:min(1080px,calc(100% - 40px));margin:0 auto;padding:48px 0 72px}.topline{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}.brand{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:750;letter-spacing:.02em}.brand-mark{display:grid;width:34px;height:34px;place-items:center;border-radius:11px;background:#172033;color:#fff;font-weight:850}.eyebrow{margin:0;color:var(--muted);font-size:11px;font-weight:750;letter-spacing:.14em;text-transform:uppercase}.timestamp{color:var(--muted);font-size:12px}.hero{position:relative;overflow:hidden;padding:38px;border:1px solid var(--line);border-radius:24px;background:var(--card)}.hero::before{position:absolute;inset:0 0 auto;height:4px;background:var(--accent);content:""}.hero-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.hero h1{margin:12px 0 8px;font-size:clamp(32px,6vw,55px);font-weight:770;letter-spacing:-.07em;line-height:1.03}.skill-command{display:inline-block;margin-top:7px;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}.status{flex-shrink:0;border-radius:999px;padding:9px 13px;background:var(--soft);color:var(--accent);font-size:12px;font-weight:750}.status-blocked{background:#fee2e2;color:#b91c1c}.status-awaiting-input{background:#fef3c7;color:#a16207}.status-preview{background:#e9edf3;color:#475569}.outcome{max-width:72ch;margin:25px 0 0;color:#334155;font-size:17px;line-height:1.7}.preview-note{margin-top:18px;border:1px solid #dbe2eb;border-radius:13px;padding:12px 15px;background:#f8fafc;color:#475569;font-size:13px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:21px}.metric{border:1px solid var(--line);border-radius:15px;padding:15px;background:var(--card)}.metric-label{color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.metric-value{display:block;margin-top:9px;font-size:25px;font-weight:770;letter-spacing:-.04em}.section{margin-top:34px}.section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.section-heading h2{margin:6px 0 0;font-size:23px;font-weight:720;letter-spacing:-.04em}.section-count{display:grid;width:31px;height:31px;place-items:center;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:12px;font-weight:700}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.detail-card{min-width:0;border:1px solid var(--line);border-radius:16px;padding:17px;background:var(--card)}.detail-heading{display:flex;align-items:center;gap:9px}.detail-heading h3{flex:1;min-width:0;margin:0;overflow-wrap:anywhere;font-size:14px;font-weight:700}.detail-card p{margin:10px 0 0;overflow-wrap:anywhere;color:#526077;font-size:13px;line-height:1.7;white-space:pre-wrap}.item-link{flex-shrink:0;color:var(--accent);font-size:12px;font-weight:700;text-decoration:none}.check-badge{border-radius:999px;padding:5px 8px;font-size:10px;font-weight:750;text-transform:uppercase}.check-passed{background:#dcfce7;color:#15803d}.check-failed{background:#fee2e2;color:#b91c1c}.check-skipped{background:#f1f5f9;color:#475569}.check-info{background:#dbeafe;color:#1d4ed8}.skills-used{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.skill-chip{border:1px solid var(--line);border-radius:999px;padding:7px 10px;background:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.next-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}.next-card{display:block;border:1px solid var(--line);border-radius:16px;padding:17px;background:var(--card);text-decoration:none}.next-card:first-child{border-color:var(--accent)}.next-card .eyebrow{color:var(--accent)}.next-card h3{margin:10px 0 7px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px}.next-card p:last-child{margin:0;color:#526077;font-size:13px;line-height:1.7}.empty-next{border:1px solid var(--line);border-radius:16px;padding:17px;background:var(--card);color:#526077;font-size:13px}.footer{display:flex;justify-content:space-between;gap:12px;margin-top:39px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.dashboard-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:22px}.dashboard-card{display:block;border:1px solid var(--line);border-radius:17px;padding:18px;background:var(--card);text-decoration:none}.dashboard-card:hover{border-color:var(--accent)}.dashboard-card h2{margin:10px 0 7px;font-size:17px;letter-spacing:-.03em}.dashboard-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.dashboard-card .status{display:inline-block;margin-top:12px}.empty-gallery{margin-top:22px;border:1px dashed var(--line);border-radius:16px;padding:22px;color:var(--muted);background:var(--card)}
  .gallery-nav{display:flex;flex-wrap:wrap;gap:9px;margin:22px 0}.gallery-nav a,.preview-toggle{border:1px solid var(--line);border-radius:999px;padding:9px 14px;background:var(--card);font-size:12px;font-weight:700;text-decoration:none}.gallery-nav a[aria-current="page"]{border-color:var(--accent);background:var(--soft);color:var(--accent)}.project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:15px}.project-card{min-width:0;border:1px solid var(--line);border-radius:19px;padding:20px;background:var(--card)}.project-card.current{border-color:var(--accent)}.project-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.project-title{display:block;margin:9px 0 5px;overflow-wrap:anywhere;font-size:19px;font-weight:750;letter-spacing:-.04em;text-decoration:none}.project-meta{color:var(--muted);font-size:12px}.current-project{border-radius:999px;padding:6px 9px;background:var(--soft);color:var(--accent);font-size:10px;font-weight:800;white-space:nowrap}.report-list{display:grid;gap:10px;margin-top:15px}.report-row{display:block;border:1px solid var(--line);border-radius:13px;padding:13px;background:#fff;text-decoration:none}.report-row:hover,.project-title:hover{border-color:var(--accent);color:var(--accent)}.report-row-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.report-row-title{font-size:13px;font-weight:720}.report-row .status{padding:5px 8px;font-size:10px}.report-outcome{margin:8px 0 0;color:#526077;font-size:12px;line-height:1.6}.report-time{display:block;margin-top:7px;color:var(--muted);font-size:11px}.explorer{display:grid;grid-template-columns:minmax(190px,250px) minmax(0,1fr);gap:16px}.explorer-sidebar,.explorer-content{min-width:0;border:1px solid var(--line);border-radius:18px;padding:17px;background:var(--card)}.sidebar-list{display:grid;gap:7px;margin-top:12px}.sidebar-project{display:block;border:1px solid transparent;border-radius:11px;padding:11px;color:var(--muted);font-size:12px;font-weight:650;text-decoration:none;overflow-wrap:anywhere}.sidebar-project[aria-current="page"]{border-color:var(--accent);background:var(--soft);color:var(--accent)}.search-form{display:flex;gap:8px;margin:15px 0}.search-input{min-width:0;flex:1;border:1px solid var(--line);border-radius:11px;padding:11px 13px;background:#fff;font:inherit;font-size:13px}.search-submit{border:1px solid var(--accent);border-radius:11px;padding:10px 14px;background:var(--accent);color:#fff;font:inherit;font-size:12px;font-weight:700}.timeline-day{margin-top:23px}.timeline-day h2{margin:0 0 12px;font-size:15px;letter-spacing:-.02em}.timeline-day .report-list{margin-top:0}.legacy-note{margin:15px 0 0;color:var(--muted);font-size:12px;line-height:1.6}
  @media(max-width:640px){main{width:calc(100% - 28px);padding-top:25px}.hero{padding:24px}.hero-heading{flex-direction:column}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr}.footer{flex-direction:column}.explorer{grid-template-columns:1fr}.project-grid{grid-template-columns:1fr}.search-form{flex-wrap:wrap}}
`;

function renderDocument({ title, body, theme, metadata = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${metadata}
  <title>${escapeHtml(title)} · QuickStark readout</title>
  <style>${reportStyles}</style>
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

export function renderSkillReadout(input) {
  return renderNormalizedSkillReadout(normalizeSkillReadout(input));
}

function renderNormalizedSkillReadout(report) {
  const family = report.skill.name.split("-")[1];
  const theme = themes[family] ?? themes.help;
  const statusClass = report.status.toLowerCase().replaceAll(" ", "-");
  const metadata = [
    `<meta name="quickstark:skill" content="${escapeHtml(report.skill.name)}">`,
    `<meta name="quickstark:skill-display-name" content="${escapeHtml(report.skill.displayName)}">`,
    `<meta name="quickstark:status" content="${escapeHtml(report.status)}">`,
    `<meta name="quickstark:generated-at" content="${escapeHtml(report.generatedAt.toISOString())}">`,
    `<meta name="quickstark:report-id" content="${escapeHtml(report.reportId)}">`,
    `<meta name="quickstark:format-version" content="${report.formatVersion}">`,
    ...(report.projectIdentity ? [
      `<meta name="quickstark:project" content="${escapeHtml(report.projectIdentity.key)}">`,
      `<meta name="quickstark:project-label" content="${escapeHtml(report.projectIdentity.label)}">`,
      `<meta name="quickstark:project-source" content="${escapeHtml(report.projectIdentity.source)}">`,
    ] : []),
  ].join("\n  ");

  const used = report.skillsUsed.length
    ? `<div class="skills-used">${report.skillsUsed.map((name) => `<span class="skill-chip">/${escapeHtml(name)}</span>`).join("")}</div>`
    : "";

  const preview = report.status === "Preview"
    ? '<p class="preview-note">Catalog preview only. No skill has been run, no checks have been performed, and no project files have been changed.</p>'
    : "";

  const metrics = [
    ["Findings", report.findings.length],
    ["Decisions", report.decisions.length],
    ["Checks", report.checks.length],
    ["Next steps", report.nextSkills.length],
  ].map(([label, value]) => `<div class="metric"><span class="metric-label">${label}</span><span class="metric-value">${value}</span></div>`).join("");

  const next = report.nextSkills.length
    ? `<div class="next-grid">${report.nextSkills.map((item, index) => `<article class="next-card"><p class="eyebrow">${index === 0 ? "Recommended next" : "Alternative"}</p><h3>/${escapeHtml(item.name)}</h3><p>${escapeHtml(item.reason)}</p></article>`).join("")}</div>`
    : '<div class="empty-next">None — the requested work is complete.</div>';

  const body = `<main>
  <div class="topline"><div class="brand"><span class="brand-mark">Q</span><span>${escapeHtml(COLLECTION_NAME)}</span></div><span class="timestamp">${escapeHtml(formatTimestamp(report.generatedAt))}</span></div>
  <header class="hero"><div class="hero-heading"><div><p class="eyebrow">${escapeHtml(theme.label)}${report.project ? ` · ${escapeHtml(report.project)}` : ""}</p><h1>${escapeHtml(report.skill.displayName)}</h1><span class="skill-command">/${escapeHtml(report.skill.name)}</span></div><span class="status status-${statusClass}">${escapeHtml(report.status)}</span></div><p class="outcome">${escapeHtml(report.outcome)}</p>${preview}${used}</header>
  <div class="metrics">${metrics}</div>
  ${renderSection("Findings", "What we learned", report.findings)}
  ${renderSection("Decisions", "What was decided", report.decisions)}
  ${renderSection("Outputs", "Files, reports, and deliverables", report.outputs)}
  ${renderSection("Checks", "Only validations actually performed", report.checks, { checks: true })}
  <section class="section"><div class="section-heading"><div><p class="eyebrow">Continue the work</p><h2>Next best skills</h2></div><span class="section-count">${report.nextSkills.length}</span></div>${next}</section>
  <footer class="footer"><span>Generated by ${escapeHtml(COLLECTION_NAME)}</span><span>Self-contained HTML · no external scripts or styles</span></footer>
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

export async function writeSkillReadout(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A skill readout requires a JSON object.");
  }

  const projectIdentity = input.projectIdentity === undefined
    ? await discoverReadoutProject({ cwd: options.cwd })
    : input.projectIdentity;
  const report = normalizeSkillReadout({ ...input, projectIdentity });
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const layout = options.layout
    ?? process.env.QS_READOUT_LAYOUT
    ?? (process.env.QS_READOUT_DIR && options.directory === undefined ? "project" : "flat");

  if (!readoutLayouts.has(layout)) {
    throw new Error("Readout layout must be flat or project.");
  }

  const timestamp = report.generatedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const filename = `${report.skill.name}--${timestamp}--${report.reportId.slice(0, 8)}.html`;
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
    status: report.status,
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
  return Promise.all(SKILLS.map((skill) => writeSkillReadout({
    skill: skill.name,
    status: "Preview",
    outcome: `${skill.shortDescription}. This page previews the readout format; the skill has not been run.`,
    skillsUsed: [],
    findings: [
      { title: "Purpose", detail: skill.shortDescription },
      { title: "Invocation", detail: skill.userInvoked
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

function normalizePublishedProjects(value) {
  if (value === undefined || value === null || value === "") return new Set();

  const values = Array.isArray(value) ? value : String(value).split(",");
  const projects = new Set();

  for (const item of values) {
    const key = requireText(item, "Published project");
    const segments = key.split("/");

    if (
      segments.length < 3
      || !/^[a-z0-9.-]+(?:~\d{1,5})?$/i.test(segments[0])
      || segments.slice(1).some((segment) => !projectSegment.test(segment) || segment === "." || segment === "..")
    ) {
      throw new Error("Published projects must use safe, canonical host/owner/repository identities.");
    }

    projects.add(key);
  }

  return projects;
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
        await visit(path, depth + 1);
        continue;
      }

      if (!entry.isFile() || !reportFilename.test(entry.name)) continue;

      const html = await readFile(path, "utf8");
      const skill = SKILLS_BY_NAME.get(findMetadata(html, "skill"));
      const status = findMetadata(html, "status");
      const generatedAt = findMetadata(html, "generated-at");
      const projectKey = decodeHtml(findMetadata(html, "project"));

      if (!skill || !statuses.has(status) || Number.isNaN(Date.parse(generatedAt))) continue;
      if (allowedProjects !== null && !allowedProjects.has(projectKey)) continue;

      const match = html.match(/<p class="outcome">([\s\S]*?)<\/p>/);

      reports.push({
        filename: entry.name,
        relativePath: relative(directory, path).split(sep).join("/"),
        skill,
        status,
        generatedAt,
        outcome: decodeHtml(match?.[1] ?? ""),
        projectKey,
        projectLabel: decodeHtml(findMetadata(html, "project-label")),
        projectSource: findMetadata(html, "project-source"),
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

function galleryHref(view, { project, query, previews } = {}) {
  const parameters = new URLSearchParams();

  if (view !== "projects") parameters.set("view", view);
  if (project) parameters.set("project", project);
  if (query) parameters.set("q", query);
  if (previews) parameters.set("previews", "1");

  const encoded = parameters.toString();
  return encoded ? `?${escapeHtml(encoded)}` : "./";
}

function reportHref(report) {
  return escapeHtml(report.relativePath.split("/").map(encodeURIComponent).join("/"));
}

function renderGalleryReport(report, { showProject = false } = {}) {
  const statusClass = report.status.toLowerCase().replaceAll(" ", "-");
  const label = showProject && report.projectLabel
    ? `${report.skill.displayName} · ${report.projectLabel}`
    : report.skill.displayName;

  return `<a class="report-row" href="${reportHref(report)}"><div class="report-row-heading"><span class="report-row-title">${escapeHtml(label)}</span><span class="status status-${escapeHtml(statusClass)}">${escapeHtml(report.status)}</span></div><p class="report-outcome">${escapeHtml(report.outcome)}</p><time class="report-time" datetime="${escapeHtml(report.generatedAt)}">${escapeHtml(formatTimestamp(new Date(report.generatedAt)))}</time></a>`;
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

function renderProjectLibrary(projects, reports, { activeProject, previews } = {}) {
  const cards = projects.map((project) => {
    const current = project.key === activeProject;
    const actualCount = project.reports.filter((report) => report.status !== "Preview").length;
    const previewCount = project.reports.length - actualCount;
    const summary = `${actualCount} actual report${actualCount === 1 ? "" : "s"}`
      + (previews && previewCount ? ` · ${previewCount} clearly labeled preview${previewCount === 1 ? "" : "s"}` : "");

    return `<article class="project-card${current ? " current" : ""}" data-project="${escapeHtml(project.key)}"><div class="project-card-header"><div><p class="eyebrow">Verified project</p><a class="project-title" href="${galleryHref("explorer", { project: project.key, previews })}">${escapeHtml(project.label)}</a><span class="project-meta">${escapeHtml(summary)}</span></div>${current ? '<span class="current-project">CURRENT PROJECT</span>' : ""}</div><div class="report-list">${project.reports.slice(0, 4).map((report) => renderGalleryReport(report)).join("")}</div></article>`;
  }).join("");

  const legacy = reports.filter((report) => !report.projectKey);
  const legacySection = legacy.length
    ? `<section class="section"><div class="section-heading"><div><p class="eyebrow">Project identity not verified</p><h2>Unassigned legacy reports</h2></div><span class="section-count">${legacy.length}</span></div><p class="legacy-note">These original reports remain available, but their free-text headings do not prove repository ownership. Associate them with a project only through an explicitly reviewed migration.</p><div class="report-list">${legacy.map((report) => renderGalleryReport(report)).join("")}</div></section>`
    : "";
  const empty = !cards && !legacySection
    ? '<p class="empty-gallery">No actual skill reports yet. Run a QuickStark skill to create a verified project report, or explicitly show clearly labeled catalog previews.</p>'
    : "";

  return `${cards ? `<div class="project-grid">${cards}</div>` : ""}${legacySection}${empty}`;
}

function renderProjectExplorer(projects, { selectedProject, query, previews } = {}) {
  const selected = projects.find((project) => project.key === selectedProject) ?? null;
  const search = query.trim().toLowerCase();
  const matches = selected?.reports.filter((report) => !search || [
    selected.label,
    selected.key,
    report.skill.name,
    report.skill.displayName,
    report.outcome,
    report.status,
  ].some((value) => value.toLowerCase().includes(search))) ?? [];
  const sidebar = projects.map((project) =>
    `<a class="sidebar-project"${project.key === selected?.key ? ' aria-current="page"' : ""} href="${galleryHref("explorer", { project: project.key, previews })}">${escapeHtml(project.label)} <span class="project-meta">(${project.reports.length})</span></a>`).join("");
  const hidden = `<input type="hidden" name="view" value="explorer"><input type="hidden" name="project" value="${escapeHtml(selected?.key ?? "")}">${previews ? '<input type="hidden" name="previews" value="1">' : ""}`;
  const title = selected ? selected.label : "Select an authorized project";
  const empty = selected
    ? (search ? "No reports match this search in the selected project." : "No actual reports are available in the selected project.")
    : "Choose a verified project from the sidebar.";

  return `<div class="explorer"><aside class="explorer-sidebar"><p class="eyebrow">Verified projects</p><nav class="sidebar-list" aria-label="Projects">${sidebar || '<span class="project-meta">No projects available.</span>'}</nav></aside><section class="explorer-content"><p class="eyebrow">Project explorer</p><h2>${escapeHtml(title)}</h2>${selected ? `<form class="search-form" method="get">${hidden}<input class="search-input" type="search" name="q" value="${escapeHtml(query)}" placeholder="Search skills, outcomes, or project" aria-label="Search selected project reports"><button class="search-submit" type="submit">Search</button></form>` : ""}${matches.length ? `<div class="report-list">${matches.map((report) => renderGalleryReport(report)).join("")}</div>` : `<p class="empty-gallery">${escapeHtml(empty)}</p>`}</section></div>`;
}

function renderActivityTimeline(reports) {
  const grouped = new Map();

  for (const report of reports) {
    const day = report.generatedAt.slice(0, 10);

    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(report);
  }

  if (grouped.size === 0) {
    return '<p class="empty-gallery">No actual skill activity yet. Catalog previews stay hidden unless explicitly requested.</p>';
  }

  return [...grouped].map(([day, entries]) => {
    const label = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(new Date(`${day}T00:00:00.000Z`));

    return `<section class="timeline-day"><h2>${escapeHtml(label)} · UTC</h2><div class="report-list">${entries.map((report) => renderGalleryReport(report, { showProject: true })).join("")}</div></section>`;
  }).join("");
}

async function renderReadoutIndex(directory, {
  searchParams = new URLSearchParams(),
  allowedProjects = null,
  currentProject = null,
} = {}) {
  const discovered = await discoverStoredReadouts(directory, { allowedProjects });
  const previews = searchParams.get("previews") === "1";
  const reports = discovered.filter((report) => previews || report.status !== "Preview");
  const projects = groupReadoutProjects(reports);
  const requestedView = searchParams.get("view") ?? "projects";
  const view = ["projects", "explorer", "activity"].includes(requestedView) ? requestedView : "projects";
  const requestedProject = searchParams.get("project");
  const projectIsVisible = requestedProject === null
    || projects.some((project) => project.key === requestedProject);
  const selectedProject = projectIsVisible && requestedProject
    ? requestedProject
    : projects[0]?.key ?? "";
  const query = projectIsVisible ? (searchParams.get("q") ?? "").slice(0, 200) : "";
  let activeProject = currentProject ?? "";

  if (!activeProject) {
    try {
      activeProject = (await discoverReadoutProject()).key;
    } catch {
      // Gallery browsing must remain available when no current Git checkout exists.
    }
  }

  const title = view === "activity" ? "Recent activity" : view === "explorer" ? "Project explorer" : "Project library";
  const content = view === "activity"
    ? renderActivityTimeline(reports)
    : view === "explorer"
      ? renderProjectExplorer(projects, { selectedProject, query, previews })
      : renderProjectLibrary(projects, reports, { activeProject, previews });
  const actualCount = discovered.filter((report) => report.status !== "Preview").length;
  const previewLink = previews
    ? `<a class="preview-toggle" href="${galleryHref(view, { project: view === "explorer" ? selectedProject : undefined, query })}">Hide catalog previews</a>`
    : `<a class="preview-toggle" href="${galleryHref(view, { project: view === "explorer" ? selectedProject : undefined, query, previews: true })}">Show catalog previews</a>`;
  const navigation = `<nav class="gallery-nav" aria-label="Readout views"><a href="${galleryHref("projects", { previews })}"${view === "projects" ? ' aria-current="page"' : ""}>Project library</a><a href="${galleryHref("explorer", { project: selectedProject, previews })}"${view === "explorer" ? ' aria-current="page"' : ""}>Project explorer</a><a href="${galleryHref("activity", { previews })}"${view === "activity" ? ' aria-current="page"' : ""}>Recent activity</a>${previewLink}</nav>`;
  const body = `<main><div class="topline"><div class="brand"><span class="brand-mark">Q</span><span>${escapeHtml(COLLECTION_NAME)}</span></div><span class="timestamp">Private report library</span></div><header class="hero"><p class="eyebrow">Project-aware skill readouts</p><h1>${escapeHtml(title)}</h1><p class="outcome">Browse verified project reports, explore a selected repository, and follow actual skill activity. Catalog previews remain clearly labeled and hidden until requested.</p></header>${navigation}${content}<footer class="footer"><span>${actualCount} actual QuickStark report${actualCount === 1 ? "" : "s"}</span><span>Self-contained HTML · no external scripts or styles</span></footer></main>`;

  return renderDocument({ title, body, theme: themes.help });
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
    sendHtml(response, 200, await renderReadoutIndex(directory, {
      searchParams: requestUrl.searchParams,
      allowedProjects,
      currentProject,
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

    if (allowedProjects !== null && !allowedProjects.has(decodeHtml(findMetadata(html, "project")))) {
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

export async function startReadoutServer(options = {}) {
  const directory = resolve(options.directory ?? process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
  const host = options.host ?? DEFAULT_READOUT_HOST;
  const port = options.port ?? DEFAULT_READOUT_PORT;

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

  if (allowedProjects !== null && currentProject !== null && !allowedProjects.has(currentProject)) {
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

    if (["--json", "--no-serve", "--apply", "--dry-run", "--trusted-proxy"].includes(argument)) {
      const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      if (parsed[key]) throw new Error(`${argument} was specified more than once.`);
      parsed[key] = true;
      continue;
    }

    if (!["--input", "--data", "--directory", "--target-directory", "--base-url", "--host", "--port", "--access", "--layout", "--project", "--retention-days", "--allowed-projects", "--publication-mode"].includes(argument)) {
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
  node scripts/qs-skill-readout.mjs render --data '{"skill":"qs-help","outcome":"Selected the right workflow."}'
  node scripts/qs-skill-readout.mjs gallery
  node scripts/qs-skill-readout.mjs serve [--host 127.0.0.1] [--port 4173]
  node scripts/qs-skill-readout.mjs migrate --project github.com/owner/repository
  node scripts/qs-skill-readout.mjs prune --project github.com/owner/repository --retention-days 90

Options:
  --directory PATH  Store or serve reports from a specific directory.
  --target-directory PATH  Optional durable destination for legacy migration.
  --layout MODE     Use flat compatibility or durable project-organized paths.
  --access MODE     Select auto, local, lan, or ssh access.
  --base-url URL    Reuse and verify an existing HTTP(S) report viewer.
  --project KEY     Explicit canonical target for migration or retention.
  --apply           Apply an explicitly reviewed migration or deletion.
  --dry-run         Explicitly request the default non-mutating preview.
  --retention-days  Project-specific retention window in whole days.
  --publication-mode MODE  Choose local or fail-closed hosted publication.
  --allowed-projects KEYS  Comma-separated canonical hosted project allowlist.
  --trusted-proxy   Accept an authenticated, private-network reverse proxy.
  --no-serve        Generate the HTML file without starting a viewer.
  --json            Print machine-readable render or gallery results.

Environment:
  QS_READOUT_DIR               Report directory; defaults to the OS temporary directory.
  QS_READOUT_LAYOUT            flat or project; persistent directories default to project.
  QS_READOUT_ACCESS            auto, local, lan, or ssh; defaults to auto.
  QS_READOUT_BASE_URL          Existing verified viewer URL for generated report links.
  QS_READOUT_PUBLICATION_MODE  local or hosted; defaults to private local access.
  QS_READOUT_ALLOWED_PROJECTS  Explicit canonical hosted project allowlist.
  QS_READOUT_CURRENT_PROJECT   Explicit canonical active project for hosted viewers.
  QS_READOUT_TRUSTED_PROXY     true only behind the authenticated private reverse proxy.

Automatic behavior:
  On a Mac or graphical desktop, reports use a private localhost viewer.
  On a headless or SSH-connected Linux host, reports use its private home-network
  IP and an unguessable report URL. No Tailscale or always-on service is needed.

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

  if (options.apply && options.dryRun) {
    throw new Error("Choose either --apply or --dry-run, not both.");
  }

  if (command === "render") {
    if (Boolean(options.input) === Boolean(options.data)) {
      throw new Error("render requires exactly one of --input or --data.");
    }

    const raw = options.input ? await readFile(resolve(options.input), "utf8") : options.data;
    const viewer = options.noServe ? null : await ensureReadoutViewer(options);
    const result = await writeSkillReadout(JSON.parse(raw), {
      ...options,
      baseUrl: viewer?.url ?? options.baseUrl,
    });

    if (viewer) await verifyReportedReadout(result);

    if (options.json) {
      console.log(JSON.stringify({
        ...result,
        viewerReused: viewer?.reused ?? null,
      }));
    } else {
      console.log(`QuickStark readout: ${result.path}`);
      if (result.url) console.log(`Verified readout: ${result.url}`);
      if (viewer) console.log(`Readout gallery: ${viewer.url}`);
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
