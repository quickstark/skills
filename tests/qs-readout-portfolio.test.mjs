import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chromium } from "playwright-core";

import {
  buildReadoutPortfolioSnapshot,
  readReadoutPortfolioInventory,
  renderReadoutPortfolio,
} from "../scripts/qs-readout-portfolio.mjs";
import {
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";

const capturedAt = "2026-07-27T21:00:00.000Z";

function projectIdentity(repository, owner = "quickstark") {
  return {
    host: "github.com",
    owner,
    repository,
    key: `github.com/${owner}/${repository}`,
    label: `${owner}/${repository}`,
    source: "explicit",
  };
}

function inventory(overrides = {}) {
  return {
    version: 1,
    generatedAt: capturedAt,
    owners: ["quickstark", "quickstarkdemo"],
    github: { status: "observed", total: 56 },
    local: { status: "observed", total: 9 },
    sessions: { status: "observed", uniqueTotal: 81 },
    projects: [
      {
        ...projectIdentity("skills"),
        source: "github",
        locallyPresent: true,
        github: {
          visibility: "public",
          defaultBranch: "main",
          pushedAt: "2026-07-27T17:03:05.000Z",
          openIssues: 22,
          openPullRequests: 0,
        },
        sessions: 11,
      },
      {
        ...projectIdentity("marketplace"),
        source: "github",
        locallyPresent: true,
        github: {
          visibility: "private",
          defaultBranch: "main",
          pushedAt: "2026-07-27T19:54:43.000Z",
          openIssues: 21,
          openPullRequests: 1,
        },
        sessions: 17,
      },
      {
        ...projectIdentity("blossy", "quickstarkdemo"),
        source: "github",
        locallyPresent: true,
        github: {
          visibility: "private",
          defaultBranch: "main",
          pushedAt: "2026-07-18T14:00:00.000Z",
          openIssues: 1,
          openPullRequests: 0,
        },
        sessions: 2,
      },
      {
        ...projectIdentity("private-client", "separate-organization"),
        source: "local",
        locallyPresent: true,
        github: null,
        sessions: 1,
      },
    ],
    ...overrides,
  };
}

async function createPortfolio(context, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-portfolio-test-"));
  const artifacts = [];

  for (const entry of [
    {
      skill: "qs-code-build",
      outcome: "Delivered a verified Skills reporting module.",
      generatedAt: "2026-07-27T18:00:00.000Z",
      projectIdentity: projectIdentity("skills"),
    },
    {
      skill: "qs-plan-explore",
      status: "Awaiting input",
      outcome: "Verified the owner-scoped Marketplace Product Research architecture.",
      generatedAt: "2026-07-27T20:49:58.000Z",
      projectIdentity: projectIdentity("marketplace"),
    },
    {
      skill: "qs-design-prototype",
      status: "Preview",
      skillsUsed: [],
      outcome: "Catalog preview only; no actual prototype skill ran.",
      generatedAt: "2026-07-27T20:50:00.000Z",
      projectIdentity: projectIdentity("skills"),
    },
  ]) {
    artifacts.push(await writeSkillReadout(entry, { directory, layout: "project" }));
  }

  if (options.inventory !== null) {
    const parent = join(directory, ".quickstark-portfolio");
    await mkdir(parent, { recursive: true });
    await writeFile(
      join(parent, "inventory-v1.json"),
      JSON.stringify(options.inventory ?? inventory()),
      { encoding: "utf8", mode: 0o600 },
    );
  }

  const viewer = await startReadoutServer({
    directory,
    port: 0,
    homepage: "portfolio",
    currentProject: "github.com/quickstark/skills",
    ...(options.viewer ?? {}),
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }
    await rm(directory, { recursive: true, force: true });
  });

  return { directory, viewer, artifacts };
}

test("the deep portfolio snapshot merges actual report projects with verified inventory", () => {
  const snapshot = buildReadoutPortfolioSnapshot({
    reports: [
      {
        projectKey: "github.com/quickstark/skills",
        projectLabel: "quickstark/skills",
        status: "Completed",
        generatedAt: "2026-07-27T18:00:00.000Z",
        skill: { name: "qs-code-build", displayName: "QS Code: Build" },
        outcome: "A verified implementation.",
        relativePath: "github.com/quickstark/skills/2026/07/build.html",
      },
      {
        projectKey: "github.com/quickstark/skills",
        projectLabel: "quickstark/skills",
        status: "Preview",
        generatedAt: "2026-07-27T20:00:00.000Z",
        skill: { name: "qs-design-prototype", displayName: "QS Design: Prototype" },
        outcome: "Not an actual run.",
        relativePath: "preview.html",
      },
    ],
    inventory: inventory(),
    allowedProjects: null,
    now: capturedAt,
  });

  assert.equal(snapshot.github.total, 56);
  assert.equal(snapshot.local.total, 9);
  assert.equal(snapshot.sessions.uniqueTotal, 81);
  assert.equal(snapshot.actualReadouts, 1);
  assert.equal(snapshot.previewCount, 1);
  assert.equal(snapshot.projects.find((project) => project.key === "github.com/quickstark/skills").reports.length, 1);
  assert.equal(snapshot.projects.find((project) => project.key === "github.com/quickstark/marketplace").sessions, 17);
});

test("the portfolio never publishes a mixed-owner local repository as an approved project", () => {
  const snapshot = buildReadoutPortfolioSnapshot({
    reports: [],
    inventory: inventory(),
    allowedProjects: new Set(["github.com/quickstark/*", "github.com/quickstarkdemo/*"]),
    now: capturedAt,
  });

  assert.ok(snapshot.projects.some((project) => project.label === "quickstark/marketplace"));
  assert.ok(snapshot.projects.some((project) => project.label === "quickstarkdemo/blossy"));
  assert.equal(snapshot.projects.some((project) => project.label === "separate-organization/private-client"), false);
});

test("missing Marketplace readouts stay distinct from observed local sessions", () => {
  const snapshot = buildReadoutPortfolioSnapshot({
    reports: [],
    inventory: inventory(),
    allowedProjects: new Set(["github.com/quickstark/*"]),
    now: capturedAt,
  });
  const marketplace = snapshot.projects.find((project) => project.label === "quickstark/marketplace");

  assert.equal(marketplace.sessions, 17);
  assert.equal(marketplace.reports.length, 0);
  assert.equal(marketplace.reportingState, "No report received");
  assert.equal(snapshot.actualReadouts, 0);
});

test("missing GitHub and model measurements remain Not captured", () => {
  const snapshot = buildReadoutPortfolioSnapshot({
    reports: [],
    inventory: {
      version: 1,
      generatedAt: capturedAt,
      owners: [],
      github: { status: "not-captured", total: null },
      local: { status: "not-captured", total: null },
      sessions: { status: "not-captured", uniqueTotal: null },
      projects: [],
    },
    allowedProjects: null,
    now: capturedAt,
  });
  const html = renderReadoutPortfolio(snapshot, { query: "", activeProject: null });

  assert.equal(snapshot.github.total, null);
  assert.equal(snapshot.sessions.uniqueTotal, null);
  assert.match(html, /Not captured/);
  assert.doesNotMatch(html, /\b\$\d|estimated cost|telemetry connected/i);
});

test("a large portfolio keeps C's cross-project activity visible after eight verified project rows", () => {
  const observedProjects = Array.from({ length: 12 }, (_, index) => ({
    ...projectIdentity(`repository-${String(index).padStart(2, "0")}`),
    source: "github",
    locallyPresent: false,
    github: {
      visibility: "private",
      defaultBranch: "main",
      pushedAt: capturedAt,
      openIssues: 0,
      openPullRequests: 0,
    },
    sessions: 0,
  }));
  const snapshot = buildReadoutPortfolioSnapshot({
    reports: [],
    inventory: inventory({
      github: { status: "observed", total: observedProjects.length },
      projects: observedProjects,
    }),
    allowedProjects: null,
    now: capturedAt,
  });
  const html = renderReadoutPortfolio(snapshot, { activeProject: null });

  assert.equal((html.match(/class="portfolio-project-link"/g) ?? []).length, 8);
  assert.match(html, /Showing 8 of 12 observed projects/);
  assert.match(html, /Recent cross-project activity/);
  assert.match(html, /Verified GitHub push/);
});

test("the production portfolio homepage combines A with C's truthful cross-project activity", async (context) => {
  const { viewer } = await createPortfolio(context);
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Portfolio overview/);
  assert.match(html, /Portfolio overview/);
  assert.match(html, /56/);
  assert.match(html, /9/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /quickstarkdemo\/blossy/);
  assert.match(html, /Verified project portfolio/);
  assert.match(html, /Recent cross-project activity/);
  assert.match(html, /owner-scoped Marketplace Product Research architecture/);
  assert.match(html, /Machine-local Codex sessions/);
  assert.doesNotMatch(html, /Catalog preview only; no actual prototype skill ran/);
  assert.doesNotMatch(html, /separate-organization\/private-client/);
  assert.doesNotMatch(html, /<script\b|<iframe\b/i);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
});

test("selecting a portfolio project preserves the approved existing Project Workbench", async (context) => {
  const { viewer, artifacts } = await createPortfolio(context);
  const url = new URL(viewer.url);
  url.searchParams.set("project", "github.com/quickstark/marketplace");
  const response = await fetch(url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Project Workbench/);
  assert.match(html, /aria-label="Verified projects"/);
  assert.match(html, /aria-label="Selected skill readout"/);
  assert.match(html, /Verified the owner-scoped Marketplace Product Research architecture/);
  assert.ok(html.includes(artifacts[1].relativePath));
  assert.doesNotMatch(html, /Catalog preview only/);
});

test("explicit workbench links remain available from the portfolio root", async (context) => {
  const { viewer } = await createPortfolio(context);
  const url = new URL(viewer.url);
  url.searchParams.set("view", "workbench");
  const response = await fetch(url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Project Workbench/);
  assert.match(html, /aria-label="Selected skill readout"/);
});

test("portfolio project search retains real URL state without rewriting immutable reports", async (context) => {
  const { viewer, artifacts } = await createPortfolio(context);
  const original = await readFile(artifacts[1].path, "utf8");
  const url = new URL(viewer.url);
  url.searchParams.set("q", "marketplace");
  const response = await fetch(url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Portfolio overview/);
  assert.match(html, /quickstark\/marketplace/);
  assert.doesNotMatch(html, /quickstarkdemo\/blossy/);
  assert.equal(await readFile(artifacts[1].path, "utf8"), original);
});

test("a missing inventory preserves actual reports without inventing repository totals", async (context) => {
  const { viewer } = await createPortfolio(context, { inventory: null });
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /Not captured/);
  assert.doesNotMatch(html, /56 repositories/);
});

test("a corrupt portfolio inventory fails closed without exposing unverified projects", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-corrupt-portfolio-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, ".quickstark-portfolio"));
  await writeFile(join(directory, ".quickstark-portfolio", "inventory-v1.json"), "not JSON", "utf8");

  const observed = await readReadoutPortfolioInventory(directory);
  assert.equal(observed.github.total, null);
  assert.equal(observed.sessions.uniqueTotal, null);
  assert.deepEqual(observed.projects, []);
});

test("a hosted portfolio honors project authorization for discovered repositories and readouts", async (context) => {
  const { viewer } = await createPortfolio(context, {
    viewer: {
      publicationMode: "hosted",
      allowedProjects: ["github.com/quickstark/skills"],
      currentProject: "github.com/quickstark/skills",
    },
  });
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /quickstark\/skills/);
  assert.doesNotMatch(html, /quickstark\/marketplace/);
  assert.doesNotMatch(html, /quickstarkdemo\/blossy/);
  assert.doesNotMatch(html, /owner-scoped Marketplace Product Research/);
});

test("actual Chromium renders the accepted portfolio at desktop and mobile sizes", async (context) => {
  const { viewer } = await createPortfolio(context);
  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });

  await page.goto(viewer.url, { waitUntil: "load" });
  assert.equal(await page.getByRole("heading", { name: "Portfolio overview" }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Recent cross-project activity" }).count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.ok(await page.getByRole("link", { name: /quickstark\/marketplace/i }).count());

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.getByRole("heading", { name: "Portfolio overview" }).count(), 1);
});
