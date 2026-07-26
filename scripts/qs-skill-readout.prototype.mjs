/**
 * THROWAWAY UI PROTOTYPE — not the production QuickStark readout viewer.
 *
 * Question: Which project-aware gallery best explains real skill readouts?
 * Three views of the same read-only reports are selected with ?variant=A|B|C.
 * Run: npm run readouts:prototype
 */

import { execFile } from "node:child_process";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import { SKILLS_BY_NAME } from "./qs-skill-catalog.mjs";
import {
  DEFAULT_READOUT_DIRECTORY,
  escapeHtml,
  resolveReadoutViewerHost,
} from "./qs-skill-readout.mjs";

const execFileAsync = promisify(execFile);
const reportFilename = /^qs-[a-z0-9-]+--\d{4}-\d{2}-\d{2}T[\d-]+Z--[a-f0-9]{8}\.html$/;
const variants = Object.freeze({
  A: { name: "Project library", question: "Which project should I open?" },
  B: { name: "Split-pane explorer", question: "What belongs to this project?" },
  C: { name: "Activity timeline", question: "What changed most recently?" },
});
const reportRoot = resolve(process.env.QS_READOUT_DIR ?? DEFAULT_READOUT_DIRECTORY);
const host = resolveReadoutViewerHost();
const requestedPort = Number(process.env.QS_PROTOTYPE_PORT ?? 4317);
const explicitlyRequestedPort = process.env.QS_PROTOTYPE_PORT !== undefined;
const accessToken = randomBytes(24).toString("hex");
const accessPrefix = `/r/${accessToken}`;

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function metadata(html, name) {
  return decodeHtml(html.match(new RegExp(
    `<meta name="quickstark:${name}" content="([^"]*)">`,
  ))?.[1] ?? "");
}

function sanitizeRemote(remote) {
  const text = remote.trim();
  const ssh = text.match(/^(?:[^@/\s]+@)?([^:/\s]+):([^?\s]+)$/);
  let hostname;
  let pathname;

  if (ssh) {
    [, hostname, pathname] = ssh;
  } else {
    const url = new URL(text);

    if (!new Set(["https:", "http:", "ssh:"]).has(url.protocol)) {
      throw new Error("Unsupported Git remote protocol.");
    }

    if (url.username || url.password || url.search || url.hash) {
      throw new Error("Refusing a credential-bearing or parameterized Git remote.");
    }

    hostname = url.hostname;
    pathname = url.pathname;
  }

  const segments = pathname.replace(/\.git$/i, "").split("/").filter(Boolean);

  if (segments.length < 2 || !/^[a-z0-9.-]+$/i.test(hostname)) {
    throw new Error("Git remote does not identify an owner and repository.");
  }

  if (segments.some((segment) => !/^[a-z0-9._-]+$/i.test(segment))) {
    throw new Error("Git remote contains an unsafe project path.");
  }

  return {
    key: [hostname.toLowerCase(), ...segments].join("/"),
    label: segments.slice(-2).join("/"),
    source: "Git origin",
  };
}

async function currentProject() {
  try {
    const result = await execFileAsync("git", ["config", "--get", "remote.origin.url"], {
      cwd: process.cwd(),
      timeout: 2_000,
    });

    return sanitizeRemote(result.stdout);
  } catch {
    try {
      const result = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
        cwd: process.cwd(),
        timeout: 2_000,
      });
      const root = result.stdout.trim();

      return {
        key: `local/${basename(root)}-${createHash("sha256").update(root).digest("hex").slice(0, 8)}`,
        label: basename(root),
        source: "Git root fallback",
      };
    } catch {
      const root = resolve(process.cwd());

      return {
        key: `local/${basename(root)}-${createHash("sha256").update(root).digest("hex").slice(0, 8)}`,
        label: basename(root),
        source: "Workspace fallback",
      };
    }
  }
}

function reportProject(html, relativePath, project) {
  const explicit = metadata(html, "project");

  if (explicit) return { label: explicit, source: "Report metadata" };

  const heading = html.match(/<header class="hero">[\s\S]*?<p class="eyebrow">([^<]*)<\/p>/)?.[1];
  const label = decodeHtml(heading ?? "").split(" · ").slice(1).join(" · ").trim();

  if (label) {
    return {
      label,
      source: label === project.label ? "Matching Git origin" : "Legacy report heading",
    };
  }

  const segments = relativePath.split(sep);

  if (segments.length >= 4 && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(segments[0])) {
    return { label: segments.slice(1, 3).join("/"), source: "Project directory" };
  }

  return { label: "Unassigned legacy reports", source: "No project metadata" };
}

async function reportFiles(directory, depth = 0) {
  if (depth > 8) return [];

  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return reportFiles(path, depth + 1);
    if (entry.isFile() && reportFilename.test(entry.name)) return [path];
    return [];
  }));

  return nested.flat().slice(0, 2_000);
}

async function loadReports(project) {
  const files = await reportFiles(reportRoot);
  const reports = await Promise.all(files.map(async (path) => {
    const html = await readFile(path, "utf8");
    const skillName = metadata(html, "skill");
    const skill = SKILLS_BY_NAME.get(skillName);

    if (!skill) return null;

    const reportPath = relative(reportRoot, path);
    const assignment = reportProject(html, reportPath, project);
    const outcome = decodeHtml(html.match(/<p class="outcome">([^<]*)<\/p>/)?.[1] ?? "");

    return {
      path,
      relativePath: reportPath,
      filename: basename(path),
      skill: skillName,
      title: skill.displayName,
      family: skillName.split("-")[1],
      status: metadata(html, "status"),
      generatedAt: metadata(html, "generated-at"),
      project: assignment.label,
      projectSource: assignment.source,
      outcome,
    };
  }));

  return reports.filter(Boolean).sort((left, right) => (
    right.generatedAt.localeCompare(left.generatedAt)
  ));
}

function hrefFor(parameters = {}, pathname = `${accessPrefix}/`) {
  const search = new URLSearchParams();

  for (const [name, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== "" && value !== false) {
      search.set(name, value === true ? "1" : String(value));
    }
  }

  const query = search.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function formatDate(value, full = false) {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", full
    ? { dateStyle: "medium", timeStyle: "short" }
    : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function reportUrl(report) {
  return `${accessPrefix}/report/${report.relativePath.split(sep).map(encodeURIComponent).join("/")}`;
}

function statusBadge(status) {
  const key = status.toLowerCase().replaceAll(" ", "-");
  return `<span class="badge badge-${escapeHtml(key)}">${escapeHtml(status)}</span>`;
}

function reportRow(report, { showProject = false, compact = false } = {}) {
  return `<a class="report-row${compact ? " report-row-compact" : ""}" href="${escapeHtml(reportUrl(report))}">
    <span class="family-dot family-${escapeHtml(report.family)}"></span>
    <span class="report-copy"><strong>${escapeHtml(report.title)}</strong>
      <span>${showProject ? `${escapeHtml(report.project)} · ` : ""}/${escapeHtml(report.skill)}${report.outcome && !compact ? ` · ${escapeHtml(report.outcome)}` : ""}</span>
    </span>
    ${statusBadge(report.status)}
    <time datetime="${escapeHtml(report.generatedAt)}">${escapeHtml(formatDate(report.generatedAt))}</time>
    <span class="open-arrow" aria-hidden="true">↗</span>
  </a>`;
}

function groupReports(reports) {
  const groups = new Map();

  for (const report of reports) {
    const group = groups.get(report.project) ?? [];
    group.push(report);
    groups.set(report.project, group);
  }

  return [...groups.entries()]
    .map(([label, items]) => ({
      label,
      reports: items,
      latest: items[0].generatedAt,
      source: items[0].projectSource,
    }))
    .sort((left, right) => right.latest.localeCompare(left.latest));
}

function renderFilters(state) {
  return `<form class="filters" action="${escapeHtml(`${accessPrefix}/`)}" method="get">
    <input type="hidden" name="variant" value="${escapeHtml(state.variant)}">
    ${state.projectFilter ? `<input type="hidden" name="project" value="${escapeHtml(state.projectFilter)}">` : ""}
    <label class="search"><span aria-hidden="true">⌕</span><input type="search" name="q" value="${escapeHtml(state.query)}" placeholder="Search projects, skills, or outcomes" aria-label="Search readouts"></label>
    <label class="preview-toggle"><input type="checkbox" name="previews" value="1"${state.showPreviews ? " checked" : ""} onchange="this.form.requestSubmit()"> Include previews</label>
    <button class="search-button" type="submit">Search</button>
  </form>`;
}

function renderHeader(state, { description } = {}) {
  return `<header class="page-header"><div><div class="eyebrow"><span class="brand-mark">Q</span> QUICKSTARK / READOUTS <span class="prototype-chip">THROWAWAY PROTOTYPE</span></div>
    <h1>Your work, <em>in one place.</em></h1><p class="intro">${escapeHtml(description ?? "Real reports, organized by their project and ready to revisit.")}</p></div>
    <div class="current-project"><span>Current project</span><strong>${escapeHtml(state.currentProject.label)}</strong><span>${escapeHtml(state.currentProject.source)} · prototype is read-only</span></div></header>`;
}

function renderMetrics(state) {
  return `<div class="metrics"><div><span>PROJECTS</span><strong>${state.groups.length}</strong></div><div><span>ACTUAL REPORTS</span><strong>${state.visibleReports.filter((report) => report.status !== "Preview").length}</strong></div><div><span>HIDDEN PREVIEWS</span><strong>${state.allReports.filter((report) => report.status === "Preview").length}</strong></div><div><span>STORAGE</span><strong>${state.persistent ? "Persistent" : "Temporary"}</strong></div></div>`;
}

function renderEmpty(message = "No matching reports. Run a QuickStark skill or adjust the filters.") {
  return `<div class="empty"><span>∅</span><strong>No reports to show</strong><p>${escapeHtml(message)}</p></div>`;
}

function renderVariantA(state) {
  const cards = state.groups.map((group) => `<section class="project-card"><div class="project-card-heading"><div><span class="section-label">PROJECT</span><h2>${escapeHtml(group.label)}</h2><p>${escapeHtml(group.source)}</p></div><span class="count-pill">${group.reports.length} ${group.reports.length === 1 ? "report" : "reports"}</span></div><div class="project-reports">${group.reports.slice(0, 5).map((report) => reportRow(report, { compact: true })).join("")}</div><a class="view-project" href="${escapeHtml(hrefFor({ variant: "B", project: group.label, previews: state.showPreviews }))}">Explore project <span>→</span></a></section>`).join("");

  return `<main class="page page-a">${renderHeader(state, { description: "Start with a project. Open its latest real reports, then drill into the full workspace." })}${renderFilters(state)}${renderMetrics(state)}<div class="section-heading"><div><span class="section-label">VARIANT A · PROJECT-FIRST</span><h2>Project library</h2></div><span class="section-note">Ordered by most recent activity</span></div><div class="project-grid">${cards || renderEmpty()}</div>${renderFootnote(state)}</main>`;
}

function renderVariantB(state) {
  const selected = state.groups.find((group) => group.label === state.projectFilter) ?? state.groups[0];
  const navigation = state.groups.map((group) => `<a class="project-nav${group.label === selected?.label ? " active" : ""}" href="${escapeHtml(hrefFor({ variant: "B", project: group.label, q: state.query, previews: state.showPreviews }))}"><span class="nav-icon">◫</span><span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.source)}</small></span><span class="nav-count">${group.reports.length}</span></a>`).join("");
  const reports = selected?.reports ?? [];

  return `<main class="page page-b">${renderHeader(state, { description: "Keep your project list in view while you browse every report for one selected workspace." })}${renderFilters(state)}<div class="explorer"><aside class="explorer-sidebar"><div class="explorer-heading"><span class="section-label">PROJECTS</span><span>${state.groups.length}</span></div>${navigation || `<p class="side-empty">No matching projects.</p>`}</aside><section class="explorer-content"><div class="explorer-project"><div><span class="section-label">VARIANT B · SPLIT-PANE EXPLORER</span><h2>${escapeHtml(selected?.label ?? "Select a project")}</h2><p>${selected ? `${escapeHtml(selected.source)} · ${selected.reports.length} matching ${selected.reports.length === 1 ? "report" : "reports"}` : "Projects appear here when a report is available."}</p></div>${selected?.label === state.currentProject.label ? '<span class="current-badge">CURRENT PROJECT</span>' : ""}</div><div class="report-list">${reports.map((report) => reportRow(report)).join("") || renderEmpty()}</div></section></div>${renderFootnote(state)}</main>`;
}

function renderVariantC(state) {
  const days = new Map();

  for (const report of state.visibleReports) {
    const key = report.generatedAt.slice(0, 10) || "Unknown date";
    const entries = days.get(key) ?? [];
    entries.push(report);
    days.set(key, entries);
  }

  const timeline = [...days.entries()].map(([day, reports]) => `<section class="timeline-day"><div class="timeline-date"><span class="timeline-marker"></span><strong>${escapeHtml(day === "Unknown date" ? day : formatDate(`${day}T12:00:00Z`, true).split(",").slice(0, 2).join(","))}</strong><span>${reports.length} ${reports.length === 1 ? "report" : "reports"}</span></div><div class="timeline-reports">${reports.map((report) => reportRow(report, { showProject: true })).join("")}</div></section>`).join("");

  return `<main class="page page-c">${renderHeader(state, { description: "See the newest real work first, across every project, without hunting through folders." })}${renderFilters(state)}${renderMetrics(state)}<div class="section-heading"><div><span class="section-label">VARIANT C · CROSS-PROJECT ACTIVITY</span><h2>Activity timeline</h2></div><span class="section-note">Newest reports first</span></div><div class="timeline">${timeline || renderEmpty()}</div>${renderFootnote(state)}</main>`;
}

function renderFootnote(state) {
  return `<footer class="footnote"><span><span class="live-indicator"></span> Actual local HTML reports · read-only · ${state.persistent ? "persistent configured directory" : "temporary OS directory"}</span><span>Legacy headings are not verified Git identities.</span></footer>`;
}

function renderSwitcher(state) {
  const keys = Object.keys(variants);
  const index = keys.indexOf(state.variant);
  const previous = keys[(index + keys.length - 1) % keys.length];
  const next = keys[(index + 1) % keys.length];
  const params = { q: state.query, previews: state.showPreviews };

  return `<nav class="switcher" aria-label="Prototype variants"><a class="switch-arrow" data-direction="previous" href="${escapeHtml(hrefFor({ ...params, variant: previous }))}" aria-label="Previous variant">←</a><span class="switch-copy"><span>PROTOTYPE VARIANT</span><strong>${escapeHtml(state.variant)} — ${escapeHtml(variants[state.variant].name)}</strong><small>${escapeHtml(variants[state.variant].question)}</small></span><a class="switch-arrow" data-direction="next" href="${escapeHtml(hrefFor({ ...params, variant: next }))}" aria-label="Next variant">→</a></nav><script>document.addEventListener('keydown',function(e){if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;var n=e.target;if(n&&(n.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)))return;var a=document.querySelector('[data-direction="'+(e.key==='ArrowLeft'?'previous':'next')+'"]');if(a){e.preventDefault();location.assign(a.href)}})</script>`;
}

const css = `
:root{color-scheme:light;--bg:#f7f8fb;--paper:#fff;--ink:#151b2b;--muted:#768095;--line:#e7eaf0;--blue:#345cf6;--blue-soft:#eef2ff;--green:#12836d;--green-soft:#e8f7f1;--shadow:0 14px 50px rgba(25,34,58,.055)}
*{box-sizing:border-box}html{min-height:100%;background:var(--bg)}body{margin:0;color:var(--ink);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.page{width:min(1150px,calc(100% - 64px));margin:0 auto;padding:54px 0 130px}.page-header{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:31px}.eyebrow{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:10px;font-weight:760;letter-spacing:.13em}.brand-mark{display:grid;width:27px;height:27px;place-items:center;border-radius:8px;background:var(--ink);color:white;font-size:14px}.prototype-chip{border:1px solid #f2dca9;border-radius:999px;padding:4px 8px;background:#fff8e8;color:#9b6915;font-size:9px;letter-spacing:.07em}.page-header h1{margin:19px 0 5px;font-size:clamp(36px,6vw, sixty);font-size:clamp(36px,6vw,58px);font-weight:770;letter-spacing:-.065em;line-height:1.08}.page-header h1 em{color:var(--blue);font-style:normal}.intro{max-width:68ch;margin:10px 0 0;color:#687285;font-size:15px}.current-project{display:grid;gap:3px;min-width:220px;border-left:2px solid var(--blue);padding:6px 0 6px 14px}.current-project>span{color:var(--muted);font-size:11px}.current-project>strong{font-size:15px}.filters{display:flex;align-items:center;gap:12px;margin-bottom:23px}.search{display:flex;flex:1;align-items:center;gap:10px;min-height:43px;border:1px solid var(--line);border-radius:11px;padding:0 13px;background:white;color:var(--muted)}.search>span{font-size:19px}.search input{width:100%;border:0;outline:0;background:transparent;color:var(--ink);font:inherit}.preview-toggle{display:flex;align-items:center;gap:7px;white-space:nowrap;color:#647087;font-size:12px}.preview-toggle input{accent-color:var(--blue)}.search-button{min-height:42px;border:0;border-radius:10px;padding:0 15px;background:var(--ink);color:white;font:inherit;font-size:12px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0 36px}.metrics>div{display:grid;gap:8px;border:1px solid var(--line);border-radius:13px;padding:15px 17px;background:white}.metrics>div>span,.section-label{color:var(--muted);font-size:10px;font-weight:750;letter-spacing:.12em}.metrics>div>strong{font-size:25px;font-weight:720;letter-spacing:-.04em}.section-heading{display:flex;align-items:end;justify-content:space-between;margin:29px 0 15px}.section-heading h2,.explorer-project h2{margin:5px 0 0;font-size:24px;letter-spacing:-.045em}.section-note{color:var(--muted);font-size:11px}.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.project-card{overflow:hidden;border:1px solid var(--line);border-radius:16px;background:white;box-shadow:var(--shadow)}.project-card-heading{display:flex;align-items:start;justify-content:space-between;gap:12px;padding:19px 19px 13px}.project-card-heading h2{margin:5px 0 1px;overflow-wrap:anywhere;font-size:18px;letter-spacing:-.035em}.project-card-heading p,.explorer-project p{margin:3px 0 0;color:var(--muted);font-size:11px}.count-pill{flex-shrink:0;border-radius:999px;padding:5px 9px;background:var(--blue-soft);color:var(--blue);font-size:10px;font-weight:650}.project-reports{padding:0 10px}.report-row{display:grid;grid-template-columns:10px minmax(0,1fr) auto auto 15px;align-items:center;gap:11px;min-height:69px;border-top:1px solid #f0f1f5;padding:12px 9px;color:inherit;text-decoration:none}.report-row:hover{background:#fafbff}.report-row-compact{min-height:53px}.family-dot{width:8px;height:8px;border-radius:50%;background:#8490a8}.family-plan{background:#4275ef}.family-design{background:#8952de}.family-code{background:#12a075}.family-git{background:#db548b}.family-skill{background:#9458d0}.family-test{background:#119296}.family-flow{background:#5964e4}.family-learn{background:#2391c1}.family-deploy{background:#ea7844}.report-copy{display:grid;gap:2px;min-width:0}.report-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:690}.report-copy>span{overflow:hidden;color:#778093;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.badge{border-radius:999px;padding:4px 7px;white-space:nowrap;font-size:9px;font-weight:700}.badge-completed{background:var(--green-soft);color:var(--green)}.badge-preview{background:#edf0f5;color:#687285}.badge-awaiting-input{background:#fff5dd;color:#9a6c10}.badge-blocked{background:#fff0ef;color:#bd4343}.report-row time{color:#7c8596;font-size:10px;white-space:nowrap}.open-arrow{color:#97a0b1}.view-project{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:12px 19px;color:var(--blue);font-size:11px;font-weight:650;text-decoration:none}.explorer{display:grid;grid-template-columns:275px minmax(0,1fr);min-height:460px;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:white;box-shadow:var(--shadow)}.explorer-sidebar{border-right:1px solid var(--line);background:#fcfcfe}.explorer-heading{display:flex;justify-content:space-between;padding:16px 15px;color:var(--muted)}.project-nav{display:grid;grid-template-columns:19px minmax(0,1fr) auto;align-items:center;gap:9px;margin:2px 7px;border-radius:9px;padding:10px 9px;color:inherit;text-decoration:none}.project-nav:hover,.project-nav.active{background:var(--blue-soft)}.project-nav.active .nav-icon,.project-nav.active strong{color:var(--blue)}.nav-icon{font-size:15px}.project-nav>span:nth-child(2){display:grid;min-width:0;gap:2px}.project-nav strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.project-nav small{overflow:hidden;color:var(--muted);text-overflow:ellipsis;white-space:nowrap;font-size:10px}.nav-count{color:var(--muted);font-size:10px}.explorer-content{min-width:0;padding:18px 20px}.explorer-project{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}.current-badge{border-radius:999px;padding:5px 8px;background:var(--green-soft);color:var(--green);font-size:9px;font-weight:700}.report-list .report-row{min-height:73px}.timeline{position:relative}.timeline-day{position:relative;margin-bottom:25px;padding-left:23px}.timeline-day::before{position:absolute;top:9px;bottom:-25px;left:5px;width:1px;background:var(--line);content:""}.timeline-day:last-child::before{bottom:0}.timeline-date{position:relative;display:flex;align-items:center;gap:10px;margin-bottom:9px}.timeline-marker{position:absolute;left:-22px;width:9px;height:9px;border:2px solid var(--blue);border-radius:50%;background:white}.timeline-date strong{font-size:12px}.timeline-date>span:last-child{color:var(--muted);font-size:10px}.timeline-reports{overflow:hidden;border:1px solid var(--line);border-radius:13px;background:white}.timeline-reports .report-row:first-child{border-top:0}.empty{display:grid;grid-column:1/-1;justify-items:center;gap:5px;border:1px dashed var(--line);border-radius:15px;padding:40px;background:white;text-align:center}.empty>span{color:#a6adba;font-size:24px}.empty strong{font-size:14px}.empty p{margin:0;color:var(--muted);font-size:12px}.side-empty{padding:0 15px;color:var(--muted);font-size:11px}.footnote{display:flex;justify-content:space-between;gap:12px;margin-top:24px;color:var(--muted);font-size:10px}.live-indicator{display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:#20a37e}.switcher{position:fixed;z-index:5;right:0;bottom:19px;left:0;display:flex;align-items:center;justify-content:center;gap:17px;width:max-content;max-width:calc(100% - 24px);margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:8px 11px;background:#171b2a;color:#fff;box-shadow:0 16px 40px rgba(15,20,35,.23)}.switch-arrow{display:grid;width:35px;height:35px;place-items:center;border-radius:9px;background:rgba(255,255,255,.08);color:white;font-size:17px;text-decoration:none}.switch-arrow:hover{background:rgba(255,255,255,.17)}.switch-copy{display:grid;min-width:185px;gap:1px;text-align:center}.switch-copy>span{color:#adb4c4;font-size:9px;font-weight:700;letter-spacing:.12em}.switch-copy>strong{font-size:12px}.switch-copy>small{color:#adb4c4;font-size:10px}@media(max-width:680px){.page{width:calc(100% - 28px);padding-top:27px}.page-header{align-items:start;flex-direction:column;gap:15px}.current-project{min-width:0}.filters{flex-wrap:wrap}.search{flex-basis:100%}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.project-grid{grid-template-columns:1fr}.explorer{grid-template-columns:1fr}.explorer-sidebar{max-height:200px;overflow:auto;border-right:0;border-bottom:1px solid var(--line)}.report-row{grid-template-columns:8px minmax(0,1fr) auto 13px;gap:7px}.report-row time{display:none}.footnote{flex-direction:column}.section-heading{align-items:start;gap:10px}.switch-copy{min-width:160px}}
`;

function renderPage(state) {
  const content = state.variant === "B"
    ? renderVariantB(state)
    : state.variant === "C"
      ? renderVariantC(state)
      : renderVariantA(state);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>QuickStark readout prototype · ${escapeHtml(variants[state.variant].name)}</title><style>${css}</style></head><body>${content}${renderSwitcher(state)}</body></html>`;
}

function writeResponse(response, status, body, { contentType = "text/html; charset=utf-8", head = false } = {}) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
  response.end(head ? undefined : body);
}

function tokenMatches(value) {
  if (!/^[a-f0-9]{48}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(accessToken, "hex"));
}

async function handleRequest(request, response, project) {
  const head = request.method === "HEAD";

  if (request.method !== "GET" && !head) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  const url = new URL(request.url ?? "/", "http://quickstark.invalid");
  const parts = url.pathname.split("/");

  if (parts[1] !== "r" || !tokenMatches(parts[2] ?? "")) {
    writeResponse(response, 404, "Prototype not found", { contentType: "text/plain; charset=utf-8", head });
    return;
  }

  const reports = await loadReports(project);

  if (parts[3] === "report") {
    let requested;

    try {
      requested = parts.slice(4).map(decodeURIComponent).join(sep);
    } catch {
      writeResponse(response, 400, "Invalid report path", { contentType: "text/plain; charset=utf-8", head });
      return;
    }

    const report = reports.find((item) => item.relativePath === requested);

    if (!report || !reportFilename.test(basename(requested))) {
      writeResponse(response, 404, "Report not found", { contentType: "text/plain; charset=utf-8", head });
      return;
    }

    const file = await lstat(report.path);

    if (!file.isFile()) {
      writeResponse(response, 404, "Report not found", { contentType: "text/plain; charset=utf-8", head });
      return;
    }

    writeResponse(response, 200, await readFile(report.path, "utf8"), { head });
    return;
  }

  if (parts.slice(3).filter(Boolean).length > 0) {
    writeResponse(response, 404, "Prototype not found", { contentType: "text/plain; charset=utf-8", head });
    return;
  }

  const variant = Object.hasOwn(variants, url.searchParams.get("variant"))
    ? url.searchParams.get("variant")
    : "A";
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const showPreviews = url.searchParams.get("previews") === "1";
  const projectFilter = (url.searchParams.get("project") ?? "").slice(0, 200);
  const visibleReports = reports.filter((report) => {
    if (!showPreviews && report.status === "Preview") return false;
    if (!query) return true;

    return [report.project, report.skill, report.title, report.outcome]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  writeResponse(response, 200, renderPage({
    variant,
    query,
    showPreviews,
    projectFilter,
    currentProject: project,
    allReports: reports,
    visibleReports,
    groups: groupReports(visibleReports),
    persistent: reportRoot !== resolve(DEFAULT_READOUT_DIRECTORY),
  }), { head });
}

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65_535) {
  console.error("QS_PROTOTYPE_PORT must be between 1 and 65535.");
  process.exitCode = 1;
} else {
  const project = await currentProject();
  let activePort = requestedPort;
  const server = createServer((request, response) => {
    handleRequest(request, response, project).catch(() => {
      if (!response.headersSent) {
        writeResponse(response, 500, "Unable to load the read-only prototype", {
          contentType: "text/plain; charset=utf-8",
          head: request.method === "HEAD",
        });
      } else {
        response.end();
      }
    });
  });

  server.on("error", (error) => {
    if (
      error.code === "EADDRINUSE"
      && !explicitlyRequestedPort
      && activePort < requestedPort + 19
    ) {
      activePort += 1;
      server.listen(activePort, host);
      return;
    }

    console.error(`QuickStark readout prototype: ${error.message}`);
    process.exitCode = 1;
  });

  server.on("listening", () => {
    const authority = host.includes(":") ? `[${host}]` : host;
    const url = `http://${authority}:${activePort}${accessPrefix}/`;
    console.log("THROWAWAY PROTOTYPE — read-only, project-organized skill readouts");
    console.log(`Prototype: ${url}`);
    console.log(`Project: ${project.label} (${project.source})`);
    console.log(`Read-only report directory: ${reportRoot}`);
    console.log(`Variants: ${url}?variant=A  ${url}?variant=B  ${url}?variant=C`);
    console.log("Security: trusted interface, unguessable URL, GET/HEAD only; no DNS or hosting changes.");
  });

  server.listen(activePort, host);

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
}
