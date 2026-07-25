import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { createServer as createPortProbe } from "node:net";
import { networkInterfaces, platform, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
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
  @media(max-width:640px){main{width:calc(100% - 28px);padding-top:25px}.hero{padding:24px}.hero-heading{flex-direction:column}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr}.footer{flex-direction:column}}
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
  const timestamp = report.generatedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const filename = `${report.skill.name}--${timestamp}--${report.reportId.slice(0, 8)}.html`;
  const path = join(directory, filename);
  const base = normalizeBaseUrl(options.baseUrl ?? process.env.QS_READOUT_BASE_URL);

  await mkdir(directory, { recursive: true, mode: 0o700 });
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
    path,
    url: base ? new URL(encodeURIComponent(filename), base).href : null,
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

async function renderReadoutIndex(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && reportFilename.test(entry.name));

  const reports = await Promise.all(files.map(async (entry) => {
    const html = await readFile(join(directory, entry.name), "utf8");
    const name = findMetadata(html, "skill");
    const skill = SKILLS_BY_NAME.get(name);

    if (!skill) return null;

    return {
      filename: entry.name,
      skill,
      status: findMetadata(html, "status"),
      generatedAt: findMetadata(html, "generated-at"),
    };
  }));

  const cards = reports
    .filter(Boolean)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
    .map((report) => {
      const statusClass = report.status.toLowerCase().replaceAll(" ", "-");

      return `<a class="dashboard-card" href="${encodeURIComponent(report.filename)}"><p class="eyebrow">${escapeHtml(themes[report.skill.name.split("-")[1]]?.label ?? "QuickStark")}</p><h2>${escapeHtml(report.skill.displayName)}</h2><p>/${escapeHtml(report.skill.name)}</p><span class="status status-${escapeHtml(statusClass)}">${escapeHtml(report.status)}</span></a>`;
    }).join("");

  const body = `<main><div class="topline"><div class="brand"><span class="brand-mark">Q</span><span>${escapeHtml(COLLECTION_NAME)}</span></div><span class="timestamp">Private report viewer</span></div><header class="hero"><p class="eyebrow">Skill readouts</p><h1>QuickStark readouts</h1><p class="outcome">Browse polished reports and honest skill previews generated on this machine. Only QuickStark HTML readouts in the configured temporary directory are served.</p></header>${cards ? `<div class="dashboard-list">${cards}</div>` : '<p class="empty-gallery">No readouts yet. Run a QuickStark skill, or use <code>npm run readouts:gallery</code> to generate clearly labeled previews.</p>'}<footer class="footer"><span>${files.length} QuickStark readout${files.length === 1 ? "" : "s"}</span><span>Self-contained HTML · no external scripts or styles</span></footer></main>`;

  return renderDocument({ title: "Skill gallery", body, theme: themes.help });
}

function sendHtml(response, status, content, { head = false } = {}) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(content),
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
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

async function handleReadoutRequest(request, response, directory, accessToken) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;

  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://quickstark.invalid").pathname);
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
    sendHtml(response, 200, await renderReadoutIndex(directory), {
      head: request.method === "HEAD",
    });
    return;
  }

  const filename = pathname.slice(1);

  if (filename !== basename(filename) || !reportFilename.test(filename)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Readout not found");
    return;
  }

  try {
    const path = join(directory, filename);
    const metadata = await lstat(path);

    if (!metadata.isFile()) throw Object.assign(new Error("Not a regular file"), { code: "ENOENT" });

    sendHtml(response, 200, await readFile(path, "utf8"), {
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

  const accessToken = options.accessToken
    ?? process.env.QS_READOUT_VIEWER_TOKEN
    ?? (loopbackHosts.has(host) ? null : randomBytes(24).toString("hex"));

  if (accessToken !== null && !viewerToken.test(accessToken)) {
    throw new Error("Readout viewer token must contain 48 lowercase hexadecimal characters.");
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });

  const server = createServer((request, response) => {
    handleReadoutRequest(request, response, directory, accessToken).catch(() => {
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

    if (argument === "--json" || argument === "--no-serve") {
      const key = argument === "--json" ? "json" : "noServe";

      if (parsed[key]) throw new Error(`${argument} was specified more than once.`);
      parsed[key] = true;
      continue;
    }

    if (!["--input", "--data", "--directory", "--base-url", "--host", "--port", "--access"].includes(argument)) {
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

Options:
  --directory PATH  Store or serve reports from a specific directory.
  --access MODE     Select auto, local, lan, or ssh access.
  --base-url URL    Reuse and verify an existing HTTP(S) report viewer.
  --no-serve        Generate the HTML file without starting a viewer.
  --json            Print machine-readable render or gallery results.

Environment:
  QS_READOUT_DIR       Report directory; defaults to the OS temporary directory.
  QS_READOUT_ACCESS    auto, local, lan, or ssh; defaults to auto.
  QS_READOUT_BASE_URL  Existing verified viewer URL for generated report links.

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
    });

    console.log(`QuickStark readout viewer: ${viewer.url}`);
    console.log(`Readout directory: ${viewer.directory}`);

    if (!loopbackHosts.has(viewer.host)) {
      console.log("Home-network access is protected by an unguessable, report-only URL.");
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
