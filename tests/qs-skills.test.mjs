import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createPortBlocker } from "node:net";
import { hostname, platform, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { formatSkillForCodex } from "../scripts/codex-skill-format.mjs";
import {
  DEFAULT_READOUT_HOST,
  READOUT_VIEWER_STATE,
  discoverHomeNetworkAddress,
  ensureReadoutViewer,
  migrateLegacyReadouts,
  normalizeSkillReadout,
  publishSkillReadout,
  pruneReadouts,
  readoutDirectoryIdentity,
  renderSkillReadout,
  resolveReadoutViewerHost,
  startReadoutIngestionServer,
  startReadoutServer,
  writeSkillGallery,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";
import {
  DOCUMENTATION_OUTPUT_HEADING,
  SKILL_OUTPUT_HEADING,
  renderDocumentationOutputContract,
  renderSkillOutputContract,
} from "../scripts/sync-skill-output-contracts.mjs";
import {
  COLLECTION_PREFIX,
  NEXT_SKILLS_BY_NAME,
  READOUT_PROFILES_BY_NAME,
  SKILLS,
  SKILLS_BY_NAME,
  UPSTREAM_SKILLS,
} from "../scripts/qs-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const personalRepository = "https://github.com/quickstark/skills";
const execFileAsync = promisify(execFile);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function listFiles(root, current = root) {
  const files = [];

  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    } else {
      assert.fail(`Packaged skill contains a non-regular entry: ${path}`);
    }
  }

  return files.sort();
}

async function temporaryReadoutDirectory(context) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-readout-test-"));

  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  return directory;
}

async function temporaryGitProject(context, remote) {
  const directory = await temporaryReadoutDirectory(context);

  await execFileAsync("git", ["init", "--quiet", directory]);

  if (remote !== undefined) {
    await execFileAsync("git", ["-C", directory, "remote", "add", "origin", remote]);
  }

  return directory;
}

function explicitProject(repository) {
  return {
    host: "github.com",
    owner: "quickstark",
    repository,
    key: `github.com/quickstark/${repository}`,
    label: `quickstark/${repository}`,
    source: "explicit",
  };
}

function verifiedGithubProvenance() {
  return {
    pullRequests: [
      {
        number: 42,
        title: "Publish verified skill readouts",
        state: "merged",
        url: "https://github.com/quickstark/skills/pull/42",
      },
    ],
    closedIssues: [
      {
        number: 17,
        title: "Make release evidence visible",
        state: "closed",
        closedByRelease: true,
        url: "https://github.com/quickstark/skills/issues/17",
      },
    ],
    release: {
      version: "v2.3.1",
      url: "https://github.com/quickstark/skills/releases/tag/v2.3.1",
    },
    commit: {
      sha: "0123456789abcdef0123456789abcdef01234567",
      published: true,
      url: "https://github.com/quickstark/skills/commit/0123456789abcdef0123456789abcdef01234567",
    },
  };
}

async function temporaryProjectGallery(context, options = {}) {
  const directory = await temporaryReadoutDirectory(context);
  const entries = [
    {
      skill: "qs-plan-research",
      outcome: "Research the skill-hosting architecture.",
      generatedAt: "2026-07-24T10:00:00.000Z",
      projectIdentity: explicitProject("skills"),
    },
    {
      skill: "qs-code-build",
      outcome: "Build the marketplace search experience.",
      generatedAt: "2026-07-25T12:00:00.000Z",
      projectIdentity: explicitProject("marketplace"),
    },
    {
      skill: "qs-design-prototype",
      status: "Preview",
      skillsUsed: [],
      outcome: "Catalog preview only; no actual design work occurred.",
      generatedAt: "2026-07-25T13:00:00.000Z",
      projectIdentity: explicitProject("skills"),
    },
  ];
  const reports = [];

  for (const entry of entries) {
    reports.push(await writeSkillReadout(entry, { directory, layout: "project" }));
  }

  const viewer = await startReadoutServer({ directory, port: 0, ...options });

  context.after(async () => {
    if (!viewer.server.listening) return;

    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  return { directory, viewer, reports };
}

function nativeIngestionEnvelope(overrides = {}) {
  return {
    version: 1,
    producer: "codex-laptop",
    harness: { name: "codex", version: "1.0.0" },
    collection: "quickstark/qs-skills",
    project: "https://github.com/quickstark/skills.git",
    runId: "a6ba1c2b-d2a5-4962-b591-7d2bec883021",
    generatedAt: "2026-07-26T12:00:00.000Z",
    skill: "qs-code-build",
    status: "Completed",
    outcome: "Publish an authenticated native skill readout.",
    findings: [{ title: "Authenticated ingestion", detail: "The real report is available." }],
    nextSkills: [],
    ...overrides,
  };
}

async function temporaryReadoutIngestion(context, options = {}) {
  const directory = await temporaryReadoutDirectory(context);
  const viewer = await startReadoutServer({
    directory,
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
    ...options.viewer,
  });
  const ingestion = await startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["github.com/quickstark/skills"],
    producers: [{
      id: "codex-laptop",
      token: "test-only-codex-laptop-credential-1234567890",
      projects: ["github.com/quickstark/skills"],
    }],
    ...options.ingestion,
  });

  for (const running of [ingestion, viewer]) {
    context.after(async () => {
      if (!running.server.listening) return;

      await new Promise((done, fail) => {
        running.server.close((error) => error ? fail(error) : done());
      });
    });
  }

  return { directory, viewer, ingestion };
}

function submitIngestion(ingestion, envelope, {
  token = "test-only-codex-laptop-credential-1234567890",
  headers = {},
  method = "POST",
  path = "api/v1/readouts",
  body,
} = {}) {
  return fetch(new URL(path, ingestion.url), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...(method === "GET" || method === "HEAD" ? {} : {
      body: body === undefined ? JSON.stringify(envelope) : body,
    }),
  });
}

test("an authenticated producer can ingest and retrieve an immutable native skill readout", async (context) => {
  const { viewer, ingestion } = await temporaryReadoutIngestion(context);
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope());

  assert.equal(response.status, 201);

  const accepted = await response.json();
  assert.equal(accepted.status, "created");
  assert.equal(accepted.project, "github.com/quickstark/skills");
  assert.equal(accepted.skill, "qs-code-build");
  assert.equal(accepted.reportId, "a6ba1c2b-d2a5-4962-b591-7d2bec883021");
  assert.ok(accepted.url.startsWith(viewer.url));

  const report = await fetch(accepted.url);
  assert.equal(report.status, 200);

  const html = await report.text();
  assert.match(html, /Publish an authenticated native skill readout/);
  assert.match(html, /Authenticated ingestion/);

  const gallery = await fetch(viewer.url);
  assert.equal(gallery.status, 200);
  assert.match(await gallery.text(), /Publish an authenticated native skill readout/);

  const viewerPost = await fetch(viewer.url, { method: "POST" });
  assert.equal(viewerPost.status, 405);
  assert.equal(viewerPost.headers.get("allow"), "GET, HEAD");
});

test("identical skill-readout submissions return the existing immutable report", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const envelope = nativeIngestionEnvelope();
  const first = await submitIngestion(ingestion, envelope);
  const initial = await first.json();
  const second = await submitIngestion(ingestion, envelope);

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);

  const retry = await second.json();
  assert.equal(retry.status, "existing");
  assert.equal(retry.url, initial.url);
  assert.equal(retry.reportId, initial.reportId);

  const report = await fetch(initial.url);
  assert.equal(report.status, 200);
  assert.match(await report.text(), /Publish an authenticated native skill readout/);
});

test("a conflicting skill-readout retry never replaces the original report", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const original = await submitIngestion(ingestion, nativeIngestionEnvelope());
  const accepted = await original.json();
  const changed = await submitIngestion(ingestion, nativeIngestionEnvelope({
    outcome: "Attempt to replace the original immutable skill report.",
  }));

  assert.equal(original.status, 201);
  assert.equal(changed.status, 409);
  assert.deepEqual(await changed.json(), { error: "run_conflict" });

  const html = await (await fetch(accepted.url)).text();
  assert.match(html, /Publish an authenticated native skill readout/);
  assert.doesNotMatch(html, /Attempt to replace/);
});

test("concurrent identical skill-readout submissions create only one report", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const envelope = nativeIngestionEnvelope();
  const responses = await Promise.all(Array.from({ length: 6 }, () => submitIngestion(ingestion, envelope)));
  const results = await Promise.all(responses.map((response) => response.json()));

  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 200).length, 5);
  assert.equal(new Set(results.map((result) => result.url)).size, 1);

  const html = await (await fetch(viewer.url)).text();
  assert.equal((html.match(/Publish an authenticated native skill readout/g) ?? []).length, 1);
});

test("readout ingestion rejects missing, invalid, and mismatched producer credentials", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);

  for (const options of [
    { token: null },
    { token: "an-invalid-producer-credential-1234567890" },
  ]) {
    const denied = await submitIngestion(ingestion, nativeIngestionEnvelope(), options);
    assert.equal(denied.status, 401);
    assert.deepEqual(await denied.json(), { error: "unauthorized" });
  }

  const mismatched = await submitIngestion(ingestion, nativeIngestionEnvelope({ producer: "different-laptop" }));
  assert.equal(mismatched.status, 403);
  assert.deepEqual(await mismatched.json(), { error: "publication_not_authorized" });

  const gallery = await fetch(viewer.url);
  assert.doesNotMatch(await gallery.text(), /Publish an authenticated native skill readout/);
});

test("an authenticated readout producer cannot publish an unapproved project", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const denied = await submitIngestion(ingestion, nativeIngestionEnvelope({
    project: "https://github.com/quickstark/marketplace.git",
  }));

  assert.equal(denied.status, 403);
  const body = await denied.text();
  assert.doesNotMatch(body, /marketplace/);
  assert.deepEqual(JSON.parse(body), { error: "publication_not_authorized" });
  assert.doesNotMatch(await (await fetch(viewer.url)).text(), /marketplace/);
});

test("readout ingestion normalizes equivalent safe SSH and HTTPS project origins", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const accepted = await submitIngestion(ingestion, nativeIngestionEnvelope({
    project: "git@github.com:quickstark/skills.git",
    runId: "d06c43ab-f919-48ad-8d4c-7a4a56d92c15",
    outcome: "Submit an authorized skill using its SSH Git origin.",
  }));

  assert.equal(accepted.status, 201);
  assert.equal((await accepted.json()).project, "github.com/quickstark/skills");
  assert.match(await (await fetch(viewer.url)).text(), /Submit an authorized skill using its SSH Git origin/);
});

test("readout ingestion rejects unsafe origins without disclosing credentials", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const project of [
    "https://token@github.com/quickstark/skills.git",
    "https://github.com/quickstark/../skills.git",
    "/tmp/private-checkout",
    "https://github.com/quickstark/skills.git?token=private",
  ]) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope({ project }));
    const body = await response.text();
    assert.equal(response.status, 422, project);
    assert.doesNotMatch(body, /token|private|checkout/i);
    assert.deepEqual(JSON.parse(body), { error: "invalid_project" });
  }
});

test("readout ingestion permits only its exact authenticated producer route", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope(), { method });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "POST");
  }

  const other = await submitIngestion(ingestion, nativeIngestionEnvelope(), { path: "api/v1/readouts/extra" });
  assert.equal(other.status, 404);

  const health = await fetch(new URL("__quickstark_ingestion_health", ingestion.url));
  assert.equal(health.status, 200);
  const metadata = await health.json();
  assert.equal(metadata.service, "quickstark-skill-readout-ingestion");
  assert.equal(typeof metadata.directory, "string");
});

test("readout ingestion rejects malformed, unsupported, and oversized submissions", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context, {
    ingestion: { maxBytes: 2048 },
  });

  const malformed = await submitIngestion(ingestion, nativeIngestionEnvelope(), { body: "{" });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "invalid_json" });

  const wrongType = await submitIngestion(ingestion, nativeIngestionEnvelope(), {
    headers: { "Content-Type": "text/html" },
  });
  assert.equal(wrongType.status, 415);

  const unsupported = await submitIngestion(ingestion, nativeIngestionEnvelope({ version: 72 }));
  assert.equal(unsupported.status, 422);
  assert.deepEqual(await unsupported.json(), { error: "unsupported_readout_version" });

  const oversized = await submitIngestion(ingestion, nativeIngestionEnvelope({ outcome: "x".repeat(4096) }));
  assert.equal(oversized.status, 413);
  assert.deepEqual(await oversized.json(), { error: "payload_too_large" });

  const invalidRun = await submitIngestion(ingestion, nativeIngestionEnvelope({ runId: "../../unsafe" }));
  assert.equal(invalidRun.status, 422);
});

test("readout ingestion requires actual UTC run timestamps and observed completion status", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const invalid of [
    { generatedAt: undefined },
    { generatedAt: null },
    { generatedAt: "2026-07-26" },
    { generatedAt: "2026-07-26T12:00:00+00:00" },
    { generatedAt: "2026-02-30T12:00:00.000Z" },
    { generatedAt: "not-an-observed-timestamp" },
    { status: undefined },
    { status: null },
    { status: "Preview" },
    { status: "Invented completion" },
  ]) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope(invalid));

    assert.equal(response.status, 422, JSON.stringify(invalid));
    assert.deepEqual(await response.json(), { error: "invalid_readout" });
  }
});

test("readout ingestion fails closed without explicit producer and project grants", async (context) => {
  const directory = await temporaryReadoutDirectory(context);

  await assert.rejects(startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: "http://127.0.0.1:4173/",
    allowedProjects: ["github.com/quickstark/skills"],
    producers: [],
  }), /explicitly authorized producer/i);

  await assert.rejects(startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: "http://127.0.0.1:4173/",
    allowedProjects: [],
    producers: [{
      id: "codex-laptop",
      token: "test-only-codex-laptop-credential-1234567890",
      projects: ["github.com/quickstark/skills"],
    }],
  }), /explicitly approved published project/i);

  await assert.rejects(startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: "http://127.0.0.1:4173/",
    allowedProjects: ["github.com/quickstark/skills"],
    producers: [{ id: "codex-laptop", token: "short", projects: [] }],
  }), /at least 24 characters/i);
});

test("readout ingestion safely renders untrusted producer findings", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const accepted = await submitIngestion(ingestion, nativeIngestionEnvelope({
    findings: [{
      title: '<script>alert("unsafe")</script>',
      detail: '<img src=x onerror="alert(1)">',
    }],
  }));

  assert.equal(accepted.status, 201);

  const report = await fetch((await accepted.json()).url);
  const html = await report.text();
  assert.doesNotMatch(html, /<script>|<img src=x/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x/);
  assert.match(report.headers.get("content-security-policy"), /default-src 'none'/);
  assert.equal(accepted.headers.get("access-control-allow-origin"), null);
});

test("an authorized external skill appears truthfully throughout the project gallery", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const envelope = nativeIngestionEnvelope({
    harness: { name: "claude-code", version: "1.0.0" },
    collection: "independent/engineering-skills",
    skill: "investigate-architecture",
    runId: "12b45dc1-d41e-44aa-b792-6e7dc3c43f10",
    outcome: "Trace a genuine independently maintained architecture skill.",
    findings: [{ title: "Independent architecture observation", detail: "Observed at the external seam." }],
  });
  const response = await submitIngestion(ingestion, envelope);

  assert.equal(response.status, 201);

  const accepted = await response.json();
  assert.equal(accepted.skill, "investigate-architecture");

  const report = await fetch(accepted.url);
  assert.equal(report.status, 200);

  const html = await report.text();
  assert.match(html, /investigate-architecture/);
  assert.match(html, /claude-code/);
  assert.match(html, /independent\/engineering-skills/);
  assert.match(html, /Independent architecture observation/);
  assert.doesNotMatch(html, /promoted QuickStark skill/i);

  for (const suffix of ["", "?view=explorer", "?view=activity"]) {
    const page = await fetch(new URL(suffix || ".", viewer.url));
    assert.equal(page.status, 200);
    assert.match(await page.text(), /investigate-architecture|Trace a genuine independently maintained architecture skill/);
  }

  assert.throws(
    () => normalizeSkillReadout({ skill: "investigate-architecture", outcome: "Do not bypass the native catalog." }),
    /not a promoted QuickStark skill/,
  );
});

test("an authorized plugin-namespaced external skill remains visible throughout the project library", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    harness: { name: "codex-desktop", version: "1.0.0" },
    collection: "compound-engineering/skills",
    skill: "compound-engineering:ce-code-review",
    runId: "ef26ecf9-1d2f-426b-a04f-605a83d40af1",
    outcome: "Record an actual namespaced skill from an independent Codex plugin.",
    nextSkills: [{ name: "compound-engineering:ce-work", reason: "Apply the verified review." }],
  }));

  assert.equal(response.status, 201);

  const accepted = await response.json();
  assert.equal(accepted.skill, "compound-engineering:ce-code-review");
  assert.match(accepted.url, /qs-external-compound-engineering-ce-code-review--/);

  const html = await (await fetch(accepted.url)).text();
  assert.match(html, /compound-engineering:ce-code-review/);
  assert.match(html, /compound-engineering:ce-work/);
  assert.match(html, /codex-desktop/);

  for (const suffix of ["", "?view=explorer", "?view=activity"]) {
    const page = await fetch(new URL(suffix || ".", viewer.url));
    assert.equal(page.status, 200);
    assert.match(await page.text(), /compound-engineering:ce-code-review/);
  }
});

test("a portable publisher sends a local native readout to the approved hosted project", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const result = await publishSkillReadout(nativeIngestionEnvelope(), {
    endpoint: new URL("api/v1/readouts", ingestion.url).href,
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: ["github.com/quickstark/skills"],
  });

  assert.equal(result.status, "published");
  assert.equal(result.created, true);
  assert.equal(result.project, "github.com/quickstark/skills");
  assert.ok(result.url.startsWith(viewer.url));
  assert.match(await (await fetch(result.url)).text(), /Publish an authenticated native skill readout/);
});

test("a portable publisher safely retries the same immutable skill run", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const options = {
    endpoint: new URL("api/v1/readouts", ingestion.url).href,
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: ["github.com/quickstark/skills"],
  };
  const first = await publishSkillReadout(nativeIngestionEnvelope(), options);
  const retry = await publishSkillReadout(nativeIngestionEnvelope(), options);

  assert.equal(first.created, true);
  assert.equal(retry.created, false);
  assert.equal(retry.url, first.url);
});

test("portable publication stays disabled without an explicit endpoint and project opt-in", async () => {
  const disabled = await publishSkillReadout(nativeIngestionEnvelope(), {
    token: "test-only-codex-laptop-credential-1234567890",
  });

  assert.deepEqual(disabled, { status: "local-only", reason: "publication_not_configured" });

  const unapproved = await publishSkillReadout(nativeIngestionEnvelope(), {
    endpoint: "https://reports.quickstark.com/api/v1/readouts",
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: [],
  });

  assert.deepEqual(unapproved, { status: "local-only", reason: "project_not_authorized" });
});

test("a portable publisher preserves local-only reporting when hosted ingestion is unavailable", async () => {
  const result = await publishSkillReadout(nativeIngestionEnvelope(), {
    endpoint: "http://127.0.0.1:1/api/v1/readouts",
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: ["github.com/quickstark/skills"],
    timeout: 250,
  });

  assert.deepEqual(result, { status: "local-only", reason: "publication_unavailable" });
});

test("the portable publisher supports independently named cross-harness skills", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const result = await publishSkillReadout(nativeIngestionEnvelope({
    harness: { name: "claude-code", version: "1.0.0" },
    collection: "independent/engineering-skills",
    skill: "review-deployment",
    runId: "c123de17-445f-4581-a4bf-8eef204d6543",
    outcome: "Publish an independently maintained skill from another harness.",
  }), {
    endpoint: new URL("api/v1/readouts", ingestion.url).href,
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: ["github.com/quickstark/skills"],
  });

  assert.equal(result.status, "published");
  const html = await (await fetch(result.url)).text();
  assert.match(html, /review-deployment/);
  assert.match(html, /claude-code/);
  assert.match(html, /independent\/engineering-skills/);
});

test("independent report producers cannot use each other's project grants", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["github.com/quickstark/skills", "github.com/quickstark/marketplace"] },
    ingestion: {
      allowedProjects: ["github.com/quickstark/skills", "github.com/quickstark/marketplace"],
      producers: [
        {
          id: "codex-laptop",
          token: "test-only-codex-laptop-credential-1234567890",
          projects: ["github.com/quickstark/skills"],
        },
        {
          id: "marketplace-laptop",
          token: "test-only-marketplace-producer-credential-4567890",
          projects: ["github.com/quickstark/marketplace"],
        },
      ],
    },
  });

  const forbidden = await submitIngestion(ingestion, nativeIngestionEnvelope({
    project: "https://github.com/quickstark/marketplace.git",
  }));

  assert.equal(forbidden.status, 403);

  const approved = await submitIngestion(ingestion, nativeIngestionEnvelope({
    producer: "marketplace-laptop",
    project: "https://github.com/quickstark/marketplace.git",
    runId: "b142743b-2038-4f95-a156-0cd73c055533",
    outcome: "Publish only the explicitly granted marketplace report.",
  }), {
    token: "test-only-marketplace-producer-credential-4567890",
  });

  assert.equal(approved.status, 201);
  assert.equal((await approved.json()).project, "github.com/quickstark/marketplace");
  assert.match(await (await fetch(viewer.url)).text(), /Publish only the explicitly granted marketplace report/);
});

test("readout ingestion enforces a bounded per-producer submission rate", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context, {
    ingestion: { maxRequestsPerMinute: 2 },
  });
  const runs = [
    "ef26ecf9-1d2f-426b-a04f-605a83d40ac1",
    "ef26ecf9-1d2f-426b-a04f-605a83d40ac2",
    "ef26ecf9-1d2f-426b-a04f-605a83d40ac3",
  ];

  const responses = [];

  for (const runId of runs) {
    responses.push(await submitIngestion(ingestion, nativeIngestionEnvelope({ runId })));
  }

  assert.deepEqual(responses.map((response) => response.status), [201, 201, 429]);
  assert.deepEqual(await responses[2].json(), { error: "rate_limited" });
  assert.ok(Number(responses[2].headers.get("retry-after")) > 0);
});

test("readout ingestion bounds result arrays and never accepts a catalog preview", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const excessive = await submitIngestion(ingestion, nativeIngestionEnvelope({
    findings: Array.from({ length: 101 }, (_, index) => ({ title: `Observation ${index}` })),
  }));

  assert.equal(excessive.status, 422);

  const preview = await submitIngestion(ingestion, nativeIngestionEnvelope({
    status: "Preview",
    runId: "ef26ecf9-1d2f-426b-a04f-605a83d40ad1",
    findings: [],
  }));

  assert.equal(preview.status, 422);
});

test("external producer claims cannot create fabricated verified release evidence", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    collection: "independent/engineering-skills",
    skill: "review-release",
    runId: "ef26ecf9-1d2f-426b-a04f-605a83d40ad2",
    provenance: verifiedGithubProvenance(),
  }));

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "unverified_provenance" });
});

test("an authenticated native producer cannot fabricate independently verified delivery provenance", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    provenance: verifiedGithubProvenance(),
  }));

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "unverified_provenance" });
  assert.doesNotMatch(await (await fetch(viewer.url)).text(), /Publish verified skill readouts/);
});

test("ingestion loads hashed producer grants without storing bearer credentials", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const configPath = join(directory, "producer-grants.json");
  const credential = "test-only-file-configured-producer-secret-1234567890";

  await writeFile(configPath, JSON.stringify({
    version: 1,
    producers: [{
      id: "codex-laptop",
      tokenSha256: createHash("sha256").update(credential).digest("hex"),
      projects: ["github.com/quickstark/skills"],
    }],
  }), { encoding: "utf8", mode: 0o600 });

  const viewer = await startReadoutServer({
    directory,
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });

  context.after(async () => {
    if (!viewer.server.listening) return;
    await new Promise((done, fail) => viewer.server.close((error) => error ? fail(error) : done()));
  });

  const ingestion = await startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["github.com/quickstark/skills"],
    producersFile: configPath,
  });

  context.after(async () => {
    if (!ingestion.server.listening) return;
    await new Promise((done, fail) => ingestion.server.close((error) => error ? fail(error) : done()));
  });

  const accepted = await submitIngestion(ingestion, nativeIngestionEnvelope(), { token: credential });
  assert.equal(accepted.status, 201);
  assert.doesNotMatch(await readFile(configPath, "utf8"), new RegExp(credential));
  assert.doesNotMatch(await (await fetch((await accepted.json()).url)).text(), new RegExp(credential));
});

test("the portable publisher refuses untrusted remote or malformed ingestion endpoints", async () => {
  for (const endpoint of [
    "http://reports.quickstark.com/api/v1/readouts",
    "https://reports.quickstark.com/api/v1/readouts/extra",
    "https://token@reports.quickstark.com/api/v1/readouts",
    "https://reports.quickstark.com/api/v1/readouts?token=secret",
  ]) {
    await assert.rejects(publishSkillReadout(nativeIngestionEnvelope(), {
      endpoint,
      token: "test-only-codex-laptop-credential-1234567890",
      allowedProjects: ["github.com/quickstark/skills"],
    }), /trusted HTTPS producer route/i);
  }
});

test("the readout command documents portable publishing and isolated ingestion", async () => {
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const { stdout } = await execFileAsync(process.execPath, [script, "--help"]);

  assert.match(stdout, /\bingest\b/);
  assert.match(stdout, /\bpublish\b/);
  assert.match(stdout, /QS_READOUT_INGESTION_URL/);
  assert.match(stdout, /QS_READOUT_PRODUCERS_FILE/);
  assert.match(stdout, /QS_READOUT_PUBLISH_PROJECTS/);
  assert.match(stdout, /--max-attempts/);
  assert.match(stdout, /--retry-delay/);
  assert.match(stdout, /--report-base-url/);
  assert.match(stdout, /QS_READOUT_PUBLISH_MAX_ATTEMPTS/);
  assert.match(stdout, /QS_READOUT_PUBLISH_RETRY_DELAY/);
});

test("any harness can publish a structured readout through the portable command", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const secret = "test-only-codex-laptop-credential-1234567890";
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    script,
    "publish",
    "--data", JSON.stringify(nativeIngestionEnvelope()),
    "--endpoint", new URL("api/v1/readouts", ingestion.url).href,
    "--allowed-projects", "github.com/quickstark/skills",
    "--json",
  ], {
    env: { ...process.env, QS_READOUT_PRODUCER_TOKEN: secret },
  });

  const result = JSON.parse(stdout);
  assert.equal(result.status, "published");
  assert.equal(result.created, true);
  assert.equal((await fetch(result.url)).status, 200);
  assert.doesNotMatch(stdout, new RegExp(secret));
  assert.doesNotMatch(stderr, new RegExp(secret));
});

test("an explicitly configured native skill render automatically publishes its real local readout", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const localDirectory = await temporaryReadoutDirectory(context);
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const input = {
    skill: "qs-code-build",
    outcome: "Automatically publish an explicitly opted-in local skill run.",
    reportId: "f0179c6b-f9f9-4c7b-b877-7143f3a95d12",
    generatedAt: "2026-07-26T14:00:00.000Z",
    nextSkills: [],
  };
  const { stdout } = await execFileAsync(process.execPath, [
    script,
    "render",
    "--data", JSON.stringify(input),
    "--directory", localDirectory,
    "--no-serve",
    "--json",
  ], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
      QS_READOUT_PRODUCER_ID: "codex-laptop",
      QS_READOUT_PRODUCER_TOKEN: "test-only-codex-laptop-credential-1234567890",
      QS_READOUT_PUBLISH_PROJECTS: "github.com/quickstark/skills",
      QS_READOUT_HARNESS: "codex-desktop",
      QS_READOUT_PUBLISH_MAX_ATTEMPTS: "2",
      QS_READOUT_PUBLISH_RETRY_DELAY: "0",
    },
  });

  const result = JSON.parse(stdout);
  assert.equal(result.publication.status, "published");
  assert.equal(await exists(result.path), true);

  const html = await (await fetch(result.publication.url)).text();
  assert.match(html, /Automatically publish an explicitly opted-in local skill run/);
  assert.match(html, /quickstark:harness" content="codex-desktop/);
  assert.match(await (await fetch(viewer.url)).text(), /Automatically publish an explicitly opted-in local skill run/);
});

test("the hosted reporting stack isolates authenticated ingestion from its read-only viewer", async () => {
  const compose = await readFile(join(repositoryRoot, "deploy", "readouts", "compose.yaml"), "utf8");

  assert.match(compose, /quickstark-readout-ingestion:/);
  assert.match(compose, /QS_READOUT_PUBLIC_URL:\s*https:\/\/reports\.quickstark\.com\/?/);
  assert.match(compose, /QS_READOUT_PRODUCERS_FILE:\s*\/run\/quickstark\/readout-producers\.json/);
  assert.match(compose, /traefik\.http\.routers\.quickstark-readout-ingestion\.rule=Host\(`reports\.quickstark\.com`\)\s*&&\s*Path\(`\/api\/v1\/readouts`\)/);
  assert.match(compose, /traefik\.http\.services\.quickstark-readout-ingestion\.loadbalancer\.server\.port=4174/);
  assert.match(compose, /quickstark-readout-ingestion:4174\/__quickstark_ingestion_health/);
  assert.match(compose, /\/docker\/appdata\/quickstark-readouts:\/docker\/appdata\/quickstark-readouts:rw/);
  assert.match(compose, /\/docker\/appdata\/quickstark-readouts-config:\/run\/quickstark:ro/);
  assert.doesNotMatch(compose, /readout-producers\.json:\/run\/quickstark\/readout-producers\.json:ro/);
  assert.doesNotMatch(compose, /quickstark-readouts-credentials/);
  assert.match(compose, /traefik\.http\.routers\.quickstark-readouts\.middlewares=authelia@file/);
  assert.match(compose, /\/docker\/appdata\/quickstark-readouts:\/docker\/appdata\/quickstark-readouts:ro/);
  assert.doesNotMatch(compose, /^\s*ports:/m);
  assert.doesNotMatch(compose, /0\.0\.0\.0/);
});

test("producer-specific report identities do not collide between authorized harnesses", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context, {
    ingestion: {
      producers: [
        {
          id: "codex-laptop",
          token: "test-only-codex-laptop-credential-1234567890",
          projects: ["github.com/quickstark/skills"],
        },
        {
          id: "second-codex-laptop",
          token: "test-only-second-laptop-credential-1234567890",
          projects: ["github.com/quickstark/skills"],
        },
      ],
    },
  });
  const first = await submitIngestion(ingestion, nativeIngestionEnvelope());
  const second = await submitIngestion(ingestion, nativeIngestionEnvelope({
    producer: "second-codex-laptop",
  }), { token: "test-only-second-laptop-credential-1234567890" });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const left = await first.json();
  const right = await second.json();
  assert.notEqual(left.url, right.url);
  assert.equal((await fetch(left.url)).status, 200);
  assert.equal((await fetch(right.url)).status, 200);
});

test("equivalent project origins and run-identifier casing are safe immutable retries", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const first = await submitIngestion(ingestion, nativeIngestionEnvelope());
  const same = await submitIngestion(ingestion, nativeIngestionEnvelope({
    project: "git@github.com:quickstark/skills.git",
    runId: "A6BA1C2B-D2A5-4962-B591-7D2BEC883021",
  }));

  assert.equal(first.status, 201);
  assert.equal(same.status, 200);
  assert.equal((await same.json()).url, (await first.json()).url);
});

test("ingestion derives project display identity from authorized canonical ownership", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    project: {
      ...explicitProject("skills"),
      label: "forged-owner/private-client-project",
    },
  }));

  assert.equal(response.status, 201);

  const report = await (await fetch((await response.json()).url)).text();
  const gallery = await (await fetch(viewer.url)).text();
  assert.match(report, /quickstark\/skills/);
  assert.doesNotMatch(report, /forged-owner|private-client-project/);
  assert.doesNotMatch(gallery, /forged-owner|private-client-project/);
});

test("ingestion rejects a symbolic-link escape outside the approved project library", async (context) => {
  const { ingestion, directory } = await temporaryReadoutIngestion(context);
  const outside = await temporaryReadoutDirectory(context);
  await symlink(outside, join(directory, "github.com"), "dir");

  const response = await submitIngestion(ingestion, nativeIngestionEnvelope());

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "readout_unavailable" });
  assert.deepEqual(await readdir(outside), []);
});

test("an accepted skill run recovers its immutable report after an interrupted visible write", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const first = await submitIngestion(ingestion, nativeIngestionEnvelope());
  const accepted = await first.json();
  const pathname = new URL(accepted.url).pathname;
  const relativePath = decodeURIComponent(pathname).replace(/^\//, "");
  const reportPath = join(ingestion.directory, ...relativePath.split("/"));

  await unlink(reportPath);

  const recovered = await submitIngestion(ingestion, nativeIngestionEnvelope());
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).url, accepted.url);
  assert.equal((await fetch(accepted.url)).status, 200);
});

test("the publisher retries a transient report-ingestion outage within a strict bound", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  let attempts = 0;
  const gateway = createHttpServer(async (request, response) => {
    attempts += 1;

    if (attempts === 1) {
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "readout_unavailable" }));
      return;
    }

    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);

    const upstream = await fetch(new URL("api/v1/readouts", ingestion.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: request.headers.authorization,
      },
      body: Buffer.concat(chunks),
    });

    response.writeHead(upstream.status, { "Content-Type": "application/json" });
    response.end(await upstream.text());
  });

  await new Promise((done, fail) => {
    gateway.once("error", fail);
    gateway.listen(0, "127.0.0.1", done);
  });

  context.after(async () => {
    if (!gateway.listening) return;
    await new Promise((done, fail) => gateway.close((error) => error ? fail(error) : done()));
  });

  const gatewayPort = gateway.address().port;
  const result = await publishSkillReadout(nativeIngestionEnvelope(), {
    endpoint: `http://127.0.0.1:${gatewayPort}/api/v1/readouts`,
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: ["github.com/quickstark/skills"],
    maxAttempts: 2,
    retryDelay: 0,
  });

  assert.equal(attempts, 2);
  assert.equal(result.status, "published");
  assert.equal((await fetch(result.url)).status, 200);

  attempts = 0;

  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const { stdout } = await execFileAsync(process.execPath, [
    script,
    "publish",
    "--data", JSON.stringify(nativeIngestionEnvelope()),
    "--endpoint", `http://127.0.0.1:${gatewayPort}/api/v1/readouts`,
    "--allowed-projects", "github.com/quickstark/skills",
    "--report-base-url", viewer.url,
    "--max-attempts", "2",
    "--retry-delay", "0",
    "--json",
  ], {
    env: {
      ...process.env,
      QS_READOUT_PRODUCER_TOKEN: "test-only-codex-laptop-credential-1234567890",
    },
  });

  assert.equal(attempts, 2);
  assert.equal(JSON.parse(stdout).status, "published");
});

test("readout acceptance records only safe, redacted operational audit evidence", async (context) => {
  const events = [];
  const { ingestion } = await temporaryReadoutIngestion(context, {
    ingestion: { audit: (event) => events.push(event) },
  });
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope());

  assert.equal(response.status, 201);
  assert.equal(events.length, 1);
  assert.equal(events[0].producer, "codex-laptop");
  assert.equal(events[0].project, "github.com/quickstark/skills");
  assert.equal(events[0].status, 201);
  assert.equal(events[0].outcome, "created");
  assert.ok(!Number.isNaN(Date.parse(events[0].timestamp)));

  const recorded = JSON.stringify(events);
  assert.doesNotMatch(recorded, /test-only-codex-laptop-credential/);
  assert.doesNotMatch(recorded, /The real report is available/);
});

test("the actual production ingestion command emits redacted structured audit events", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const grantsPath = join(directory, "test-producer-grants.json");
  const secret = "test-only-codex-laptop-credential-1234567890";

  await writeFile(grantsPath, JSON.stringify({
    version: 1,
    producers: [{
      id: "codex-laptop",
      tokenSha256: createHash("sha256").update(secret).digest("hex"),
      projects: ["github.com/quickstark/skills"],
    }],
  }), { encoding: "utf8", mode: 0o600 });

  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const child = spawn(process.execPath, [
    script,
    "ingest",
    "--directory", directory,
    "--host", "127.0.0.1",
    "--port", "0",
    "--base-url", "http://127.0.0.1:4173/",
    "--allowed-projects", "github.com/quickstark/skills",
    "--producers-file", grantsPath,
  ], { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"] });

  context.after(() => {
    if (child.exitCode === null && !child.killed) child.kill();
  });

  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  const waitFor = (stream, current, pattern) => new Promise((done, fail) => {
    const finish = () => {
      if (!pattern.test(current())) return;
      clearTimeout(timeout);
      stream.removeListener("data", finish);
      child.removeListener("error", failure);
      done();
    };
    const failure = (error) => {
      clearTimeout(timeout);
      stream.removeListener("data", finish);
      fail(error);
    };
    const timeout = setTimeout(() => failure(new Error("The isolated ingestion command did not produce its expected operational evidence.")), 5000);

    stream.on("data", finish);
    child.once("error", failure);
    finish();
  });

  await waitFor(child.stdout, () => stdout, /QuickStark readout ingestion: http:\/\/127\.0\.0\.1:\d+\//);

  const url = stdout.match(/QuickStark readout ingestion: (http:\/\/127\.0\.0\.1:\d+\/)/)?.[1];
  assert.ok(url);

  const response = await submitIngestion({ url }, nativeIngestionEnvelope());
  assert.equal(response.status, 201);

  await waitFor(child.stderr, () => stderr, /"outcome":"created"/);

  const audit = JSON.parse(stderr.trim().split("\n").at(-1));
  assert.equal(audit.producer, "codex-laptop");
  assert.equal(audit.project, "github.com/quickstark/skills");
  assert.equal(audit.status, 201);
  assert.equal(audit.outcome, "created");
  assert.doesNotMatch(stderr, /test-only-codex-laptop-credential|The real report is available/);
});

test("rotating producer grants immediately revokes old tokens without restarting ingestion", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const grantsPath = join(directory, "producer-grants.json");
  const originalToken = "test-only-original-rotating-producer-1234567890";
  const rotatedToken = "test-only-replaced-rotating-producer-1234567890";
  const independentToken = "test-only-independent-producer-secret-1234567890";
  const grants = (token) => ({
    version: 1,
    producers: [
      {
        id: "codex-laptop",
        tokenSha256: createHash("sha256").update(token).digest("hex"),
        projects: ["github.com/quickstark/skills"],
      },
      {
        id: "independent-laptop",
        tokenSha256: createHash("sha256").update(independentToken).digest("hex"),
        projects: ["github.com/quickstark/skills"],
      },
    ],
  });

  await writeFile(grantsPath, JSON.stringify(grants(originalToken)), {
    encoding: "utf8",
    mode: 0o600,
  });

  const viewer = await startReadoutServer({
    directory,
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });

  context.after(async () => {
    if (!viewer.server.listening) return;
    await new Promise((done, fail) => viewer.server.close((error) => error ? fail(error) : done()));
  });

  const ingestion = await startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["github.com/quickstark/skills"],
    producersFile: grantsPath,
  });

  context.after(async () => {
    if (!ingestion.server.listening) return;
    await new Promise((done, fail) => ingestion.server.close((error) => error ? fail(error) : done()));
  });

  const first = await submitIngestion(ingestion, nativeIngestionEnvelope(), { token: originalToken });
  assert.equal(first.status, 201);
  const originalReport = await first.json();

  await writeFile(grantsPath, JSON.stringify(grants(rotatedToken)), { encoding: "utf8" });

  const revoked = await submitIngestion(ingestion, nativeIngestionEnvelope({
    runId: "e46fd0fd-94f1-4328-bd57-00c75143f470",
  }), { token: originalToken });
  assert.equal(revoked.status, 401);

  const rotated = await submitIngestion(ingestion, nativeIngestionEnvelope({
    runId: "e46fd0fd-94f1-4328-bd57-00c75143f471",
  }), { token: rotatedToken });
  assert.equal(rotated.status, 201);

  const independent = await submitIngestion(ingestion, nativeIngestionEnvelope({
    producer: "independent-laptop",
    runId: "e46fd0fd-94f1-4328-bd57-00c75143f472",
  }), { token: independentToken });
  assert.equal(independent.status, 201);

  assert.equal((await fetch(originalReport.url)).status, 200);
});

test("immutable skill submissions remain idempotent after an ingestion-server restart", async (context) => {
  const { directory, ingestion, viewer } = await temporaryReadoutIngestion(context);
  const first = await submitIngestion(ingestion, nativeIngestionEnvelope());
  const created = await first.json();

  await new Promise((done, fail) => ingestion.server.close((error) => error ? fail(error) : done()));

  const restarted = await startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["github.com/quickstark/skills"],
    producers: [{
      id: "codex-laptop",
      token: "test-only-codex-laptop-credential-1234567890",
      projects: ["github.com/quickstark/skills"],
    }],
  });

  context.after(async () => {
    if (!restarted.server.listening) return;
    await new Promise((done, fail) => restarted.server.close((error) => error ? fail(error) : done()));
  });

  const retry = await submitIngestion(restarted, nativeIngestionEnvelope());

  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).url, created.url);
  assert.equal((await fetch(created.url)).status, 200);
});

test("the portable publisher rejects forged hosted report origins, paths, and skills", async (context) => {
  let accepted;
  const imposter = createHttpServer((_request, response) => {
    response.writeHead(201, { "Content-Type": "application/json" });
    response.end(JSON.stringify(accepted));
  });

  await new Promise((done, fail) => {
    imposter.once("error", fail);
    imposter.listen(0, "127.0.0.1", done);
  });

  context.after(async () => {
    if (!imposter.listening) return;
    await new Promise((done, fail) => imposter.close((error) => error ? fail(error) : done()));
  });

  const endpoint = `http://127.0.0.1:${imposter.address().port}/api/v1/readouts`;
  const options = {
    endpoint,
    token: "test-only-codex-laptop-credential-1234567890",
    allowedProjects: ["github.com/quickstark/skills"],
    reportBaseUrl: "http://127.0.0.1:4173/",
    maxAttempts: 1,
  };
  const standard = {
    status: "created",
    project: "github.com/quickstark/skills",
    skill: "qs-code-build",
    reportId: "a6ba1c2b-d2a5-4962-b591-7d2bec883021",
  };

  for (const malicious of [
    { ...standard, url: "http://127.0.0.1:8443/github.com/quickstark/skills/2026/07/qs-code-build--2026-07-26T12-00-00-000Z--codex-laptop--a6ba1c2b-d2a5-4962-b591-7d2bec883021.html" },
    { ...standard, url: "http://127.0.0.1:4173/private/unrelated.html" },
    { ...standard, url: "http://127.0.0.1:4173/github.com/quickstark/skills/2026/07/qs-code-build--2026-07-26T12-00-00-000Z--codex-laptop--ffffffff-d2a5-4962-b591-7d2bec883021.html" },
    { ...standard, skill: "different-skill", url: "http://127.0.0.1:4173/github.com/quickstark/skills/2026/07/qs-code-build--2026-07-26T12-00-00-000Z--codex-laptop--a6ba1c2b-d2a5-4962-b591-7d2bec883021.html" },
  ]) {
    accepted = malicious;
    assert.deepEqual(await publishSkillReadout(nativeIngestionEnvelope(), options), {
      status: "local-only",
      reason: "invalid_publication_response",
    });
  }
});

test("the catalog preserves all 22 upstream skills and adds dedicated deployment and documentation skills", () => {
  assert.equal(UPSTREAM_SKILLS.length, 22);
  assert.equal(SKILLS.length, 24);
  assert.equal(SKILLS.filter((skill) => skill.upstreamName === null).length, 2);
  assert.ok(SKILLS.some((skill) => skill.name === "qs-deploy-release"));
  assert.ok(SKILLS.some((skill) => skill.name === "qs-code-document"));
});

test("skill names are unique, discoverable, and organized by purpose", () => {
  const names = SKILLS.map((skill) => skill.name);
  assert.equal(new Set(names).size, names.length);

  for (const name of names) {
    assert.match(name, new RegExp(`^${COLLECTION_PREFIX}-[a-z0-9]+(?:-[a-z0-9]+)*$`));
    assert.ok(name.length <= 64, `${name} exceeds the skill naming limit`);
  }

  for (const category of ["plan", "design", "code", "test", "review", "git", "flow", "deploy"]) {
    assert.ok(names.some((name) => name.startsWith(`${COLLECTION_PREFIX}-${category}-`)), `missing ${category} skills`);
  }
});

test("every skill has valid, specific, non-circular next-step recommendations", () => {
  const catalogNames = SKILLS.map((skill) => skill.name).sort();
  assert.deepEqual(Object.keys(NEXT_SKILLS_BY_NAME).sort(), catalogNames);

  for (const skill of SKILLS) {
    const nextSkills = NEXT_SKILLS_BY_NAME[skill.name];

    assert.ok(Array.isArray(nextSkills), `${skill.name} has no next-skill list`);
    assert.ok(nextSkills.length >= 1 && nextSkills.length <= 3);
    assert.equal(
      new Set(nextSkills.map((next) => next.name)).size,
      nextSkills.length,
      `${skill.name} repeats a recommendation`,
    );

    for (const next of nextSkills) {
      assert.ok(SKILLS_BY_NAME.has(next.name), `${skill.name} recommends an unknown skill`);
      assert.notEqual(next.name, skill.name, `${skill.name} recommends itself`);
      assert.equal(typeof next.reason, "string");
      assert.ok(next.reason.trim().length >= 20, `${skill.name} has a vague next-step reason`);
    }
  }
});

test("every promoted skill has a distinct, self-contained architecture-quality HTML readout", () => {
  for (const skill of SKILLS) {
    const html = renderSkillReadout({
      skill: skill.name,
      status: "Completed",
      outcome: `Completed the ${skill.displayName} workflow.`,
      findings: [{ title: "Skill purpose", detail: skill.shortDescription }],
    });

    assert.match(html, /^<!doctype html>/i, `${skill.name} is not a browser-ready HTML document`);
    assert.ok(html.includes(skill.displayName), `${skill.name} omits its readable display name`);
    assert.ok(html.includes(`/${skill.name}`), `${skill.name} omits its actual command`);
    assert.ok(html.includes('content="Completed"'), `${skill.name} omits the actual report status`);
    assert.ok(html.includes("Next best skills"), `${skill.name} omits follow-on guidance`);
    assert.ok(html.includes("Self-contained HTML"), `${skill.name} omits its offline guarantee`);
    assert.doesNotMatch(html, /<script\b/i, `${skill.name} unexpectedly depends on executable scripts`);
    assert.doesNotMatch(html, /<link\b[^>]+rel=["']stylesheet/i, `${skill.name} depends on external styles`);

    for (const next of NEXT_SKILLS_BY_NAME[skill.name]) {
      assert.ok(html.includes(`/${next.name}`), `${skill.name} omits /${next.name}`);
    }
  }
});

test("every promoted skill has its own complete, purpose-specific visual report profile", () => {
  const names = SKILLS.map((skill) => skill.name).sort();

  assert.deepEqual(Object.keys(READOUT_PROFILES_BY_NAME).sort(), names);
  assert.equal(
    new Set(Object.values(READOUT_PROFILES_BY_NAME).map((profile) => profile.title)).size,
    SKILLS.length,
    "Every skill must communicate its own distinct report purpose.",
  );

  for (const skill of SKILLS) {
    const profile = READOUT_PROFILES_BY_NAME[skill.name];

    assert.ok(profile.title.length >= 8, `${skill.name} needs a meaningful report title.`);
    assert.ok(profile.signal.length >= 8, `${skill.name} must identify its actual primary signal.`);
    assert.ok(
      ["map", "flow", "bars", "matrix", "checks", "brief"].includes(profile.visualization),
      `${skill.name} needs a supported, self-contained visual cue.`,
    );
    assert.deepEqual(
      [...profile.sections].sort(),
      ["checks", "decisions", "findings", "outputs"],
      `${skill.name} must retain every actual report field in a purpose-specific order.`,
    );
  }
});

test("actual skill reports automatically identify the actual execution machine near the top", () => {
  for (const skill of SKILLS) {
    const input = {
      skill: skill.name,
      outcome: `Verified the actual ${skill.displayName} execution machine.`,
    };
    const report = normalizeSkillReadout(input);
    const html = renderSkillReadout(input);

    assert.equal(report.execution.machine.hostname, hostname(), skill.name);
    assert.equal(report.execution.machine.platform, platform(), skill.name);
    assert.match(html, /Execution context/);
    assert.ok(html.includes(hostname()), `${skill.name} omits its actual execution machine`);
    assert.ok(html.includes(`<meta name="quickstark:machine" content="${hostname()}">`));
    assert.ok(
      html.indexOf("Execution context") < html.indexOf("Next best skills"),
      `${skill.name} hides the execution machine below the completion summary`,
    );
  }
});

test("deployment reports prominently identify only verified deployment environments and URLs", () => {
  const url = "https://reports.quickstark.com/";
  const html = renderSkillReadout({
    skill: "qs-deploy-release",
    outcome: "Verified the authenticated report deployment.",
    execution: {
      deployments: [
        {
          environment: "production",
          status: "verified",
          url,
          summary: "Authelia protects the production report viewer.",
        },
      ],
    },
  });

  assert.match(html, /Execution context/);
  assert.match(html, /Verified deployment · production/);
  assert.ok(html.includes(url));
  assert.match(html, /Authelia protects the production report viewer/);
  assert.match(html, /<meta name="quickstark:deployment-url"/);
  assert.ok(html.indexOf("Verified deployment · production") < html.indexOf("Next best skills"));
});

test("architecture, module, implementation, and documentation reports foreground actual changed files", () => {
  for (const skill of [
    "qs-design-architecture",
    "qs-design-modules",
    "qs-code-build",
    "qs-code-document",
  ]) {
    const html = renderSkillReadout({
      skill,
      outcome: "Recorded only files actually modified by this skill run.",
      execution: {
        files: [
          {
            path: "scripts/qs-skill-readout.mjs",
            change: "modified",
            summary: "Display verified run context near the report heading.",
          },
          {
            path: "docs/engineering/qs-code-document.md",
            change: "added",
            summary: "Describe the new documentation workflow.",
          },
        ],
      },
    });

    assert.match(html, /Execution context/);
    assert.match(html, /Modified file/);
    assert.match(html, /Added file/);
    assert.match(html, /scripts\/qs-skill-readout\.mjs/);
    assert.match(html, /docs\/engineering\/qs-code-document\.md/);
    assert.match(html, /quickstark:changed-file/);
  }
});

test("execution context rejects fabricated machines, unsafe deployment URLs, and unsafe file paths", () => {
  const base = {
    skill: "qs-code-build",
    outcome: "Validate actual execution evidence.",
  };

  for (const [label, execution, expected] of [
    [
      "different execution machine",
      { machine: { hostname: "invented-remote-host", platform: platform() } },
      /actual execution machine/i,
    ],
    [
      "different execution platform",
      { machine: { hostname: hostname(), platform: "invented-os" } },
      /actual execution platform/i,
    ],
    [
      "unsafe deployment protocol",
      { deployments: [{ environment: "production", status: "verified", url: "javascript:alert(1)" }] },
      /HTTP or HTTPS deployment URL/i,
    ],
    [
      "credential-bearing deployment URL",
      { deployments: [{ environment: "production", status: "verified", url: "https://token@reports.quickstark.com/" }] },
      /credentials/i,
    ],
    [
      "query-bearing deployment URL",
      { deployments: [{ environment: "production", status: "verified", url: "https://reports.quickstark.com/?token=secret" }] },
      /query parameters/i,
    ],
    [
      "invented deployment status",
      { deployments: [{ environment: "production", status: "probably", url: "https://reports.quickstark.com/" }] },
      /actual deployment status/i,
    ],
    [
      "absolute machine path",
      { files: [{ path: "/home/private/secrets.txt", change: "modified" }] },
      /relative project file/i,
    ],
    [
      "traversal path",
      { files: [{ path: "../../private.txt", change: "modified" }] },
      /relative project file/i,
    ],
    [
      "secret environment file",
      { files: [{ path: ".env.production", change: "modified" }] },
      /sensitive/i,
    ],
    [
      "invented file change",
      { files: [{ path: "README.md", change: "imagined" }] },
      /actual file change/i,
    ],
  ]) {
    assert.throws(() => normalizeSkillReadout({ ...base, execution }), expected, label);
  }
});

test("changed-file metadata rejects Git, cloud, package-manager, and private-key credential paths", () => {
  for (const path of [
    ".git/config",
    ".git-credentials",
    ".npmrc",
    ".pypirc",
    ".netrc",
    ".envrc",
    ".aws/credentials",
    ".ssh/id_rsa",
    ".ssh/id_ed25519",
    ".docker/config.json",
    ".kube/config",
    "credentials.json",
    "secrets.yaml",
    "private.key",
    "config/service-account.json",
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-code-build",
      outcome: "Validate safe changed-file evidence.",
      execution: {
        files: [{ path, change: "modified" }],
      },
    }), /sensitive/i, path);
  }
});

test("execution context escapes observed summaries and never attributes unrelated dirty files", () => {
  const hostile = '<script>alert("unsafe")</script>';
  const html = renderSkillReadout({
    skill: "qs-code-document",
    outcome: "Recorded only the documentation file changed by this run.",
    execution: {
      files: [{
        path: "docs/engineering/qs-code-document.md",
        change: "added",
        summary: hostile,
      }],
    },
  });

  assert.match(html, /docs\/engineering\/qs-code-document\.md/);
  assert.match(html, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /package\.json/, "Unrelated dirty files must not be attributed to this skill run.");

  assert.throws(() => normalizeSkillReadout({
    skill: "qs-code-document",
    outcome: "Validate the actual documentation change.",
    execution: {
      files: [
        { path: "docs/engineering/qs-code-document.md", change: "added" },
        { path: "docs/engineering/qs-code-document.md", change: "modified" },
      ],
    },
  }), /must not repeat/i);
});

test("catalog previews neither expose the execution machine nor claim deployments or changed files", () => {
  const input = {
    skill: "qs-code-document",
    status: "Preview",
    skillsUsed: [],
    outcome: "Catalog preview only.",
  };
  const html = renderSkillReadout(input);

  assert.doesNotMatch(html, /Execution context/);
  assert.doesNotMatch(html, /quickstark:machine|quickstark:deployment-url|quickstark:changed-file/);

  assert.throws(() => normalizeSkillReadout({
    ...input,
    execution: {
      deployments: [{
        environment: "production",
        status: "verified",
        url: "https://reports.quickstark.com/",
      }],
    },
  }), /preview cannot claim actual execution/i);

  assert.throws(() => normalizeSkillReadout({
    ...input,
    execution: { files: [{ path: "README.md", change: "modified" }] },
  }), /preview cannot claim actual execution/i);
});

test("the documentation skill has a distinct, evidence-led documentation coverage report", () => {
  const profile = READOUT_PROFILES_BY_NAME["qs-code-document"];

  assert.equal(profile.title, "Documentation coverage");
  assert.equal(profile.visualization, "checks");

  const html = renderSkillReadout({
    skill: "qs-code-document",
    outcome: "Documented the verified report contract and deployment behavior.",
    execution: {
      files: [{
        path: "docs/skill-report-assessment.md",
        change: "modified",
        summary: "Document machine, deployment, and changed-file reporting.",
      }],
    },
    outputs: [{
      title: "Report evidence documentation",
      detail: "Documented only observed behavior and supported report fields.",
    }],
    checks: [{
      title: "Documentation examples agree with implementation",
      status: "passed",
      detail: "Verified each reported field against the actual renderer.",
    }],
  });

  assert.match(html, /Documentation coverage/);
  assert.match(html, /Documented artifacts/);
  assert.match(html, /Documentation validation/);
  assert.match(html, /docs\/skill-report-assessment\.md/);
  assert.match(html, /1 passed/i);
});

test("GitHub-facing reports prominently preserve verified release, issue, PR, and commit evidence", () => {
  const provenance = verifiedGithubProvenance();
  const input = {
    skill: "qs-git-merge",
    outcome: "Merged and verified the observed release changes.",
    projectIdentity: explicitProject("skills"),
    provenance,
  };
  const report = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);

  assert.equal(report.provenance.pullRequests[0].number, 42);
  assert.equal(report.provenance.pullRequests[0].state, "merged");
  assert.equal(report.provenance.closedIssues[0].closedByRelease, true);
  assert.equal(report.provenance.release.version, "v2.3.1");
  assert.equal(report.provenance.commit.published, true);
  assert.match(html, /Verified delivery evidence/);
  assert.match(html, /Merged pull request/);
  assert.match(html, /#42/);
  assert.match(html, /Issues verified as closed by this release/);
  assert.match(html, /#17/);
  assert.match(html, /Released version/);
  assert.match(html, /v2\.3\.1/);
  assert.match(html, /Published commit/);
  assert.match(html, /0123456789abcdef0123456789abcdef01234567/);
  assert.match(html, /https:\/\/github\.com\/quickstark\/skills\/pull\/42/);
  assert.match(html, /quickstark:release-version/);
  assert.match(html, /quickstark:commit-sha/);
  assert.ok(
    html.indexOf("Verified delivery evidence") < html.indexOf("Next best skills"),
    "Verified delivery evidence should appear before follow-on recommendations.",
  );
});

test("partial delivery evidence distinguishes a verified local commit from a published release", () => {
  const sha = "70ac659d11111111111111111111111111111111";
  const html = renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Recorded a locally committed implementation.",
    provenance: { commit: { sha, published: false } },
  });

  assert.match(html, /Verified delivery evidence/);
  assert.match(html, /Local commit/);
  assert.match(html, new RegExp(sha));
  assert.doesNotMatch(html, /Published commit|Merged pull request|Released version|Closed issues/);
});

test("reports omit delivery provenance completely when no GitHub evidence was observed", () => {
  for (const skill of SKILLS) {
    const html = renderSkillReadout({
      skill: skill.name,
      outcome: `Completed the actual ${skill.displayName} workflow.`,
    });

    assert.doesNotMatch(html, /Verified delivery evidence/, skill.name);
    assert.doesNotMatch(html, /quickstark:release-version|quickstark:commit-sha/, skill.name);
  }
});

test("GitHub provenance rejects unsafe, mismatched, unverified, and cross-project records", () => {
  const base = {
    skill: "qs-deploy-release",
    outcome: "Validate release evidence.",
    projectIdentity: explicitProject("skills"),
  };

  for (const [label, provenance, expected] of [
    [
      "unsafe pull request protocol",
      { pullRequests: [{ number: 42, url: "javascript:alert(1)" }] },
      /HTTPS GitHub URL/i,
    ],
    [
      "credential-bearing pull request URL",
      { pullRequests: [{ number: 42, url: "https://token@github.com/quickstark/skills/pull/42" }] },
      /credentials/i,
    ],
    [
      "different repository",
      { pullRequests: [{ number: 42, url: "https://github.com/other/project/pull/42" }] },
      /verified project/i,
    ],
    [
      "different pull request number",
      { pullRequests: [{ number: 42, url: "https://github.com/quickstark/skills/pull/43" }] },
      /pull request number/i,
    ],
    [
      "open issue presented as closed",
      { closedIssues: [{ number: 17, state: "open", url: "https://github.com/quickstark/skills/issues/17" }] },
      /actually closed/i,
    ],
    [
      "closure attributed to a nonexistent release",
      { closedIssues: [{ number: 17, state: "closed", closedByRelease: true, url: "https://github.com/quickstark/skills/issues/17" }] },
      /verified release/i,
    ],
    [
      "invalid Git hash",
      { commit: { sha: "not-a-commit" } },
      /Git commit hash/i,
    ],
    [
      "abbreviated Git hash",
      { commit: { sha: "70ac659" } },
      /complete.*Git commit hash/i,
    ],
    [
      "unpublished commit presented as a remote link",
      {
        commit: {
          sha: "0123456789abcdef0123456789abcdef01234567",
          published: false,
          url: "https://github.com/quickstark/skills/commit/0123456789abcdef0123456789abcdef01234567",
        },
      },
      /published commit/i,
    ],
    [
      "release tag mismatch",
      { release: { version: "v2.3.1", url: "https://github.com/quickstark/skills/releases/tag/v9.9.9" } },
      /release version/i,
    ],
  ]) {
    assert.throws(() => normalizeSkillReadout({ ...base, provenance }), expected, label);
  }
});

test("GitHub delivery evidence cannot be attached to a verified non-GitHub project", () => {
  for (const projectIdentity of [
    {
      host: "gitlab.com",
      owner: "acme",
      repository: "private",
      key: "gitlab.com/acme/private",
      label: "acme/private",
      source: "git-origin",
    },
    {
      host: "local",
      owner: "workspace",
      repository: "private-0123456789ab",
      key: "local/workspace/private-0123456789ab",
      label: "Private local workspace",
      source: "workspace",
    },
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-git-merge",
      outcome: "Verify repository isolation.",
      projectIdentity,
      provenance: {
        pullRequests: [{
          number: 42,
          url: "https://github.com/quickstark/skills/pull/42",
        }],
      },
    }), /verified project/i, projectIdentity.key);
  }
});

test("delivery evidence escapes externally controlled GitHub record titles", () => {
  const hostile = '<script>alert("unsafe")</script>';
  const provenance = verifiedGithubProvenance();

  provenance.pullRequests[0].title = hostile;
  provenance.closedIssues[0].title = hostile;

  const html = renderSkillReadout({
    skill: "qs-git-merge",
    outcome: "Rendered independently verified GitHub records safely.",
    projectIdentity: explicitProject("skills"),
    provenance,
  });

  assert.match(html, /Verified delivery evidence/);
  assert.match(html, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("catalog previews reject all claimed GitHub and release provenance", () => {
  assert.throws(() => normalizeSkillReadout({
    skill: "qs-deploy-release",
    status: "Preview",
    skillsUsed: [],
    outcome: "Catalog preview only.",
    provenance: verifiedGithubProvenance(),
  }), /preview cannot claim actual.*provenance/i);
});

test("review reports preserve independent Standards and Specification priorities", () => {
  const html = renderSkillReadout({
    skill: "qs-review-code",
    outcome: "Reviewed standards and specification requirements independently.",
    findings: [
      {
        title: "Verify repository-matched pull request URLs",
        detail: "scripts/qs-skill-readout.mjs:350",
        axis: "standards",
        priority: "P1",
      },
      {
        title: "Preserve actual released issue closures",
        detail: "docs/specs/project-aware-skill-readout-gallery.md:106",
        axis: "specification",
        priority: "P2",
      },
    ],
  });

  assert.match(html, /Standards findings/);
  assert.match(html, /Specification findings/);
  assert.match(html, /Verify repository-matched pull request URLs/);
  assert.match(html, /Preserve actual released issue closures/);
  assert.match(html, /\bP1\b/);
  assert.match(html, /\bP2\b/);
  assert.ok(
    html.indexOf("Standards findings") < html.indexOf("Specification findings"),
    "Standards and specification findings must remain independently readable.",
  );
});

test("review findings reject invented priority and assessment axes", () => {
  for (const finding of [
    { title: "Unknown priority", priority: "urgent" },
    { title: "Unknown axis", axis: "vibes" },
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-review-code",
      outcome: "Validate a real review finding.",
      findings: [finding],
    }), /priority|review axis/i);
  }
});

test("visual flows draw arrows only for explicitly recorded item relationships", () => {
  const input = {
    skill: "qs-plan-tickets",
    outcome: "Recorded two independently observed implementation tickets.",
    outputs: [
      { title: "Create the report contract", detail: "The contract is available." },
      { title: "Verify the hosted readout", detail: "The behavior is verified." },
    ],
    decisions: [{ title: "Preserve backward compatibility" }],
  };
  const independent = renderSkillReadout(input);

  assert.match(independent, /Implementation ticket board/);
  assert.doesNotMatch(independent, /<path\b/, "Independent observations must not be joined by invented arrows.");

  const related = renderSkillReadout({
    ...input,
    relationships: [
      {
        from: "Create the report contract",
        to: "Preserve backward compatibility",
        label: "verified constraint",
      },
    ],
  });

  assert.match(related, /<path\b/);
  assert.match(related, /1 verified relationship/i);
});

test("visual relationships must connect actual recorded results", () => {
  assert.throws(() => normalizeSkillReadout({
    skill: "qs-design-domain",
    outcome: "Validate observed domain relationships.",
    findings: [{ title: "Verified concept" }],
    relationships: [{ from: "Verified concept", to: "Invented concept" }],
  }), /actual recorded/i);

  assert.throws(() => normalizeSkillReadout({
    skill: "qs-design-domain",
    status: "Preview",
    skillsUsed: [],
    outcome: "Catalog preview only.",
    findings: [{ title: "Catalog purpose" }],
    relationships: [{ from: "Catalog purpose", to: "Catalog purpose" }],
  }), /preview cannot claim actual.*relationships/i);
});

test("domain maps render only explicitly verified concept relationships", () => {
  const input = {
    skill: "qs-design-domain",
    outcome: "Recorded an independently verified domain relationship.",
    findings: [
      { title: "Delivery provenance" },
      { title: "Published commit" },
    ],
  };

  assert.doesNotMatch(renderSkillReadout(input), /<path\b/);

  const html = renderSkillReadout({
    ...input,
    relationships: [
      {
        from: "Delivery provenance",
        to: "Published commit",
        label: "includes verified commit",
      },
    ],
  });

  assert.match(html, /1 verified relationship/i);
  assert.match(html, /includes verified commit/);
  assert.match(html, /<svg\b[^>]*role="img"/);
});

test("domain-design reports visually map actual resolved concepts and shared vocabulary", () => {
  const html = renderSkillReadout({
    skill: "qs-design-domain",
    outcome: "Defined the vocabulary for purpose-specific skill readouts.",
    findings: [
      { title: "Report profile", detail: "The purpose-specific presentation of one promoted skill." },
      { title: "Primary signal", detail: "The real result that must be understood first." },
    ],
    decisions: [
      { title: "A preview is not a skill run", detail: "Previews never claim observed work." },
    ],
  });

  assert.match(html, /Domain model/);
  assert.match(html, /Shared vocabulary/);
  assert.match(html, /Report profile/);
  assert.match(html, /Primary signal/);
  assert.match(html, /A preview is not a skill run/);
  assert.match(html, /<svg\b[^>]*role="img"/);
  assert.match(html, /aria-label="[^"]*[Dd]omain/);
  assert.match(html, /quickstark:report-profile/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("research reports foreground observed evidence and a truthful compact signal chart", () => {
  const html = renderSkillReadout({
    skill: "qs-plan-research",
    outcome: "Compared authenticated hosting options against the existing infrastructure.",
    findings: [
      { title: "Cloudflare DNS", detail: "The proxied hostname resolves publicly." },
      { title: "Traefik routing", detail: "The authenticated service is healthy." },
    ],
    decisions: [
      { title: "Use the existing Authelia boundary", detail: "Reuse the verified browser sign-in." },
    ],
  });

  assert.match(html, /Research brief/);
  assert.match(html, /Evidence/);
  assert.match(html, /Cloudflare DNS/);
  assert.match(html, /Traefik routing/);
  assert.match(html, /<svg\b[^>]*role="img"/);
  assert.doesNotMatch(html.slice(html.indexOf("<body")), /100%|guaranteed|fabricated/i);
});

test("test-driven reports visualize only checks that actually ran", () => {
  const html = renderSkillReadout({
    skill: "qs-test-tdd",
    outcome: "Verified the compact visual report behavior.",
    checks: [
      { title: "Purpose-specific domain report", status: "passed", detail: "The actual renderer returned an accessible concept map." },
      { title: "Optional screenshot review", status: "skipped", detail: "A visual browser was unavailable." },
    ],
  });

  assert.match(html, /Test results/);
  assert.match(html, /Verification/);
  assert.match(html, /Purpose-specific domain report/);
  assert.match(html, /Optional screenshot review/);
  assert.match(html, /1 passed/i);
  assert.match(html, /1 skipped/i);
  assert.doesNotMatch(html.slice(html.indexOf("<body")), /100%|all tests passed/i);
});

test("implementation and review reports expose different useful results", () => {
  const build = renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Implemented purpose-specific readout profiles.",
    outputs: [
      { title: "Catalog profiles", detail: "Added a distinct purpose for every promoted skill." },
    ],
    checks: [
      { title: "Profile coverage", status: "passed", detail: "All 24 real skills are represented." },
    ],
  });
  const review = renderSkillReadout({
    skill: "qs-review-code",
    outcome: "Reviewed the skill-specific report implementation.",
    findings: [
      { title: "Standards", detail: "No security or code-standard findings." },
      { title: "Specification", detail: "The implementation matches the requested compact report behavior." },
    ],
    checks: [
      { title: "Independent review", status: "passed", detail: "Both review axes completed." },
    ],
  });

  assert.match(build, /Delivery summary/);
  assert.match(build, /Deliverables/);
  assert.match(build, /Catalog profiles/);
  assert.match(review, /Review findings/);
  assert.match(review, /Review matrix/);
  assert.match(review, /Standards/);
  assert.match(review, /Specification/);
  assert.notEqual(build, review);
});

test("roadmap and release reports prioritize actual decisions and observed release gates", () => {
  const roadmap = renderSkillReadout({
    skill: "qs-plan-roadmap",
    outcome: "Ordered the independently recorded report design decisions.",
    decisions: [
      { title: "Model the domain vocabulary", detail: "Resolve purpose, primary signals, and preview semantics." },
      { title: "Ship purpose-specific layouts", detail: "Implement and verify all real skill profiles." },
    ],
  });
  const release = renderSkillReadout({
    skill: "qs-deploy-release",
    outcome: "Verified and redeployed the existing readout service.",
    checks: [
      { title: "Docker health", status: "passed", detail: "The approved deployed service is healthy." },
      { title: "Authelia", status: "passed", detail: "Anonymous requests redirect to sign-in." },
    ],
  });

  assert.match(roadmap, /Delivery roadmap/);
  assert.match(roadmap, /Decision sequence/);
  assert.match(roadmap, /Model the domain vocabulary/);
  assert.match(roadmap, /<svg\b[^>]*role="img"/);
  assert.match(release, /Release readiness/);
  assert.match(release, /Release gates/);
  assert.match(release, /2 passed/i);
  assert.match(release, /Docker health/);
  assert.match(release, /Authelia/);
});

test("skill-specific visualizations escape hostile chart and concept-map labels", () => {
  const hostile = '<script>alert("unsafe")</script>';
  const html = renderSkillReadout({
    skill: "qs-design-domain",
    outcome: "Escaped externally controlled domain terms.",
    findings: [{ title: hostile, detail: hostile }],
    decisions: [{ title: hostile, detail: hostile }],
  });

  assert.match(html, /<svg\b[^>]*role="img"/);
  assert.match(html, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("reports without observed signals omit decorative charts and zero-value metric cards", () => {
  const html = renderSkillReadout({
    skill: "qs-design-domain",
    outcome: "A domain question remains to be clarified.",
    status: "Awaiting input",
  });
  const body = html.slice(html.indexOf("<body"));

  assert.match(body, /Awaiting input/);
  assert.match(body, /Domain model/);
  assert.doesNotMatch(body, /<svg\b/i);
  assert.doesNotMatch(body, /class="metrics"/);
  assert.doesNotMatch(body, /class="signal-panel"/);
});

test("skill-specific preview layouts never invent activity, checks, or chart values", () => {
  for (const skill of SKILLS) {
    const html = renderSkillReadout({
      skill: skill.name,
      status: "Preview",
      skillsUsed: [],
      outcome: `Layout preview for ${skill.displayName}; no skill has been run.`,
      findings: [
        { title: "Purpose", detail: skill.shortDescription },
        { title: "Invocation", detail: "Catalog information only; no skill was invoked." },
      ],
    });

    assert.match(html, /Catalog preview only/i, `${skill.name} must identify a catalog preview.`);
    assert.match(html, /No skill has been run/i, `${skill.name} cannot imply actual work.`);
    const body = html.slice(html.indexOf("<body"));

    assert.doesNotMatch(body, /class="skills-used"/, `${skill.name} cannot claim actual skill use.`);
    assert.doesNotMatch(body, /class="[^"]*\bcheck-passed\b/, `${skill.name} cannot invent a passing check.`);
    assert.doesNotMatch(body, /\b100%\b/, `${skill.name} cannot invent chart progress.`);
    assert.doesNotMatch(body, /class="metrics"/, `${skill.name} cannot represent catalog copy as observed metrics.`);
    assert.doesNotMatch(body, /class="signal-panel"/, `${skill.name} cannot chart catalog-only results.`);
    assert.match(body, /Catalog information/, `${skill.name} should clearly label catalog-only descriptions.`);
    assert.match(body, />Purpose</, `${skill.name} should preserve its actual catalog explanation.`);
    assert.match(body, />Invocation</, `${skill.name} should preserve its actual invocation description.`);
  }
});

test("catalog previews reject fabricated decisions, deliverables, and validation results", () => {
  for (const [field, value] of [
    ["decisions", [{ title: "Invented decision", detail: "No preview actually chose this." }]],
    ["outputs", [{ title: "Invented artifact", detail: "No preview actually produced this." }]],
    ["checks", [{ title: "Invented test", status: "passed", detail: "No preview actually ran this." }]],
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-design-domain",
      status: "Preview",
      skillsUsed: [],
      outcome: "Catalog preview only.",
      [field]: value,
    }), /preview cannot claim actual/i, `Preview ${field} must not claim actual work.`);
  }
});

test("readouts escape user-controlled content and never activate unsafe artifact links", () => {
  const hostile = '<script>alert("unsafe")</script>';
  const html = renderSkillReadout({
    skill: "qs-code-build",
    status: "Completed",
    outcome: hostile,
    findings: [{ title: hostile, detail: hostile }],
    outputs: [{ title: "Artifact", detail: hostile, href: "javascript:alert(1)" }],
  });

  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /href=["']javascript:/i);
  assert.ok(html.includes("&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;"));
});

test("readouts distinguish actually employed skills from catalog recommendations", () => {
  const report = normalizeSkillReadout({
    skill: "qs-design-architecture",
    outcome: "Selected the highest-value architectural improvement.",
    skillsUsed: ["qs-design-architecture", "qs-design-modules"],
  });

  assert.deepEqual(report.skillsUsed, ["qs-design-architecture", "qs-design-modules"]);
  assert.deepEqual(
    report.nextSkills.map((next) => next.name),
    NEXT_SKILLS_BY_NAME["qs-design-architecture"].map((next) => next.name),
  );
});

test("completed readouts can honestly report that no further skill is required", () => {
  const html = renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Completed the exact requested change.",
    nextSkills: [],
  });

  assert.ok(html.includes("None — the requested work is complete."));
});

test("readouts reject unknown skills, fabricated skill usage, and irrelevant next steps", () => {
  assert.throws(
    () => normalizeSkillReadout({ skill: "qs-made-up", outcome: "No real skill." }),
    /not a promoted QuickStark skill/,
  );
  assert.throws(
    () => normalizeSkillReadout({
      skill: "qs-code-build",
      outcome: "A build was performed.",
      skillsUsed: ["qs-review-code"],
    }),
    /actual active skill/,
  );
  assert.throws(
    () => normalizeSkillReadout({
      skill: "qs-code-build",
      outcome: "A build was performed.",
      nextSkills: ["qs-help"],
    }),
    /not an approved next step/,
  );
  assert.throws(
    () => normalizeSkillReadout({
      skill: "qs-code-build",
      status: "Preview",
      outcome: "This is only a preview.",
      skillsUsed: ["qs-code-build"],
    }),
    /cannot claim that a skill has been used/,
  );
});

test("readout check cards report only explicit, valid validation results", () => {
  const html = renderSkillReadout({
    skill: "qs-test-tdd",
    outcome: "Completed the red-green test loop.",
    checks: [
      { title: "Regression suite", status: "passed", detail: "All observed tests passed." },
      { title: "Optional browser test", status: "skipped", detail: "No browser change was in scope." },
    ],
  });

  assert.ok(html.includes("check-passed"));
  assert.ok(html.includes("check-skipped"));
  assert.throws(
    () => normalizeSkillReadout({
      skill: "qs-test-tdd",
      outcome: "Ran tests.",
      checks: [{ title: "Imaginary check", status: "success-ish" }],
    }),
    /must be passed, failed, skipped, or info/,
  );
});

test("readouts are written as unique, private, remotely linkable HTML files", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const input = {
    skill: "qs-plan-clarify",
    outcome: "Clarified the boundaries and success criteria.",
  };

  const first = await writeSkillReadout(input, {
    directory,
    baseUrl: "http://192.168.1.200:4173/r/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/",
  });
  const second = await writeSkillReadout(input, { directory });

  assert.equal(first.directory, directory);
  assert.match(first.filename, /^qs-plan-clarify--.*--[a-f0-9]{8}\.html$/);
  assert.notEqual(first.filename, second.filename);
  assert.equal(
    first.url,
    `http://192.168.1.200:4173/r/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/${first.filename}`,
  );
  assert.equal(second.url, null);
  assert.match(await readFile(first.path, "utf8"), /Clarified the boundaries/);
  assert.equal((await stat(first.path)).mode & 0o777, 0o600);
});

test("skill readouts identify equivalent HTTPS and SSH Git origins as the same canonical project", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const remotes = [
    "https://github.com/quickstark/skills.git",
    "https://github.com:443/quickstark/skills.git",
    "git@github.com:quickstark/skills.git",
    "deployment-user@github.com:quickstark/skills.git",
    "ssh://git@github.com/quickstark/skills.git",
    "ssh://git@github.com:22/quickstark/skills.git",
    "ssh://deployment-user@github.com/quickstark/skills.git",
  ];

  for (const remote of remotes) {
    const cwd = await temporaryGitProject(context, remote);
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: "Rendered a project-aware skill readout.",
    }, { directory, cwd });
    const html = await readFile(report.path, "utf8");

    assert.match(html, /<meta name="quickstark:project" content="github\.com\/quickstark\/skills">/);
    assert.match(html, /<meta name="quickstark:project-label" content="quickstark\/skills">/);
    assert.match(html, /<meta name="quickstark:project-source" content="git-origin">/);
    assert.doesNotMatch(html, /git@github\.com/);
    assert.doesNotMatch(html, /quickstark-readout-test-/);
  }
});

test("project-aware readouts refuse credential-bearing and unsafe Git origins", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const unsafeRemotes = [
    "https://secret-token@github.com/quickstark/skills.git",
    "https://developer:private-token@github.com/quickstark/skills.git",
    "https://github.com/quickstark/skills.git?token=private",
    "ssh://deployment-user:private-token@github.com/quickstark/skills.git",
    "git@github.com:quickstark/%2e%2e/private.git",
    "https://github.com/quickstark/../private/skills.git",
    "https://github.com/quickstark/%2e%2e/private/skills.git",
    "ssh://git@github.com/quickstark/../private/skills.git",
    "ssh://git@github.com/quickstark/%2e%2e/private/skills.git",
  ];

  for (const remote of unsafeRemotes) {
    const cwd = await temporaryGitProject(context, remote);

    await assert.rejects(
      writeSkillReadout({
        skill: "qs-code-build",
        outcome: "Unsafe repository origins must not be published.",
      }, { directory, cwd }),
      /credentials|query parameters|unsafe repository path/i,
    );
  }

  assert.deepEqual(await readdir(directory), []);
});

test("project-aware readouts distinguish Git services running on different non-default ports", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const remotes = [
    ["ssh://git@git.example.com:2222/team/project.git", "git.example.com~2222/team/project"],
    ["ssh://git@git.example.com:2223/team/project.git", "git.example.com~2223/team/project"],
    ["https://git.example.com:8443/team/project.git", "git.example.com~8443/team/project"],
    ["https://git.example.com:9443/team/project.git", "git.example.com~9443/team/project"],
  ];

  for (const [remote, identity] of remotes) {
    const cwd = await temporaryGitProject(context, remote);
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: "Kept distinct self-hosted Git instances isolated.",
    }, { directory, cwd });
    const html = await readFile(report.path, "utf8");

    assert.ok(
      html.includes(`<meta name="quickstark:project" content="${identity}">`),
      `Remote ${remote} must produce the independently known canonical identity ${identity}.`,
    );
  }
});

test("project-aware readouts safely identify repositories without an origin and non-Git workspaces", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const gitProject = await temporaryGitProject(context);
  const workspace = await temporaryReadoutDirectory(context);

  for (const [cwd, source] of [[gitProject, "git-root"], [workspace, "workspace"]]) {
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: "Rendered a safely identified local project.",
    }, { directory, cwd });
    const html = await readFile(report.path, "utf8");

    assert.match(html, new RegExp(`<meta name="quickstark:project" content="local/${source}/[a-zA-Z0-9._-]+-[a-f0-9]{12}">`));
    assert.match(html, new RegExp(`<meta name="quickstark:project-source" content="${source}">`));
    assert.doesNotMatch(html, /\/tmp\/quickstark-readout-test-/);
  }
});

test("symlinked checkouts preserve the same canonical Git project identity", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const project = await temporaryGitProject(context, "https://github.com/quickstark/skills.git");
  const aliasRoot = await temporaryReadoutDirectory(context);
  const alias = join(aliasRoot, "checkout-alias");

  await symlink(project, alias, "dir");

  for (const cwd of [project, alias]) {
    const report = await writeSkillReadout({
      skill: "qs-code-build",
      outcome: "Resolved the same repository through alternate checkout paths.",
    }, { directory, cwd });
    const html = await readFile(report.path, "utf8");

    assert.match(html, /<meta name="quickstark:project" content="github\.com\/quickstark\/skills">/);
    assert.doesNotMatch(html, /checkout-alias/);
  }
});

test("project-aware readouts publish immutable run and format metadata without changing report URLs", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const cwd = await temporaryGitProject(context, "https://github.com/quickstark/skills.git");
  const reportId = "a1b2c3d4-1111-4222-8333-123456789abc";
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Generated an immutable project-aware report.",
    generatedAt: "2026-07-25T15:30:00.000Z",
    reportId,
  }, { directory, cwd });

  assert.equal(report.filename, "qs-code-build--2026-07-25T15-30-00-000Z--a1b2c3d4.html");

  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  const response = await fetch(new URL(report.filename, viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /<meta name="quickstark:project" content="github\.com\/quickstark\/skills">/);
  assert.match(html, /<meta name="quickstark:skill-display-name" content="QS Code: Build">/);
  assert.match(html, new RegExp(`<meta name="quickstark:report-id" content="${reportId}">`));
  assert.match(html, /<meta name="quickstark:format-version" content="1">/);
  assert.match(html, /Implementation · quickstark\/skills/);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
});

test("the project-aware HTTP viewer serves only verified delivery evidence and stable provenance metadata", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const report = await writeSkillReadout({
    skill: "qs-deploy-release",
    outcome: "Served the actually verified release receipt.",
    projectIdentity: explicitProject("skills"),
    provenance: verifiedGithubProvenance(),
  }, { directory, layout: "project" });
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  const response = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /Verified delivery evidence/);
  assert.match(html, /Merged pull request #42/);
  assert.match(html, /Issues verified as closed by this release · #17/);
  assert.match(html, /<meta name="quickstark:release-version" content="v2\.3\.1">/);
  assert.match(html, /<meta name="quickstark:pull-request" content="42">/);
  assert.match(html, /<meta name="quickstark:closed-issue" content="17">/);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("the HTTP viewer serves the actual execution machine, verified deployment, and run-owned files", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const report = await writeSkillReadout({
    skill: "qs-code-document",
    outcome: "Documented the verified hosted report deployment.",
    projectIdentity: explicitProject("skills"),
    execution: {
      deployments: [{
        environment: "production",
        status: "verified",
        url: "https://reports.quickstark.com/",
        summary: "Verified the authenticated report endpoint.",
      }],
      files: [{
        path: "docs/engineering/qs-code-document.md",
        change: "added",
        summary: "Documented the actual project workflow.",
      }],
    },
  }, { directory, layout: "project" });
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  const response = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.ok(html.includes(`<meta name="quickstark:machine" content="${hostname()}">`));
  assert.match(html, /<meta name="quickstark:deployment-url" content="https:\/\/reports\.quickstark\.com\/">/);
  assert.match(html, /<meta name="quickstark:changed-file" content="docs\/engineering\/qs-code-document\.md">/);
  assert.match(html, /Execution context/);
  assert.match(html, /Verified deployment · production/);
  assert.match(html, /Documented the actual project workflow/);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("project-aware readouts honor an explicitly supplied canonical project identity", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Rendered a deliberately supplied project identity.",
    projectIdentity: {
      host: "github.com",
      owner: "quickstark",
      repository: "other-project",
      key: "github.com/quickstark/other-project",
      label: "quickstark/other-project",
      source: "explicit",
    },
  }, { directory });
  const html = await readFile(report.path, "utf8");

  assert.match(html, /<meta name="quickstark:project" content="github\.com\/quickstark\/other-project">/);
  assert.match(html, /<meta name="quickstark:project-source" content="explicit">/);
  assert.match(html, /Implementation · quickstark\/other-project/);
});

test("persistent project readouts survive viewer restarts with immutable nested report links", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const cwd = await temporaryGitProject(context, "https://github.com/quickstark/skills.git");
  const reports = [];

  for (const outcome of ["First durable project decision.", "Second durable project decision."]) {
    reports.push(await writeSkillReadout({
      skill: "qs-plan-research",
      generatedAt: "2026-07-25T15:30:00.000Z",
      outcome,
    }, { directory, cwd, layout: "project" }));
  }

  assert.notEqual(reports[0].path, reports[1].path);

  for (const report of reports) {
    assert.match(
      relative(directory, report.path),
      /^github\.com\/quickstark\/skills\/2026\/07\/qs-plan-research--2026-07-25T15-30-00-000Z--[a-f0-9]{8}\.html$/,
    );
  }

  let viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    if (!viewer.server.listening) return;

    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  for (const report of reports) {
    const response = await fetch(new URL(report.relativePath, viewer.url));

    assert.equal(response.status, 200);
    assert.match(await response.text(), /durable project decision/);
  }

  await new Promise((done, fail) => {
    viewer.server.close((error) => error ? fail(error) : done());
  });

  viewer = await startReadoutServer({ directory, port: 0 });

  for (const report of reports) {
    const response = await fetch(new URL(report.relativePath, viewer.url));

    assert.equal(response.status, 200);
    assert.match(await response.text(), /durable project decision/);
  }

  const health = await fetch(new URL("__quickstark_health", viewer.url));

  assert.equal(health.status, 200);
  assert.equal((await health.json()).directory, readoutDirectoryIdentity(directory));
});

test("the production gallery groups actual reports into a project-first library", async (context) => {
  const { viewer, reports } = await temporaryProjectGallery(context);
  const response = await fetch(viewer.url);

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /Project library/);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /CURRENT PROJECT/i);
  assert.match(html, /Research the skill-hosting architecture/);
  assert.match(html, /Build the marketplace search experience/);
  assert.match(html, /Research brief/);
  assert.match(html, /Delivery summary/);
  assert.doesNotMatch(html, /Catalog preview only; no actual design work occurred/);
  assert.ok(html.indexOf("quickstark/marketplace") < html.indexOf("quickstark/skills"));

  for (const report of reports.slice(0, 2)) {
    assert.ok(html.includes(report.relativePath), `Gallery must link the actual ${report.filename}.`);
  }
});

test("the production viewer safely serves purpose-specific concept maps and labels", async (context) => {
  const { directory, viewer } = await temporaryProjectGallery(context);
  const domain = await writeSkillReadout({
    skill: "qs-design-domain",
    outcome: "Defined the skill-report profile and truthful visual-cue vocabulary.",
    projectIdentity: explicitProject("skills"),
    findings: [
      { title: "Report profile", detail: "A purpose-specific presentation of actual results." },
      { title: "Visual cue", detail: "An accessible display of recorded observations." },
    ],
    decisions: [
      { title: "Catalog previews are not actual runs", detail: "No visualization may claim invented results." },
    ],
  }, { directory, layout: "project" });

  const response = await fetch(new URL(domain.relativePath, viewer.url));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);

  const html = await response.text();

  assert.match(html, /Domain model/);
  assert.match(html, /Shared vocabulary/);
  assert.match(html, /<svg\b[^>]*role="img"/);
  assert.match(html, /Report profile/);
  assert.doesNotMatch(html, /<script\b/i);

  const gallery = await fetch(viewer.url);

  assert.match(await gallery.text(), /Domain model/);
});

test("the gallery truthfully labels earlier reports without changing immutable legacy HTML", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const filename = "qs-plan-research--2026-07-23T09-00-00-000Z--abcdef12.html";
  const original = renderSkillReadout({
    skill: "qs-plan-research",
    generatedAt: "2026-07-23T09:00:00.000Z",
    outcome: "Preserve the original report and identify its actual research skill.",
  }).replace(/\s*<meta name="quickstark:report-profile" content="[^"]*">/, "");

  await writeFile(join(directory, filename), original, "utf8");

  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Research brief/);
  assert.ok(html.includes(filename));
  assert.equal(await readFile(join(directory, filename), "utf8"), original);

  const direct = await fetch(new URL(filename, viewer.url));

  assert.equal(direct.status, 200);
  assert.doesNotMatch(await direct.text(), /quickstark:report-profile/);
});

test("the production explorer isolates project reports and supports shareable outcome searches", async (context) => {
  const { viewer, reports } = await temporaryProjectGallery(context);
  const parameters = new URLSearchParams({
    view: "explorer",
    project: "github.com/quickstark/skills",
    q: "hosting",
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /Project explorer/);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /Research the skill-hosting architecture/);
  assert.ok(html.includes(reports[0].relativePath));
  assert.doesNotMatch(html, /Build the marketplace search experience/);
  assert.ok(!html.includes(reports[1].relativePath));
  assert.match(response.headers.get("content-security-policy"), /form-action 'self'/);

  const empty = await fetch(new URL(`?${new URLSearchParams({
    view: "explorer",
    project: "github.com/quickstark/skills",
    q: "this outcome does not exist",
  })}`, viewer.url));

  assert.match(await empty.text(), /No reports match this search in the selected project/);
});

test("the activity timeline shows actual cross-project runs in newest-first order", async (context) => {
  const { viewer, reports } = await temporaryProjectGallery(context);
  const response = await fetch(new URL("?view=activity", viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /Recent activity/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /Build the marketplace search experience/);
  assert.match(html, /Research the skill-hosting architecture/);
  assert.ok(html.indexOf("Build the marketplace search experience")
    < html.indexOf("Research the skill-hosting architecture"));
  assert.doesNotMatch(html, /Catalog preview only; no actual design work occurred/);

  for (const report of reports.slice(0, 2)) {
    assert.ok(html.includes(report.relativePath));
  }

  const previews = await fetch(new URL("?view=activity&previews=1", viewer.url));
  const previewHtml = await previews.text();

  assert.match(previewHtml, /Catalog preview only; no actual design work occurred/);
  assert.match(previewHtml, />Preview</);
  assert.ok(previewHtml.includes(reports[2].relativePath));
  assert.match(previewHtml, /Hide catalog previews/);
});

test("legacy readouts remain accessible and are honestly marked as unassigned", async (context) => {
  const { directory, viewer, reports } = await temporaryProjectGallery(context);
  const filename = "qs-plan-research--2026-07-23T09-00-00-000Z--abcdef12.html";
  const legacy = renderSkillReadout({
    skill: "qs-plan-research",
    project: "An unverified personal project heading",
    generatedAt: "2026-07-23T09:00:00.000Z",
    outcome: "A previously generated flat readout remains available.",
  });

  await writeFile(join(directory, filename), legacy, "utf8");

  const index = await fetch(viewer.url);
  const html = await index.text();

  assert.match(html, /Unassigned legacy reports/);
  assert.match(html, /Project identity not verified/);
  assert.match(html, /previously generated flat readout remains available/);
  assert.doesNotMatch(html, /An unverified personal project heading/);
  assert.ok(html.includes(filename));
  assert.ok(html.includes(reports[0].relativePath));

  const direct = await fetch(new URL(filename, viewer.url));

  assert.equal(direct.status, 200);
  assert.match(await direct.text(), /An unverified personal project heading/);
});

test("legacy migration is explicit, dry-run first, immutable, and safe to repeat", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const filename = "qs-plan-research--2026-07-23T09-00-00-000Z--abcdef12.html";
  const originalPath = join(directory, filename);
  const original = renderSkillReadout({
    skill: "qs-plan-research",
    project: "An unverified personal project heading",
    generatedAt: "2026-07-23T09:00:00.000Z",
    outcome: "Migrate this historical report only when explicitly approved.",
  });

  await writeFile(originalPath, original, "utf8");

  await assert.rejects(migrateLegacyReadouts({ directory }), /explicit target project/i);

  const preview = await migrateLegacyReadouts({
    directory,
    project: explicitProject("skills"),
  });

  assert.equal(preview.dryRun, true);
  assert.equal(preview.migrated, 0);
  assert.equal(preview.candidates, 1);
  assert.equal(await readFile(originalPath, "utf8"), original);
  assert.equal(await exists(preview.reports[0].target), false);

  const applied = await migrateLegacyReadouts({
    directory,
    project: explicitProject("skills"),
    apply: true,
  });

  assert.equal(applied.dryRun, false);
  assert.equal(applied.migrated, 1);
  assert.equal(await readFile(originalPath, "utf8"), original);

  const migrated = await readFile(applied.reports[0].target, "utf8");

  assert.match(migrated, /<meta name="quickstark:project" content="github\.com\/quickstark\/skills">/);
  assert.match(migrated, /<meta name="quickstark:project-source" content="explicit">/);
  assert.match(migrated, /Migrate this historical report only when explicitly approved/);

  const repeated = await migrateLegacyReadouts({
    directory,
    project: explicitProject("skills"),
    apply: true,
  });

  assert.equal(repeated.migrated, 0);
  assert.equal(repeated.skipped, 1);
  assert.equal(await readFile(originalPath, "utf8"), original);
});

test("explicit legacy migration can preserve temporary originals in a durable report library", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const targetDirectory = await temporaryReadoutDirectory(context);
  const filename = "qs-plan-research--2026-07-23T09-00-00-000Z--abcdef12.html";
  const originalPath = join(directory, filename);
  const original = renderSkillReadout({
    skill: "qs-plan-research",
    generatedAt: "2026-07-23T09:00:00.000Z",
    outcome: "Preserve this explicitly verified temporary report in durable storage.",
  });

  await writeFile(originalPath, original, "utf8");

  const preview = await migrateLegacyReadouts({
    directory,
    targetDirectory,
    project: "github.com/quickstark/skills",
  });

  assert.equal(preview.dryRun, true);
  assert.ok(preview.reports[0].target.startsWith(`${targetDirectory}/`));
  assert.equal(await exists(preview.reports[0].target), false);

  const applied = await migrateLegacyReadouts({
    directory,
    targetDirectory,
    project: "github.com/quickstark/skills",
    apply: true,
  });

  assert.equal(applied.migrated, 1);
  assert.ok(applied.reports[0].target.startsWith(`${targetDirectory}/`));
  assert.equal(await readFile(originalPath, "utf8"), original);
  assert.match(await readFile(applied.reports[0].target, "utf8"), /quickstark:project/);
});

test("hosted publication fails closed and isolates all views and direct report links", async (context) => {
  await assert.rejects(
    startReadoutServer({
      directory: await temporaryReadoutDirectory(context),
      port: 0,
      publicationMode: "hosted",
    }),
    /explicitly approved project/i,
  );

  const { viewer, reports } = await temporaryProjectGallery(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
  });

  for (const route of ["./", "?view=explorer", "?view=activity"]) {
    const response = await fetch(new URL(route, viewer.url));
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /quickstark\/skills/);
    assert.doesNotMatch(html, /marketplace/i);
    assert.doesNotMatch(html, /Build the marketplace search experience/);
  }

  const approved = await fetch(new URL(reports[0].relativePath, viewer.url));
  const denied = await fetch(new URL(reports[1].relativePath, viewer.url));

  assert.equal(approved.status, 200);
  assert.equal(denied.status, 404);
  assert.doesNotMatch(await denied.text(), /marketplace/i);

  const guessedProject = await fetch(new URL(`?${new URLSearchParams({
    view: "explorer",
    project: "github.com/quickstark/marketplace",
    q: "marketplace",
  })}`, viewer.url));

  assert.doesNotMatch(await guessedProject.text(), /marketplace/i);
});

test("report retention previews deletion and cannot delete another project's history", async (context) => {
  const { directory, reports } = await temporaryProjectGallery(context);

  await assert.rejects(pruneReadouts({ directory, retentionDays: 1 }), /explicit target project/i);

  const preview = await pruneReadouts({
    directory,
    project: "github.com/quickstark/skills",
    retentionDays: 1,
    now: "2026-08-01T00:00:00.000Z",
  });

  assert.equal(preview.dryRun, true);
  assert.equal(preview.candidates, 2);
  assert.equal(preview.deleted, 0);
  assert.equal(await exists(reports[0].path), true);
  assert.equal(await exists(reports[1].path), true);

  const applied = await pruneReadouts({
    directory,
    project: "github.com/quickstark/skills",
    retentionDays: 1,
    now: "2026-08-01T00:00:00.000Z",
    apply: true,
  });

  assert.equal(applied.deleted, 2);
  assert.equal(await exists(reports[0].path), false);
  assert.equal(await exists(reports[2].path), false);
  assert.equal(await exists(reports[1].path), true);
});

test("migration and retention commands default to reviewable, non-mutating JSON previews", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const filename = "qs-plan-research--2026-07-23T09-00-00-000Z--abcdef12.html";
  const originalPath = join(directory, filename);

  await writeFile(originalPath, renderSkillReadout({
    skill: "qs-plan-research",
    generatedAt: "2026-07-23T09:00:00.000Z",
    outcome: "Inspect the legacy migration before applying it.",
  }), "utf8");

  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const { stdout } = await execFileAsync(process.execPath, [
    script,
    "migrate",
    "--directory", directory,
    "--project", "github.com/quickstark/skills",
    "--json",
  ]);
  const migration = JSON.parse(stdout);

  assert.equal(migration.dryRun, true);
  assert.equal(migration.candidates, 1);
  assert.equal(await exists(originalPath), true);
  assert.equal(await exists(migration.reports[0].target), false);

  const retention = await execFileAsync(process.execPath, [
    script,
    "prune",
    "--directory", directory,
    "--project", "github.com/quickstark/skills",
    "--retention-days", "30",
    "--json",
  ]);

  assert.equal(JSON.parse(retention.stdout).dryRun, true);
  assert.equal(await exists(originalPath), true);
});

test("trusted reverse-proxy mode is available only for an explicitly allowlisted hosted library", async (context) => {
  const directory = await temporaryReadoutDirectory(context);

  await assert.rejects(
    startReadoutServer({ directory, port: 0, trustedProxy: true }),
    /trusted reverse proxy requires hosted publication/i,
  );

  await assert.rejects(
    startReadoutServer({
      directory,
      port: 0,
      publicationMode: "hosted",
      trustedProxy: true,
    }),
    /explicitly approved project/i,
  );

  const { viewer, reports } = await temporaryProjectGallery(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
    trustedProxy: true,
  });

  assert.equal(viewer.accessToken, null);
  assert.equal(viewer.publicationMode, "hosted");
  assert.equal((await fetch(viewer.url)).status, 200);
  assert.equal((await fetch(new URL(reports[1].relativePath, viewer.url))).status, 404);
});

test("a hosted container can explicitly and safely identify its verified current project", async (context) => {
  const { viewer } = await temporaryProjectGallery(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills", "github.com/quickstark/marketplace"],
    currentProject: "github.com/quickstark/marketplace",
  });
  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.match(
    html,
    /<article class="project-card current" data-project="github\.com\/quickstark\/marketplace">/,
  );
  assert.doesNotMatch(
    html,
    /<article class="project-card current" data-project="github\.com\/quickstark\/skills">/,
  );

  await assert.rejects(
    startReadoutServer({
      directory: await temporaryReadoutDirectory(context),
      port: 0,
      publicationMode: "hosted",
      allowedProjects: ["github.com/quickstark/skills"],
      currentProject: "github.com/quickstark/marketplace",
    }),
    /current project must be explicitly approved/i,
  );
});

test("the hosted deployment attaches Authelia and exposes no direct container or repository port", async () => {
  const compose = await readFile(join(repositoryRoot, "deploy", "readouts", "compose.yaml"), "utf8");

  assert.match(compose, /reports\.quickstark\.com/);
  assert.match(compose, /traefik\.http\.routers\.quickstark-readouts\.middlewares=authelia@file/);
  assert.match(compose, /traefik\.http\.services\.quickstark-readouts\.loadbalancer\.server\.port=4173/);
  assert.match(compose, /QS_READOUT_PUBLICATION_MODE:\s*hosted/);
  assert.match(compose, /QS_READOUT_ALLOWED_PROJECTS:\s*github\.com\/quickstark\/skills/);
  assert.match(compose, /QS_READOUT_CURRENT_PROJECT:\s*github\.com\/quickstark\/skills/);
  assert.match(compose, /QS_READOUT_TRUSTED_PROXY:\s*["']?true/);
  assert.match(compose, /working_dir:\s*\/opt\/quickstark/);
  assert.match(compose, /\/github\/skills:\/opt\/quickstark:ro/);
  assert.match(compose, /QS_READOUT_DIR:\s*\/docker\/appdata\/quickstark-readouts/);
  assert.match(compose, /\/docker\/appdata\/quickstark-readouts:\/docker\/appdata\/quickstark-readouts:ro/);
  assert.match(compose, /read_only:\s*true/);
  assert.doesNotMatch(compose, /^\s*ports:/m);
  assert.doesNotMatch(compose, /0\.0\.0\.0/);
});

test("the preview gallery covers all 24 skills without inventing completed work", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const previews = await writeSkillGallery({ directory });

  assert.equal(previews.length, SKILLS.length);
  assert.deepEqual(
    previews.map((preview) => preview.skill).sort(),
    SKILLS.map((skill) => skill.name).sort(),
  );

  for (const preview of previews) {
    const html = await readFile(preview.path, "utf8");

    assert.equal(preview.status, "Preview");
    assert.match(html, /Catalog preview only/);
    assert.match(html, /No skill has been run/);
    assert.doesNotMatch(html, /class="skills-used"/);

    const body = html.slice(html.indexOf("<body"));

    assert.match(body, /Catalog information/, `${preview.skill} must label its catalog-only descriptions.`);
    assert.doesNotMatch(body, /class="metrics"/, `${preview.skill} must not count catalog copy as work.`);
    assert.doesNotMatch(body, /class="signal-panel"/, `${preview.skill} must not visualize unobserved work.`);
    assert.doesNotMatch(body, /class="[^"]*\bcheck-passed\b/, `${preview.skill} must not invent passing checks.`);
  }
});

test("home-network discovery chooses physical private interfaces over Docker and Tailscale", () => {
  const interfaces = {
    docker0: [{ address: "172.17.0.1", family: "IPv4", internal: false }],
    tailscale0: [{ address: "100.66.93.87", family: "IPv4", internal: false }],
    wlp3s0: [{ address: "192.168.1.28", family: "IPv4", internal: false }],
    enp1s0: [{ address: "192.168.1.200", family: "IPv4", internal: false }],
  };

  assert.equal(discoverHomeNetworkAddress(interfaces), "192.168.1.200");
});

test("automatic Mac readouts stay on localhost", () => {
  const host = resolveReadoutViewerHost({
    runtimePlatform: "darwin",
    environment: {},
    interfaces: {
      en0: [{ address: "192.168.1.42", family: "IPv4", internal: false }],
    },
  });

  assert.equal(host, DEFAULT_READOUT_HOST);
});

test("SSH-connected Linux readouts automatically select the private home-network IP", () => {
  const host = resolveReadoutViewerHost({
    runtimePlatform: "linux",
    environment: { SSH_CONNECTION: "private-ssh-session" },
    interfaces: {
      enp1s0: [{ address: "192.168.1.200", family: "IPv4", internal: false }],
      tailscale0: [{ address: "100.66.93.87", family: "IPv4", internal: false }],
    },
  });

  assert.equal(host, "192.168.1.200");
});

test("SSH-only and local-only access explicitly remain on loopback", () => {
  const options = {
    runtimePlatform: "linux",
    environment: { SSH_CONNECTION: "private-ssh-session" },
    interfaces: {
      enp1s0: [{ address: "192.168.1.200", family: "IPv4", internal: false }],
    },
  };

  assert.equal(resolveReadoutViewerHost({ ...options, access: "ssh" }), DEFAULT_READOUT_HOST);
  assert.equal(resolveReadoutViewerHost({ ...options, access: "local" }), DEFAULT_READOUT_HOST);
  assert.equal(resolveReadoutViewerHost({ ...options, access: "lan" }), "192.168.1.200");
});

test("readout discovery refuses an unavailable private LAN instead of inventing a URL", () => {
  assert.throws(
    () => resolveReadoutViewerHost({
      access: "lan",
      interfaces: {
        tailscale0: [{ address: "100.66.93.87", family: "IPv4", internal: false }],
        docker0: [{ address: "172.17.0.1", family: "IPv4", internal: false }],
      },
    }),
    /No trusted private home-network address/,
  );
});

test("the readout viewer defaults to private loopback and serves the skill gallery", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const report = await writeSkillReadout({
    skill: "qs-help",
    outcome: "Selected the right engineering workflow.",
  }, { directory });
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  assert.equal(viewer.host, DEFAULT_READOUT_HOST);
  assert.match(viewer.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);

  const dashboard = await fetch(viewer.url);
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /QS Help/);
  assert.match(dashboard.headers.get("content-security-policy"), /default-src 'none'/);

  const page = await fetch(new URL(report.filename, viewer.url));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Selected the right engineering workflow/);
});

test("the viewer rejects repository files, encoded traversal, and unexpected HTTP methods", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  const repositoryFile = await fetch(new URL("package.json", viewer.url));
  assert.equal(repositoryFile.status, 404);

  const traversal = await fetch(new URL("/%2e%2e%2fpackage.json", viewer.url));
  assert.equal(traversal.status, 404);

  const unexpectedMethod = await fetch(viewer.url, { method: "POST" });
  assert.equal(unexpectedMethod.status, 405);
  assert.equal(unexpectedMethod.headers.get("allow"), "GET, HEAD");
});

test("network-accessible viewers require an unguessable capability URL", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const accessToken = "a".repeat(48);
  const report = await writeSkillReadout({
    skill: "qs-help",
    outcome: "Selected the right engineering workflow.",
  }, { directory });
  const viewer = await startReadoutServer({
    directory,
    host: DEFAULT_READOUT_HOST,
    port: 0,
    accessToken,
  });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  assert.match(viewer.url, new RegExp(`/r/${accessToken}/$`));

  const unprotectedRoot = await fetch(`http://127.0.0.1:${viewer.port}/`);
  assert.equal(unprotectedRoot.status, 404);

  const guessedRoot = await fetch(
    `http://127.0.0.1:${viewer.port}/r/${"b".repeat(48)}/`,
  );
  assert.equal(guessedRoot.status, 404);

  const dashboard = await fetch(viewer.url);
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /QS Help/);

  const reportPage = await fetch(new URL(report.filename, viewer.url));
  assert.equal(reportPage.status, 200);
  assert.match(await reportPage.text(), /Selected the right engineering workflow/);
});

test("automatic viewer startup verifies and reuses an existing QuickStark service", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  const reused = await ensureReadoutViewer({
    directory,
    baseUrl: viewer.url,
  });

  assert.equal(reused.url, viewer.url);
  assert.equal(reused.reused, true);

  const health = await fetch(new URL("__quickstark_health", reused.url));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    service: "quickstark-skill-readouts",
    version: 1,
    directory: readoutDirectoryIdentity(directory),
  });
});

test("automatic readouts refuse a healthy viewer serving another report directory", async (context) => {
  const viewerDirectory = await temporaryReadoutDirectory(context);
  const requestedDirectory = await temporaryReadoutDirectory(context);
  const viewer = await startReadoutServer({ directory: viewerDirectory, port: 0 });

  context.after(async () => {
    await new Promise((done, fail) => {
      viewer.server.close((error) => error ? fail(error) : done());
    });
  });

  await assert.rejects(
    ensureReadoutViewer({
      directory: requestedDirectory,
      baseUrl: viewer.url,
    }),
    /serves a different report directory/,
  );
});

test("a readout starts its local background viewer once and reuses it", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const portProbe = await startReadoutServer({ directory, port: 0 });
  const port = portProbe.port;

  await new Promise((done, fail) => {
    portProbe.server.close((error) => error ? fail(error) : done());
  });

  const first = await ensureReadoutViewer({
    directory,
    host: DEFAULT_READOUT_HOST,
    port,
  });

  context.after(() => {
    try {
      process.kill(first.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  });

  assert.equal(first.reused, false);
  assert.ok(Number.isInteger(first.pid));

  const second = await ensureReadoutViewer({
    directory,
    host: DEFAULT_READOUT_HOST,
    port,
  });

  assert.equal(second.reused, true);
  assert.equal(second.pid, first.pid);
  assert.equal(second.url, first.url);

  const statePath = join(directory, READOUT_VIEWER_STATE);
  const state = JSON.parse(await readFile(statePath, "utf8"));

  assert.equal(state.url, first.url);
  assert.equal(state.pid, first.pid);
  assert.equal((await stat(statePath)).mode & 0o777, 0o600);
});

test("automatic readouts select another port when a development server already occupies the default", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const blocker = createPortBlocker();

  await new Promise((done, fail) => {
    blocker.once("error", fail);
    blocker.listen(0, DEFAULT_READOUT_HOST, done);
  });

  context.after(async () => {
    await new Promise((done, fail) => {
      blocker.close((error) => error ? fail(error) : done());
    });
  });

  const blockedPort = blocker.address().port;
  const viewer = await ensureReadoutViewer({
    directory,
    host: DEFAULT_READOUT_HOST,
    defaultPort: blockedPort,
  });

  context.after(() => {
    try {
      process.kill(viewer.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  });

  assert.notEqual(viewer.port, blockedPort);
  assert.ok(viewer.port > blockedPort);

  const health = await fetch(new URL("__quickstark_health", viewer.url));
  assert.equal(health.status, 200);

  const reused = await ensureReadoutViewer({
    directory,
    host: DEFAULT_READOUT_HOST,
    defaultPort: blockedPort,
  });

  assert.equal(reused.reused, true);
  assert.equal(reused.port, viewer.port);
});

test("explicitly requested readout ports fail clearly when already occupied", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const blocker = createPortBlocker();

  await new Promise((done, fail) => {
    blocker.once("error", fail);
    blocker.listen(0, DEFAULT_READOUT_HOST, done);
  });

  context.after(async () => {
    await new Promise((done, fail) => {
      blocker.close((error) => error ? fail(error) : done());
    });
  });

  await assert.rejects(
    ensureReadoutViewer({
      directory,
      host: DEFAULT_READOUT_HOST,
      port: blocker.address().port,
    }),
    /explicitly requested readout port .* is already in use/,
  );
});

test("the skill-facing renderer automatically returns a verified, reusable report URL", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const portProbe = await startReadoutServer({ directory, port: 0 });
  const port = portProbe.port;

  await new Promise((done, fail) => {
    portProbe.server.close((error) => error ? fail(error) : done());
  });

  const command = [
    join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
    "render",
    "--data", JSON.stringify({
      skill: "qs-help",
      outcome: "Verified automatic report delivery for the actual skill-facing command.",
    }),
    "--directory", directory,
    "--access", "local",
    "--port", String(port),
    "--json",
  ];

  const first = JSON.parse((await execFileAsync(process.execPath, command, {
    timeout: 10_000,
    windowsHide: true,
  })).stdout);

  const state = JSON.parse(await readFile(join(directory, READOUT_VIEWER_STATE), "utf8"));

  context.after(() => {
    try {
      process.kill(state.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  });

  assert.equal(first.viewerReused, false);
  assert.match(first.url, new RegExp(`^http://127\\.0\\.0\\.1:${port}/`));

  const page = await fetch(first.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Verified automatic report delivery/);

  const second = JSON.parse((await execFileAsync(process.execPath, command, {
    timeout: 10_000,
    windowsHide: true,
  })).stdout);

  assert.equal(second.viewerReused, true);
  assert.equal(new URL(second.url).origin, new URL(first.url).origin);
});

test("the viewer never binds to every network interface", async () => {
  await assert.rejects(
    startReadoutServer({ host: "0.0.0.0" }),
    /specific trusted home-network address/,
  );

  await assert.rejects(
    startReadoutServer({ host: "::" }),
    /specific trusted home-network address/,
  );
});

for (const skill of SKILLS) {
  test(`${skill.name} has matching folder, frontmatter, picker metadata, and documentation`, async () => {
    const directory = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const skillContent = await readFile(join(directory, "SKILL.md"), "utf8");
    const metadata = await readFile(join(directory, "agents", "openai.yaml"), "utf8");

    assert.match(skillContent, new RegExp(`^name:\\s*${skill.name}\\s*$`, "m"));
    assert.match(skillContent, /^description:\s*\S/m);
    assert.match(metadata, new RegExp(`display_name:\\s*${JSON.stringify(skill.displayName)}`));
    assert.match(metadata, new RegExp(`default_prompt:\\s*"Use \\$${skill.name} to `));
    assert.ok(skill.shortDescription.length >= 25 && skill.shortDescription.length <= 64);
    assert.match(metadata, new RegExp(`short_description:\\s*${JSON.stringify(skill.shortDescription)}`));

    if (skill.userInvoked) {
      assert.match(skillContent, /^disable-model-invocation:\s*true\s*$/m);
      assert.match(metadata, /^\s*allow_implicit_invocation:\s*false\s*$/m);
    } else {
      assert.doesNotMatch(skillContent, /^disable-model-invocation:\s*true\s*$/m);
      assert.doesNotMatch(metadata, /^\s*allow_implicit_invocation:\s*false\s*$/m);
    }

    const documentation = await readFile(
      join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`),
      "utf8",
    );
    assert.match(documentation, /## What it does/);
    assert.match(documentation, /## When to reach for it/);
    assert.match(documentation, /## Where it fits/);
    assert.match(documentation, new RegExp(`\\/${skill.name}(?![a-z0-9-])`));

    assert.equal(
      skillContent.split(SKILL_OUTPUT_HEADING).length - 1,
      1,
      `${skill.name} must contain exactly one completion-report contract`,
    );
    assert.ok(
      skillContent.endsWith(renderSkillOutputContract(skill)),
      `${skill.name} has an outdated completion-report contract`,
    );
    assert.equal(
      documentation.split(DOCUMENTATION_OUTPUT_HEADING).length - 1,
      1,
      `${skill.name} must document its output and next steps exactly once`,
    );
    assert.ok(
      documentation.includes(renderDocumentationOutputContract(skill)),
      `${skill.name} has outdated output documentation`,
    );

    for (const next of NEXT_SKILLS_BY_NAME[skill.name]) {
      assert.ok(skillContent.includes(`/${next.name}`));
      assert.ok(documentation.includes(`/${next.name}`));
    }
  });
}

test("the root and bucket indexes list exactly the promoted skills", async () => {
  const rootReadme = await readFile(join(repositoryRoot, "README.md"), "utf8");

  for (const skill of SKILLS) {
    const expectedLink = `./skills/${skill.bucket}/${skill.name}/SKILL.md`;
    assert.ok(rootReadme.includes(expectedLink), `root README omits ${skill.name}`);

    const bucketReadme = await readFile(
      join(repositoryRoot, "skills", skill.bucket, "README.md"),
      "utf8",
    );
    assert.ok(bucketReadme.includes(`./${skill.name}/SKILL.md`), `${skill.bucket} README omits ${skill.name}`);
  }

  for (const bucket of ["misc", "personal", "in-progress", "deprecated"]) {
    const entries = await readdir(join(repositoryRoot, "skills", bucket), {
      withFileTypes: true,
    });

    for (const entry of entries.filter((item) => item.isDirectory())) {
      assert.ok(
        !rootReadme.includes(`./skills/${bucket}/${entry.name}/SKILL.md`),
        `non-promoted ${bucket}/${entry.name} leaked into the root index`,
      );
    }
  }
});

test("the Claude plugin exposes exactly the promoted skills with a synchronized version", async () => {
  const [plugin, marketplace, project] = await Promise.all([
    readFile(join(repositoryRoot, ".claude-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, ".claude-plugin", "marketplace.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
  ]);

  const expectedPaths = SKILLS.map((skill) => `./skills/${skill.bucket}/${skill.name}`).sort();

  assert.equal(project.name, "qs-skills");
  assert.equal(plugin.name, "qs-skills");
  assert.equal(plugin.version, project.version);
  assert.deepEqual([...plugin.skills].sort(), expectedPaths);
  assert.equal(marketplace.name, "quickstark");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "qs-skills");
});

test("the Codex marketplace and native plugin are validly connected", async () => {
  const [marketplace, plugin, project] = await Promise.all([
    readFile(join(repositoryRoot, "codex", ".agents", "plugins", "marketplace.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "codex", "plugins", "qs-skills", ".codex-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
  ]);

  assert.equal(marketplace.name, "quickstark");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "qs-skills");
  assert.equal(marketplace.plugins[0].source.source, "local");
  assert.equal(marketplace.plugins[0].source.path, "./plugins/qs-skills");
  assert.equal(marketplace.plugins[0].policy.installation, "AVAILABLE");
  assert.equal(marketplace.plugins[0].policy.authentication, "ON_INSTALL");
  assert.equal(marketplace.plugins[0].category, "Coding");
  assert.equal(plugin.name, "qs-skills");
  assert.equal(plugin.version, project.version);
  assert.equal(plugin.skills, "./skills/");
  assert.equal(plugin.interface.category, "Coding");
});

test("repository and plugin metadata point to the personal QuickStark fork", async () => {
  const [project, claudePlugin, codexPlugin, readme] = await Promise.all([
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, ".claude-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(
      join(repositoryRoot, "codex", "plugins", "qs-skills", ".codex-plugin", "plugin.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(join(repositoryRoot, "README.md"), "utf8"),
  ]);

  assert.equal(project.repository.url, personalRepository);
  assert.equal(claudePlugin.homepage, personalRepository);
  assert.equal(claudePlugin.repository, personalRepository);
  assert.equal(codexPlugin.homepage, personalRepository);
  assert.equal(codexPlugin.interface.websiteURL, personalRepository);
  assert.ok(readme.includes(`git clone ${personalRepository}.git`));
  assert.match(readme, /git fetch upstream/);
});

test("the Codex package is a curated, Codex-compatible snapshot of the canonical skills", async () => {
  const generatedRoot = join(repositoryRoot, "codex", "plugins", "qs-skills", "skills");
  const entries = await readdir(generatedRoot, { withFileTypes: true });
  const packagedNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  assert.deepEqual(packagedNames, SKILLS.map((skill) => skill.name).sort());

  for (const skill of SKILLS) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const packaged = join(generatedRoot, skill.name);
    const sourceFiles = await listFiles(source);
    const packagedFiles = await listFiles(packaged);

    assert.deepEqual(packagedFiles, sourceFiles, `${skill.name} has stale packaged files`);

    for (const file of sourceFiles) {
      const [sourceBytes, packagedBytes] = await Promise.all([
        readFile(join(source, file)),
        readFile(join(packaged, file)),
      ]);
      const expected =
        file === "SKILL.md"
          ? Buffer.from(formatSkillForCodex(sourceBytes.toString("utf8"), skill))
          : sourceBytes;

      assert.ok(expected.equals(packagedBytes), `${skill.name}/${file} is out of sync`);

      if (file === "SKILL.md" && skill.userInvoked) {
        assert.doesNotMatch(
          packagedBytes.toString("utf8"),
          /^disable-model-invocation:\s*true\s*$/m,
          `Claude-only invocation flag leaked into Codex: ${skill.name}`,
        );
      }

      if (file === "SKILL.md") {
        assert.doesNotMatch(
          packagedBytes.toString("utf8"),
          /^argument-hint:\s*/m,
          `Claude-only argument hint leaked into Codex: ${skill.name}`,
        );
      }
    }
  }
});

test("installed Codex skills receive the exact canonical catalog and HTML readout helper", async () => {
  const packagedSupport = join(repositoryRoot, "codex", "plugins", "qs-skills", "scripts");
  const expected = ["qs-skill-catalog.mjs", "qs-skill-readout.mjs"].sort();

  assert.deepEqual(await listFiles(packagedSupport), expected);

  for (const file of expected) {
    const [canonical, packaged] = await Promise.all([
      readFile(join(repositoryRoot, "scripts", file)),
      readFile(join(packagedSupport, file)),
    ]);

    assert.ok(canonical.equals(packaged), `${file} is not synchronized into the Codex plugin`);
  }
});

test("project, plugin, and lockfile versions stay synchronized", async () => {
  const [project, lockfile, claudePlugin, codexPlugin] = await Promise.all([
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, "package-lock.json"), "utf8").then(JSON.parse),
    readFile(join(repositoryRoot, ".claude-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(
      join(repositoryRoot, "codex", "plugins", "qs-skills", ".codex-plugin", "plugin.json"),
      "utf8",
    ).then(JSON.parse),
  ]);

  assert.equal(project.version, "2.3.0");
  assert.equal(lockfile.name, project.name);
  assert.equal(lockfile.version, project.version);
  assert.equal(lockfile.packages[""].name, project.name);
  assert.equal(lockfile.packages[""].version, project.version);
  assert.equal(claudePlugin.version, project.version);
  assert.equal(codexPlugin.version, project.version);
});

test("the router describes the personalized end-to-end workflow", async () => {
  const router = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-help", "SKILL.md"),
    "utf8",
  );

  for (const skill of SKILLS) {
    if (skill.name === "qs-help") continue;
    assert.ok(router.includes(`/${skill.name}`), `router omits /${skill.name}`);
  }

  for (const skill of UPSTREAM_SKILLS) {
    assert.doesNotMatch(
      router,
      new RegExp(`(?<![a-z0-9_-])\\/${skill.upstreamName}(?![a-z0-9_-])`, "i"),
      `router still invokes /${skill.upstreamName}`,
    );
  }
});

test("the help router enumerates the right order for new work", async () => {
  const router = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-help", "SKILL.md"),
    "utf8",
  );
  const start = router.indexOf("## Order of operations: new work");
  const end = router.indexOf("## Order of operations: refactoring");

  assert.ok(start >= 0, "the new-work order is not documented");
  assert.ok(end > start, "the new-work and refactoring workflows are not distinct");

  const workflow = router.slice(start, end);
  const expectedOrder = [
    "qs-setup",
    "qs-plan-clarify",
    "qs-plan-roadmap",
    "qs-plan-research",
    "qs-design-domain",
    "qs-design-prototype",
    "qs-plan-spec",
    "qs-plan-tickets",
    "qs-design-modules",
    "qs-code-build",
    "qs-review-code",
    "qs-deploy-release",
  ];
  let previous = -1;

  for (const name of expectedOrder) {
    const current = workflow.indexOf(`/${name}`);
    assert.ok(current > previous, `${name} appears out of order in the new-work workflow`);
    previous = current;
  }

  assert.match(workflow, /small change/i);
  assert.match(workflow, /only when/i);
});

test("the help router enumerates safe, test-first refactoring", async () => {
  const router = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-help", "SKILL.md"),
    "utf8",
  );
  const start = router.indexOf("## Order of operations: refactoring");
  const end = router.indexOf("## Every skill and its purpose");

  assert.ok(start >= 0, "the refactoring order is not documented");
  assert.ok(end > start, "refactoring must be separate from the skill catalog");

  const workflow = router.slice(start, end);
  const expectedOrder = [
    "qs-design-architecture",
    "qs-plan-clarify",
    "qs-design-modules",
    "qs-test-tdd",
    "qs-code-build",
    "qs-review-code",
    "qs-deploy-release",
  ];
  let previous = -1;

  for (const name of expectedOrder) {
    const current = workflow.indexOf(`/${name}`);
    assert.ok(current > previous, `${name} appears out of order in the refactoring workflow`);
    previous = current;
  }

  assert.match(workflow, /behavior/i);
  assert.match(workflow, /approval|authorization/i);
});

test("the help router clearly articulates every promoted skill's purpose", async () => {
  const router = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-help", "SKILL.md"),
    "utf8",
  );
  const heading = "## Every skill and its purpose";
  const start = router.indexOf(heading);
  const end = router.indexOf("## Context and handoffs", start);

  assert.ok(start >= 0, "the help router does not provide a complete skill catalog");
  assert.ok(end > start, "the skill-purpose catalog is not clearly bounded");

  const catalog = router.slice(start, end);

  for (const skill of SKILLS) {
    const row = catalog
      .split("\n")
      .find((line) => line.startsWith(`| \`/${skill.name}\` | `));

    assert.ok(row, `the help router does not include /${skill.name}`);
    const purpose = row.split("|")[2]?.trim();
    assert.ok(
      purpose && purpose.length >= 15,
      `the help router does not clearly explain /${skill.name}`,
    );
  }
});

test("the standard report distinguishes actual skills from suggested next steps", () => {
  for (const skill of SKILLS) {
    const contract = renderSkillOutputContract(skill);

    for (const field of ["Status:", "Skills used:", "Outcome:", "Execution:", "Readout:", "Outputs:", "Checks:", "Delivery:", "Next best:"]) {
      assert.ok(contract.includes(field), `${skill.name} omits the ${field} field`);
    }

    assert.match(contract, /architecture-quality, self-contained HTML readout/);
    assert.match(contract, /scripts\/qs-skill-readout\.mjs/);
    assert.match(contract, /automatically starts or reuses a verified readout viewer/i);
    assert.match(contract, /QS_READOUT_DIR/);
    assert.match(contract, /project-organized/i);
    assert.match(contract, /temporary.*default/i);
    assert.match(contract, /purpose-specific/i);
    assert.match(contract, /actual (?:recorded )?(?:evidence|results|checks)/i);
    assert.match(contract, /provenance/);
    assert.match(contract, /actual execution machine/i);
    assert.match(contract, /execution\.deployments/);
    assert.match(contract, /execution\.files/);
    assert.match(contract, /unrelated existing work/i);
    assert.match(contract, /closedByRelease/);
    assert.match(contract, /commit\.published/);
    assert.match(contract, /standards.*specification/i);
    assert.match(contract, /relationships/);
    assert.match(contract, /QS_READOUT_ACCESS=ssh/);
    assert.match(contract, /Tailscale is not required/);
    assert.match(contract, /do not bind to every network interface/i);
    assert.match(contract, /only skills that actually ran/);
    assert.match(contract, /only the tests, validations, or observations actually performed/i);
    assert.match(contract, /Awaiting input/);
    assert.match(contract, /the requested work is complete/);

    const documentation = renderDocumentationOutputContract(skill);

    assert.match(documentation, /QS_READOUT_DIR/);
    assert.match(documentation, /project-organized/i);
    assert.match(documentation, /purpose-specific/i);
    assert.match(documentation, /actual execution machine/i);
    assert.match(documentation, /verified deployment/i);
    assert.match(documentation, /verified GitHub pull requests/i);
    assert.match(documentation, /released versions/i);
  }
});

test("original promoted folder names have all been migrated", async () => {
  for (const skill of UPSTREAM_SKILLS) {
    assert.equal(
      await exists(join(repositoryRoot, "skills", skill.bucket, skill.upstreamName)),
      false,
      `old skill folder remains: ${skill.upstreamName}`,
    );
    assert.equal(
      await exists(join(repositoryRoot, "docs", skill.bucket, `${skill.upstreamName}.md`)),
      false,
      `old documentation remains: ${skill.upstreamName}`,
    );
  }
});

test("promoted skills and documentation do not invoke obsolete upstream commands", async () => {
  for (const skill of SKILLS) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const markdown = (await listFiles(source))
      .filter((file) => file.endsWith(".md"))
      .map((file) => join(source, file));

    markdown.push(
      join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`),
    );

    for (const file of markdown) {
      const content = (await readFile(file, "utf8")).replace(
        /https?:\/\/[^\s)>\]]+/g,
        "",
      );

      for (const upstream of UPSTREAM_SKILLS) {
        assert.doesNotMatch(
          content,
          new RegExp(
            `(?<![A-Za-z0-9_-])\\/${upstream.upstreamName}(?![A-Za-z0-9_-])`,
          ),
          `${relative(repositoryRoot, file)} still invokes /${upstream.upstreamName}`,
        );
      }
    }
  }
});

test("deployment remains explicit and never invents an external release workflow", async () => {
  const skill = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-deploy-release", "SKILL.md"),
    "utf8",
  );
  const metadata = await readFile(
    join(
      repositoryRoot,
      "codex",
      "plugins",
      "qs-skills",
      "skills",
      "qs-deploy-release",
      "agents",
      "openai.yaml",
    ),
    "utf8",
  );

  assert.match(skill, /^disable-model-invocation:\s*true\s*$/m);
  assert.match(metadata, /^\s*allow_implicit_invocation:\s*false\s*$/m);
  assert.match(skill, /Never invent a deployment target/);
  assert.match(skill, /Obtain explicit confirmation/);
  assert.match(skill, /documented rollback/);
});

test("Matt Pocock's upstream attribution and MIT license remain intact", async () => {
  const [license, readme] = await Promise.all([
    readFile(join(repositoryRoot, "LICENSE"), "utf8"),
    readFile(join(repositoryRoot, "README.md"), "utf8"),
  ]);

  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Matt Pocock/);
  assert.match(readme, /https:\/\/github\.com\/mattpocock\/skills/);
  assert.match(readme, /git fetch upstream/);
  assert.match(readme, /scripts\/qs-skill-catalog\.mjs/);
});
