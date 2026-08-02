import { createHmac, timingSafeEqual } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";

import { READOUT_SKILLS_BY_NAME } from "./qs-skill-catalog.mjs";

const githubContexts = new Map();
const readoutTextSizes = Object.freeze({
  default: Object.freeze({ featurePx: 13, promptPx: 12 }),
  comfortable: Object.freeze({ featurePx: 15, promptPx: 14 }),
  large: Object.freeze({ featurePx: 17, promptPx: 16 }),
});
const readoutDensities = new Set(["balanced", "compact"]);

export function normalizeReadoutPreferences(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Dashboard preferences must be a safe object.");
  }

  const size = value.size ?? "default";
  const density = value.density ?? "balanced";

  if (!Object.hasOwn(readoutTextSizes, size)) {
    throw new Error("Dashboard preference size must be default, comfortable, or large.");
  }

  if (!readoutDensities.has(density)) {
    throw new Error("Dashboard preference density must be balanced or compact.");
  }

  return { size, density, ...readoutTextSizes[size] };
}

export async function loadReadoutPreferenceSecret({ secret, path } = {}) {
  if (secret !== undefined) {
    if (!Buffer.isBuffer(secret) || secret.length < 32 || secret.length > 128) {
      throw new Error("Dashboard preferences require a bounded private signing secret.");
    }

    return secret;
  }

  if (path === undefined || path === null || path === "") return null;

  if (typeof path !== "string") {
    throw new Error("Dashboard preference signing requires a safe private secret file.");
  }

  const metadata = await lstat(path);

  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.size > 256
    || (metadata.mode & 0o077) !== 0
  ) {
    throw new Error("Dashboard preference signing requires an owner-only regular secret file.");
  }

  const encoded = (await readFile(path, "utf8")).trim();

  if (!/^[a-f0-9]{64}$/i.test(encoded)) {
    throw new Error("Dashboard preference signing requires a 32-byte hexadecimal secret.");
  }

  return Buffer.from(encoded, "hex");
}

export function encodeReadoutPreferences(secret, user, preferences) {
  if (!Buffer.isBuffer(secret) || secret.length < 32) {
    throw new Error("Dashboard preferences require an actual private signing secret.");
  }

  const value = Buffer.from(JSON.stringify(normalizeReadoutPreferences(preferences)), "utf8")
    .toString("base64url");
  const signature = createHmac("sha256", secret).update(`${user}:${value}`).digest("hex");

  return `${value}.${signature}`;
}

export function decodeReadoutPreferences(secret, user, cookies) {
  if (!Buffer.isBuffer(secret) || secret.length < 32 || typeof user !== "string" || typeof cookies !== "string") {
    return normalizeReadoutPreferences();
  }

  const item = cookies.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("qs_readout_preferences="));

  if (!item) return normalizeReadoutPreferences();

  try {
    const [value, signature, ...unexpected] = item.slice("qs_readout_preferences=".length).split(".");

    if (
      unexpected.length
      || !/^[a-z0-9_-]{1,1024}$/i.test(value ?? "")
      || !/^[a-f0-9]{64}$/i.test(signature ?? "")
    ) {
      throw new Error("Invalid preferences.");
    }

    const expected = createHmac("sha256", secret).update(`${user}:${value}`).digest();

    if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) {
      throw new Error("Invalid preference signature.");
    }

    return normalizeReadoutPreferences(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return normalizeReadoutPreferences();
  }
}

function escape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shorten(value, maximum = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maximum ? `${text.slice(0, maximum - 1).trimEnd()}…` : text;
}

function symbol(name) {
  const glyphs = {
    check: "✓",
    pulse: "∿",
    scan: "◈",
    github: "↗",
    shield: "◇",
  };

  return `<span class="presentation-icon" aria-hidden="true">${glyphs[name] ?? glyphs.scan}</span>`;
}

function repositoryIdentity(report) {
  if (report.projectIdentity) return report.projectIdentity;
  if (!report.projectKey || !report.projectLabel) return null;

  const [host, ...segments] = String(report.projectKey).split("/");

  if (!host || segments.length < 2) return null;

  return {
    host,
    owner: segments.slice(0, -1).join("/"),
    repository: segments.at(-1),
    key: report.projectKey,
    label: report.projectLabel,
    source: report.projectSource,
  };
}

async function githubJson(url, fetcher) {
  const response = await fetcher(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "QuickStark-Skill-Readout",
    },
    signal: AbortSignal.timeout(3_000),
  });

  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);

  return response.json();
}

export async function observeGitHubProject(project, { fetcher = globalThis.fetch } = {}) {
  if (!project || project.host !== "github.com" || typeof fetcher !== "function") return null;
  if (
    typeof project.owner !== "string"
    || !/^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(project.owner)
    || typeof project.repository !== "string"
    || !/^[a-z0-9_.-]{1,100}$/i.test(project.repository)
    || project.repository === "."
    || project.repository === ".."
  ) return null;

  const fullName = `${project.owner}/${project.repository}`;
  const cached = fetcher === globalThis.fetch ? githubContexts.get(fullName) : null;

  if (cached && Date.now() - cached.capturedAt < 300_000) return cached.result;

  const result = (async () => {
    const endpoint = `https://api.github.com/repos/${fullName}`;
    const search = new URLSearchParams({
      q: `repo:${fullName} is:issue is:open`,
      per_page: "1",
    });
    const [repository, issues, issueTotal] = await Promise.allSettled([
      githubJson(endpoint, fetcher),
      githubJson(`${endpoint}/issues?state=open&per_page=8`, fetcher),
      githubJson(`https://api.github.com/search/issues?${search}`, fetcher),
    ]);

    if (
      repository.status !== "fulfilled"
      || repository.value.full_name !== fullName
      || repository.value.html_url !== `https://github.com/${fullName}`
    ) return null;

    const verifiedIssues = issues.status === "fulfilled" && Array.isArray(issues.value)
      ? issues.value
        .filter((issue) => (
          !issue.pull_request
          && issue.state === "open"
          && Number.isSafeInteger(issue.number)
          && issue.number > 0
          && typeof issue.title === "string"
          && issue.html_url === `https://github.com/${fullName}/issues/${issue.number}`
        ))
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          labels: Array.isArray(issue.labels)
            ? issue.labels
              .map((label) => label?.name)
              .filter((label) => typeof label === "string")
            : [],
        }))
      : null;
    const openIssueCount = issueTotal.status === "fulfilled"
      && issueTotal.value.incomplete_results === false
      && Number.isSafeInteger(issueTotal.value.total_count)
      && issueTotal.value.total_count >= 0
      && (!verifiedIssues || issueTotal.value.total_count >= verifiedIssues.length)
      ? issueTotal.value.total_count
      : null;

    return {
      fullName,
      url: repository.value.html_url,
      defaultBranch: typeof repository.value.default_branch === "string"
        ? repository.value.default_branch
        : null,
      visibility: typeof repository.value.visibility === "string"
        ? repository.value.visibility
        : null,
      openIssueCount,
      issues: verifiedIssues,
    };
  })().catch(() => null);

  if (fetcher === globalThis.fetch) {
    githubContexts.set(fullName, { capturedAt: Date.now(), result });
  }

  return result;
}

function fact(label, value, source, href = null) {
  const content = href
    ? `<a class="presentation-metadata-link" href="${escape(href)}" rel="noreferrer">${escape(value)} ↗</a>`
    : escape(value);

  return `<div class="presentation-project-fact"><span>${escape(label)}</span><strong>${content}</strong><small>${escape(source)}</small></div>`;
}

export function renderReadoutProjectMetadata(report, { github = report.github ?? null } = {}) {
  const project = repositoryIdentity(report);
  const git = report.gitContext ?? null;
  const repositoryUrl = github?.url
    ?? (project?.host === "github.com"
      ? `https://github.com/${project.owner}/${project.repository}`
      : null);
  const revision = git?.revision ?? report.provenance?.commit?.sha ?? null;
  const tracking = Number.isSafeInteger(git?.ahead) && Number.isSafeInteger(git?.behind)
    ? `↑ ${git.ahead} · ↓ ${git.behind}`
    : "Not captured";
  const publishedCommit = report.provenance?.commit;
  const commitUrl = repositoryUrl
    && publishedCommit?.published === true
    && publishedCommit.sha === revision
    && publishedCommit.url === `${repositoryUrl}/commit/${revision}`
    ? publishedCommit.url
    : null;
  const facts = [
    fact("REPOSITORY", project?.label ?? "Not captured", github ? "GitHub verified" : project ? "Verified project identity" : "Not captured", repositoryUrl),
    fact("BRANCH", git?.branch ?? "Not captured", git ? "Observed local Git" : "Not captured"),
    fact("REVISION", revision ? revision.slice(0, 8) : "Not captured", git?.revision ? "Observed local Git" : revision ? "Verified delivery evidence" : "Not captured", commitUrl),
    fact("TRACKING", tracking, tracking === "Not captured" ? "Not captured" : "Observed upstream"),
    fact("WORKTREE", Number.isSafeInteger(git?.dirtyCount) ? git.dirtyCount ? `${git.dirtyCount} changes` : "Clean" : "Not captured", git ? "Observed local Git" : "Not captured"),
    fact("DEFAULT", github?.defaultBranch ?? "Not captured", github?.defaultBranch ? "Verified GitHub" : "Not captured"),
    fact("VISIBILITY", github?.visibility ?? "Not captured", github?.visibility ? "Verified GitHub" : "Not captured"),
    fact("LATEST RUN", report.status === "Preview" ? "Not run" : report.status ?? "Not captured", report.status === "Preview" ? "Catalog preview" : "Recorded report"),
  ];

  return `<div class="presentation-project-bar" role="group" aria-label="Verified project and run metadata">${facts.join("")}</div>`;
}

function summaryMetric(label, value, detail, name, tone = "neutral") {
  return `<article class="presentation-summary-metric presentation-tone-${escape(tone)}">${symbol(name)}<div><span>${escape(label)}</span><strong>${escape(value)}</strong><small>${escape(detail)}</small></div></article>`;
}

function checkRing(passed, total, failed) {
  if (!total) {
    return '<div class="presentation-check-ring"><span class="presentation-empty-ring" aria-label="No checks recorded">—</span><span>No checks recorded</span></div>';
  }

  const circumference = 2 * Math.PI * 17;
  const offset = circumference * (1 - passed / total);
  const description = `${passed} of ${total} recorded checks passed`;

  return `<div class="presentation-check-ring"><svg viewBox="0 0 44 44" role="img" aria-label="${escape(description)}"><circle class="presentation-ring-track" cx="22" cy="22" r="17"></circle><circle class="presentation-ring-progress${failed ? " presentation-ring-failed" : ""}" cx="22" cy="22" r="17" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle><text x="22" y="25" text-anchor="middle">${passed}</text></svg><span>checks</span></div>`;
}

export function renderReadoutSignalSummary(report, profile, { github = report.github ?? null } = {}) {
  const preview = report.status === "Preview";
  const findings = preview ? [] : report.findings ?? [];
  const checks = preview ? [] : report.checks ?? [];
  const failed = checks.filter((check) => check.status === "failed");
  const passed = checks.filter((check) => check.status === "passed");
  const rank = (finding) => ({ P0: 100, P1: 80, P2: 40, P3: 20 })[finding.priority] ?? 0;
  const critical = findings
    .filter((finding) => finding.priority === "P0" || finding.priority === "P1")
    .sort((left, right) => rank(right) - rank(left));
  const blocked = !preview && ["Blocked", "Awaiting input"].includes(report.status);
  const attention = Number(blocked) + critical.length + failed.length;
  const lead = [...findings].sort((left, right) => rank(right) - rank(left))[0];
  const state = preview ? "READY TO RUN" : attention ? "NEEDS ATTENTION" : "NO CRITICAL EXCEPTIONS";
  const stateDetail = preview
    ? "No actual skill run has been recorded."
    : attention
      ? `${attention} explicitly recorded ${attention === 1 ? "exception" : "exceptions"}`
      : "No blocked status, P0/P1 finding, or failed check was recorded.";
  const leadLabel = preview
    ? "FIRST RUN"
    : critical[0]?.priority
      ?? (blocked ? "RUN STATUS" : failed.length ? "FAILED CHECK" : lead ? "LEAD OBSERVATION" : "RECORDED OUTCOME");
  const featured = preview
    ? { title: profile.title, detail: profile.signal }
    : critical[0]
      ?? (blocked ? { title: report.status, detail: report.outcome } : failed[0])
      ?? lead
      ?? { title: report.outcome, detail: profile.signal };
  const issues = Number.isSafeInteger(github?.openIssueCount)
    && github.openIssueCount >= 0
    ? github.openIssueCount
    : null;
  const metrics = [
    summaryMetric("EXCEPTIONS", preview ? "—" : String(attention), preview ? "No run yet" : "Explicit evidence only", "pulse", attention ? "danger" : "clear"),
    summaryMetric("FINDINGS", preview ? "—" : String(findings.length), preview ? "No run yet" : "Recorded observations", "scan", "accent"),
    summaryMetric("CHECKS", checks.length ? `${passed.length}/${checks.length}` : "—", checks.length ? "Passed / recorded" : "None recorded", "check", failed.length ? "danger" : "clear"),
    summaryMetric("OPEN ISSUES", issues === null ? "—" : String(issues), issues === null ? "Not independently verified" : "Verified GitHub issues", "github", "accent"),
  ];

  return `<div class="presentation-summary-panel"><div class="presentation-summary-caption"><span class="eyebrow">At a glance</span><span class="signal-caption">${escape(profile.signal)}</span></div><div class="presentation-summary presentation-summary-${attention ? "attention" : preview ? "preview" : "clear"}" role="group" aria-label="Five-second report summary"><div class="presentation-summary-head">${symbol(attention ? "pulse" : "shield")}<strong>${escape(state)}</strong><span>${escape(stateDetail)}</span></div><div class="presentation-summary-body"><article class="presentation-featured-signal"><span>${escape(leadLabel)}</span><strong>${escape(shorten(featured.title, 145))}</strong><p>${escape(shorten(featured.detail ?? report.outcome ?? "", 205))}</p></article><div class="presentation-summary-metrics">${metrics.join("")}</div>${checkRing(passed.length, checks.length, failed.length)}</div></div></div>`;
}

export function renderReadoutRunMetrics(report) {
  if (!report || report.status === "Preview") return "";

  const observation = report.observation?.attributionScope === "skill-run"
    ? report.observation
    : null;
  const number = (value) => Number.isSafeInteger(value)
    ? new Intl.NumberFormat("en-US").format(value)
    : "Not captured";
  const metrics = [
    ["MODEL", observation?.inference?.model ?? "Not captured"],
    ["THINKING", observation?.inference?.reasoningEffort ?? "Not captured"],
    ["INPUT TOKENS", number(observation?.tokens?.input)],
    ["OUTPUT TOKENS", number(observation?.tokens?.output)],
    ["TOTAL TOKENS", number(observation?.tokens?.total)],
    ["ACTIVE TIME", Number.isSafeInteger(observation?.timing?.activeDurationMs)
      ? `${number(observation.timing.activeDurationMs)} ms`
      : "Not captured"],
  ].map(([label, value]) => `<article class="presentation-run-metric"><span>${escape(label)}</span><strong>${escape(value)}</strong></article>`).join("");
  const provenance = observation
    ? `${observation.measurementSource} · ${observation.attributionScope}${observation.inference?.provider ? ` · ${observation.inference.provider}` : ""}`
    : "No verified per-skill measurement was captured";

  return `<section class="section presentation-run-metrics"><div class="section-heading"><div><p class="eyebrow">Actual Codex output</p><h2>Skill run metrics</h2></div><span class="presentation-run-metrics-source">${escape(provenance)}</span></div><div class="presentation-run-metrics-grid">${metrics}</div></section>`;
}

export function renderReadoutNextPrompts(report) {
  if (!report.nextSkills.length) {
    return '<div class="empty-next">None — the requested work is complete.</div>';
  }

  return `<div class="next-grid">${report.nextSkills.map((item, index) => {
    const skill = READOUT_SKILLS_BY_NAME.get(item.name);
    const label = index === 0 ? "Top next prompt" : "Alternative prompt";
    const recommendation = index === 0 ? "RECOMMENDED" : "ALTERNATIVE";

    return `<article class="next-card"><div class="presentation-next-top"><span class="presentation-next-rank">${String(index + 1).padStart(2, "0")}</span><span class="presentation-next-badge">${recommendation}</span></div><p class="eyebrow">${escape(label)}</p><h3>${escape(skill?.displayName ?? item.name)} <span class="presentation-native-skill" aria-label="/${escape(item.name)}">$${escape(item.name)}</span></h3>${item.reason ? `<p class="next-reason">${escape(item.reason)}</p>` : ""}<pre class="next-prompt-block"><code>${escape(item.prompt)}</code></pre><aside class="next-model-callout" aria-label="Heuristic model and thinking guidance"><span class="next-model-label">Suggested model <strong>${escape(item.model)}</strong></span><span class="next-model-label">Suggested thinking <strong>${escape(item.thinking)}</strong></span><p class="next-model-reason">Heuristic suggestion · ${escape(item.modelReason)} Choosing it does not change the active model or thinking level.</p></aside></article>`;
  }).join("")}</div>`;
}

function renderActionableCodeSection({ title, description, items, value }) {
  if (!items?.length) return "";

  const blocks = items.map((item) => {
    const path = item.path
      ? `<code class="presentation-evidence-path">${escape(item.path)}</code>`
      : "";
    const detail = item.detail
      ? `<p class="presentation-evidence-detail">${escape(item.detail)}</p>`
      : "";

    return `<article class="presentation-evidence-card"><div class="presentation-evidence-heading"><h3>${escape(item.title)}</h3>${path}</div>${detail}<pre class="presentation-evidence-block"><code class="language-${escape(item.language)}">${escape(item[value])}</code></pre></article>`;
  }).join("");

  return `<section class="section"><div class="section-heading"><div><p class="eyebrow">${escape(description)}</p><h2>${escape(title)}</h2></div><span class="section-count">${items.length}</span></div><div class="presentation-evidence-grid">${blocks}</div></section>`;
}

export function renderReadoutActionableCode(report) {
  return [
    renderActionableCodeSection({
      title: "Commands to run",
      description: "Only recorded actions for you to run",
      items: report.commands,
      value: "command",
    }),
    renderActionableCodeSection({
      title: "Key code",
      description: "Recorded code worth your attention",
      items: report.keyCode,
      value: "code",
    }),
  ].filter(Boolean).join("\n  ");
}

export function renderReadoutGitHubIssues(github) {
  if (!Array.isArray(github?.issues)) return "";

  const relevant = github.issues.filter((issue) => /readout|report|skill|prototype|ingestion|workbench/i.test(issue.title));
  const selected = (relevant.length ? relevant : github.issues).slice(0, 3);
  const verifiedTotal = Number.isSafeInteger(github.openIssueCount)
    && github.openIssueCount >= selected.length
    ? github.openIssueCount
    : null;
  const sampleLabel = verifiedTotal === null
    ? `Showing ${selected.length} verified open ${selected.length === 1 ? "issue" : "issues"}; total not independently verified`
    : `Showing ${selected.length} of ${verifiedTotal} verified open ${verifiedTotal === 1 ? "issue" : "issues"}`;
  const items = selected.length
    ? selected.map((issue) => `<article class="presentation-github-issue"><span>#${issue.number}</span><a href="${escape(issue.url)}" rel="noreferrer">${escape(issue.title)} ↗</a>${issue.labels.slice(0, 2).map((label) => `<small>${escape(label)}</small>`).join("")}</article>`).join("")
    : '<p class="presentation-empty-issues">No open GitHub issues were independently observed.</p>';

  return `<section class="section presentation-issue-sidebar"><div class="section-heading"><div><p class="eyebrow">Verified GitHub context</p><h2>Relevant open issues</h2></div>${verifiedTotal === null ? "" : `<span class="section-count">${verifiedTotal}</span>`}</div><p class="presentation-issue-caption">${escape(sampleLabel)}</p><div class="presentation-github-issues">${items}</div></section>`;
}

export const REPORT_PRESENTATION_STYLES = `
  :root{--presentation-label:10px;--presentation-support:11px;--presentation-body:12px;--presentation-feature:13px;--presentation-violet:#7358f5;--presentation-green:#158765;--presentation-red:#d9455f}
  .workbench-masthead-actions{display:flex;align-items:center;gap:12px}.workbench-settings-link{display:inline-flex;align-items:center;justify-content:center;min-height:30px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;color:var(--presentation-violet);font-size:var(--presentation-body);font-weight:690;text-decoration:none}.workbench-settings-link:hover,.workbench-settings-link:focus-visible{border-color:var(--presentation-violet);outline-color:var(--presentation-violet)}
  .compact-readout{width:min(1100px,calc(100% - 34px));padding:21px 0 34px}.compact-readout .topline{margin-bottom:12px}.compact-readout .hero{padding:18px 20px;border-radius:15px}.compact-readout .hero h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(27px,4vw,43px);font-weight:570}.compact-readout .outcome{margin:10px 0 0;font-size:var(--presentation-feature);line-height:1.55}.compact-readout .section{margin-top:15px}.compact-readout .section-heading h2{font-size:17px}.compact-readout .signal-panel{margin-top:12px;border-radius:11px;padding:10px}.compact-readout .detail-card p{font-size:var(--presentation-body)}
  .presentation-icon{display:grid;width:16px;height:16px;flex:none;place-items:center;font-size:15px;font-weight:750}
  .presentation-project-bar{display:grid;grid-template-columns:1.35fr .75fr .8fr .75fr .8fr .7fr .7fr .9fr;overflow:hidden;margin-top:12px;border:1px solid var(--line);border-radius:10px;background:var(--card)}.presentation-project-fact{display:grid;align-content:center;gap:3px;min-width:0;min-height:55px;border-right:1px solid var(--line);padding:7px 8px}.presentation-project-fact:last-child{border-right:0}.presentation-project-fact>span{color:var(--muted);font-size:var(--presentation-label);font-weight:750;letter-spacing:.06em}.presentation-project-fact>strong{overflow:hidden;font-size:var(--presentation-support);text-overflow:ellipsis;white-space:nowrap}.presentation-project-fact>small{overflow:hidden;color:var(--muted);font-size:var(--presentation-label);text-overflow:ellipsis;white-space:nowrap}.presentation-metadata-link{color:var(--presentation-violet);text-decoration:none}
  .presentation-summary-panel{margin-top:12px;border:1px solid var(--line);border-radius:11px;padding:10px;background:var(--card)}.presentation-summary-caption{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:8px}.presentation-summary{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--card)}.presentation-summary-head{display:grid;grid-template-columns:17px max-content minmax(0,1fr);align-items:center;gap:7px;border-bottom:1px solid var(--line);padding:8px 10px;color:var(--presentation-green)}.presentation-summary-head>strong{font-size:var(--presentation-label);letter-spacing:.07em}.presentation-summary-head>span{overflow:hidden;color:var(--muted);font-size:var(--presentation-support);text-align:right;text-overflow:ellipsis;white-space:nowrap}.presentation-summary-attention .presentation-summary-head{color:var(--presentation-red)}.presentation-summary-body{display:grid;grid-template-columns:minmax(190px,1.4fr) minmax(240px,2fr) 53px;gap:8px;padding:9px}.presentation-featured-signal{display:grid;align-content:center;gap:5px;min-width:0;border-left:4px solid var(--presentation-violet);border-radius:0 7px 7px 0;padding:8px 10px;background:#f6f2ff}.presentation-featured-signal>span{color:var(--presentation-violet);font-size:var(--presentation-label);font-weight:760;letter-spacing:.08em}.presentation-featured-signal>strong{display:-webkit-box;overflow:hidden;font-family:Georgia,"Times New Roman",serif;font-size:16px;font-weight:590;line-height:1.3;-webkit-box-orient:vertical;-webkit-line-clamp:2}.presentation-featured-signal>p{display:-webkit-box;overflow:hidden;margin:0;color:var(--muted);font-size:var(--presentation-feature);line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.presentation-summary-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.presentation-summary-metric{display:grid;grid-template-columns:17px minmax(0,1fr);align-content:center;gap:6px;min-width:0;border:1px solid var(--line);border-radius:8px;padding:7px}.presentation-summary-metric>.presentation-icon{color:var(--presentation-violet)}.presentation-tone-clear>.presentation-icon{color:var(--presentation-green)}.presentation-tone-danger>.presentation-icon{color:var(--presentation-red)}.presentation-summary-metric>div{display:grid;align-content:center;gap:2px;min-width:0}.presentation-summary-metric>div>span,.presentation-summary-metric>div>small{overflow:hidden;color:var(--muted);font-size:var(--presentation-label);text-overflow:ellipsis;white-space:nowrap}.presentation-summary-metric>div>strong{font-size:19px;font-weight:770;line-height:1.1}.presentation-check-ring{display:grid;align-content:center;justify-items:center;gap:2px}.presentation-check-ring>svg{width:43px;height:43px}.presentation-empty-ring{display:grid;width:43px;height:43px;place-items:center;border:2px solid var(--line);border-radius:50%;font-size:19px}.presentation-ring-track,.presentation-ring-progress{fill:none;stroke-width:4}.presentation-ring-track{stroke:var(--line)}.presentation-ring-progress{stroke:var(--presentation-green);stroke-linecap:round;transform:rotate(-90deg);transform-origin:center}.presentation-ring-failed{stroke:var(--presentation-red)}.presentation-check-ring text{fill:var(--ink);font:750 12px ui-sans-serif,system-ui,sans-serif}.presentation-check-ring>span{color:var(--muted);font-size:var(--presentation-label)}
  .presentation-run-metrics-source{max-width:min(52%,360px);overflow-wrap:anywhere;color:var(--muted);font-size:var(--presentation-support);line-height:1.45;text-align:right}.presentation-run-metrics-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.presentation-run-metric{display:grid;align-content:center;gap:5px;min-width:0;min-height:55px;border:1px solid var(--line);border-radius:9px;padding:9px 10px;background:var(--card)}.presentation-run-metric>span{color:var(--muted);font-size:var(--presentation-label);font-weight:750;letter-spacing:.06em}.presentation-run-metric>strong{overflow-wrap:anywhere;color:var(--ink);font-size:var(--presentation-feature);font-weight:720;line-height:1.4}
  .compact-readout .next-grid,.workbench-readout-document .next-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:9px}.compact-readout .next-card,.workbench-readout-document .next-card{display:grid;grid-template-rows:21px 15px 39px 54px minmax(85px,1fr) auto;align-content:start;gap:6px;min-width:0;height:100%;border-radius:11px;padding:11px}.presentation-next-top{display:flex;align-items:center;justify-content:space-between}.presentation-next-rank{color:var(--muted);font:700 11px ui-monospace,SFMono-Regular,monospace}.presentation-next-badge{border:1px solid var(--line);border-radius:999px;padding:3px 7px;color:var(--presentation-violet);font-size:var(--presentation-label);font-weight:730}.compact-readout .next-card>.eyebrow,.workbench-readout-document .next-card>.eyebrow{font-size:var(--presentation-label)}.compact-readout .next-card h3,.workbench-readout-document .next-card h3{display:grid;align-content:start;gap:2px;margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:var(--presentation-feature);line-height:1.35}.presentation-native-skill{color:var(--presentation-violet);font:650 11px ui-monospace,SFMono-Regular,monospace}.compact-readout .next-card .next-reason,.workbench-readout-document .next-card .next-reason{display:-webkit-box;overflow:hidden;margin:0;color:var(--muted);font-size:var(--presentation-body);line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:3}.compact-readout .next-prompt-block,.workbench-readout-document .next-prompt-block{min-height:85px;margin:0;padding:8px 9px;background:#f8f8ff;color:#312c49;line-height:1.5}.compact-readout .next-prompt-block code,.workbench-readout-document .next-prompt-block code{font-size:var(--presentation-body);line-height:1.5}.compact-readout .next-model-callout,.workbench-readout-document .next-model-callout{margin-top:0}.compact-readout .next-model-label,.workbench-readout-document .next-model-label{font-size:var(--presentation-support)}
  .presentation-evidence-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(285px,100%),1fr));align-items:stretch;gap:9px}.presentation-evidence-card{display:grid;grid-template-rows:auto auto minmax(0,1fr);align-content:start;gap:8px;min-width:0;height:100%;border:1px solid var(--line);border-radius:11px;padding:11px;background:var(--card)}.presentation-evidence-heading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px;min-width:0}.presentation-evidence-heading h3{min-width:0;margin:0;overflow-wrap:anywhere;font-size:var(--presentation-feature);line-height:1.4}.presentation-evidence-path{max-width:100%;overflow-wrap:anywhere;color:var(--presentation-violet);font:500 var(--presentation-support)/1.5 ui-monospace,SFMono-Regular,monospace}.presentation-evidence-detail{margin:0;color:var(--muted);font-size:var(--presentation-body);line-height:1.55}.presentation-evidence-block{box-sizing:border-box;min-width:0;max-width:100%;margin:0;overflow-x:auto;border:1px solid var(--line);border-radius:8px;padding:10px 11px;background:#f8f8ff;color:#312c49;tab-size:2}.presentation-evidence-block code{font:500 var(--presentation-body)/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre}
  .presentation-github-issues{display:grid;gap:7px}.presentation-issue-caption{margin:0 0 9px;color:var(--muted);font-size:var(--presentation-support);line-height:1.5}.presentation-github-issue{display:grid;grid-template-columns:36px minmax(0,1fr);gap:4px 7px;border-top:1px solid var(--line);padding:8px 0}.presentation-github-issue>span{color:var(--muted);font:11px ui-monospace,SFMono-Regular,monospace}.presentation-github-issue>a{color:var(--presentation-violet);font-size:var(--presentation-body);line-height:1.45;text-decoration:none}.presentation-github-issue>small{grid-column:2;width:max-content;border:1px solid var(--line);border-radius:999px;padding:2px 6px;color:var(--muted);font-size:var(--presentation-label)}.presentation-empty-issues{margin:0;color:var(--muted);font-size:var(--presentation-body)}
  .workbench-page{--ink:#28231f;--paper:#faf8f4;--card:#fffdfa;--line:#ebe5dc}.workbench-masthead{min-height:51px}.workbench-brand{font-size:14px}.workbench-project-title,.workbench-run-title strong{font-size:12px}.workbench-project-count,.workbench-run-title>span,.workbench-run-time,.workbench-run-observation{font-size:var(--presentation-support)}.workbench-project-outcome,.workbench-project-profile{font-size:var(--presentation-support)}.workbench-detail-title{font-family:Georgia,"Times New Roman",serif;font-size:clamp(27px,4vw,39px);font-weight:560}.workbench-detail-profile,.workbench-scope,.workbench-readonly{font-size:var(--presentation-body)}.workbench-detail-section h3{font-size:var(--presentation-feature)}.workbench-detail-section>p,.workbench-evidence dt,.workbench-evidence dd{font-size:var(--presentation-body)}.workbench-open-report{font-size:var(--presentation-support)}.workbench-readout-document{margin-top:16px}.workbench-detail .presentation-project-bar{margin-top:12px}.workbench-detail .signal-panel,.workbench-detail .presentation-summary-panel{margin-top:12px;padding:10px}.workbench-detail .presentation-summary{background:#fff}.workbench-shell.has-issue-sidebar{grid-template-columns:minmax(180px,240px) minmax(0,1fr) minmax(200px,260px)}.workbench-issues{grid-column:3;grid-row:1/-1;min-width:0;min-height:0;overflow-y:auto;border-left:1px solid var(--line);padding:17px 12px}.workbench-issues>.presentation-issue-sidebar{margin-top:0}.workbench-issues .section-heading h2{font-size:var(--presentation-feature)}
  @media(max-width:1080px){.compact-readout .next-grid,.workbench-readout-document .next-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.presentation-run-metrics-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.presentation-project-bar{grid-template-columns:repeat(4,minmax(0,1fr))}.presentation-project-fact:nth-child(4){border-right:0}.presentation-project-fact:nth-child(n+5){border-top:1px solid var(--line)}}
  @media(max-width:780px){.compact-readout .next-grid,.workbench-readout-document .next-grid{grid-template-columns:1fr}.presentation-summary-body{grid-template-columns:minmax(0,1fr) 50px}.presentation-featured-signal{grid-column:1/-1}.presentation-summary-metrics{grid-column:1;grid-row:2}.presentation-check-ring{grid-column:2;grid-row:2}.workbench-shell.has-issue-sidebar{grid-template-columns:minmax(160px,200px) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto}.workbench-shell.has-issue-sidebar>.workbench-issues{grid-column:2;grid-row:3;max-height:220px;border-top:1px solid var(--line);border-left:0}}
  @media(max-width:620px){.presentation-project-bar{grid-template-columns:repeat(2,minmax(0,1fr))}.presentation-project-fact:nth-child(2n){border-right:0}.presentation-project-fact:nth-child(n+3){border-top:1px solid var(--line)}.presentation-summary-metrics,.presentation-run-metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.workbench-shell.has-issue-sidebar{grid-template-columns:1fr;grid-template-rows:auto auto auto auto}.workbench-shell.has-issue-sidebar>.workbench-issues{grid-column:1;grid-row:4;max-height:none}}
  .workbench-page[data-preference-density="compact"] .workbench-shell{margin-top:8px}.workbench-page[data-preference-density="compact"] .workbench-sidebar{padding:9px}.workbench-page[data-preference-density="compact"] .workbench-workspace{padding:11px 12px}.workbench-page[data-preference-density="compact"] .workbench-detail{padding:13px 12px 19px}.workbench-page[data-preference-density="compact"] .workbench-project-runs .workbench-run{padding:7px 8px}.workbench-page[data-preference-density="compact"] .workbench-readout-document .section{margin-top:15px}
`;
