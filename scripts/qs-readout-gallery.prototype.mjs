/**
 * PROTOTYPE — throwaway, local-only QuickStark Reports design exploration.
 *
 * Question: Which one-page layout makes verified project readouts easiest to
 * search, compare, and read without inventing run or model telemetry?
 *
 * Run:
 *   QS_READOUT_DIR=/docker/appdata/quickstark-readouts \
 *     node scripts/qs-readout-gallery.prototype.mjs
 *
 * This is not the production viewer or ingestion module. It binds only to
 * loopback by default; a trusted proxy can explicitly configure a specific
 * container hostname and an authenticated public subpath. It never writes a
 * report.
 */

import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { NEXT_SKILLS_BY_NAME, SKILLS_BY_NAME } from "./qs-skill-catalog.mjs";

const HOST = process.env.QS_READOUT_PROTOTYPE_HOST ?? "127.0.0.1";
const DEFAULT_PORT = 4181;
const MAX_REPORTS = 10_000;
const MAX_DEPTH = 10;
const directory = resolve(
  process.env.QS_READOUT_DIR ?? join(tmpdir(), "quickstark-readouts"),
);
const configuredPort = Number(process.env.QS_READOUT_PROTOTYPE_PORT ?? DEFAULT_PORT);
const basePath = (process.env.QS_READOUT_PROTOTYPE_BASE_PATH ?? "")
  .replace(/\/$/, "");
const allowedProjects = new Set(
  (process.env.QS_READOUT_ALLOWED_PROJECTS ?? "github.com/quickstark/skills")
    .split(",")
    .map((project) => project.trim())
    .filter(Boolean),
);

if (!Number.isSafeInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
  throw new Error("QS_READOUT_PROTOTYPE_PORT must be a port between 1 and 65535.");
}

if (
  !/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(HOST)
  || HOST === "0.0.0.0"
  || HOST === "::"
) {
  throw new Error("Bind the prototype to loopback or one explicitly trusted hostname, not every network interface.");
}

if (basePath && !/^\/[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\/[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/i.test(basePath)) {
  throw new Error("QS_READOUT_PROTOTYPE_BASE_PATH must be a safe absolute URL prefix.");
}

if (allowedProjects.size === 0) {
  throw new Error("The prototype requires at least one explicitly allowed project.");
}

const variants = [
  { key: "A", name: "Project workbench" },
  { key: "B", name: "Search command center" },
  { key: "C", name: "Activity canvas" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => {
      const point = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
      return Number.isSafeInteger(point) && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : "";
    })
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function findMetadata(html, key) {
  const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = html.match(new RegExp(
    `<meta\\b(?=[^>]*\\bname=["']quickstark:${safeKey}["'])[^>]*>`,
    "i",
  ));

  if (!tag) return "";

  const content = tag[0].match(/\bcontent=(?:"([^"]*)"|'([^']*)')/i);
  return decodeHtml(content?.[1] ?? content?.[2] ?? "");
}

function safeObservedInteger(value) {
  if (!/^\d+$/.test(value ?? "")) return null;

  const observed = Number(value);
  return Number.isSafeInteger(observed) ? observed : null;
}

function observedTelemetry(html) {
  const source = findMetadata(html, "observation-source");
  const scope = findMetadata(html, "observation-scope");

  // Thread-level and unattributed provider usage must never be displayed as
  // this particular skill run's inference consumption.
  if (!source || scope !== "skill_run") return null;

  return {
    source,
    scope,
    model: findMetadata(html, "model") || null,
    effort: findMetadata(html, "reasoning-effort") || null,
    totalTokens: safeObservedInteger(findMetadata(html, "total-tokens")),
    durationMs: safeObservedInteger(findMetadata(html, "duration-ms")),
  };
}

function readOutcome(html) {
  const outcome = html.match(/<p\s+class="outcome"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  return decodeHtml((outcome ?? "").replace(/<[^>]+>/g, " ")).trim();
}

function readSkillsUsed(html) {
  const chips = [...html.matchAll(
    /<span\s+class="skill-chip"[^>]*>\s*\/?([^<]+)<\/span>/gi,
  )];

  return [...new Set(chips.map((match) => decodeHtml(match[1]).trim()))]
    .filter((name) => SKILLS_BY_NAME.has(name));
}

async function discoverReports() {
  const reports = [];

  async function visit(current, depth) {
    if (depth > MAX_DEPTH || reports.length >= MAX_REPORTS) return;

    let entries;

    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      if (reports.length >= MAX_REPORTS) return;
      if (entry.name.startsWith(".")) continue;

      const path = join(current, entry.name);

      if (entry.isDirectory()) {
        await visit(path, depth + 1);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

      const html = await readFile(path, "utf8");
      const name = findMetadata(html, "skill");
      const status = findMetadata(html, "status");
      const generatedAt = findMetadata(html, "generated-at");
      const projectKey = findMetadata(html, "project");
      const external = findMetadata(html, "report-origin") === "external";
      const catalogSkill = SKILLS_BY_NAME.get(name);

      if (
        !allowedProjects.has(projectKey)
        || status === "Preview"
        || !["Completed", "Blocked", "Awaiting input"].includes(status)
        || Number.isNaN(Date.parse(generatedAt))
        || (!catalogSkill && !external)
      ) {
        continue;
      }

      reports.push({
        id: findMetadata(html, "report-id") || null,
        name,
        displayName: catalogSkill?.displayName
          ?? findMetadata(html, "skill-display-name")
          ?? name,
        family: catalogSkill?.name.split("-")[1] ?? "external",
        profile: findMetadata(html, "report-profile"),
        status,
        generatedAt,
        projectKey,
        projectLabel: findMetadata(html, "project-label") || projectKey,
        outcome: readOutcome(html),
        producer: findMetadata(html, "producer") || null,
        harness: findMetadata(html, "harness") || null,
        machine: findMetadata(html, "machine") || null,
        platform: findMetadata(html, "platform") || null,
        relativePath: relative(directory, path).split(sep).join("/"),
        skillsUsed: readSkillsUsed(html),
        telemetry: observedTelemetry(html),
      });
    }
  }

  await visit(directory, 0);

  return reports.sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt)
    || left.relativePath.localeCompare(right.relativePath));
}

function icon(name, className = "") {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
    report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><path d="M14 3v6h6M8 13h8M8 17h8"></path>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"></path>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"></path><path d="m9 12 2 2 4-4"></path>',
    arrowLeft: '<path d="m15 18-6-6 6-6"></path>',
    arrowRight: '<path d="m9 18 6-6-6-6"></path>',
    external: '<path d="M15 3h6v6M10 14 21 3"></path><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    command: '<path d="M18 9a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3z"></path>',
  };

  return `<svg class="icon ${escapeHtml(className)}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.report}</svg>`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDuration(value) {
  if (value === null || value === undefined) return "—";
  if (value < 1_000) return `${value} ms`;
  if (value < 60_000) return `${(value / 1_000).toFixed(1)} s`;
  return `${Math.floor(value / 60_000)}m ${Math.round((value % 60_000) / 1_000)}s`;
}

function hrefFor(params, changes = {}) {
  const next = new URLSearchParams(params);

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }

  const encoded = next.toString();
  const root = `${basePath}/`;
  return encoded ? `${root}?${escapeHtml(encoded)}` : root;
}

function reportHref(report) {
  return `${basePath}/report/${report.relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function statusMarkup(status) {
  const modifier = status.toLowerCase().replaceAll(" ", "-");
  return `<span class="status status--${escapeHtml(modifier)}"><span class="status-dot"></span>${escapeHtml(status)}</span>`;
}

function metricMarkup(label, value, detail) {
  return `<div class="metric"><span class="metric-label">${escapeHtml(label)}</span><span class="metric-value">${escapeHtml(value)}</span><span class="metric-detail">${escapeHtml(detail)}</span></div>`;
}

function renderMetrics(reports) {
  const primarySkills = new Set(reports.map((report) => report.name));
  const projects = new Set(reports.map((report) => report.projectKey));
  const measured = reports.filter((report) => report.telemetry !== null);

  return `<div class="metrics">${[
    metricMarkup("Actual runs", reports.length, "Immutable non-preview readouts"),
    metricMarkup("Primary skills", primarySkills.size, "Distinct observed report skills"),
    metricMarkup("Verified projects", projects.size, "Authorized project identities"),
    metricMarkup("Measured runs", measured.length, "Run-attributed model telemetry"),
  ].join("")}</div>`;
}

function renderProjects(projects, params, selectedProject) {
  if (projects.length === 0) return '<p class="empty-note">No authorized project reports.</p>';

  return projects.map((project) => {
    const selected = project.key === selectedProject;

    return `<a class="project-link${selected ? " is-selected" : ""}" ${selected ? 'aria-current="page"' : ""} href="${hrefFor(params, { project: project.key, report: null })}">${icon("folder")}<span class="project-name">${escapeHtml(project.label)}</span><span class="project-count">${project.count}</span></a>`;
  }).join("");
}

function renderSearch(params, variant, project, query) {
  return `<form class="search-form" method="get" action="${escapeHtml(`${basePath}/`)}"><input type="hidden" name="variant" value="${escapeHtml(variant)}">${project ? `<input type="hidden" name="project" value="${escapeHtml(project)}">` : ""}<label class="search-field">${icon("search")}<span class="visually-hidden">Search actual project reports</span><input id="report-search" name="q" type="search" value="${escapeHtml(query)}" placeholder="Search skills, outcomes, or reports" maxlength="200" autocomplete="off"><span class="keycap">/</span></label><button class="quiet-button" type="submit">Search</button>${query ? `<a class="quiet-button" href="${hrefFor(params, { q: null, report: null })}">Clear</a>` : ""}</form>`;
}

function renderRow(report, params, selected, { showProject = false } = {}) {
  const telemetry = report.telemetry;

  return `<a class="report-row${selected ? " is-selected" : ""}" ${selected ? 'aria-current="true"' : ""} href="${hrefFor(params, { report: report.relativePath })}"><span class="report-name">${icon("report")}<span><strong>/${escapeHtml(report.name)}</strong>${showProject ? `<small>${escapeHtml(report.projectLabel)}</small>` : ""}</span></span><span>${statusMarkup(report.status)}</span><span class="muted">${escapeHtml(report.family)}</span><span class="mono">${escapeHtml(formatTime(report.generatedAt))}</span><span class="mono">${escapeHtml(telemetry?.model ?? "—")}</span><span class="mono">${escapeHtml(telemetry?.effort ?? "—")}</span><span class="mono">${escapeHtml(telemetry?.totalTokens?.toLocaleString("en-US") ?? "—")}</span><span class="mono">${escapeHtml(formatDuration(telemetry?.durationMs ?? null))}</span></a>`;
}

function renderLedger(reports, params, selected, options = {}) {
  if (reports.length === 0) {
    return '<div class="empty-state">'+icon("report")+'<h3>No matching actual reports</h3><p>Only completed, blocked, or awaiting-input reports from explicitly authorized projects are shown. Catalog previews are excluded.</p></div>';
  }

  return `<div class="ledger"><div class="ledger-head"><span>Skill</span><span>Status</span><span>Family</span><span>Generated · UTC</span><span>Model</span><span>Effort</span><span>Tokens</span><span>Duration</span></div>${reports.map((report) => renderRow(report, params, report.relativePath === selected?.relativePath, options)).join("")}</div>`;
}

function detailItem(label, value) {
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not captured")}</strong></div>`;
}

function renderRecommendation(report) {
  const next = NEXT_SKILLS_BY_NAME[report.name]?.[0];

  if (!next) {
    return '<div class="recommendation"><h3>Next best</h3><p>No approved catalog recommendation is recorded for this skill.</p></div>';
  }

  return `<div class="recommendation"><div class="section-heading">${icon("activity")}<h3>Next best</h3><span class="source-label">Catalog-approved</span></div><p class="next-command">/${escapeHtml(next.name)}</p><p class="recommendation-reason">${escapeHtml(next.reason)}</p>${detailItem("Suggested model", "Insufficient evidence")}${detailItem("Reasoning effort", "Insufficient evidence")}<p class="evidence-note">Model and effort recommendations require comparable observed skill runs and verified quality evidence.</p></div>`;
}

function renderDetail(report) {
  if (!report) {
    return `<aside class="detail-pane"><div class="empty-state">${icon("report")}<h3>Select a readout</h3><p>Choose an actual report to inspect its immutable outcome, provenance, available telemetry, and catalog-approved next step.</p></div></aside>`;
  }

  const telemetry = report.telemetry;

  return `<aside class="detail-pane"><div class="detail-top"><span class="readonly-label">${icon("shield")} Read-only report</span>${statusMarkup(report.status)}</div><h2 class="detail-title">/${escapeHtml(report.name)}</h2><p class="profile-label">${escapeHtml(report.profile || report.displayName)}</p><a class="open-report" href="${escapeHtml(reportHref(report))}" target="_blank" rel="noopener">Open immutable readout ${icon("external")}</a><section class="detail-section"><div class="section-heading">${icon("report")}<h3>Observed outcome</h3></div><p class="outcome-copy">${escapeHtml(report.outcome || "The stored report does not contain a readable outcome.")}</p></section><section class="detail-section"><div class="section-heading">${icon("clock")}<h3>Run evidence</h3></div>${detailItem("Project", report.projectLabel)}${detailItem("Generated · UTC", formatTime(report.generatedAt))}${detailItem("Harness", report.harness)}${detailItem("Producer", report.producer)}${detailItem("Machine", report.machine)}${detailItem("Model", telemetry?.model)}${detailItem("Reasoning effort", telemetry?.effort)}${detailItem("Total tokens", telemetry?.totalTokens?.toLocaleString("en-US"))}${detailItem("Active duration", telemetry ? formatDuration(telemetry.durationMs) : null)}${detailItem("Measurement source", telemetry?.source)}<p class="evidence-note">Missing fields were not observed. A report timestamp is not an execution duration.</p></section>${renderRecommendation(report)}</aside>`;
}

function renderActivity(reports, params, selected) {
  if (reports.length === 0) return renderLedger(reports, params, selected);

  const groups = new Map();

  for (const report of reports) {
    const day = report.generatedAt.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(report);
  }

  return `<div class="timeline">${[...groups].map(([day, entries]) => {
    const label = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(new Date(`${day}T00:00:00.000Z`));

    return `<section class="timeline-group"><h3 class="timeline-date">${escapeHtml(label)} <span>UTC</span></h3>${entries.map((report) => `<a class="activity-row${report.relativePath === selected?.relativePath ? " is-selected" : ""}" href="${hrefFor(params, { report: report.relativePath })}"><span class="activity-mark family--${escapeHtml(report.family)}"></span><span class="activity-body"><strong>/${escapeHtml(report.name)}</strong><small>${escapeHtml(report.outcome || report.profile || report.projectLabel)}</small></span>${statusMarkup(report.status)}<span class="activity-time">${escapeHtml(formatTime(report.generatedAt))}</span></a>`).join("")}</section>`;
  }).join("")}</div>`;
}

function groupProjects(reports) {
  const groups = new Map();

  for (const report of reports) {
    const current = groups.get(report.projectKey) ?? {
      key: report.projectKey,
      label: report.projectLabel,
      count: 0,
    };

    current.count += 1;
    groups.set(report.projectKey, current);
  }

  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
}

const styles = `
:root{color-scheme:light;--paper:#fcfcfa;--surface:#fff;--ink:#172019;--muted:#717a74;--line:#e5e8e4;--accent:#138a63;--soft:#eaf5ee;--blue:#3868c9;--amber:#9a650b;--radius:10px}
*{box-sizing:border-box}html{min-height:100%;background:var(--paper)}body{margin:0;color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;-webkit-font-smoothing:antialiased}a{color:inherit}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.icon{flex:none}.muted{color:var(--muted)}.mono{color:#59625c;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.masthead{display:flex;height:62px;align-items:center;justify-content:space-between;gap:18px;padding:0 22px;border-bottom:1px solid var(--line);background:var(--surface)}.brand{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:750;letter-spacing:-.025em}.brand-mark{display:grid;width:30px;height:30px;place-items:center;border-radius:8px;background:#153325;color:#fff;font-size:13px}.prototype-label{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:11px}.prototype-label strong{color:#96630d}.shell{display:grid;min-height:calc(100vh - 62px);grid-template-columns:215px minmax(0,1fr) 365px}.sidebar{min-width:0;padding:23px 12px;border-right:1px solid var(--line);background:var(--surface)}.rail-label{padding:3px 8px 11px;color:var(--muted);font-size:10px;font-weight:750;letter-spacing:.11em;text-transform:uppercase}.project-link{display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:39px;margin-bottom:3px;border-radius:7px;padding:8px;text-decoration:none}.project-link:hover,.project-link.is-selected{background:var(--soft)}.project-link.is-selected{color:#116a4d}.project-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.project-count{color:var(--muted);font-size:11px}.workspace{min-width:0;padding:25px 24px 105px}.workspace-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.workspace-heading h1{margin:0;font-size:23px;line-height:1.1;letter-spacing:-.055em}.scope-note{color:var(--muted);font-size:11px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:19px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.metric{min-width:0;padding:13px 10px 12px;border-right:1px solid var(--line)}.metric:first-child{padding-left:0}.metric:last-child{border-right:0}.metric-label{display:block;color:var(--muted);font-size:10px;font-weight:640}.metric-value{display:block;margin-top:6px;font-size:24px;font-weight:720;letter-spacing:-.07em}.metric-detail{display:block;margin-top:4px;color:var(--muted);font-size:10px;line-height:1.45}.search-form{display:flex;align-items:center;gap:8px;margin:15px 0}.search-field{display:flex;min-width:0;max-width:410px;flex:1;align-items:center;gap:8px;height:35px;border:1px solid var(--line);border-radius:8px;padding:0 10px;background:var(--surface);color:var(--muted)}.search-field input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font:inherit}.keycap{border:1px solid var(--line);border-radius:4px;padding:1px 5px;font:10px ui-monospace,SFMono-Regular,Menlo,monospace}.quiet-button{display:inline-flex;height:35px;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;padding:0 11px;background:var(--surface);color:var(--ink);font:600 11px ui-sans-serif,system-ui,sans-serif;text-decoration:none}.ledger{min-width:0;overflow-x:auto}.ledger-head,.report-row{display:grid;grid-template-columns:minmax(165px,1.55fr) minmax(100px,.9fr) minmax(64px,.55fr) minmax(104px,.9fr) minmax(66px,.55fr) minmax(54px,.48fr) minmax(50px,.42fr) minmax(62px,.48fr);align-items:center;gap:9px;min-width:790px}.ledger-head{min-height:35px;border-bottom:1px solid var(--line);color:var(--muted);font-size:10px;font-weight:700}.report-row{min-height:52px;border-bottom:1px solid var(--line);padding:5px 0;text-decoration:none}.report-row:hover,.report-row.is-selected{background:linear-gradient(90deg,#eff8f2,transparent)}.report-row.is-selected{box-shadow:inset 2px 0 var(--accent)}.report-name{display:flex;min-width:0;align-items:center;gap:8px}.report-name>span{min-width:0}.report-name strong,.report-name small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.report-name strong{font-size:11px;font-weight:670}.report-name small{margin-top:4px;color:var(--muted);font-size:10px}.status{display:inline-flex;max-width:100%;align-items:center;gap:6px;color:#176949;font-size:10px;font-weight:640}.status-dot{width:7px;height:7px;border-radius:50%;background:currentColor}.status--blocked{color:#b54640}.status--awaiting-input{color:var(--amber)}.detail-pane{min-width:0;padding:23px 17px 105px;border-left:1px solid var(--line);background:var(--surface)}.detail-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.readonly-label{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:10px}.detail-title{margin:19px 0 5px;overflow-wrap:anywhere;font-size:21px;line-height:1.2;letter-spacing:-.06em}.profile-label{margin:0;color:var(--muted);font-size:11px}.open-report{display:inline-flex;align-items:center;gap:7px;margin-top:15px;color:#2860a5;font-size:11px;font-weight:640;text-decoration:none}.detail-section,.recommendation{margin-top:22px;border-top:1px solid var(--line);padding-top:14px}.section-heading{display:flex;align-items:center;gap:8px}.section-heading h3{flex:1;margin:0;font-size:12px;font-weight:690}.source-label{color:var(--accent);font-size:10px}.outcome-copy,.recommendation-reason{color:#46534c;font-size:12px;line-height:1.7}.detail-row{display:grid;grid-template-columns:minmax(90px,1fr) minmax(110px,1fr);gap:8px;border-bottom:1px solid #f0f1ee;padding:9px 0;font-size:11px}.detail-row>span{color:var(--muted)}.detail-row>strong{overflow-wrap:anywhere;font-weight:590}.evidence-note{margin:11px 0 0;color:var(--muted);font-size:10px;line-height:1.6}.next-command{margin:13px 0 4px;color:#146c4f;font:650 12px ui-monospace,SFMono-Regular,Menlo,monospace}.empty-note{padding:5px 8px;color:var(--muted);font-size:11px}.empty-state{display:grid;min-height:220px;place-content:center;justify-items:center;padding:20px;text-align:center}.empty-state>.icon{color:var(--muted)}.empty-state h3{margin:12px 0 5px;font-size:14px}.empty-state p{max-width:36ch;margin:0;color:var(--muted);font-size:11px;line-height:1.7}.switcher{position:fixed;z-index:2;bottom:19px;left:50%;display:flex;align-items:center;gap:6px;transform:translateX(-50%);border:1px solid #dbe2da;border-radius:999px;padding:5px;background:#fff;box-shadow:0 8px 29px rgb(24 35 27 / 9%)}.switch-link{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;color:#526057;text-decoration:none}.switch-link:hover{background:var(--soft)}.switch-label{min-width:155px;padding:0 9px;text-align:center;font-size:11px}.switch-label strong{color:var(--accent)}.timeline-group{margin:20px 0}.timeline-date{margin:0 0 9px;font-size:12px;letter-spacing:-.01em}.timeline-date span{color:var(--muted);font-size:10px;font-weight:500}.activity-row{display:grid;grid-template-columns:12px minmax(130px,1fr) 105px 105px;align-items:center;gap:11px;min-height:61px;border-bottom:1px solid var(--line);padding:9px 5px;text-decoration:none}.activity-row.is-selected{background:linear-gradient(90deg,#eff8f2,transparent)}.activity-mark{width:9px;height:9px;border:2px solid var(--accent);border-radius:50%}.family--review{border-color:#7250b5}.family--code{border-color:#376bc0}.family--test{border-color:#ae6822}.activity-body{min-width:0}.activity-body strong,.activity-body small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.activity-body strong{font-size:11px}.activity-body small{margin-top:5px;color:var(--muted);font-size:10px}.activity-time{color:var(--muted);font:10px ui-monospace,SFMono-Regular,Menlo,monospace}.variant-b .shell{grid-template-columns:minmax(0,1fr)}.variant-b .sidebar{display:none}.variant-b .workspace{padding:20px 28px 12px}.variant-b .detail-pane{display:grid;grid-template-columns:minmax(240px,1fr) minmax(240px,1fr);align-items:start;gap:0 26px;min-height:220px;border-top:1px solid var(--line);border-left:0;padding:16px 28px 85px}.variant-b .detail-top,.variant-b .detail-title,.variant-b .profile-label,.variant-b .open-report{grid-column:1}.variant-b .detail-section{margin-top:12px}.variant-b .recommendation{grid-column:2;grid-row:1 / span 6;margin-top:0}.variant-b .metrics{margin:12px 0}.variant-b .mast-search{display:flex;min-width:280px;max-width:560px;flex:1;justify-content:center}.variant-b .mast-search .search-form{width:100%;margin:0}.variant-c .shell{grid-template-columns:165px minmax(0,1fr) 355px}.variant-c .workspace{padding-top:19px}.variant-c .metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.variant-c .ledger{display:none}@media(max-width:980px){.shell,.variant-c .shell{grid-template-columns:170px minmax(0,1fr)}.detail-pane{grid-column:1 / -1;border-top:1px solid var(--line);border-left:0}.workspace{padding:19px 15px 26px}.variant-b .detail-pane{grid-template-columns:1fr}.variant-b .recommendation{grid-column:1;grid-row:auto}.variant-b .mast-search{min-width:160px}.prototype-label span{display:none}}@media(max-width:620px){.masthead{height:auto;min-height:58px;flex-wrap:wrap;padding:10px 13px}.shell,.variant-c .shell{grid-template-columns:1fr}.sidebar{border-right:0;border-bottom:1px solid var(--line)}.project-list{display:flex;gap:6px;overflow-x:auto}.project-link{min-width:180px}.workspace{padding:16px 12px 24px}.metrics{grid-template-columns:1fr 1fr}.metric:nth-child(2){border-right:0}.metric:nth-child(-n+2){border-bottom:1px solid var(--line)}.activity-row{grid-template-columns:10px minmax(120px,1fr) 84px}.activity-time{display:none}.detail-pane{padding:18px 12px 80px}.variant-b .mast-search{order:3;width:100%;max-width:none}.variant-b .workspace,.variant-b .detail-pane{padding-right:12px;padding-left:12px}}
`;

function renderSwitcher(variant, params) {
  const current = variants.findIndex((entry) => entry.key === variant);
  const previous = variants[(current + variants.length - 1) % variants.length];
  const next = variants[(current + 1) % variants.length];
  const selected = variants[current];

  return `<nav class="switcher" aria-label="Prototype variants"><a class="switch-link" data-variant-direction="previous" aria-label="Previous prototype variant" href="${hrefFor(params, { variant: previous.key })}">${icon("arrowLeft")}</a><span class="switch-label"><strong>${escapeHtml(selected.key)}</strong> · ${escapeHtml(selected.name)}</span><a class="switch-link" data-variant-direction="next" aria-label="Next prototype variant" href="${hrefFor(params, { variant: next.key })}">${icon("arrowRight")}</a></nav>`;
}

function renderDocument({ reports, searchParams, nonce }) {
  const requestedVariant = searchParams.get("variant") ?? "A";
  const variant = variants.some((entry) => entry.key === requestedVariant)
    ? requestedVariant
    : "A";
  const projects = groupProjects(reports);
  const requestedProject = searchParams.get("project");
  const project = projects.some((entry) => entry.key === requestedProject)
    ? requestedProject
    : projects[0]?.key ?? "";
  const query = (searchParams.get("q") ?? "").slice(0, 200);
  const queryValue = query.trim().toLowerCase();
  const projectReports = reports.filter((report) => report.projectKey === project);
  const visibleReports = projectReports.filter((report) =>
    !queryValue || [
      report.name,
      report.displayName,
      report.family,
      report.projectLabel,
      report.outcome,
      report.status,
      report.profile,
    ].some((value) => String(value ?? "").toLowerCase().includes(queryValue)));
  const requestedReport = searchParams.get("report");
  const selected = visibleReports.find((report) => report.relativePath === requestedReport)
    ?? visibleReports[0]
    ?? null;
  const mastSearch = variant === "B"
    ? `<div class="mast-search">${renderSearch(searchParams, variant, project, query)}</div>`
    : "";
  const heading = variant === "B" ? "Report command center"
    : variant === "C" ? "Run activity" : "Skill readouts";
  const search = variant === "B" ? "" : renderSearch(searchParams, variant, project, query);
  const body = variant === "C"
    ? renderActivity(visibleReports, searchParams, selected)
    : renderLedger(visibleReports, searchParams, selected, { showProject: variant === "B" });
  const accessLabel = basePath ? "Authenticated prototype" : "Local-only prototype";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Prototype ${escapeHtml(variant)} · QuickStark Reports</title><style>${styles}</style></head><body class="variant-${escapeHtml(variant.toLowerCase())}"><header class="masthead"><div class="brand"><span class="brand-mark">Q</span><span>QuickStark <span class="muted">Reports</span></span></div>${mastSearch}<div class="prototype-label">${icon("shield")}<strong>${escapeHtml(accessLabel)}</strong><span>Actual authorized reports · read-only</span></div></header><main class="shell"><aside class="sidebar"><div class="rail-label">Verified projects</div><nav class="project-list" aria-label="Authorized report projects">${renderProjects(projects, searchParams, project)}</nav></aside><section class="workspace"><div class="workspace-heading"><h1>${heading}</h1><span class="scope-note">${escapeHtml(project || "No authorized project")}</span></div>${renderMetrics(projectReports)}${search}${body}</section>${renderDetail(selected)}</main>${renderSwitcher(variant, searchParams)}<script nonce="${nonce}">document.addEventListener('keydown',function(event){const tag=event.target&&event.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||event.target&&event.target.isContentEditable)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){const direction=event.key==='ArrowLeft'?'previous':'next';const link=document.querySelector('[data-variant-direction="'+direction+'"]');if(link){event.preventDefault();location.href=link.href}}if(event.key==='/'&&!event.ctrlKey&&!event.metaKey){const search=document.querySelector('#report-search');if(search){event.preventDefault();search.focus()}}});</script></body></html>`;
}

function sendHtml(response, status, body, { nonce, head = false } = {}) {
  const scriptDirective = nonce ? `; script-src 'nonce-${nonce}'` : "";
  const formDirective = nonce ? "self" : "none";

  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'${scriptDirective}; base-uri 'none'; frame-ancestors 'none'; form-action '${formDirective}'`,
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });

  response.end(head ? undefined : body);
}

async function sendReport(pathname, response, head) {
  let decoded;

  try {
    decoded = pathname.slice("/report/".length).split("/").map(decodeURIComponent);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid report path");
    return;
  }

  if (
    decoded.length === 0
    || decoded.some((part) => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\"))
    || !decoded.at(-1).endsWith(".html")
  ) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Report not found");
    return;
  }

  try {
    const root = await realpath(directory);
    const path = await realpath(resolve(root, ...decoded));
    const withinRoot = relative(root, path);

    if (
      !withinRoot
      || withinRoot === ".."
      || withinRoot.startsWith(`..${sep}`)
      || isAbsolute(withinRoot)
      || !(await stat(path)).isFile()
    ) {
      throw Object.assign(new Error("Report not found"), { code: "ENOENT" });
    }

    const html = await readFile(path, "utf8");
    const project = findMetadata(html, "project");

    if (!allowedProjects.has(project) || findMetadata(html, "status") === "Preview") {
      throw Object.assign(new Error("Report not found"), { code: "ENOENT" });
    }

    // Original immutable readouts stay script-free under the strict report CSP.
    sendHtml(response, 200, html, { head });
  } catch (error) {
    if (["ENOENT", "EACCES", "ENOTDIR"].includes(error.code)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Report not found");
      return;
    }

    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    const requestUrl = new URL(request.url ?? "/", `http://${HOST}:${configuredPort}`);
    const head = request.method === "HEAD";
    const rootPath = `${basePath}/`;

    if (basePath && requestUrl.pathname === basePath) {
      response.writeHead(308, {
        Location: `${rootPath}${requestUrl.search}`,
        "Cache-Control": "no-store",
      });
      response.end();
      return;
    }

    if (requestUrl.pathname === `${rootPath}__quickstark_prototype_health`) {
      const health = JSON.stringify({
        service: "quickstark-skill-readout-prototype",
        version: 1,
      });

      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(health),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(head ? undefined : health);
      return;
    }

    if (requestUrl.pathname.startsWith(`${rootPath}report/`)) {
      await sendReport(requestUrl.pathname.slice(basePath.length), response, head);
      return;
    }

    if (requestUrl.pathname !== rootPath) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const nonce = randomBytes(18).toString("base64");
    const reports = await discoverReports();
    const html = renderDocument({ reports, searchParams: requestUrl.searchParams, nonce });
    sendHtml(response, 200, html, { nonce, head });
  } catch (error) {
    console.error("QuickStark report prototype:", error.message);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The local read-only report prototype could not render.");
  }
});

server.listen(configuredPort, HOST, () => {
  const root = `http://${HOST}:${configuredPort}${basePath}/`;
  console.log(`QuickStark Reports prototype: ${root}?variant=A`);
  console.log(`Variant B: ${root}?variant=B`);
  console.log(`Variant C: ${root}?variant=C`);
  console.log(`Read-only report directory: ${directory}`);
  console.log(`Authorized projects: ${[...allowedProjects].join(", ")}`);
  console.log(basePath
    ? "Prototype only. Published behind the explicitly configured authenticated reverse-proxy route."
    : "Prototype only. No report, production route, or deployment is modified.");
});

server.on("error", (error) => {
  console.error(`QuickStark Reports prototype could not start: ${error.message}`);
  process.exitCode = 1;
});
