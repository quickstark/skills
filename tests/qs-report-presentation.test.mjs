import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chromium } from "playwright-core";

import {
  normalizeSkillReadout,
  renderSkillReadout,
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";
import {
  READOUT_PROFILES_BY_NAME,
  SKILLS,
} from "../scripts/qs-skill-catalog.mjs";
import {
  observeGitHubProject,
  renderReadoutGitHubIssues,
  renderReadoutProjectMetadata,
  renderReadoutSignalSummary,
} from "../scripts/qs-skill-report-presentation.mjs";

const quickStarkProject = Object.freeze({
  host: "github.com",
  owner: "quickstark",
  repository: "skills",
  key: "github.com/quickstark/skills",
  label: "quickstark/skills",
  source: "explicit",
});

async function productionWorkbench(context) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-presentation-tdd-"));
  const viewer = await startReadoutServer({
    directory,
    port: 0,
    currentProject: quickStarkProject.key,
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  return { directory, viewer };
}

function verifiedGithubFixture({ total = 22, sampleSize = 8 } = {}) {
  const requested = [];
  const issues = Array.from({ length: sampleSize }, (_, index) => ({
    number: index + 1,
    title: `Verified open report issue ${index + 1}`,
    state: "open",
    html_url: `https://github.com/quickstark/skills/issues/${index + 1}`,
    labels: [{ name: "reporting" }],
  }));
  const fetcher = async (url) => {
    requested.push(url);

    const payload = url.includes("/search/issues?")
      ? { total_count: total, incomplete_results: false, items: issues.slice(0, 1) }
      : url.endsWith("/issues?state=open&per_page=8")
        ? issues
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };

  return { fetcher, issues, requested, total };
}

test("the five-second report summary features a recorded P0 before an earlier P1 finding", () => {
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Diagnosed multiple independently recorded production regressions.",
    findings: [
      {
        title: "An earlier high-priority layout regression",
        detail: "A recorded P1 finding must not conceal a later P0 finding.",
        priority: "P1",
      },
      {
        title: "The production report exposes a critical authorization failure",
        detail: "The observed P0 is the most important exception to surface first.",
        priority: "P0",
      },
    ],
  });
  const featured = html.match(
    /<article class="presentation-featured-signal">([\s\S]*?)<\/article>/,
  );

  assert.ok(featured, "the selected B report includes its featured exception");
  assert.match(featured[1], />P0</);
  assert.match(featured[1], /critical authorization failure/);
  assert.doesNotMatch(featured[1], /earlier high-priority layout regression/);
});

test("verified GitHub context never reports closed, cross-project, or pull-request records as open issues", async () => {
  const project = {
    host: "github.com",
    owner: "quickstark",
    repository: "skills",
  };
  const fetcher = async (url) => new Response(JSON.stringify(
    url.endsWith("/issues?state=open&per_page=8")
      ? [
        {
          number: 21,
          title: "Verify the open reporting regression",
          state: "open",
          html_url: "https://github.com/quickstark/skills/issues/21",
          labels: [{ name: "ready-for-agent" }],
        },
        {
          number: 44,
          title: "A closed issue must not reappear",
          state: "closed",
          html_url: "https://github.com/quickstark/skills/issues/44",
          labels: [],
        },
        {
          number: 52,
          title: "A pull request is not an open issue",
          state: "open",
          html_url: "https://github.com/quickstark/skills/issues/52",
          pull_request: { url: "https://api.github.com/repos/quickstark/skills/pulls/52" },
          labels: [],
        },
        {
          number: 99,
          title: "Another repository cannot supply project context",
          state: "open",
          html_url: "https://github.com/quickstark/other/issues/99",
          labels: [],
        },
      ]
      : {
        full_name: "quickstark/skills",
        html_url: "https://github.com/quickstark/skills",
        default_branch: "main",
        visibility: "public",
      },
  ), { headers: { "Content-Type": "application/json" } });

  const github = await observeGitHubProject(project, { fetcher });

  assert.equal(github.fullName, "quickstark/skills");
  assert.deepEqual(github.issues.map((issue) => issue.number), [21]);
  assert.deepEqual(github.issues[0].labels, ["ready-for-agent"]);
});

test("GitHub reports its independently verified issue total separately from a limited issue sample", async () => {
  const requested = [];
  const firstPage = Array.from({ length: 8 }, (_, index) => ({
    number: index + 1,
    title: `Verified open report issue ${index + 1}`,
    state: "open",
    html_url: `https://github.com/quickstark/skills/issues/${index + 1}`,
    labels: [],
  }));
  const fetcher = async (url) => {
    requested.push(url);

    const payload = url.includes("/search/issues?")
      ? {
        total_count: 22,
        incomplete_results: false,
        items: [firstPage[0]],
      }
      : url.endsWith("/issues?state=open&per_page=8")
        ? firstPage
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };

  const github = await observeGitHubProject(quickStarkProject, { fetcher });

  assert.equal(github.fullName, "quickstark/skills");
  assert.equal(github.openIssueCount, 22);
  assert.equal(github.issues.length, 8);
  assert.ok(
    requested.some((url) => {
      const parsed = new URL(url);

      return parsed.pathname === "/search/issues"
        && parsed.searchParams.get("q") === "repo:quickstark/skills is:issue is:open";
    }),
    "the full issue-only total comes from an independently verified GitHub search",
  );
});

test("GitHub rejects issues whose open state was not independently observed", async () => {
  const fetcher = async (url) => {
    const payload = url.includes("/search/issues?")
      ? { total_count: 1, incomplete_results: false, items: [] }
      : url.endsWith("/issues?state=open&per_page=8")
        ? [
          {
            number: 71,
            title: "Missing issue state must fail closed",
            html_url: "https://github.com/quickstark/skills/issues/71",
            labels: [],
          },
          {
            number: 72,
            title: "Null issue state must fail closed",
            state: null,
            html_url: "https://github.com/quickstark/skills/issues/72",
            labels: [],
          },
          {
            number: 73,
            title: "Only a verified open issue is displayed",
            state: "open",
            html_url: "https://github.com/quickstark/skills/issues/73",
            labels: [],
          },
        ]
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };

  const github = await observeGitHubProject(quickStarkProject, { fetcher });

  assert.deepEqual(github.issues.map((issue) => issue.number), [73]);
  assert.equal(github.openIssueCount, 1);
});

test("the five-second summary displays the verified issue total instead of the sidebar sample", () => {
  const report = normalizeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Preserve the independently verified GitHub issue count.",
    projectIdentity: quickStarkProject,
  });
  const github = {
    fullName: "quickstark/skills",
    url: "https://github.com/quickstark/skills",
    defaultBranch: "main",
    visibility: "public",
    openIssueCount: 22,
    issues: Array.from({ length: 8 }, (_, index) => ({
      number: index + 1,
      title: `Verified open issue ${index + 1}`,
      url: `https://github.com/quickstark/skills/issues/${index + 1}`,
      labels: [],
    })),
  };
  const summary = renderReadoutSignalSummary(
    report,
    READOUT_PROFILES_BY_NAME[report.skill.name],
    { github },
  );

  assert.match(
    summary,
    /<span>OPEN ISSUES<\/span><strong>22<\/strong><small>Verified GitHub issues<\/small>/,
  );
  assert.doesNotMatch(summary, /<span>OPEN ISSUES<\/span><strong>8<\/strong>/);
});

test("locally observed branches and unpublished commits never become GitHub artifact links", () => {
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Keep unpublished local Git observations separate from verified GitHub delivery.",
    projectIdentity: quickStarkProject,
  });
  const metadata = renderReadoutProjectMetadata({
    ...report,
    gitContext: {
      branch: "local-unpublished-report-fix",
      revision: "8146b2ac285d5ba0abb2bbc3db669f31582e0a65",
      ahead: 1,
      behind: 0,
      dirtyCount: 2,
    },
  }, {
    github: {
      fullName: "quickstark/skills",
      url: "https://github.com/quickstark/skills",
      defaultBranch: "main",
      visibility: "public",
      openIssueCount: 22,
      issues: [],
    },
  });

  assert.match(metadata, /local-unpublished-report-fix/);
  assert.match(metadata, /8146b2ac/);
  assert.match(metadata, /Observed local Git/);
  assert.match(metadata, /href="https:\/\/github\.com\/quickstark\/skills"/);
  assert.doesNotMatch(metadata, /github\.com\/quickstark\/skills\/(?:tree|commit)\//);
});

test("independently published matching GitHub commits retain their verified artifact links", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Retain the exact verified published delivery commit.",
    projectIdentity: quickStarkProject,
    provenance: {
      commit: {
        sha,
        published: true,
        url: `https://github.com/quickstark/skills/commit/${sha}`,
      },
    },
  });
  const metadata = renderReadoutProjectMetadata(report, {
    github: {
      fullName: "quickstark/skills",
      url: "https://github.com/quickstark/skills",
      defaultBranch: "main",
      visibility: "public",
    },
  });

  assert.match(metadata, new RegExp(`href="https://github\\.com/quickstark/skills/commit/${sha}"`));
  assert.match(metadata, /Verified delivery evidence/);
  assert.doesNotMatch(metadata, /github\.com\/quickstark\/skills\/tree\//);
});

test("an incomplete GitHub issue search never promotes a sidebar sample into a verified total", async () => {
  const issues = [{
    number: 21,
    title: "An independently verified open report issue",
    state: "open",
    html_url: "https://github.com/quickstark/skills/issues/21",
    labels: [],
  }];
  const fetcher = async (url) => {
    const payload = url.includes("/search/issues?")
      ? { total_count: 22, incomplete_results: true, items: issues }
      : url.endsWith("/issues?state=open&per_page=8")
        ? issues
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };
  const github = await observeGitHubProject(quickStarkProject, { fetcher });
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Keep an incomplete GitHub issue count explicitly unverified.",
    projectIdentity: quickStarkProject,
  });
  const summary = renderReadoutSignalSummary(
    report,
    READOUT_PROFILES_BY_NAME[report.skill.name],
    { github },
  );
  const sidebar = renderReadoutGitHubIssues(github);

  assert.equal(github.openIssueCount, null);
  assert.deepEqual(github.issues.map((issue) => issue.number), [21]);
  assert.match(summary, /<span>OPEN ISSUES<\/span><strong>—<\/strong><small>Not independently verified<\/small>/);
  assert.match(sidebar, /Showing 1 verified open issue; total not independently verified/);
  assert.match(sidebar, /An independently verified open report issue/);
  assert.doesNotMatch(sidebar, /<span class="section-count">(?:1|22)<\/span>/);
});

test("immutable reports preserve the verified issue total and the separately verified sidebar sample", async (context) => {
  const { directory } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Record the full GitHub issue total without confusing it with sidebar samples.",
    generatedAt: "2026-07-27T16:00:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const html = await readFile(report.path, "utf8");
  const captured = [...html.matchAll(/<meta name="quickstark:github-issue" content="([^"]*)">/g)];

  assert.equal(github.requested.length, 3, "only the three independently verified GitHub endpoints are requested");
  assert.match(html, /<meta name="quickstark:github-open-issues" content="22">/);
  assert.match(html, /<meta name="quickstark:github-open-issues-source" content="github-issue-search">/);
  assert.doesNotMatch(html, /<meta name="quickstark:github-open-issues" content="8">/);
  assert.equal(captured.length, 8, "the independently verified first-page sample is recorded separately");
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>22<\/strong>/);
  assert.match(html, /Showing 3 of 22 verified open issues/);
});

test("the full-height Workbench places verified relevant GitHub issues in a separate sidebar", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Display independently verified issue context outside the selected report.",
    generatedAt: "2026-07-27T16:05:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    findings: [{ title: "The sidebar preserves the actual 22-issue total.", priority: "P2" }],
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const reportStart = html.indexOf('aria-label="Selected skill readout"');
  const sidebarStart = html.indexOf('aria-label="Relevant open GitHub issues"');

  assert.equal(response.status, 200);
  assert.notEqual(reportStart, -1, "the selected immutable report remains in its reading pane");
  assert.ok(sidebarStart > reportStart, "the issue sidebar is a separate sibling after the report pane");
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>22<\/strong>/);
  assert.match(html.slice(sidebarStart), /Showing 3 of 22 verified open issues/);
  assert.match(html.slice(sidebarStart), /Verified open report issue 1/);
  assert.doesNotMatch(html.slice(reportStart, sidebarStart), /<h2>Relevant open issues<\/h2>/);
  assert.doesNotMatch(html, /github\.com\/quickstark\/skills\/(?:tree|commit)\//);
});

test("stored issue sidebars reject cross-repository immutable metadata without discarding the verified total", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Reject a GitHub issue whose immutable evidence belongs to another repository.",
    generatedAt: "2026-07-27T16:07:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const unsafeIssue = JSON.stringify({
    number: 1,
    title: "A cross-repository issue must not enter the sidebar",
    url: "https://github.com/quickstark/another-repository/issues/1",
    labels: ["reporting"],
  }).replaceAll('"', "&quot;");
  const tampered = original.replace(
    /<meta name="quickstark:github-issue" content="[^"]*">/,
    `<meta name="quickstark:github-issue" content="${unsafeIssue}">`,
  );

  assert.notEqual(tampered, original, "the security fixture replaces actual captured GitHub issue metadata");

  await writeFile(report.path, tampered);

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>22<\/strong>/);
  assert.doesNotMatch(html, /aria-label="Relevant open GitHub issues"/);
  assert.doesNotMatch(html, /A cross-repository issue must not enter the sidebar/);
  assert.match(html, /aria-label="Complete immutable skill readout"/);
  assert.equal(await readFile(report.path, "utf8"), tampered, "reading the project library never overwrites stored report bytes");
});

test("legacy first-page issue counts are not reclassified as independently verified totals", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve historical report bytes without repeating an unverified first-page issue count.",
    generatedAt: "2026-07-27T16:08:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const historical = original
    .replace(
      '<meta name="quickstark:github-open-issues" content="22">',
      '<meta name="quickstark:github-open-issues" content="8">',
    )
    .replace(/\s*<meta name="quickstark:github-open-issues-source" content="github-issue-search">/, "")
    .replace(/\s*<meta name="quickstark:github-issue" content="[^"]*">/g, "");

  assert.notEqual(historical, original);

  await writeFile(report.path, historical);

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>—<\/strong><small>Not independently verified<\/small>/);
  assert.doesNotMatch(html, /<span>OPEN ISSUES<\/span><strong>8<\/strong>/);
  assert.equal(await readFile(report.path, "utf8"), historical, "a legacy report is never rewritten to repair historical evidence");
});

test("actual Chromium renders the GitHub issue rail outside the full-height report pane", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Verify the report and issue sidebar in the actual production browser.",
    generatedAt: "2026-07-27T16:10:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    findings: [{
      title: "The independently verified issue rail remains a separate sidebar.",
      detail: "The selected immutable report remains visible beside verified GitHub issue context.",
      priority: "P2",
    }],
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({
    viewport: { width: 1734, height: 1100 },
  });
  const response = await page.goto(new URL(`?${parameters}`, viewer.url).href);
  const selected = page.getByRole("complementary", { name: "Selected skill readout" });
  const sidebar = page.getByRole("complementary", { name: "Relevant open GitHub issues" });

  assert.equal(response.status(), 200);
  assert.equal(await selected.count(), 1);
  assert.equal(await sidebar.count(), 1);
  assert.equal(await selected.getByRole("heading", { name: "Relevant open issues" }).count(), 0);
  assert.equal(await sidebar.getByRole("heading", { name: "Relevant open issues" }).count(), 1);
  assert.equal(await sidebar.getByText("Showing 3 of 22 verified open issues", { exact: true }).count(), 1);
  assert.equal(await sidebar.getByRole("link", { name: /Verified open report issue/ }).count(), 3);

  const desktopLayout = await page.evaluate(() => {
    const detail = document.querySelector('[aria-label="Selected skill readout"]').getBoundingClientRect();
    const issues = document.querySelector('[aria-label="Relevant open GitHub issues"]').getBoundingClientRect();
    const shell = document.querySelector(".workbench-shell");

    return {
      detailRight: detail.right,
      issueLeft: issues.left,
      shellOverflows: shell.scrollWidth > shell.clientWidth,
      viewportHeight: document.querySelector(".workbench-page").getBoundingClientRect().height,
    };
  });

  assert.ok(desktopLayout.issueLeft >= desktopLayout.detailRight - 1, "the GitHub rail is visibly beside the selected report");
  assert.equal(desktopLayout.shellOverflows, false, "the separate sidebar does not introduce horizontal overflow");
  assert.equal(desktopLayout.viewportHeight, 1100, "the production Workbench fills the actual viewport");

  await page.setViewportSize({ width: 600, height: 1000 });

  const mobileLayout = await page.evaluate(() => {
    const detail = document.querySelector('[aria-label="Selected skill readout"]').getBoundingClientRect();
    const issues = document.querySelector('[aria-label="Relevant open GitHub issues"]').getBoundingClientRect();

    return {
      detailBottom: detail.bottom,
      issueTop: issues.top,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });

  assert.ok(mobileLayout.issueTop >= mobileLayout.detailBottom - 1, "the issue rail moves below the report on narrow screens");
  assert.equal(mobileLayout.horizontalOverflow, false, "the mobile Workbench stays inside the actual viewport");
  assert.equal(await readFile(report.path, "utf8"), original, "browser navigation never rewrites the immutable report");
});

test("GitHub verification rejects unsafe repository identities before making an external request", async () => {
  for (const project of [
    { host: "github.com", owner: "../quickstark", repository: "skills" },
    { host: "github.com", owner: "quickstark%2Fother", repository: "skills" },
    { host: "github.com", owner: "quickstark", repository: "skills/../private" },
    { host: "github.com", owner: "quickstark", repository: "skills?token=private" },
    { host: "github.com", owner: "quickstark", repository: ".." },
    { host: "github.com.evil.example", owner: "quickstark", repository: "skills" },
  ]) {
    const requested = [];
    const fetcher = async (url) => {
      requested.push(url);
      return new Response(JSON.stringify({
        full_name: "quickstark/skills",
        html_url: "https://github.com/quickstark/skills",
      }), { headers: { "Content-Type": "application/json" } });
    };

    assert.equal(
      await observeGitHubProject(project, { fetcher }),
      null,
      `${project.owner}/${project.repository} must not become verified`,
    );
    assert.deepEqual(
      requested,
      [],
      `${project.owner}/${project.repository} must not trigger an external request`,
    );
  }
});

test("production B renders actual 13 px featured details, 12 px native prompts, and aligned responsive cards", async (context) => {
  const featuredDetail = "The full-height report keeps its recorded observation independently readable.";
  const nextSkills = [
    {
      name: "qs-test-tdd",
      reason: "Protect the confirmed production failure with a regression test.",
      prompt: "Use $qs-test-tdd to protect the confirmed full-height report regression.",
    },
    {
      name: "qs-review-code",
      reason: "Independently review the recorded report, sidebar, issue ownership, immutable history, verified issue totals, publication boundaries, and responsive presentation before treating the implementation as complete.",
      prompt: "Use $qs-review-code to independently inspect the full-height report, verified GitHub issue total, responsive presentation, complete native prompts, preserved immutable historical reports, and unlinked local Git artifacts.",
    },
    {
      name: "qs-design-architecture",
      reason: "Inspect the confirmed architectural boundary.",
      prompt: "Use /qs-design-architecture to inspect the verified production boundary.",
    },
  ];
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({
    viewport: { width: 1734, height: 1100 },
  });

  await page.setContent(renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Verify the approved B layout in an actual Chromium browser.",
    findings: [{
      title: "A recorded production observation",
      detail: featuredDetail,
      priority: "P2",
    }],
    nextSkills,
  }), { waitUntil: "load" });

  assert.equal(
    await page.getByRole("group", { name: "Five-second report summary" })
      .getByText(featuredDetail, { exact: true }).evaluate(
      (element) => getComputedStyle(element).fontSize,
    ),
    "13px",
    "the browser actually renders the featured observation at 13 px",
  );

  const cards = page.locator("article.next-card");

  assert.equal(await cards.count(), 3);

  for (const [index, next] of nextSkills.entries()) {
    const card = cards.nth(index);
    const reason = card.getByText(next.reason, { exact: true });
    const code = card.locator("pre code");

    assert.equal(await reason.evaluate((element) => getComputedStyle(element).fontSize), "12px");
    assert.equal(await code.evaluate((element) => getComputedStyle(element).fontSize), "12px");
    assert.equal(await code.textContent(), next.prompt, "the actual visible prompt remains complete and copy-ready");
  }

  const desktop = await cards.evaluateAll((elements) => elements.map((element) => {
    const card = element.getBoundingClientRect();
    const prompt = element.querySelector("pre").getBoundingClientRect();

    return { top: card.top, bottom: card.bottom, promptTop: prompt.top };
  }));

  for (const card of desktop.slice(1)) {
    assert.ok(Math.abs(card.top - desktop[0].top) <= 1, "all three desktop cards begin on the same row");
    assert.ok(Math.abs(card.bottom - desktop[0].bottom) <= 1, "unequal prompts retain equal desktop card heights");
    assert.ok(Math.abs(card.promptTop - desktop[0].promptTop) <= 1, "copy-ready prompts align despite unequal explanation lengths");
  }

  await page.setViewportSize({ width: 1040, height: 1000 });

  const tablet = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();

    return { top: box.top, bottom: box.bottom };
  }));

  assert.ok(Math.abs(tablet[0].top - tablet[1].top) <= 1, "the first two tablet cards share a row");
  assert.ok(Math.abs(tablet[0].bottom - tablet[1].bottom) <= 1, "tablet cards remain equal in height");
  assert.ok(tablet[2].top > tablet[0].bottom, "the third tablet card wraps to its next row");

  await page.setViewportSize({ width: 760, height: 1000 });

  const mobile = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();

    return { top: box.top, bottom: box.bottom };
  }));

  assert.ok(mobile[1].top > mobile[0].bottom, "the second mobile card wraps below the first");
  assert.ok(mobile[2].top > mobile[1].bottom, "the third mobile card wraps below the second");
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "responsive cards never introduce horizontal page overflow",
  );
});

test("unequal native and historical prompts remain complete, aligned, and separate from model guidance", () => {
  const input = {
    skill: "qs-code-debug",
    outcome: "Diagnosed the observed full-height production regression.",
    nextSkills: [
      {
        name: "qs-test-tdd",
        reason: "Add a focused regression test.",
        prompt: "Use $qs-test-tdd to prevent the confirmed viewport regression.",
      },
      {
        name: "qs-review-code",
        reason: "Review the actual fix against the reported regression, responsive layout, and historical readout boundaries without inventing additional work.",
        prompt: "Use $qs-review-code to inspect the verified responsive production fix, preserved historical reports, and exact native skill prompt boundaries.",
      },
      {
        name: "qs-design-architecture",
        reason: "Inspect the verified architecture only if the failure recurs.",
        prompt: "Use /qs-design-architecture to investigate the recorded viewport boundary.",
      },
    ],
  };
  const report = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);
  const cards = [...html.matchAll(
    /<article class="next-card">([\s\S]*?)<\/article>/g,
  )];

  assert.equal(cards.length, 3, "all three approved prompt cards remain visible");

  for (const [index, card] of cards.entries()) {
    const item = report.nextSkills[index];
    const code = card[1].match(/<pre class="next-prompt-block"><code>([\s\S]*?)<\/code><\/pre>/);

    assert.ok(code, `${item.name} provides a complete copy-ready prompt`);
    assert.equal(code[1], item.prompt);
    assert.ok(card[1].includes(`$${item.name}`), `${item.name} remains discoverable in the native skill picker`);
    assert.ok(card[1].includes(item.reason), `${item.name} explains why it is recommended`);
    assert.ok(
      card[1].indexOf(item.reason) < card[1].indexOf('<pre class="next-prompt-block">'),
      `${item.name} explains its reasoning before the complete prompt`,
    );
    assert.ok(
      card[1].indexOf('</pre>') < card[1].indexOf('aria-label="Heuristic model and thinking guidance"'),
      `${item.name} keeps suggested model and thinking below the copy-ready prompt`,
    );
    assert.doesNotMatch(code[1], /Suggested model|Suggested thinking|Heuristic suggestion/);
  }

  assert.match(cards[0][1], /RECOMMENDED/);
  assert.match(cards[1][1], /ALTERNATIVE/);
  assert.match(cards[2][1], /Use \/qs-design-architecture/);
});

test("production reports accept only the exact approved dollar or slash skill as the first action", () => {
  const input = {
    skill: "qs-code-debug",
    outcome: "Preserve strict, backward-compatible first-action validation.",
  };

  for (const prompt of [
    "Use $qs-test-tdd to protect the actual reporting boundary.",
    "Use /qs-test-tdd to protect the actual reporting boundary.",
    "  USE   $qs-test-tdd to protect the actual reporting boundary.  ",
    "  USE   /qs-test-tdd to protect the actual reporting boundary.  ",
  ]) {
    const report = normalizeSkillReadout({
      ...input,
      nextSkills: [{ name: "qs-test-tdd", prompt }],
    });

    assert.equal(report.nextSkills[0].prompt, prompt.trim());
  }

  for (const prompt of [
    "Use $qs-test-tdd-extra to evade the approved skill.",
    "Use /qs-test-tdd-extra to evade the approved skill.",
    "Use $qs-test-tdd:extra to evade the approved skill.",
    "Use /qs-test-tdd:extra to evade the approved skill.",
    "Use $qs-review-code before $qs-test-tdd.",
    "Use /qs-review-code before /qs-test-tdd.",
    "Mention $qs-test-tdd and then implement something else.",
    "Do not use /qs-test-tdd; use /qs-review-code instead.",
  ]) {
    assert.throws(
      () => normalizeSkillReadout({
        ...input,
        nextSkills: [{ name: "qs-test-tdd", prompt }],
      }),
      /must explicitly invoke \/qs-test-tdd as its first action/i,
      prompt,
    );
  }
});

test("all 24 first-run B summaries show honest preview states without invented findings or check progress", () => {
  assert.equal(SKILLS.length, 24, "the test covers every actual promoted QuickStark skill");

  for (const skill of SKILLS) {
    const html = renderSkillReadout({
      skill: skill.name,
      status: "Preview",
      skillsUsed: [],
      outcome: `Catalog preview only; ${skill.displayName} has not run.`,
      findings: [{
        title: "Catalog description is not an observed critical finding",
        detail: skill.shortDescription,
        priority: "P0",
      }],
    });
    const summary = html.match(
      /<div class="presentation-summary-panel">([\s\S]*?)\n\s*<section class="section">/,
    );

    assert.ok(summary, `${skill.name} exposes its public five-second preview`);
    assert.match(summary[1], /READY TO RUN/, skill.name);
    assert.match(summary[1], /FIRST RUN/, skill.name);
    assert.match(summary[1], /No actual skill run has been recorded/, skill.name);
    assert.match(summary[1], /aria-label="No checks recorded"/, skill.name);
    assert.doesNotMatch(summary[1], /NEEDS ATTENTION|NO CRITICAL EXCEPTIONS/, skill.name);
    assert.doesNotMatch(summary[1], /Catalog description is not an observed critical finding/, skill.name);
    assert.doesNotMatch(summary[1], /<svg\b|recorded checks passed/i, skill.name);
  }
});

test("a failed recorded check leads the summary without hiding skipped checks or inventing progress", () => {
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Recorded the actual regression and its check outcomes.",
    findings: [{
      title: "A routine observation must not conceal a failed check",
      priority: "P3",
    }],
    checks: [
      { title: "Confirmed native prompt validation", status: "passed" },
      { title: "The full-height viewport regression remains reproducible", status: "failed" },
      { title: "Optional browser check", status: "skipped" },
    ],
  });
  const featured = html.match(
    /<article class="presentation-featured-signal">([\s\S]*?)<\/article>/,
  );

  assert.ok(featured, "the actual failed check remains visible at a glance");
  assert.match(featured[1], />FAILED CHECK</);
  assert.match(featured[1], /full-height viewport regression remains reproducible/);
  assert.doesNotMatch(featured[1], /routine observation must not conceal/);
  assert.match(html, /NEEDS ATTENTION/);
  assert.match(html, /1 explicitly recorded exception/);
  assert.match(html, /aria-label="1 of 3 recorded checks passed"/);
  assert.match(html, /presentation-ring-failed/);
  assert.doesNotMatch(html, /aria-label="3 of 3 recorded checks passed"/);
});

test("blocked B reports count only observed exceptions and feature the most severe recorded finding", () => {
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    status: "Blocked",
    outcome: "Awaiting correction of an independently recorded production blocker.",
    findings: [
      { title: "Observed high-priority layout defect", priority: "P1" },
      { title: "Observed critical repository-ownership failure", priority: "P0" },
      { title: "Recorded low-priority formatting observation", priority: "P3" },
    ],
    checks: [
      { title: "Recorded regression check", status: "failed" },
      { title: "Recorded unaffected check", status: "passed" },
    ],
  });
  const featured = html.match(
    /<article class="presentation-featured-signal">([\s\S]*?)<\/article>/,
  );

  assert.ok(featured, "the blocked report still exposes its actual leading exception");
  assert.match(featured[1], />P0</);
  assert.match(featured[1], /critical repository-ownership failure/);
  assert.match(html, /4 explicitly recorded exceptions/);
  assert.match(html, /aria-label="1 of 2 recorded checks passed"/);
  assert.doesNotMatch(html, /5 explicitly recorded exceptions/);
});

test("a GitHub issue outage preserves verified repository metadata without inventing zero issues", async () => {
  const project = {
    host: "github.com",
    owner: "quickstark",
    repository: "skills",
    key: "github.com/quickstark/skills",
    label: "quickstark/skills",
    source: "explicit",
  };
  const fetcher = async (url) => url.endsWith("/issues?state=open&per_page=8")
    ? new Response(null, { status: 503 })
    : new Response(JSON.stringify({
      full_name: "quickstark/skills",
      html_url: "https://github.com/quickstark/skills",
      default_branch: "main",
      visibility: "public",
    }), { headers: { "Content-Type": "application/json" } });
  const github = await observeGitHubProject(project, { fetcher });
  const report = normalizeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Preserve independently verified repository ownership during an issue API outage.",
    projectIdentity: project,
  });
  const metadata = renderReadoutProjectMetadata(report, { github });
  const summary = renderReadoutSignalSummary(
    report,
    READOUT_PROFILES_BY_NAME[report.skill.name],
    { github },
  );

  assert.equal(github.fullName, "quickstark/skills");
  assert.equal(github.issues, null);
  assert.match(metadata, /GitHub verified/);
  assert.match(metadata, /quickstark\/skills/);
  assert.match(metadata, /main/);
  assert.match(
    summary,
    /<span>OPEN ISSUES<\/span><strong>—<\/strong><small>Not independently verified<\/small>/,
  );
  assert.equal(renderReadoutGitHubIssues(github), "");
});

test("the full-height production Workbench preserves the leading B exception and complete immutable report", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Protect the actual full-height production report from recorded regressions.",
    generatedAt: "2026-07-27T15:00:00.000Z",
    projectIdentity: quickStarkProject,
    findings: [
      { title: "Earlier recorded P1 layout regression", priority: "P1" },
      { title: "Later recorded P0 authorization regression", priority: "P0" },
    ],
    checks: [{ title: "Actual full-height regression check", status: "passed" }],
  }, { directory, layout: "project" });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const selected = html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>([\s\S]*?)<\/aside>/,
  );
  const stylesheet = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  const immutable = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(response.status, 200);
  assert.ok(selected, "the verified report remains inside the actual project-first Workbench");
  assert.match(selected[1], /aria-label="Verified project and run metadata"/);
  assert.match(selected[1], /aria-label="Five-second report summary"/);
  assert.match(selected[1], />P0</);
  assert.match(selected[1], /Later recorded P0 authorization regression/);
  assert.match(selected[1], /Use \$qs-test-tdd/);
  assert.match(selected[1], /aria-label="Complete immutable skill readout"/);
  assert.ok(stylesheet, "the production Workbench remains a self-contained full-height application");
  assert.match(stylesheet[1], /\.workbench-page\s*\{[^}]*height\s*:\s*100dvh/);
  assert.match(stylesheet[1], /\.workbench-shell\s*\{[^}]*max-height\s*:\s*none/);
  assert.doesNotMatch(html, /<script\b|<iframe\b/i);
  assert.equal(immutable.status, 200);
  assert.equal(await immutable.text(), original);
  assert.equal(await readFile(report.path, "utf8"), original);
});

test("production B keeps a profile-free historical readout readable without changing its immutable bytes", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve an existing historical production report.",
    generatedAt: "2026-07-26T15:00:00.000Z",
    projectIdentity: quickStarkProject,
    findings: [{ title: "Recorded historical finding" }],
    outputs: [{ title: "Recorded historical delivery" }],
    checks: [{ title: "Recorded historical verification", status: "passed" }],
  }, { directory, layout: "project" });
  const current = await readFile(report.path, "utf8");
  const historical = current
    .replace(/\s*<meta name="quickstark:report-profile" content="[^"]*">/, "")
    .replace("<h2>Deliverables</h2>", "<h2>Outputs</h2>")
    .replace("<h2>Verification</h2>", "<h2>Checks</h2>");

  assert.notEqual(historical, current, "the fixture is an actual profile-free historical report");
  assert.doesNotMatch(historical, /<meta name="quickstark:report-profile"/);

  await writeFile(report.path, historical, "utf8");

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const selected = html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>([\s\S]*?)<\/aside>/,
  );
  const immutable = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(response.status, 200);
  assert.ok(selected, "the historical readout remains in the verified production Workbench");
  assert.match(selected[1], /Recorded historical finding/);
  assert.match(selected[1], /Recorded historical delivery/);
  assert.match(selected[1], /Recorded historical verification/);
  assert.match(selected[1], /aria-label="Complete immutable skill readout"/);
  assert.equal(immutable.status, 200);
  assert.equal(await immutable.text(), historical);
  assert.equal(await readFile(report.path, "utf8"), historical);
});

test("verified issue summaries escape GitHub-controlled titles and labels without activating page content", async () => {
  const fetcher = async (url) => new Response(JSON.stringify(
    url.endsWith("/issues?state=open&per_page=8")
      ? [{
        number: 21,
        state: "open",
        title: '<script>alert("untrusted issue title")</script> report',
        html_url: "https://github.com/quickstark/skills/issues/21",
        labels: [{ name: '<img src=x onerror="alert(1)">' }],
      }]
      : {
        full_name: "quickstark/skills",
        html_url: "https://github.com/quickstark/skills",
        default_branch: "main",
        visibility: "public",
      },
  ), { headers: { "Content-Type": "application/json" } });
  const github = await observeGitHubProject(quickStarkProject, { fetcher });
  const issues = renderReadoutGitHubIssues(github);

  assert.match(issues, /Relevant open issues/);
  assert.match(issues, /https:\/\/github\.com\/quickstark\/skills\/issues\/21/);
  assert.match(issues, /&lt;script&gt;alert\(&quot;untrusted issue title&quot;\)&lt;\/script&gt;/);
  assert.match(issues, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(issues, /<(?:script|img)\b|<[a-z][^<>]*\sonerror\s*=/i);
});
