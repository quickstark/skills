import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, realpath, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const INVENTORY_VERSION = 1;
const MAX_INVENTORY_BYTES = 2 * 1024 * 1024;
const MAX_SESSION_FILES = 10_000;
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]{0,126}$/i;
const DEFAULT_OWNERS = Object.freeze(["quickstark", "quickstarkdemo"]);
const REPORT_STATUSES = new Set(["Completed", "Blocked", "Awaiting input"]);

function escape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function safeInstant(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

function safeIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const key = typeof value.key === "string" ? value.key : "";
  const segments = key.split("/");

  if (
    segments.length !== 3
    || segments[0] !== "github.com"
    || !SAFE_SEGMENT.test(segments[1])
    || !SAFE_SEGMENT.test(segments[2])
  ) return null;

  return {
    host: segments[0],
    owner: segments[1],
    repository: segments[2],
    key,
    label: `${segments[1]}/${segments[2]}`,
  };
}

function ownerList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((owner) => typeof owner === "string" && SAFE_SEGMENT.test(owner)))];
}

function unavailableInventory() {
  return {
    version: INVENTORY_VERSION,
    generatedAt: null,
    owners: [],
    github: { status: "not-captured", total: null },
    local: { status: "not-captured", total: null },
    sessions: { status: "not-captured", uniqueTotal: null },
    projects: [],
  };
}

function normalizeInventory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== INVENTORY_VERSION) {
    return unavailableInventory();
  }

  const generatedAt = safeInstant(value.generatedAt);
  if (!generatedAt) return unavailableInventory();

  const githubTotal = safeInteger(value.github?.total);
  const localTotal = safeInteger(value.local?.total);
  const sessionTotal = safeInteger(value.sessions?.uniqueTotal);
  const projects = Array.isArray(value.projects)
    ? value.projects.map((entry) => {
      const identity = safeIdentity(entry);
      if (!identity) return null;
      const github = entry.github && typeof entry.github === "object" && !Array.isArray(entry.github)
        ? {
          visibility: new Set(["public", "private", "internal"]).has(entry.github.visibility)
            ? entry.github.visibility
            : null,
          defaultBranch: typeof entry.github.defaultBranch === "string"
            && /^[a-z0-9][a-z0-9._/-]{0,199}$/i.test(entry.github.defaultBranch)
            ? entry.github.defaultBranch
            : null,
          pushedAt: safeInstant(entry.github.pushedAt),
          openIssues: safeInteger(entry.github.openIssues),
          openPullRequests: safeInteger(entry.github.openPullRequests),
        }
        : null;

      return {
        ...identity,
        source: entry.source === "github" ? "github" : "local",
        locallyPresent: entry.locallyPresent === true,
        github,
        sessions: safeInteger(entry.sessions),
      };
    }).filter(Boolean)
    : [];

  return {
    version: INVENTORY_VERSION,
    generatedAt,
    owners: ownerList(value.owners),
    github: {
      status: value.github?.status === "observed" && githubTotal !== null ? "observed" : "not-captured",
      total: githubTotal,
    },
    local: {
      status: value.local?.status === "observed" && localTotal !== null ? "observed" : "not-captured",
      total: localTotal,
    },
    sessions: {
      status: value.sessions?.status === "observed" && sessionTotal !== null ? "observed" : "not-captured",
      uniqueTotal: sessionTotal,
    },
    projects,
  };
}

export async function readReadoutPortfolioInventory(directory) {
  const file = join(resolve(directory), ".quickstark-portfolio", "inventory-v1.json");

  try {
    const metadata = await stat(file);
    if (!metadata.isFile() || metadata.size > MAX_INVENTORY_BYTES) return unavailableInventory();
    return normalizeInventory(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return unavailableInventory();
  }
}

function authorizedProject(allowedProjects, key) {
  if (allowedProjects === null || allowedProjects === undefined) return true;
  if (!(allowedProjects instanceof Set)) return false;
  if (allowedProjects.has("*") || allowedProjects.has(key)) return true;
  const segments = key.split("/");
  return segments.length === 3 && allowedProjects.has(`${segments[0]}/${segments[1]}/*`);
}

function meaningful(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildReadoutPortfolioSnapshot({
  reports = [],
  inventory,
  allowedProjects = null,
  currentProject = null,
  now = new Date().toISOString(),
} = {}) {
  const observed = normalizeInventory(inventory);
  const permittedOwners = new Set(observed.owners);
  const recordedReports = Array.isArray(reports) ? reports : [];
  const actual = recordedReports.filter((report) =>
    report
    && REPORT_STATUSES.has(report.status)
    && typeof report.projectKey === "string"
    && authorizedProject(allowedProjects, report.projectKey));
  const previews = recordedReports.filter((report) =>
    report?.status === "Preview"
    && typeof report.projectKey === "string"
    && authorizedProject(allowedProjects, report.projectKey));
  const actualProjectKeys = new Set(actual.map((report) => report.projectKey));
  const merged = new Map();

  function ensureProject(identity, fallbackLabel) {
    const normalized = safeIdentity(identity);
    if (!normalized || !authorizedProject(allowedProjects, normalized.key)) return null;
    if (!merged.has(normalized.key)) {
      merged.set(normalized.key, {
        ...normalized,
        label: meaningful(fallbackLabel) ? fallbackLabel : normalized.label,
        locallyPresent: false,
        github: null,
        sessions: null,
        reports: [],
        reportingState: "Repository discovered",
      });
    }
    return merged.get(normalized.key);
  }

  for (const candidate of observed.projects) {
    if (
      !authorizedProject(allowedProjects, candidate.key)
      || (!permittedOwners.has(candidate.owner) && !actualProjectKeys.has(candidate.key))
    ) continue;
    const project = ensureProject(candidate);
    if (!project) continue;
    project.locallyPresent = candidate.locallyPresent;
    project.github = candidate.github;
    project.sessions = candidate.sessions;
  }

  for (const report of actual) {
    const segments = report.projectKey.split("/");
    if (segments.length !== 3) continue;
    const project = ensureProject({ key: report.projectKey }, report.projectLabel);
    if (project) project.reports.push(report);
  }

  const projects = [...merged.values()];

  for (const project of projects) {
    project.reports.sort((left, right) =>
      String(right.generatedAt ?? "").localeCompare(String(left.generatedAt ?? "")));
    project.reportingState = project.reports.length > 0
      ? "Reporting"
      : project.sessions
        ? "No report received"
        : "Repository discovered";
  }

  projects.sort((left, right) => {
    const reporting = Number(right.reports.length > 0) - Number(left.reports.length > 0);
    if (reporting) return reporting;
    if (right.key === currentProject) return 1;
    if (left.key === currentProject) return -1;
    return String(right.reports[0]?.generatedAt ?? right.github?.pushedAt ?? "")
      .localeCompare(String(left.reports[0]?.generatedAt ?? left.github?.pushedAt ?? ""))
      || left.label.localeCompare(right.label);
  });

  const unrestricted = allowedProjects === null || allowedProjects?.has?.("*");
  const completeOwnerScope = observed.owners.length > 0 && observed.owners.every((owner) =>
    unrestricted || allowedProjects?.has?.(`github.com/${owner}/*`));

  return {
    version: INVENTORY_VERSION,
    observedAt: safeInstant(now) ?? new Date().toISOString(),
    generatedAt: observed.generatedAt,
    owners: observed.owners,
    github: {
      status: observed.github.status,
      total: completeOwnerScope ? observed.github.total : null,
    },
    local: {
      status: observed.local.status,
      total: completeOwnerScope ? observed.local.total : null,
    },
    sessions: {
      status: observed.sessions.status,
      uniqueTotal: completeOwnerScope ? observed.sessions.uniqueTotal : null,
    },
    actualReadouts: actual.length,
    previewCount: previews.length,
    reportingProjects: projects.filter((project) => project.reports.length > 0).length,
    projects,
    reports: actual.sort((left, right) =>
      String(right.generatedAt ?? "").localeCompare(String(left.generatedAt ?? ""))),
    currentProject: projects.some((project) => project.key === currentProject)
      ? currentProject
      : null,
  };
}

function glyph(name) {
  const paths = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    git: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="7" cy="18" r="2"/><path d="M7 8v8m2-9h3a5 5 0 0 1 5 5v-4"/>',
    report: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v6h6M10 13h6m-6 4h6"/>',
    pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3m10-10h-3M5 12H2m17.1-7.1-2.1 2.1M7 17l-2.1 2.1m14.2 0L17 17M7 7 4.9 4.9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    external: '<path d="M13 5h6v6m0-6L10 14"/><path d="M19 13v6H5V5h6"/>',
    alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4m0 4h.01"/>',
    source: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  };
  return `<svg class="portfolio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.overview}</svg>`;
}

function displayTime(value) {
  const instant = safeInstant(value);
  if (!instant) return "Not captured";
  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(instant))} UTC`;
}

function href(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (meaningful(value)) search.set(key, value);
  }
  const encoded = search.toString();
  return encoded ? `?${escape(encoded)}` : "./";
}

function projectStatus(project) {
  const state = project.reportingState;
  const appearance = state === "Reporting" ? "good" : state === "No report received" ? "warn" : "quiet";
  return `<span class="portfolio-status is-${appearance}"><span class="portfolio-dot"></span>${escape(state)}</span>`;
}

function metric(label, value, note, image) {
  const actual = value === null || value === undefined ? "Not captured" : String(value);
  return `<article class="portfolio-metric"><div class="portfolio-metric-icon">${glyph(image)}</div><div class="portfolio-metric-copy"><span>${escape(label)}</span><strong${actual === "Not captured" ? ' class="portfolio-metric-missing"' : ""}>${escape(actual)}</strong><small>${escape(note)}</small></div></article>`;
}

function matchesProject(project, query) {
  if (!query) return true;
  const term = query.toLowerCase();
  return [project.key, project.label, project.reportingState, ...project.reports.flatMap((report) => [
    report.skill?.name ?? "",
    report.skill?.displayName ?? "",
    report.outcome ?? "",
  ])].some((text) => String(text).toLowerCase().includes(term));
}

function portfolioProjectRow(project) {
  const pushed = project.reports[0]?.generatedAt ?? project.github?.pushedAt;
  const issues = project.github?.openIssues;
  const pullRequests = project.github?.openPullRequests;
  const detail = project.github?.visibility === "private"
    ? "Private GitHub repository"
    : project.github
      ? "Verified GitHub repository"
      : project.locallyPresent
        ? "Verified local Git identity"
        : "Verified immutable report project";

  return `<tr><td><a class="portfolio-project-link" href="${href({ project: project.key })}">${glyph("git")}<span><strong>${escape(project.label)}</strong><small>${escape(detail)}</small></span></a></td><td>${projectStatus(project)}</td><td><strong>${project.reports.length}</strong><small class="portfolio-cell-note">actual readout${project.reports.length === 1 ? "" : "s"}</small></td><td>${project.sessions === null ? '<span class="portfolio-unknown">Not captured</span>' : `<strong>${project.sessions}</strong><small class="portfolio-cell-note">this machine only</small>`}</td><td>${issues === null || issues === undefined ? '<span class="portfolio-unknown">Not captured</span>' : `<strong>${issues}</strong><small class="portfolio-cell-note">${pullRequests ?? "Not captured"} open PR${pullRequests === 1 ? "" : "s"}</small>`}</td><td><span class="portfolio-time">${escape(displayTime(pushed))}</span></td></tr>`;
}

function portfolioSearch(query) {
  return `<form class="portfolio-search" method="get" action="./"><label>${glyph("search")}<span class="portfolio-sr">Search repositories and reports</span><input type="search" name="q" maxlength="160" placeholder="Search repositories, projects, and reports" value="${escape(query)}"></label><button type="submit">Search</button>${query ? '<a class="portfolio-reset" href="./">Clear</a>' : ""}</form>`;
}

function renderProjectPortfolio(snapshot, query) {
  const matching = snapshot.projects.filter((project) => matchesProject(project, query));
  const visibleProjects = 8;
  const rows = matching.slice(0, visibleProjects).map(portfolioProjectRow).join("")
    || '<tr><td class="portfolio-empty" colspan="6">No verified project matches this search.</td></tr>';

  return `<section class="portfolio-panel" aria-label="Verified project portfolio"><header class="portfolio-section-heading"><div><h2>Verified project portfolio</h2><p>${matching.length} observed project${matching.length === 1 ? "" : "s"}${query ? " match this search" : " in this view"}</p></div>${portfolioSearch(query)}</header><div class="portfolio-table-scroll"><table class="portfolio-table"><thead><tr><th>Verified project</th><th>Reporting state</th><th>Immutable reports</th><th>Codex sessions</th><th>GitHub activity</th><th>Last observed</th></tr></thead><tbody>${rows}</tbody></table></div>${matching.length > visibleProjects ? `<p class="portfolio-table-foot">Showing ${visibleProjects} of ${matching.length} observed projects. Search to narrow the results.</p>` : ""}</section>`;
}

function matchingActivity(event, query) {
  if (!query) return true;
  const term = query.toLowerCase();
  return [event.label, event.project, event.kind, event.detail]
    .some((text) => String(text).toLowerCase().includes(term));
}

function renderActivity(snapshot, query) {
  const readoutEvents = snapshot.reports.map((report) => ({
    time: safeInstant(report.generatedAt),
    kind: "Immutable skill readout",
    label: report.skill?.displayName ?? report.skill?.name ?? "Recorded skill run",
    project: report.projectLabel ?? report.projectKey,
    detail: report.outcome
      ? `${report.status} · ${String(report.outcome).slice(0, 180)}`
      : report.status,
    tone: "report",
    link: report.relativePath
      ? report.relativePath.split("/").map(encodeURIComponent).join("/")
      : href({ project: report.projectKey }),
  }));
  const githubEvents = snapshot.projects.filter((project) => project.github?.pushedAt)
    .map((project) => ({
      time: project.github.pushedAt,
      kind: "Verified GitHub push",
      label: `${project.github.defaultBranch ?? "Default branch"} updated`,
      project: project.label,
      detail: `${project.github.openIssues ?? "Not captured"} open issues · ${project.github.openPullRequests ?? "Not captured"} open PRs`,
      tone: "github",
      link: href({ project: project.key }),
    }));
  const events = [...readoutEvents, ...githubEvents]
    .filter((event) => matchingActivity(event, query))
    .sort((left, right) => String(right.time ?? "").localeCompare(String(left.time ?? "")))
    .slice(0, 12);
  const rows = events.map((event) => `<tr><td><span class="portfolio-event-dot is-${escape(event.tone)}"></span><span class="portfolio-time">${escape(displayTime(event.time))}</span></td><td><a class="portfolio-activity-link" href="${escape(event.link)}"><strong>${escape(event.label)}</strong><small class="portfolio-cell-note">${escape(event.kind)}</small></a></td><td>${escape(event.project)}</td><td>${escape(event.detail)}</td></tr>`).join("")
    || '<tr><td class="portfolio-empty" colspan="4">No actual project event matches this search.</td></tr>';

  return `<section class="portfolio-panel portfolio-activity" aria-label="Recent cross-project activity"><header class="portfolio-section-heading"><div><h2>Recent cross-project activity</h2><p>Verified GitHub events and actual immutable skill readouts, labeled by source</p></div></header><div class="portfolio-table-scroll"><table class="portfolio-table"><thead><tr><th>Observed (UTC)</th><th>Event and verified source</th><th>Project</th><th>Recorded evidence</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function renderPortfolioAttention(snapshot) {
  const marketplace = snapshot.projects.find((project) => project.key === "github.com/quickstark/marketplace");
  if (!marketplace || marketplace.reports.length) return "";
  return `<aside class="portfolio-attention" role="note">${glyph("alert")}<div><strong>Marketplace has no received skill report</strong><p>${marketplace.sessions ? `${marketplace.sessions} machine-local sessions were observed. ` : ""}A running Codex task is not a completed immutable skill readout.</p></div><a href="${href({ project: marketplace.key })}">Inspect project ${glyph("arrow")}</a></aside>`;
}

function renderPortfolioEvidence(snapshot, query) {
  const attention = snapshot.projects.find((project) =>
    matchesProject(project, query)
    && project.key === "github.com/quickstark/marketplace")
    ?? snapshot.projects.find((project) => matchesProject(project, query))
    ?? null;
  const github = attention?.github;

  return `<aside class="portfolio-evidence" aria-label="Portfolio evidence and observations"><span class="portfolio-overline">Evidence and observations</span><section class="portfolio-evidence-section"><h2>${attention ? escape(attention.label) : "Portfolio sources"}</h2>${attention ? projectStatus(attention) : ""}<dl><dt>Actual immutable readouts</dt><dd>${attention ? attention.reports.length : "Not captured"}</dd><dt>Machine-local Codex sessions</dt><dd>${attention?.sessions === null || attention?.sessions === undefined ? "Not captured" : `${attention.sessions} · this machine only`}</dd><dt>Open GitHub issues</dt><dd>${github?.openIssues ?? "Not captured"}</dd><dt>Open GitHub pull requests</dt><dd>${github?.openPullRequests ?? "Not captured"}</dd><dt>Verified skill-token cost</dt><dd>Not captured</dd></dl></section><section class="portfolio-evidence-section"><h3>What these signals mean</h3><ul><li>GitHub inventory is a separately captured, authorized repository observation.</li><li>Machine-local Codex sessions are not completed skill runs.</li><li>Project reports never include catalog previews.</li><li>Other-owner local repositories are excluded without explicit publication approval.</li></ul></section><section class="portfolio-evidence-section"><h3>Source freshness</h3><p>${escape(displayTime(snapshot.generatedAt))}</p><p>${snapshot.generatedAt ? "The repository inventory is an explicit, refreshable snapshot." : "No verified repository inventory has been captured."}</p></section></aside>`;
}

export function renderReadoutPortfolio(snapshot, {
  query = "",
  activeProject = null,
  preferences,
} = {}) {
  const search = String(query).slice(0, 160).trim();
  const feature = safeInteger(preferences?.featurePx) ?? 14;
  const body = safeInteger(preferences?.promptPx) ?? 12;
  const metrics = [
    metric("GitHub repositories", snapshot.github.total, snapshot.owners.length ? snapshot.owners.join(" + ") : "Not captured", "git"),
    metric("Local checkouts", snapshot.local.total, "Canonical Git origins", "source"),
    metric("Projects reporting", snapshot.reportingProjects, "Actual immutable skill readouts", "report"),
    metric("Machine-local Codex sessions", snapshot.sessions.uniqueTotal, "This machine only; not skill runs", "pulse"),
  ].join("");

  return `<main class="portfolio-page" data-portfolio-home="true" style="--portfolio-feature:${feature}px;--portfolio-body:${body}px"><aside class="portfolio-rail" aria-label="Portfolio navigation"><a class="portfolio-brand" href="./"><span class="portfolio-brand-mark">Q</span><span>QuickStark<small>Reports</small></span></a><nav><a class="portfolio-rail-link is-current" href="./" aria-current="page">${glyph("overview")}<span>Portfolio overview</span></a><a class="portfolio-rail-link" href="${href({ view: "workbench", project: activeProject })}">${glyph("report")}<span>Project Workbench</span></a><a class="portfolio-rail-link" href="#recent-activity">${glyph("pulse")}<span>Recent activity</span></a><a class="portfolio-rail-link" href="/settings">${glyph("settings")}<span>Settings</span></a></nav><footer><span>AUTHENTICATED · READ-ONLY</span><p>Only independently observed sources and approved projects.</p></footer></aside><div class="portfolio-body"><header class="portfolio-heading"><div><h1>Portfolio overview</h1><p>Projects, verified reporting, and activity across your QuickStark portfolio.</p></div><div class="portfolio-freshness"><span class="portfolio-dot"></span><span><strong>Observed snapshot</strong><small>${escape(displayTime(snapshot.observedAt))}</small></span></div></header><section class="portfolio-metrics" aria-label="Verified portfolio metrics">${metrics}</section>${renderPortfolioAttention(snapshot)}${renderProjectPortfolio(snapshot, search)}<div id="recent-activity">${renderActivity(snapshot, search)}</div></div>${renderPortfolioEvidence(snapshot, search)}</main>`;
}

export const READOUT_PORTFOLIO_STYLES = `
  .portfolio-page{--portfolio-bg:#f7f9f8;--portfolio-white:#fff;--portfolio-ink:#14231f;--portfolio-muted:#63746e;--portfolio-line:#e5ebe7;--portfolio-forest:#123b2b;--portfolio-green:#07865a;--portfolio-mint:#e8f8ef;--portfolio-amber:#9b6100;--portfolio-amber-bg:#fff7e8;width:100%;min-height:100dvh;margin:0;padding:0;display:grid;grid-template-columns:190px minmax(0,1fr) 280px;background:var(--portfolio-bg);color:var(--portfolio-ink)}
  .portfolio-icon{width:17px;height:17px;flex:none}.portfolio-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.portfolio-rail{display:flex;min-height:100dvh;flex-direction:column;background:var(--portfolio-forest);color:#fff}.portfolio-brand{display:flex;align-items:center;gap:10px;min-height:70px;padding:15px;border-bottom:1px solid rgba(255,255,255,.13);color:#fff;font-size:13px;font-weight:770;text-decoration:none}.portfolio-brand-mark{display:grid;width:33px;height:33px;place-items:center;border-radius:10px;background:#fff;color:var(--portfolio-forest);font-size:17px;font-weight:850}.portfolio-brand small{display:block;margin-top:2px;color:#c8dfd0;font-size:10px;font-weight:500}.portfolio-rail nav{display:grid;gap:5px;padding:21px 8px}.portfolio-rail-link{display:flex;min-height:39px;align-items:center;gap:9px;padding:0 10px;border-left:2px solid transparent;border-radius:7px;color:#e5eee7;font-size:11px;text-decoration:none}.portfolio-rail-link.is-current{border-left-color:#72dab0;background:rgba(255,255,255,.11);color:#fff}.portfolio-rail footer{margin-top:auto;padding:14px;border-top:1px solid rgba(255,255,255,.13)}.portfolio-rail footer>span{font-size:9px;font-weight:730;letter-spacing:.08em}.portfolio-rail footer p{margin:7px 0 0;color:#c8dfd0;font-size:10px;line-height:1.55}
  .portfolio-body{min-width:0;padding:26px clamp(13px,2vw,26px) 40px}.portfolio-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:19px}.portfolio-heading h1{margin:0;color:var(--portfolio-ink);font-size:clamp(25px,3.1vw,35px);font-weight:760;line-height:1.12;letter-spacing:-.06em}.portfolio-heading p{margin:5px 0 0;color:var(--portfolio-muted);font-size:max(11px,var(--portfolio-body))}.portfolio-freshness{display:flex;align-items:center;gap:7px}.portfolio-freshness>span:last-child strong,.portfolio-freshness>span:last-child small{display:block}.portfolio-freshness strong{font-size:10px}.portfolio-freshness small{color:var(--portfolio-muted);font-size:9px}.portfolio-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:15px}.portfolio-metric{display:flex;min-height:88px;align-items:center;gap:10px;padding:11px;border:1px solid var(--portfolio-line);border-radius:11px;background:#fff}.portfolio-metric-icon{display:grid;width:35px;height:35px;flex:none;place-items:center;border-radius:12px;background:var(--portfolio-mint);color:var(--portfolio-green)}.portfolio-metric-copy{min-width:0}.portfolio-metric-copy>span,.portfolio-metric-copy>small{display:block;color:var(--portfolio-muted);font-size:10px}.portfolio-metric-copy strong{display:block;margin:2px 0;color:var(--portfolio-forest);font-size:25px;font-weight:760;line-height:1.08;letter-spacing:-.055em}.portfolio-metric-copy .portfolio-metric-missing{font-size:15px;letter-spacing:-.025em}
  .portfolio-attention{display:grid;grid-template-columns:19px minmax(0,1fr) auto;align-items:center;gap:10px;margin-bottom:15px;padding:11px 12px;border:1px solid #eed49d;border-radius:10px;background:var(--portfolio-amber-bg);color:var(--portfolio-amber)}.portfolio-attention strong{font-size:11px}.portfolio-attention p{margin:3px 0 0;color:#755c36;font-size:10px}.portfolio-attention>a{display:flex;align-items:center;gap:3px;color:#755c36;font-size:10px;font-weight:650;text-decoration:none}
  .portfolio-panel{overflow:hidden;margin-bottom:14px;border:1px solid var(--portfolio-line);border-radius:11px;background:var(--portfolio-white)}.portfolio-section-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px 11px}.portfolio-section-heading h2{margin:0;color:var(--portfolio-ink);font-size:max(14px,var(--portfolio-feature));line-height:1.3;letter-spacing:-.025em}.portfolio-section-heading p{margin:3px 0 0;color:var(--portfolio-muted);font-size:10px}.portfolio-search{display:flex;align-items:center;gap:6px}.portfolio-search label{display:flex;min-width:190px;min-height:32px;align-items:center;gap:6px;padding:0 8px;border:1px solid var(--portfolio-line);border-radius:7px;color:var(--portfolio-muted)}.portfolio-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--portfolio-ink);font:11px ui-sans-serif,system-ui,sans-serif}.portfolio-search button{min-height:32px;padding:0 11px;border:0;border-radius:7px;background:var(--portfolio-green);color:#fff;font:650 11px ui-sans-serif,system-ui,sans-serif}.portfolio-reset{color:var(--portfolio-muted);font-size:10px}.portfolio-table-scroll{overflow-x:auto}.portfolio-table{width:100%;border-collapse:collapse;text-align:left}.portfolio-table th{padding:9px 10px;border-block:1px solid var(--portfolio-line);background:#fafcfb;color:var(--portfolio-muted);font-size:9px;font-weight:750;letter-spacing:.035em;white-space:nowrap}.portfolio-table td{padding:10px;border-bottom:1px solid #eff2ef;font-size:max(10px,calc(var(--portfolio-body) - 1px));vertical-align:middle}.portfolio-table tbody tr:last-child td{border-bottom:0}.portfolio-project-link{display:flex;min-width:165px;align-items:center;gap:7px;color:var(--portfolio-forest);text-decoration:none}.portfolio-project-link strong,.portfolio-project-link small{display:block}.portfolio-project-link strong{font-size:11px}.portfolio-project-link small,.portfolio-cell-note{display:block;margin-top:2px;color:var(--portfolio-muted);font-size:10px}.portfolio-status{display:inline-flex;align-items:center;gap:5px;color:var(--portfolio-green);font-size:10px;font-weight:650;white-space:nowrap}.portfolio-dot{display:inline-block;width:8px;height:8px;flex:none;border-radius:50%;background:var(--portfolio-green)}.portfolio-status.is-warn{color:var(--portfolio-amber)}.portfolio-status.is-warn .portfolio-dot{background:#d39a20}.portfolio-status.is-quiet{color:var(--portfolio-muted)}.portfolio-status.is-quiet .portfolio-dot{background:#9aa7a1}.portfolio-unknown,.portfolio-time{color:var(--portfolio-muted);font-size:10px}.portfolio-time{white-space:nowrap}.portfolio-table-foot{margin:0;padding:8px 12px;color:var(--portfolio-muted);font-size:10px}.portfolio-empty{padding:17px;color:var(--portfolio-muted)}
  .portfolio-event-dot{display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:50%;background:var(--portfolio-green)}.portfolio-event-dot.is-github{background:#3363ba}.portfolio-activity-link{color:var(--portfolio-ink);text-decoration:none}.portfolio-activity-link strong{font-size:11px}.portfolio-evidence{min-width:0;padding:25px 14px;border-left:1px solid var(--portfolio-line);background:#fff}.portfolio-overline{color:var(--portfolio-muted);font-size:10px;font-weight:760;letter-spacing:.08em;text-transform:uppercase}.portfolio-evidence-section{padding:14px 0;border-bottom:1px solid var(--portfolio-line)}.portfolio-evidence-section h2{margin:0 0 8px;color:var(--portfolio-ink);font-size:max(14px,var(--portfolio-feature));letter-spacing:-.03em;overflow-wrap:anywhere}.portfolio-evidence-section h3{margin:0 0 7px;color:var(--portfolio-ink);font-size:11px}.portfolio-evidence-section dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px 6px;margin:12px 0 0}.portfolio-evidence-section dt{color:var(--portfolio-muted);font-size:10px}.portfolio-evidence-section dd{margin:0;font-size:10px;font-weight:660;text-align:right}.portfolio-evidence-section>p{margin:5px 0;color:var(--portfolio-muted);font-size:10px;line-height:1.55}.portfolio-evidence-section ul{margin:0;padding-left:15px;color:var(--portfolio-muted);font-size:10px}.portfolio-evidence-section li+li{margin-top:6px}
  @media(max-width:1050px){.portfolio-page{grid-template-columns:175px minmax(0,1fr) 235px}.portfolio-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.portfolio-section-heading{flex-wrap:wrap}.portfolio-search{width:100%}.portfolio-search label{flex:1}}
  @media(max-width:650px){.portfolio-page{grid-template-columns:minmax(0,1fr)}.portfolio-rail{min-height:0}.portfolio-brand{min-height:54px}.portfolio-rail nav{display:flex;gap:5px;overflow-x:auto;padding:7px}.portfolio-rail-link{min-height:34px;white-space:nowrap}.portfolio-rail footer{display:none}.portfolio-body{padding:14px 10px 20px}.portfolio-heading{align-items:flex-start}.portfolio-heading h1{font-size:25px}.portfolio-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.portfolio-metric{min-height:80px;padding:9px}.portfolio-metric-copy strong{font-size:22px}.portfolio-attention{grid-template-columns:18px minmax(0,1fr)}.portfolio-attention>a{grid-column:2}.portfolio-evidence{border-top:1px solid var(--portfolio-line);border-left:0}.portfolio-table-scroll{-webkit-overflow-scrolling:touch}.portfolio-section-heading{padding-inline:10px}}
`;

async function mapLimited(items, limit, operation) {
  let cursor = 0;
  const result = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(items.length, limit) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await operation(items[index]);
    }
  }));
  return result;
}

async function safeFiles(root, accepts, depth = 0) {
  if (depth > 6) return [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EACCES") return [];
    throw error;
  }
  const results = await mapLimited(entries, 12, async (entry) => {
    if (entry.name.startsWith(".")) return [];
    const path = join(root, entry.name);
    if (entry.isDirectory()) return safeFiles(path, accepts, depth + 1);
    return entry.isFile() && accepts(entry.name) ? [path] : [];
  });
  return results.flat().slice(0, MAX_SESSION_FILES);
}

function normalizeGitRemote(remote) {
  const text = String(remote ?? "").trim();
  let owner;
  let repository;
  const ssh = text.match(/^(?:[a-z0-9._-]+@)?github\.com:([^/\s?#]+)\/([^/\s?#]+?)(?:\.git)?$/i);
  if (ssh) {
    [, owner, repository] = ssh;
  } else {
    let url;
    try {
      url = new URL(text);
    } catch {
      return null;
    }
    if (url.hostname !== "github.com" || url.username || url.password || url.search || url.hash) return null;
    const parts = url.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    [owner, repository] = parts;
  }
  if (!SAFE_SEGMENT.test(owner) || !SAFE_SEGMENT.test(repository)) return null;
  return safeIdentity({ key: `github.com/${owner}/${repository}` });
}

async function observeLocalRepositories(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return { status: "not-captured", total: null, projects: [] };
  }
  const projects = await mapLimited(
    entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")),
    8,
    async (entry) => {
      try {
        const result = await execute("git", ["-C", join(root, entry.name), "config", "--get", "remote.origin.url"], {
          timeout: 2500,
          maxBuffer: 8192,
        });
        const identity = normalizeGitRemote(result.stdout);
        if (!identity) return null;
        return { ...identity, locallyPresent: true, localName: entry.name, github: null, sessions: null, source: "local" };
      } catch {
        return null;
      }
    },
  );
  const observed = projects.filter(Boolean);
  return { status: "observed", total: observed.length, projects: observed };
}

function githubPortfolioQuery(owners) {
  const entries = owners.map((owner, index) => `owner${index}:repositoryOwner(login:"${owner}"){repositories(first:100,ownerAffiliations:OWNER,orderBy:{field:PUSHED_AT,direction:DESC}){totalCount nodes{nameWithOwner isPrivate pushedAt defaultBranchRef{name} issues(states:OPEN){totalCount} pullRequests(states:OPEN){totalCount}}}}`);
  return `query QuickStarkPortfolio{${entries.join(" ")}}`;
}

async function observeGitHubRepositories(owners, cwd) {
  if (!owners.length) return { status: "not-captured", total: null, projects: [] };
  try {
    const result = await execute("gh", ["api", "graphql", "-f", `query=${githubPortfolioQuery(owners)}`], {
      cwd,
      timeout: 15_000,
      maxBuffer: MAX_INVENTORY_BYTES,
    });
    const response = JSON.parse(result.stdout);
    if (response.errors?.length || !response.data) return { status: "not-captured", total: null, projects: [] };
    const groups = owners.map((_, index) => response.data[`owner${index}`]?.repositories);
    if (groups.some((group) => !group || !Number.isSafeInteger(group.totalCount))) {
      return { status: "not-captured", total: null, projects: [] };
    }
    const projects = groups.flatMap((group) => group.nodes.map((node) => {
      const identity = safeIdentity({ key: `github.com/${node.nameWithOwner}` });
      if (!identity) return null;
      return {
        ...identity,
        source: "github",
        locallyPresent: false,
        sessions: null,
        github: {
          visibility: node.isPrivate ? "private" : "public",
          defaultBranch: node.defaultBranchRef?.name ?? null,
          pushedAt: safeInstant(node.pushedAt),
          openIssues: safeInteger(node.issues?.totalCount),
          openPullRequests: safeInteger(node.pullRequests?.totalCount),
        },
      };
    })).filter(Boolean);
    return {
      status: "observed",
      total: groups.reduce((total, group) => total + group.totalCount, 0),
      projects,
    };
  } catch {
    return { status: "not-captured", total: null, projects: [] };
  }
}

async function observeSession(path, root) {
  let handle;
  try {
    handle = await open(path, "r");
    const buffer = Buffer.alloc(24 * 1024);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    const lines = buffer.toString("utf8", 0, result.bytesRead).split("\n").slice(0, 4);
    for (const line of lines) {
      if (!line.includes('"session_meta"')) continue;
      const event = JSON.parse(line);
      if (event.type !== "session_meta") continue;
      const payload = event.payload ?? {};
      const id = payload.id ?? payload.session_id;
      if (!meaningful(id)) return null;
      const cwd = meaningful(payload.cwd)
        ? await realpath(payload.cwd).catch(() => "")
        : "";
      const projectRelative = relative(root, cwd);
      const localName = projectRelative
        && !projectRelative.startsWith(`..${sep}`)
        && projectRelative !== ".."
        ? projectRelative.split(sep)[0]
        : null;
      return { id, localName };
    }
    return null;
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

async function observeCodexSessions(sessionRoot, repositoryRoot, localProjects) {
  try {
    const paths = await safeFiles(sessionRoot, (name) => name.endsWith(".jsonl"));
    const records = await mapLimited(paths, 18, (path) => observeSession(path, repositoryRoot));
    const identities = new Map(localProjects.map((project) => [project.localName, project.key]));
    const sessions = new Map();
    for (const item of records.filter(Boolean)) {
      if (!sessions.has(item.id)) sessions.set(item.id, identities.get(item.localName) ?? null);
    }
    const counts = new Map();
    for (const key of sessions.values()) {
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return { status: "observed", uniqueTotal: sessions.size, byProject: counts };
  } catch {
    return { status: "not-captured", uniqueTotal: null, byProject: new Map() };
  }
}

export async function refreshReadoutPortfolioInventory({
  directory,
  owners = DEFAULT_OWNERS,
  repositoryRoot = "/github",
  sessionRoot = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "sessions"),
  now = new Date().toISOString(),
} = {}) {
  if (!meaningful(directory)) throw new Error("Portfolio refresh requires an explicit readout directory.");
  const approvedOwners = ownerList(owners);
  if (!approvedOwners.length) throw new Error("Portfolio refresh requires at least one explicitly approved repository owner.");
  const root = await realpath(resolve(repositoryRoot)).catch(() => resolve(repositoryRoot));
  const local = await observeLocalRepositories(root);
  const [github, sessions] = await Promise.all([
    observeGitHubRepositories(approvedOwners, root),
    observeCodexSessions(resolve(sessionRoot), root, local.projects),
  ]);
  const projects = new Map();
  for (const item of github.projects) projects.set(item.key, item);
  for (const item of local.projects) {
    if (!approvedOwners.includes(item.owner)) continue;
    const previous = projects.get(item.key);
    projects.set(item.key, {
      ...(previous ?? item),
      locallyPresent: true,
      source: previous ? "github" : "local",
      sessions: sessions.byProject.get(item.key) ?? 0,
    });
  }
  for (const project of projects.values()) {
    project.sessions = sessions.byProject.get(project.key) ?? 0;
  }

  const inventory = normalizeInventory({
    version: INVENTORY_VERSION,
    generatedAt: safeInstant(now),
    owners: approvedOwners,
    github: { status: github.status, total: github.total },
    local: { status: local.status, total: local.total },
    sessions: { status: sessions.status, uniqueTotal: sessions.uniqueTotal },
    projects: [...projects.values()],
  });
  const parent = join(resolve(directory), ".quickstark-portfolio");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const path = join(parent, "inventory-v1.json");
  const temporary = join(parent, `inventory-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(inventory, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await rename(temporary, path);

  return {
    generatedAt: inventory.generatedAt,
    directory: resolve(directory),
    path,
    owners: inventory.owners,
    githubRepositories: inventory.github.total,
    localCheckouts: inventory.local.total,
    uniqueMachineSessions: inventory.sessions.uniqueTotal,
    projects: inventory.projects.length,
  };
}

function portfolioOptions(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (!["--directory", "--owners", "--repository-root", "--session-root"].includes(argument)) {
      throw new Error(`Unsupported portfolio option: ${argument}`);
    }
    const value = arguments_[++index];
    if (!meaningful(value)) throw new Error(`${argument} requires a value.`);
    if (argument === "--directory") options.directory = value;
    if (argument === "--owners") options.owners = ownerList(value.split(","));
    if (argument === "--repository-root") options.repositoryRoot = value;
    if (argument === "--session-root") options.sessionRoot = value;
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...arguments_] = process.argv.slice(2);
  if (command !== "refresh") {
    throw new Error("Usage: node scripts/qs-readout-portfolio.mjs refresh --directory /path/to/readouts [--owners quickstark,quickstarkdemo] [--json]");
  }
  const options = portfolioOptions(arguments_);
  const result = await refreshReadoutPortfolioInventory(options);
  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`Verified portfolio snapshot: ${result.path}`);
    console.log(`GitHub repositories: ${result.githubRepositories ?? "Not captured"}`);
    console.log(`Local checkouts: ${result.localCheckouts ?? "Not captured"}`);
    console.log(`Machine-local Codex sessions: ${result.uniqueMachineSessions ?? "Not captured"}`);
  }
}
