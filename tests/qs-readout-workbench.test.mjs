import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  renderSkillReadout,
  startReadoutIngestionServer,
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";

const workbenchObservedRun = Object.freeze({
  version: 1,
  measurementSource: "provider-response",
  attributionScope: "skill-run",
  capturedAt: "2026-07-26T19:02:00.000Z",
  inference: {
    provider: "openai",
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
  },
  tokens: {
    input: 1_200,
    cachedInput: 300,
    output: 280,
    reasoningOutput: 80,
    total: 1_480,
  },
  timing: {
    startedAt: "2026-07-26T19:01:00.000Z",
    finishedAt: "2026-07-26T19:02:00.000Z",
    activeDurationMs: 42_000,
  },
});

function verifiedProject(repository) {
  return {
    host: "github.com",
    owner: "quickstark",
    repository,
    key: `github.com/quickstark/${repository}`,
    label: `quickstark/${repository}`,
    source: "explicit",
  };
}

function visibleProjectSidebar(html) {
  return html.match(
    /<aside\b[^>]*aria-label="Verified projects"[^>]*>[\s\S]*?<\/aside>/,
  );
}

function visibleSelectedReadout(html) {
  return html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>[\s\S]*?<\/aside>/,
  );
}

async function createProjectWorkbench(context, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-workbench-test-"));
  const entries = [
    {
      skill: "qs-code-build",
      outcome: "Deliver the approved single-page Project Workbench.",
      generatedAt: "2026-07-26T16:00:00.000Z",
      projectIdentity: verifiedProject("skills"),
    },
    {
      skill: "qs-plan-research",
      outcome: "Verify the report library trust boundaries.",
      generatedAt: "2026-07-25T10:00:00.000Z",
      projectIdentity: verifiedProject("skills"),
    },
    {
      skill: "qs-code-build",
      outcome: "Build the independent marketplace search experience.",
      generatedAt: "2026-07-26T17:00:00.000Z",
      projectIdentity: verifiedProject("marketplace"),
    },
    {
      skill: "qs-design-prototype",
      status: "Preview",
      skillsUsed: [],
      outcome: "Catalog preview only; no actual prototype skill ran.",
      generatedAt: "2026-07-26T18:00:00.000Z",
      projectIdentity: verifiedProject("skills"),
    },
  ];
  const reports = [];

  for (const entry of entries) {
    reports.push(await writeSkillReadout(entry, { directory, layout: "project" }));
  }

  const viewer = await startReadoutServer({
    directory,
    port: 0,
    currentProject: "github.com/quickstark/skills",
    ...options,
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  return { directory, viewer, reports };
}

async function publishObservedWorkbenchRun(context, { directory, viewer }, overrides = {}) {
  const ingestion = await startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["github.com/quickstark/skills"],
    producers: [{
      id: "workbench-observed-producer",
      token: "test-only-workbench-observation-credential-1234567890",
      projects: ["github.com/quickstark/skills"],
    }],
  });

  context.after(async () => {
    if (!ingestion.server.listening) return;

    await new Promise((resolve, reject) => {
      ingestion.server.close((error) => error ? reject(error) : resolve());
    });
  });

  const envelope = {
    version: 1,
    producer: "workbench-observed-producer",
    harness: { name: "claude-code", version: "1.2.0" },
    collection: "independent/agent-skills",
    project: "https://github.com/quickstark/skills.git",
    runId: "c06a1939-88a0-48e7-9c24-678bb92683e1",
    generatedAt: "2026-07-26T19:03:00.000Z",
    skill: "external-workbench-review",
    displayName: "Observed independent Workbench review",
    status: "Completed",
    outcome: "Present one authorized external observation in the verified Project Workbench.",
    checks: [{ title: "External Workbench rendering", status: "passed" }],
    observation: {
      ...workbenchObservedRun,
      quality: { source: "observed-checks", passedChecks: 1, failedChecks: 0 },
    },
    nextSkills: [],
    ...overrides,
  };
  const response = await fetch(new URL("api/v1/readouts", ingestion.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-only-workbench-observation-credential-1234567890",
    },
    body: JSON.stringify(envelope),
  });

  assert.equal(response.status, 201);

  return response.json();
}

test("the production root presents verified projects, actual skill runs, and the selected readout in one Project Workbench", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /Project Workbench/);
  assert.match(html, /aria-label="Verified projects"/);
  assert.match(html, /aria-label="Skill run readouts"/);
  assert.match(html, /aria-label="Selected skill readout"/);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /Deliver the approved single-page Project Workbench\./);
  assert.match(html, /Verify the report library trust boundaries\./);
  assert.match(html, /Open immutable readout/);
  assert.ok(html.includes(reports[0].relativePath));
  assert.doesNotMatch(html, /Catalog preview only; no actual prototype skill ran\./);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("the production Workbench presents the selected B metadata, visual summary, and native next prompts", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-debug",
    report: "full",
    completionState: "continuation-required",
    outcome: "Diagnosed the verified panel-height regression.",
    generatedAt: "2026-07-26T21:00:00.000Z",
    projectIdentity: verifiedProject("skills"),
    findings: [{
      title: "The application was cut off by a legacy panel-height cap",
      detail: "An observed CSS maximum prevented the full project workspace from rendering.",
    }],
    checks: [{ title: "Verified full-height regression", status: "passed" }],
  }, { directory, layout: "project" });
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(detail, "the selected report remains inside the existing project-first reading pane");
  assert.match(detail[0], /aria-label="Verified project and run metadata"/);
  assert.match(detail[0], /aria-label="Five-second report summary"/);
  assert.match(detail[0], /NO CRITICAL EXCEPTIONS/);
  assert.match(detail[0], /The application was cut off by a legacy panel-height cap/);
  assert.match(detail[0], /1 of 1 recorded checks passed/);
  assert.match(detail[0], /Use \$qs-skills:qs-review-code/);
  assert.doesNotMatch(detail[0], /qs-test-tdd|qs-design-architecture|qs-plan-interview/);
  assert.match(detail[0], /Heuristic model and thinking guidance/);
  assert.match(detail[0], /aria-label="Complete immutable skill readout"/);
  assert.ok(
    detail[0].indexOf('aria-label="Verified project and run metadata"')
      < detail[0].indexOf('aria-label="Five-second report summary"'),
    "the selected production report presents project metadata before its visual summary",
  );
  assert.ok(
    detail[0].indexOf('aria-label="Five-second report summary"')
      < detail[0].indexOf("Top next prompts"),
    "the five-second summary comes before the native, copy-ready next prompts",
  );
  assert.doesNotMatch(html, /<script\b|<iframe\b/i);
});

test("the production Project Workbench fills the full viewport without a capped or clipped application panel", async (context) => {
  const { viewer } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();
  const stylesheet = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);

  assert.equal(response.status, 200);
  assert.ok(stylesheet, "the self-contained production Workbench includes its actual rendered stylesheet");

  const page = stylesheet[1].match(/(?:^|})\s*\.workbench-page\s*\{([^}]*)\}/);
  const shell = stylesheet[1].match(/(?:^|})\s*\.workbench-shell\s*\{([^}]*)\}/);

  assert.ok(page, "the production page defines its actual full-viewport application layout");
  assert.ok(shell, "the production page defines its actual integrated Workbench shell");
  assert.match(page[1], /(?:^|;)\s*height\s*:\s*100dvh(?:;|$)/);
  assert.match(page[1], /(?:^|;)\s*min-height\s*:\s*100dvh(?:;|$)/);
  assert.match(page[1], /(?:^|;)\s*display\s*:\s*grid(?:;|$)/);
  assert.match(
    page[1],
    /(?:^|;)\s*grid-template-rows\s*:\s*auto\s+minmax\(0,\s*1fr\)\s+auto(?:;|$)/,
    "the header, flexible application, and footer occupy the entire browser viewport",
  );
  assert.match(shell[1], /(?:^|;)\s*min-height\s*:\s*0(?:;|$)/);
  assert.match(shell[1], /(?:^|;)\s*max-height\s*:\s*none(?:;|$)/);
  assert.doesNotMatch(
    shell[1],
    /(?:^|;)\s*max-height\s*:\s*(?:min|max|clamp)\s*\(/,
    "a legacy viewport cap must not truncate the actual reading pane",
  );
});

test("retired gallery URLs always resolve to the full Project Workbench without resurrecting the old navigation", async (context) => {
  const { viewer } = await createProjectWorkbench(context);

  for (const suffix of [
    "?view=projects",
    "?view=explorer",
    "?view=activity",
    "?view=explorer&project=github.com%2Fquickstark%2Fskills&q=trust+boundaries",
  ]) {
    const response = await fetch(new URL(suffix, viewer.url));
    const html = await response.text();

    assert.equal(response.status, 200, suffix);
    assert.match(html, /<title>Project Workbench(?:\s*[·|–-][^<]*)?<\/title>/, suffix);
    assert.match(html, /aria-label="Verified projects"/, suffix);
    assert.match(html, /aria-label="Skill run readouts"/, suffix);
    assert.match(html, /aria-label="Selected skill readout"/, suffix);
    assert.doesNotMatch(html, /aria-label="Readout views"/, suffix);
    assert.doesNotMatch(html, /\bclass="gallery-nav"/, suffix);
    assert.doesNotMatch(
      html,
      /(?:^|[}\s])\.(?:gallery-nav|explorer|explorer-sidebar|explorer-content|timeline-day)(?:[.#:{\s>]|$)/,
      `retired gallery menu and view styles must not be shipped: ${suffix}`,
    );
    assert.doesNotMatch(html, /\bname="view"/, suffix);
    assert.doesNotMatch(html, /href="[^"<>]*\bview=(?:explorer|activity)\b/, suffix);

    if (suffix.includes("trust+boundaries")) {
      assert.match(html, /Verify the report library trust boundaries\./, suffix);
    }
  }
});

test("the project-first sidebar nests only the selected project's newest-first actual readouts", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();
  const sidebar = html.match(/<aside\b[^>]*aria-label="Verified projects"[^>]*>([\s\S]*?)<\/aside>/);

  assert.equal(response.status, 200);
  assert.ok(sidebar, "the public viewer exposes one accessible verified-project sidebar");

  const projectEntries = [...sidebar[1].matchAll(
    /<article\b[^>]*data-project="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g,
  )];
  const selected = projectEntries.find(([ , key]) => key === "github.com/quickstark/skills");
  const other = projectEntries.find(([ , key]) => key === "github.com/quickstark/marketplace");

  assert.equal(projectEntries.length, 2, "each verified project is represented once");
  assert.ok(selected, "the active verified project remains visible");
  assert.ok(other, "other verified projects remain directly selectable");
  assert.match(selected[2], /aria-label="Recorded skill runs"/);
  assert.match(selected[2], /\/qs-code-build/);
  assert.match(selected[2], /\/qs-plan-research/);
  assert.ok(
    selected[2].indexOf("/qs-code-build") < selected[2].indexOf("/qs-plan-research"),
    "the selected project's real reports are displayed newest first",
  );
  assert.ok(
    selected[2].includes(encodeURIComponent(reports[0].relativePath)),
    "each nested report retains its safe, restorable immutable-report link",
  );
  assert.doesNotMatch(selected[2], /Build the independent marketplace search experience\./);
  assert.doesNotMatch(other[2], /aria-label="Recorded skill runs"/);
  assert.doesNotMatch(sidebar[1], /Catalog preview only; no actual prototype skill ran\./);
});

test("the project-first Workbench presents one report tree without redundant top-level views", async (context) => {
  const { viewer } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(
    (html.match(/aria-label="Recorded skill runs"/g) ?? []).length,
    1,
    "the selected project's actual skill runs appear in exactly one accessible project tree",
  );
  assert.match(html, /aria-label="Verified projects"/);
  assert.match(html, /aria-label="Skill run readouts"/);
  assert.match(html, /aria-label="Selected skill readout"/);
  assert.match(html, /Show catalog previews/);
  assert.doesNotMatch(html, /aria-label="Readout views"/);
  assert.doesNotMatch(html, /<iframe\b|<script\b/i);
});

test("the project-first Workbench exposes one accessible project tree and one complete reading pane", async (context) => {
  const { viewer } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();
  const sidebar = visibleProjectSidebar(html);
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(sidebar, "verified project navigation has a named accessible sidebar");
  assert.ok(detail, "the selected immutable report has a named accessible reading pane");
  assert.equal(
    (html.match(/<aside\b[^>]*aria-label="Verified projects"/g) ?? []).length,
    1,
    "verified projects are presented in exactly one navigation pane",
  );
  assert.equal(
    (html.match(/<aside\b[^>]*aria-label="Selected skill readout"/g) ?? []).length,
    1,
    "the full selected report is presented in exactly one reading pane",
  );
  assert.equal(
    (html.match(/<nav\b[^>]*aria-label="Recorded skill runs"/g) ?? []).length,
    1,
    "actual skill runs are nested under one selected verified project",
  );
  assert.ok(
    html.indexOf(sidebar[0]) < html.indexOf(detail[0]),
    "project navigation precedes its integrated readout in the accessible document order",
  );
  assert.match(detail[0], /aria-label="Complete immutable skill readout"/);
  assert.doesNotMatch(html, /aria-label="Readout views"|<iframe\b|<script\b/i);
});

test("project-tree search restores only matching readouts from the selected verified project", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    q: "trust boundaries",
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const sidebar = visibleProjectSidebar(html);
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(sidebar, "the filtered project tree remains accessible");
  assert.ok(detail, "the matching report is selected in the same reader");
  assert.match(sidebar[0], /aria-label="Search selected project reports"/);
  assert.match(sidebar[0], /value="trust boundaries"/);
  assert.match(sidebar[0], /\/qs-plan-research/);
  assert.doesNotMatch(sidebar[0], /\/qs-code-build/);
  assert.match(detail[0], /Verify the report library trust boundaries\./);
  assert.match(html, />2 actual skill runs</);
  assert.ok(html.includes(reports[1].relativePath));
  assert.doesNotMatch(detail[0], /Build the independent marketplace search experience\./);
});

test("a project search distinguishes matching actual reports from the project-wide total", async (context) => {
  const { viewer } = await createProjectWorkbench(context);
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    q: "trust boundaries",
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /aria-label="Matching actual skill runs"[^>]*>1 matching</,
    "one actual report visibly matches the current project search",
  );
  assert.match(
    html,
    />2 actual skill runs</,
    "the verified project's independently truthful actual-run total remains visible",
  );
  assert.doesNotMatch(html, /Catalog preview only; no actual prototype skill ran\./);
});

test("verified project reports round-trip independently selectable skill and status filters", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const blocked = await writeSkillReadout({
    skill: "qs-plan-research",
    status: "Blocked",
    outcome: "Resolve the blocked report filter for the verified project.",
    generatedAt: "2026-07-26T19:15:00.000Z",
    projectIdentity: verifiedProject("skills"),
  }, { directory, layout: "project" });

  for (const filters of [
    { status: "Blocked" },
    { skill: "qs-plan-research" },
    { skill: "qs-plan-research", status: "Blocked" },
  ]) {
    const parameters = new URLSearchParams({
      project: "github.com/quickstark/skills",
      ...filters,
    });
    const response = await fetch(new URL(`?${parameters}`, viewer.url));
    const html = await response.text();
    const sidebar = visibleProjectSidebar(html);
    const detail = visibleSelectedReadout(html);

    assert.equal(response.status, 200, JSON.stringify(filters));
    assert.ok(sidebar, "the filtered verified-project sidebar remains accessible");
    assert.ok(detail, "a matching actual immutable report remains selected");

    const runs = sidebar[0].match(
      /<nav\b[^>]*aria-label="Recorded skill runs"[^>]*>([\s\S]*?)<\/nav>/,
    );

    assert.ok(runs, "the selected project retains one real skill-run navigation landmark");
    assert.match(runs[1], /\/qs-plan-research/);
    assert.doesNotMatch(runs[1], /\/qs-code-build/);
    assert.match(detail[0], /Resolve the blocked report filter for the verified project\./);
    assert.ok(html.includes(blocked.relativePath));

    const reportLink = runs[1].match(/<a\b[^>]*href="([^"]+)"/);

    assert.ok(reportLink, "the filtered report has a real shareable navigation link");

    const restored = new URL(reportLink[1].replaceAll("&amp;", "&"), viewer.url);

    assert.equal(restored.searchParams.get("project"), "github.com/quickstark/skills");

    for (const [name, value] of Object.entries(filters)) {
      assert.equal(restored.searchParams.get(name), value);
    }
  }
});

test("toggling catalog previews preserves the selected project, report, and search", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const state = new URL(viewer.url);

  state.searchParams.set("project", "github.com/quickstark/marketplace");
  state.searchParams.set("report", reports[2].relativePath);
  state.searchParams.set("q", "independent marketplace");

  const response = await fetch(state);
  const html = await response.text();
  const show = html.match(/<a\b[^>]*href="([^"]+)"[^>]*>Show catalog previews<\/a>/);

  assert.equal(response.status, 200);
  assert.ok(show, "the selected project exposes an accessible preview-toggle link");

  const shownState = new URL(show[1].replaceAll("&amp;", "&"), viewer.url);

  assert.equal(shownState.searchParams.get("project"), "github.com/quickstark/marketplace");
  assert.equal(shownState.searchParams.get("report"), reports[2].relativePath);
  assert.equal(shownState.searchParams.get("q"), "independent marketplace");
  assert.equal(shownState.searchParams.get("previews"), "1");

  const shownResponse = await fetch(shownState);
  const shownHtml = await shownResponse.text();
  const detail = visibleSelectedReadout(shownHtml);
  const hide = shownHtml.match(/<a\b[^>]*href="([^"]+)"[^>]*>Hide catalog previews<\/a>/);

  assert.equal(shownResponse.status, 200);
  assert.ok(detail, "the selected report remains visible after enabling previews");
  assert.match(detail[0], /Build the independent marketplace search experience\./);
  assert.doesNotMatch(detail[0], /Deliver the approved single-page Project Workbench\./);
  assert.ok(hide, "catalog previews can be hidden without resetting project selection");

  const hiddenState = new URL(hide[1].replaceAll("&amp;", "&"), viewer.url);

  assert.equal(hiddenState.searchParams.get("project"), "github.com/quickstark/marketplace");
  assert.equal(hiddenState.searchParams.get("report"), reports[2].relativePath);
  assert.equal(hiddenState.searchParams.get("q"), "independent marketplace");
  assert.equal(hiddenState.searchParams.has("previews"), false);
});

test("a selected project report presents its complete immutable findings, checks, and next prompts", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    report: "full",
    completionState: "continuation-required",
    outcome: "Display the selected report without replacing its immutable original.",
    generatedAt: "2026-07-26T19:04:00.000Z",
    projectIdentity: verifiedProject("skills"),
    findings: [{
      title: "Verified project-first reading behavior",
      detail: "The selected project and its complete skill readout share one public viewer.",
    }],
    checks: [{
      title: "Original immutable report remains unchanged",
      status: "passed",
    }],
  }, { directory, layout: "project" });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const observedOutcome = html.match(
    /<section\b[^>]*aria-label="Observed skill outcome"[^>]*>([\s\S]*?)<\/section>/,
  );

  assert.equal(response.status, 200);
  assert.match(html, /aria-label="Selected skill readout"/);
  assert.match(html, /aria-label="Complete immutable skill readout"/);
  assert.match(html, /Verified project-first reading behavior/);
  assert.match(html, /The selected project and its complete skill readout share one public viewer\./);
  assert.match(html, /Original immutable report remains unchanged/);
  assert.match(html, /(?:Top next prompts|Next best skills)/);
  assert.ok(observedOutcome, "the reader exposes one accessible primary outcome section");
  assert.equal(
    (observedOutcome[1].match(/Display the selected report without replacing its immutable original\./g) ?? []).length,
    1,
    "the selected report outcome is presented once in its primary outcome section",
  );
  assert.doesNotMatch(html, /<iframe\b|<script\b/i);

  const direct = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(direct.status, 200);
  assert.equal(await direct.text(), original);
  assert.equal(await readFile(report.path, "utf8"), original);
});

test("the Workbench safely preserves complete historical readouts without profile metadata", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    report: "full",
    completionState: "continuation-required",
    outcome: "Preserve the verified historical readout and its original section labels.",
    generatedAt: "2026-07-26T20:15:00.000Z",
    projectIdentity: verifiedProject("skills"),
    findings: [{ title: "Historical report finding", detail: "The original finding remains visible." }],
    decisions: [{ title: "Historical report decision", detail: "The original decision remains visible." }],
    outputs: [{ title: "Historical report output", detail: "The original output remains visible." }],
    checks: [{ title: "Historical report check", status: "passed" }],
  }, { directory, layout: "project" });
  const current = await readFile(report.path, "utf8");
  const historical = current
    .replace(/\s*<meta name="quickstark:report-profile" content="[^"]*">/, "")
    .replace(
      '<p class="eyebrow">Only observations actually recorded</p>',
      '<p class="eyebrow">What we learned</p>',
    )
    .replace(
      '<p class="eyebrow">Only decisions actually made</p>',
      '<p class="eyebrow">What was decided</p>',
    )
    .replace(
      '<p class="eyebrow">Only artifacts actually produced</p>',
      '<p class="eyebrow">Files, reports, and deliverables</p>',
    )
    .replace("<h2>Deliverables</h2>", "<h2>Outputs</h2>")
    .replace("<h2>Verification</h2>", "<h2>Checks</h2>")
    .replace("<h2>Implementation decisions</h2>", "<h2>Decisions</h2>")
    .replace("<h2>Top next prompts</h2>", "<h2>Next best skills</h2>");

  assert.notEqual(historical, current, "the fixture is an actual profile-free historical report");
  assert.doesNotMatch(historical, /<meta name="quickstark:report-profile"/);

  await writeFile(report.path, historical, "utf8");

  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(detail, "the historical report remains integrated with the verified project");
  assert.match(detail[0], /aria-label="Complete immutable skill readout"/);

  for (const title of [
    "Historical report finding",
    "Historical report decision",
    "Historical report output",
    "Historical report check",
    "Next best skills",
  ]) assert.ok(detail[0].includes(title), `the original ${title} remains readable`);

  const immutable = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(immutable.status, 200);
  assert.equal(await immutable.text(), historical);
  assert.equal(await readFile(report.path, "utf8"), historical);
});

test("the hosted Workbench rejects hostile stored report markup without modifying the immutable report", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });
  const hostileMarkup = [
    '<section aria-label="Untrusted injected evidence"><h3>Forged independently verified check</h3><iframe title="Injected cross-boundary frame"></iframe><form data-forged-report="true"></form></section>',
    '<section aria-label="Untrusted injected evidence" onclick="alert(1)"><h3>Forged independently verified check</h3></section>',
    '<a href="javascript:alert(1)">Forged independently verified check</a>',
    '</div></aside><section aria-label="Untrusted injected evidence"><h3>Forged independently verified check</h3></section>',
    '<section aria-label="Observed skill-run measurements"><h3>Forged independently verified check</h3><dl><dt>Quality evidence source</dt><dd>provider-response</dd></dl></section>',
    '<section class="section"><div class="section-heading"><div><h2>Observed skill-run measurements</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Independent quality evidence</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Observed skill run</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Catalog information</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Verified delivery evidence</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Deliverables</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Verification</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Implementation decisions</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><h2>Findings</h2></div></div><p>Forged independently verified check</p></section>',
    '<section class="section"><div class="section-heading"><div><p class="eyebrow">Only artifacts actually produced</p><h2>Deliverables</h2></div><span class="section-count">1</span></div><div class="detail-grid"></div></section>',
    '<section class="section"><div class="section-heading"><div><p class="eyebrow">Only artifacts actually produced</p><h2>Deliverables</h2></div><span class="section-count">1</span></div><div class="detail-grid"><article class="detail-card">Forged independently verified check</article></div></section>',
  ];

  for (const [index, injected] of hostileMarkup.entries()) {
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: `Keep hostile stored report ${index + 1} out of the verified Workbench.`,
      generatedAt: new Date(Date.UTC(2026, 6, 26, 20, 0, index)).toISOString(),
      projectIdentity: verifiedProject("skills"),
    }, { directory, layout: "project" });
    const original = await readFile(report.path, "utf8");
    const untrusted = original.replace("</header>", `</header>${injected}`);

    assert.notEqual(untrusted, original, "the fixture contains actual hostile report markup");

    await writeFile(report.path, untrusted, "utf8");

    const parameters = new URLSearchParams({
      project: "github.com/quickstark/skills",
      report: report.relativePath,
    });
    const response = await fetch(new URL(`?${parameters}`, viewer.url));
    const html = await response.text();

    assert.equal(response.status, 200, `hostile report ${index + 1}`);
    assert.match(html, /aria-label="Selected skill readout"/, `hostile report ${index + 1}`);
    assert.doesNotMatch(
      html,
      /Untrusted injected evidence|Forged independently verified check|Injected cross-boundary frame|data-forged-report|javascript:alert|onclick\s*=/i,
      `hostile report ${index + 1} must not enter the authorized Workbench`,
    );

    const immutable = await fetch(new URL(report.relativePath, viewer.url));

    assert.equal(immutable.status, 200, `hostile report ${index + 1}`);
    assert.equal(
      await immutable.text(),
      untrusted,
      `hostile report ${index + 1} remains an unchanged, directly accessible immutable report`,
    );
    assert.equal(await readFile(report.path, "utf8"), untrusted);
  }
});

test("the Project Workbench displays the verified model, effort, tokens, duration, and quality of its selected skill run", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const observed = await writeSkillReadout({
    skill: "qs-code-build",
    report: "full",
    outcome: "Display the exact immutable observed skill run in the Project Workbench.",
    generatedAt: "2026-07-26T19:03:00.000Z",
    projectIdentity: verifiedProject("skills"),
    checks: [{ title: "Workbench observation rendering", status: "passed" }],
    observation: {
      ...workbenchObservedRun,
      quality: { source: "observed-checks", passedChecks: 1, failedChecks: 0 },
    },
  }, { directory, layout: "project" });
  const response = await fetch(viewer.url);
  const html = await response.text();
  const workspace = visibleProjectSidebar(html);
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(workspace, "the verified project exposes one recorded skill-run list");
  assert.ok(detail, "the verified project exposes one selected immutable readout");
  assert.ok(html.includes(observed.relativePath));
  assert.ok(workspace[0].includes("provider-response"), "the skill-run list includes the independently observed measurement source");
  assert.ok(workspace[0].includes("gpt-5.6-sol"), "the skill-run list includes the actual provider-reported model");
  assert.ok(workspace[0].includes("medium"), "the skill-run list includes the observed reasoning effort");
  assert.ok(workspace[0].includes("1,480"), "the skill-run list includes the observed final response tokens");
  assert.ok(workspace[0].includes("42,000"), "the skill-run list includes the actual active duration");
  assert.match(detail[0], /Observed skill-run measurements/);
  assert.match(detail[0], /provider-response/);
  assert.match(detail[0], /skill-run/);
  assert.match(detail[0], /openai/);
  assert.match(detail[0], /gpt-5\.6-sol/);
  assert.match(detail[0], /medium/);
  assert.match(detail[0], /1,200/);
  assert.match(detail[0], /1,480/);
  assert.match(detail[0], /42,000 ms/);
  assert.match(detail[0], /Independent quality evidence/);
  assert.match(detail[0], /observed-checks/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("the Project Workbench labels uninstrumented historical runs and missing quality as Not captured", async (context) => {
  const { viewer } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();
  const workspace = visibleProjectSidebar(html);
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(workspace);
  assert.ok(detail);
  assert.match(workspace[0], /Not captured/);
  assert.match(detail[0], /Observed run measurements/);
  assert.match(detail[0], /Independent quality evidence/);
  assert.ok((detail[0].match(/Not captured/g) ?? []).length >= 15);
  assert.doesNotMatch(detail[0], /(?:tokens|duration)<\/dt><dd>0(?: ms)?<\/dd>/i);
});

test("the Project Workbench preserves thread-level model and tokens without presenting them as skill-run usage", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);

  for (const [index, attributionScope] of ["thread-turn", "thread-cumulative"].entries()) {
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: `Preserve independently attributed ${attributionScope} observation.`,
      generatedAt: `2026-07-26T19:0${index + 3}:00.000Z`,
      projectIdentity: verifiedProject("skills"),
      observation: { ...workbenchObservedRun, attributionScope },
    }, { directory, layout: "project" });
    const parameters = new URLSearchParams({
      project: "github.com/quickstark/skills",
      report: report.relativePath,
    });
    const response = await fetch(new URL(`?${parameters}`, viewer.url));
    const html = await response.text();
    const workspace = visibleProjectSidebar(html);
    const detail = visibleSelectedReadout(html);

    assert.equal(response.status, 200, attributionScope);
    assert.ok(workspace, attributionScope);
    assert.ok(detail, attributionScope);
    assert.match(workspace[0], new RegExp(attributionScope, "i"));
    assert.match(workspace[0], /gpt-5\.6-sol/);
    assert.match(workspace[0], /1,480/);
    assert.match(detail[0], new RegExp(`Observed ${attributionScope} measurements`));
    assert.match(detail[0], /provider-response/);
    assert.match(detail[0], /gpt-5\.6-sol/);
    assert.match(detail[0], /1,480/);
    assert.doesNotMatch(detail[0], /Observed skill-run measurements|Skill-run model|Skill-run total tokens/);

    const standalone = await fetch(new URL(report.relativePath, viewer.url));
    const original = await standalone.text();

    assert.equal(standalone.status, 200, attributionScope);
    assert.match(original, new RegExp(`<meta name="quickstark:${attributionScope}-model" content="gpt-5\\.6-sol">`));
    assert.doesNotMatch(original, /<meta name="quickstark:(?:model|total-tokens|active-duration-ms)"/);
  }
});

test("the Workbench preserves genuinely observed zero tokens and zero active duration", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);

  await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve the genuinely observed zero-value Workbench measurements.",
    generatedAt: "2026-07-26T19:03:00.000Z",
    projectIdentity: verifiedProject("skills"),
    observation: {
      ...workbenchObservedRun,
      tokens: { input: 0, output: 0, total: 0 },
      timing: {
        startedAt: "2026-07-26T19:02:00.000Z",
        finishedAt: "2026-07-26T19:02:00.000Z",
        activeDurationMs: 0,
      },
    },
  }, { directory, layout: "project" });

  const response = await fetch(viewer.url);
  const html = await response.text();
  const workspace = visibleProjectSidebar(html);
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(workspace);
  assert.ok(detail);
  assert.match(workspace[0], /0 tokens/);
  assert.match(workspace[0], /0 ms/);
  assert.match(detail[0], /Skill-run total tokens<\/dt><dd>0<\/dd>/);
  assert.match(detail[0], /Skill-run active duration<\/dt><dd>0 ms<\/dd>/);
});

test("the Workbench and immutable readout agree at the 99- and 100-check evidence boundaries", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);

  for (const [index, [passedChecks, failedChecks]] of [[98, 1], [99, 1]].entries()) {
    const checks = [
      ...Array.from({ length: passedChecks }, (_, check) => ({
        title: `Observed passing Workbench check ${check + 1}`,
        status: "passed",
      })),
      ...Array.from({ length: failedChecks }, (_, check) => ({
        title: `Observed failing Workbench check ${check + 1}`,
        status: "failed",
      })),
    ];
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      status: "Failed",
      completionState: "failed",
      report: "full",
      outcome: `Preserve ${passedChecks + failedChecks} independently observed Workbench checks.`,
      generatedAt: `2026-07-26T19:2${index}:00.000Z`,
      projectIdentity: verifiedProject("skills"),
      checks,
      observation: {
        ...workbenchObservedRun,
        quality: { source: "observed-checks", passedChecks, failedChecks },
      },
    }, { directory, layout: "project" });
    const parameters = new URLSearchParams({
      project: "github.com/quickstark/skills",
      report: report.relativePath,
    });
    const response = await fetch(new URL(`?${parameters}`, viewer.url));
    const html = await response.text();
    const detail = visibleSelectedReadout(html);

    assert.equal(response.status, 200);
    assert.ok(detail);
    assert.match(detail[0], /Observed skill-run measurements/);
    assert.match(detail[0], /gpt-5\.6-sol/);
    assert.match(detail[0], /Independent quality evidence/);
    assert.match(detail[0], new RegExp(`<dt>Passed checks<\\/dt><dd>${passedChecks}<\\/dd>`));
    assert.match(detail[0], new RegExp(`<dt>Failed checks<\\/dt><dd>${failedChecks}<\\/dd>`));

    const standalone = await fetch(new URL(report.relativePath, viewer.url));
    const immutable = await standalone.text();

    assert.equal(standalone.status, 200);
    assert.match(immutable, new RegExp(`<meta name="quickstark:quality-passed-checks" content="${passedChecks}">`));
    assert.match(immutable, new RegExp(`<meta name="quickstark:quality-failed-checks" content="${failedChecks}">`));
  }
});

test("the authorized Project Workbench presents the same immutable observed external report as hosted ingestion", async (context) => {
  const workbench = await createProjectWorkbench(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });
  const accepted = await publishObservedWorkbenchRun(context, workbench);
  const response = await fetch(workbench.viewer.url);
  const html = await response.text();
  const workspace = visibleProjectSidebar(html);
  const detail = visibleSelectedReadout(html);

  assert.equal(response.status, 200);
  assert.ok(workspace);
  assert.ok(detail);
  assert.match(workspace[0], /external-workbench-review/);
  assert.match(workspace[0], /provider-response/);
  assert.match(workspace[0], /gpt-5\.6-sol/);
  assert.match(workspace[0], /1,480/);
  assert.match(detail[0], /Observed independent Workbench review/);
  assert.match(detail[0], /provider-response/);
  assert.match(detail[0], /gpt-5\.6-sol/);
  assert.match(detail[0], /Independent quality evidence/);
  assert.match(detail[0], /observed-checks/);
  assert.doesNotMatch(html, /marketplace|<script\b/i);

  const standalone = await fetch(accepted.url);
  const immutable = await standalone.text();

  assert.equal(standalone.status, 200);
  assert.match(immutable, /<meta name="quickstark:report-id" content="c06a1939-88a0-48e7-9c24-678bb92683e1">/);
  assert.match(immutable, /<meta name="quickstark:model" content="gpt-5\.6-sol">/);
  assert.match(immutable, /<meta name="quickstark:quality-source" content="observed-checks">/);
  assert.ok(html.includes(new URL(accepted.url).pathname.replace(/^\//, "")));
});

test("invalid or fabricated immutable observation metadata never enters the visible project snapshot", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const replacements = [
    [
      "unsafe model",
      '<meta name="quickstark:model" content="gpt-5.6-sol">',
      '<meta name="quickstark:model" content="&lt;script&gt;unsafe&lt;/script&gt;">',
    ],
    [
      "oversized token count",
      '<meta name="quickstark:total-tokens" content="1480">',
      '<meta name="quickstark:total-tokens" content="9007199254740992">',
    ],
    [
      "fabricated check count",
      '<meta name="quickstark:quality-passed-checks" content="1">',
      '<meta name="quickstark:quality-passed-checks" content="2">',
    ],
  ];

  for (const [index, [label, original, replacement]] of replacements.entries()) {
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: `Safely disregard ${label} in a project snapshot.`,
      generatedAt: `2026-07-26T19:1${index}:00.000Z`,
      projectIdentity: verifiedProject("skills"),
      checks: [{ title: "Verified snapshot observation", status: "passed" }],
      observation: {
        ...workbenchObservedRun,
        quality: { source: "observed-checks", passedChecks: 1, failedChecks: 0 },
      },
    }, { directory, layout: "project" });
    const trusted = await readFile(report.path, "utf8");
    const tampered = trusted.replace(original, replacement);

    assert.notEqual(tampered, trusted, label);

    await writeFile(report.path, tampered, "utf8");

    const parameters = new URLSearchParams({
      project: "github.com/quickstark/skills",
      report: report.relativePath,
    });
    const response = await fetch(new URL(`?${parameters}`, viewer.url));
    const html = await response.text();
    const detail = visibleSelectedReadout(html);

    assert.equal(response.status, 200, label);
    assert.ok(detail, label);
    assert.match(detail[0], /Observed run measurements/, label);
    assert.match(detail[0], /Not captured/, label);
    assert.doesNotMatch(detail[0], /gpt-5\.6-sol|9007199254740992|<script\b/i, label);
  }
});

test("an empty Project Workbench explains that no verified projects or actual skill readouts exist", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-empty-workbench-test-"));
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Project Workbench/);
  assert.match(html, /No verified project reports are available\./);
  assert.match(html, /No actual skill readouts are available for this verified project\./);
  assert.match(html, /Select a skill readout/);
  assert.match(html, /0 actual QuickStark reports/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("the Project Workbench deterministically selects the active verified project and its newest actual report", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /aria-current="page"[^>]*data-latest-report="github\.com\/quickstark\/skills\//);
  assert.match(html, />Current project</);
  assert.match(html, />2 actual skill runs</);
  assert.match(html, /aria-current="true"[^>]*href="\?project=github\.com%2Fquickstark%2Fskills&amp;report=/);
  assert.ok(html.includes(reports[0].relativePath));
  assert.match(html, /<h2 class="workbench-detail-title">\/qs-code-build<\/h2>/);
  assert.match(html, /<dt>Verified project<\/dt><dd>quickstark\/skills<\/dd>/);
  assert.match(html, /Deliver the approved single-page Project Workbench\./);
});

test("the selected Workbench outcome appears once and preserves human-readable skill identity", async (context) => {
  const { viewer } = await createProjectWorkbench(context);
  const response = await fetch(viewer.url);
  const html = await response.text();
  const observedOutcome = html.match(
    /<section\b[^>]*aria-label="Observed skill outcome"[^>]*>([\s\S]*?)<\/section>/,
  );

  assert.equal(response.status, 200);
  assert.ok(observedOutcome, "the selected readout exposes one accessible outcome section");
  assert.equal(
    (observedOutcome[1].match(/Deliver the approved single-page Project Workbench\./g) ?? []).length,
    1,
  );
  assert.match(html, /QS Code: Build/);
});

test("a verified project can be selected without mixing another project's readouts", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/marketplace",
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const workspace = visibleProjectSidebar(html);

  assert.equal(response.status, 200);
  assert.ok(workspace);
  assert.match(workspace[0], /quickstark\/marketplace/);
  assert.match(workspace[0], /\/qs-code-build/);
  assert.doesNotMatch(workspace[0], /Deliver the approved single-page Project Workbench\./);
  assert.match(html, /<dt>Verified project<\/dt><dd>quickstark\/marketplace<\/dd>/);
  assert.match(html, /Build the independent marketplace search experience\./);
  assert.ok(html.includes(reports[2].relativePath));

  const immutable = await fetch(new URL(reports[2].relativePath, viewer.url));

  assert.equal(immutable.status, 200);
  assert.match(await immutable.text(), /Build the independent marketplace search experience\./);
});

test("selecting an older skill run restores its exact immutable readout without modifying it", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const original = await readFile(reports[1].path, "utf8");
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    report: reports[1].relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<h2 class="workbench-detail-title">\/qs-plan-research<\/h2>/);
  assert.match(html, /Verify the report library trust boundaries\./);
  assert.ok(html.includes(`href="${reports[1].relativePath}"`));
  assert.match(html, /aria-current="true"[^>]*href="\?project=github\.com%2Fquickstark%2Fskills&amp;report=/);

  const immutable = await fetch(new URL(reports[1].relativePath, viewer.url));

  assert.equal(immutable.status, 200);
  assert.equal(await immutable.text(), original);
  assert.equal(await readFile(reports[1].path, "utf8"), original);
});

test("the Project Workbench never selects a report belonging to another verified project", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/skills",
    report: reports[2].relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<dt>Verified project<\/dt><dd>quickstark\/skills<\/dd>/);
  assert.match(html, /Deliver the approved single-page Project Workbench\./);
  assert.match(html, /<h2 class="workbench-detail-title">\/qs-code-build<\/h2>/);
});

test("catalog previews remain excluded from actual Workbench runs until explicitly requested", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const ordinary = await fetch(viewer.url);
  const ordinaryHtml = await ordinary.text();

  assert.equal(ordinary.status, 200);
  assert.match(ordinaryHtml, />2 actual skill runs</);
  assert.doesNotMatch(ordinaryHtml, /Catalog preview only; no actual prototype skill ran\./);

  const preview = await fetch(new URL(`?${new URLSearchParams({
    project: "github.com/quickstark/skills",
    previews: "1",
  })}`, viewer.url));
  const previewHtml = await preview.text();

  assert.equal(preview.status, 200);
  assert.match(previewHtml, /Catalog preview only; no actual prototype skill ran\./);
  assert.match(previewHtml, /workbench-status-preview/);
  assert.match(previewHtml, />2 actual skill runs</);
  assert.ok(previewHtml.includes(reports[3].relativePath));
});

test("the hosted Project Workbench exposes only explicitly authorized verified projects", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Project Workbench/);
  assert.match(html, /quickstark\/skills/);
  assert.doesNotMatch(html, /marketplace/i);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.doesNotMatch(html, /<script\b/i);

  const denied = await fetch(new URL(reports[2].relativePath, viewer.url));

  assert.equal(denied.status, 404);
  assert.doesNotMatch(await denied.text(), /marketplace/i);

  const guessed = await fetch(new URL(`?${new URLSearchParams({
    project: "github.com/quickstark/marketplace",
    report: reports[2].relativePath,
  })}`, viewer.url));

  assert.equal(guessed.status, 200);
  assert.doesNotMatch(await guessed.text(), /marketplace/i);
});

test("unverified legacy reports stay labeled and directly readable without fabricated project ownership", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const filename = "qs-plan-research--2026-07-23T09-00-00-000Z--abcdef12.html";
  const original = renderSkillReadout({
    skill: "qs-plan-research",
    project: "An unverified private project heading",
    generatedAt: "2026-07-23T09:00:00.000Z",
    outcome: "Preserve the original unassigned legacy report.",
  });

  await writeFile(join(directory, filename), original, "utf8");

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Unassigned legacy reports/);
  assert.match(html, /Project identity not verified/);
  assert.match(html, /Preserve the original unassigned legacy report\./);
  assert.doesNotMatch(html, /An unverified private project heading/);

  const direct = await fetch(new URL(filename, viewer.url));

  assert.equal(direct.status, 200);
  assert.equal(await direct.text(), original);
  assert.equal(await readFile(join(directory, filename), "utf8"), original);
});

test("Workbench report content is escaped and never relaxes the read-only security boundary", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);

  await writeSkillReadout({
    skill: "qs-review-code",
    outcome: '<script>alert("unsafe report content")</script>',
    generatedAt: "2026-07-26T19:00:00.000Z",
    projectIdentity: verifiedProject("skills"),
  }, { directory, layout: "project" });

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.doesNotMatch(html, /<script\b/i);

  const write = await fetch(viewer.url, { method: "POST" });

  assert.equal(write.status, 405);
});
