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

test("the Project Workbench displays the verified model, effort, tokens, duration, and quality of its selected skill run", async (context) => {
  const { directory, viewer } = await createProjectWorkbench(context);
  const observed = await writeSkillReadout({
    skill: "qs-code-build",
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
  const workspace = html.match(/<section class="workbench-workspace"[\s\S]*?<\/section><aside class="workbench-detail"/);
  const detail = html.match(/<aside class="workbench-detail"[\s\S]*?<\/aside>/);

  assert.equal(response.status, 200);
  assert.ok(workspace, "the verified project exposes one recorded skill-run list");
  assert.ok(detail, "the verified project exposes one selected immutable readout");
  assert.ok(html.includes(observed.relativePath));
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
  const workspace = html.match(/<section class="workbench-workspace"[\s\S]*?<\/section><aside class="workbench-detail"/);
  const detail = html.match(/<aside class="workbench-detail"[\s\S]*?<\/aside>/);

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
    const workspace = html.match(/<section class="workbench-workspace"[\s\S]*?<\/section><aside class="workbench-detail"/);
    const detail = html.match(/<aside class="workbench-detail"[\s\S]*?<\/aside>/);

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
  const workspace = html.match(/<section class="workbench-workspace"[\s\S]*?<\/section><aside class="workbench-detail"/);
  const detail = html.match(/<aside class="workbench-detail"[\s\S]*?<\/aside>/);

  assert.equal(response.status, 200);
  assert.ok(workspace);
  assert.ok(detail);
  assert.match(workspace[0], /0 tokens/);
  assert.match(workspace[0], /0 ms/);
  assert.match(detail[0], /Skill-run total tokens<\/dt><dd>0<\/dd>/);
  assert.match(detail[0], /Skill-run active duration<\/dt><dd>0 ms<\/dd>/);
});

test("the authorized Project Workbench presents the same immutable observed external report as hosted ingestion", async (context) => {
  const workbench = await createProjectWorkbench(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });
  const accepted = await publishObservedWorkbenchRun(context, workbench);
  const response = await fetch(workbench.viewer.url);
  const html = await response.text();
  const workspace = html.match(/<section class="workbench-workspace"[\s\S]*?<\/section><aside class="workbench-detail"/);
  const detail = html.match(/<aside class="workbench-detail"[\s\S]*?<\/aside>/);

  assert.equal(response.status, 200);
  assert.ok(workspace);
  assert.ok(detail);
  assert.match(workspace[0], /external-workbench-review/);
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
    const detail = html.match(/<aside class="workbench-detail"[\s\S]*?<\/aside>/);

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

  assert.equal(response.status, 200);
  assert.equal((html.match(/Deliver the approved single-page Project Workbench\./g) ?? []).length, 1);
  assert.match(html, /QS Code: Build/);
});

test("a verified project can be selected without mixing another project's readouts", async (context) => {
  const { viewer, reports } = await createProjectWorkbench(context);
  const parameters = new URLSearchParams({
    project: "github.com/quickstark/marketplace",
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const workspace = html.match(/<section class="workbench-workspace"[\s\S]*?<\/section><aside class="workbench-detail"/);

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
