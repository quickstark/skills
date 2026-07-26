import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  renderSkillReadout,
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";

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
