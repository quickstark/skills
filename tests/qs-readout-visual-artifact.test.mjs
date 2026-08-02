import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  startReadoutServer,
  writeReadoutVisualArtifact,
} from "../scripts/qs-skill-readout.mjs";
import { SKILLS } from "../scripts/qs-skill-catalog.mjs";
import { renderSkillOutputContract } from "../scripts/sync-skill-output-contracts.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const skillsProject = Object.freeze({
  host: "github.com",
  owner: "quickstark",
  repository: "skills",
  key: "github.com/quickstark/skills",
  label: "quickstark/skills",
  source: "explicit",
});

const visualDocument = [
  "<!doctype html>",
  '<html lang="en">',
  "<head>",
  '  <meta charset="utf-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1">',
  "  <title>QuickStark Dashboard Settings</title>",
  "  <style>body{font:14px system-ui}.featured{font-size:13px}.prompt{font-size:12px}</style>",
  "</head>",
  "<body><main>",
  "  <h1>QuickStark Dashboard Settings</h1>",
  '  <p class="featured">One-time producer token generation and appearance preferences.</p>',
  '  <code class="prompt">Use $qs-review-code to review the protected settings module.</code>',
  "  <p>Linux · macOS · Windows · ChatGPT</p>",
  "</main></body></html>",
].join("\n");

async function createVisualFixture(context, viewerOptions = {}) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-visual-artifact-"));
  const sources = await mkdtemp(join(tmpdir(), "quickstark-visual-source-"));
  const source = join(sources, "architecture-review.html");

  await writeFile(source, visualDocument, { encoding: "utf8", mode: 0o600 });

  const viewer = await startReadoutServer({
    directory,
    port: 0,
    ...viewerOptions,
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await Promise.all([
      rm(directory, { recursive: true, force: true }),
      rm(sources, { recursive: true, force: true }),
    ]);
  });

  return { directory, sources, source, viewer };
}

test("a primary visual artifact opens as a verified browser website rather than a local editor file", async (context) => {
  const { directory, source, viewer } = await createVisualFixture(context);
  const artifact = await writeReadoutVisualArtifact({
    skill: "qs-review-code",
    source,
    projectIdentity: skillsProject,
  }, { directory, baseUrl: viewer.url });

  assert.equal(new URL(artifact.url).protocol, "http:");
  assert.doesNotMatch(artifact.url, /^file:|\/tmp\/|vscode:/i);
  assert.match(artifact.filename, /^qs-visual-review-code--.*--[a-f0-9]{8}\.html$/);
  assert.equal((await stat(artifact.path)).mode & 0o777, 0o600);

  const response = await fetch(artifact.url);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/i);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.match(await response.text(), /QuickStark Dashboard Settings/);
});

test("visual artifacts require an actual HTTP or HTTPS browser destination", async (context) => {
  const { directory, source } = await createVisualFixture(context);

  for (const baseUrl of [undefined, "file:///tmp/", "vscode://file/tmp/report.html", "javascript:alert(1)"]) {
    await assert.rejects(
      writeReadoutVisualArtifact({
        skill: "qs-review-code",
        source,
        projectIdentity: skillsProject,
      }, { directory, baseUrl }),
      /HTTP|HTTPS|browser|baseUrl/i,
    );
  }
});

test("a primary visual never appears as a fabricated skill run in the Project Workbench", async (context) => {
  const { directory, source, viewer } = await createVisualFixture(context);

  await writeReadoutVisualArtifact({
    skill: "qs-review-code",
    source,
    projectIdentity: skillsProject,
  }, { directory, baseUrl: viewer.url });

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /0 actual QuickStark reports/);
  assert.doesNotMatch(html, /architecture-review\.html/);
});

test("browser visual artifacts reject executable documents, unsafe resource behavior, and plaintext credentials", async (context) => {
  const { directory, sources, viewer } = await createVisualFixture(context);
  const unsafe = [
    { name: "script", body: '<!doctype html><html><head></head><body><script>alert(1)</script></body></html>' },
    { name: "iframe", body: '<!doctype html><html><head></head><body><iframe src="https://example.com"></iframe></body></html>' },
    { name: "handler", body: '<!doctype html><html><head></head><body><main onclick="alert(1)">Unsafe</main></body></html>' },
    { name: "navigation", body: '<!doctype html><html><head></head><body><a href="javascript:alert(1)">Unsafe</a></body></html>' },
    { name: "refresh", body: '<!doctype html><html><head><meta http-equiv="refresh" content="0;url=https://example.com"></head><body>Unsafe</body></html>' },
    { name: "credential", body: '<!doctype html><html><head></head><body>Bearer test-only-private-token-123456789012345</body></html>' },
  ];

  for (const item of unsafe) {
    const source = join(sources, item.name + ".html");

    await writeFile(source, item.body, "utf8");

    await assert.rejects(
      writeReadoutVisualArtifact({
        skill: "qs-review-code",
        source,
        projectIdentity: skillsProject,
      }, { directory, baseUrl: viewer.url }),
      /unsafe|script|credential|executable|navigation|visual/i,
      "Reject the unsafe " + item.name + " visual artifact.",
    );
  }
});

test("browser visual artifacts reject symbolic links, unsupported skills, and oversized sources", async (context) => {
  const { directory, sources, source, viewer } = await createVisualFixture(context);
  const linkedSource = join(sources, "linked-review.html");
  const oversizedSource = join(sources, "oversized-review.html");

  await symlink(source, linkedSource);
  await writeFile(oversizedSource, visualDocument + " ".repeat(513 * 1024), "utf8");

  await assert.rejects(
    writeReadoutVisualArtifact({
      skill: "qs-review-code",
      source: linkedSource,
      projectIdentity: skillsProject,
    }, { directory, baseUrl: viewer.url }),
    /regular|symbolic|visual/i,
  );

  await assert.rejects(
    writeReadoutVisualArtifact({
      skill: "invented-visual-skill",
      source,
      projectIdentity: skillsProject,
    }, { directory, baseUrl: viewer.url }),
    /promoted|skill/i,
  );

  await assert.rejects(
    writeReadoutVisualArtifact({
      skill: "qs-review-code",
      source: oversizedSource,
      projectIdentity: skillsProject,
    }, { directory, baseUrl: viewer.url }),
    /bounded|maximum|large|visual/i,
  );
});

test("hosted visual artifacts honor project access without exposing another project's website", async (context) => {
  const { directory, source, viewer } = await createVisualFixture(context, {
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
    currentProject: "github.com/quickstark/skills",
  });

  const allowed = await writeReadoutVisualArtifact({
    skill: "qs-review-code",
    source,
    projectIdentity: skillsProject,
  }, { directory, baseUrl: viewer.url });

  const forbidden = await writeReadoutVisualArtifact({
    skill: "qs-review-code",
    source,
    projectIdentity: {
      ...skillsProject,
      repository: "other",
      key: "github.com/quickstark/other",
      label: "quickstark/other",
    },
  }, { directory, baseUrl: viewer.url });

  assert.equal((await fetch(allowed.url)).status, 200);
  assert.equal((await fetch(forbidden.url)).status, 404);
});

test("publishing a browser visual preserves its original document and creates distinct immutable URLs", async (context) => {
  const { directory, source, viewer } = await createVisualFixture(context);
  const before = await readFile(source, "utf8");

  const first = await writeReadoutVisualArtifact({
    skill: "qs-review-code",
    source,
    projectIdentity: skillsProject,
  }, { directory, baseUrl: viewer.url });
  const second = await writeReadoutVisualArtifact({
    skill: "qs-review-code",
    source,
    projectIdentity: skillsProject,
  }, { directory, baseUrl: viewer.url });

  assert.equal(await readFile(source, "utf8"), before);
  assert.notEqual(first.path, second.path);
  assert.notEqual(first.url, second.url);
  assert.equal((await fetch(first.url)).status, 200);
  assert.equal((await fetch(second.url)).status, 200);
});

test("the canonical visual command returns a verified browser URL instead of a temporary HTML path", async (context) => {
  const { directory, source, viewer } = await createVisualFixture(context);
  const { stdout } = await execFileAsync(process.execPath, [
    join(repositoryRoot, "scripts", "qs-skill-readout.mjs"),
    "visual",
    "--input", source,
    "--skill", "qs-review-code",
    "--directory", directory,
    "--base-url", viewer.url,
    "--json",
  ]);
  const artifact = JSON.parse(stdout);

  assert.equal(artifact.skill, "qs-review-code");
  assert.equal(new URL(artifact.url).protocol, "http:");
  assert.doesNotMatch(artifact.url, /^file:|\/tmp\/|vscode:/i);
  assert.equal((await fetch(artifact.url)).status, 200);
});

test("every promoted skill returns only an authenticated hosted report, not an editor or local path", () => {
  for (const skill of SKILLS) {
    const contract = renderSkillOutputContract(skill);

    assert.match(contract, /render --require-hosted/i, skill.name);
    assert.match(contract, /https:\/\/reports\.quickstark\.com\//i, skill.name);
    assert.match(contract, /without exposing its path, localhost, or a private-IP URL/i, skill.name);
  }
});
