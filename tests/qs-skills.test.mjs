import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { createServer as createPortBlocker } from "node:net";
import { tmpdir } from "node:os";
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
  normalizeSkillReadout,
  readoutDirectoryIdentity,
  renderSkillReadout,
  resolveReadoutViewerHost,
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

test("the catalog preserves all 22 upstream skills and adds a real deployment skill", () => {
  assert.equal(UPSTREAM_SKILLS.length, 22);
  assert.equal(SKILLS.length, 23);
  assert.equal(SKILLS.filter((skill) => skill.upstreamName === null).length, 1);
  assert.ok(SKILLS.some((skill) => skill.name === "qs-deploy-release"));
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

test("the preview gallery covers all 23 skills without inventing completed work", async (context) => {
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

    for (const field of ["Status:", "Skills used:", "Outcome:", "Readout:", "Outputs:", "Checks:", "Next best:"]) {
      assert.ok(contract.includes(field), `${skill.name} omits the ${field} field`);
    }

    assert.match(contract, /architecture-quality, self-contained HTML readout/);
    assert.match(contract, /scripts\/qs-skill-readout\.mjs/);
    assert.match(contract, /automatically starts or reuses a verified readout viewer/i);
    assert.match(contract, /QS_READOUT_ACCESS=ssh/);
    assert.match(contract, /Tailscale is not required/);
    assert.match(contract, /do not bind to every network interface/i);
    assert.match(contract, /only skills that actually ran/);
    assert.match(contract, /only the tests, validations, or observations actually performed/i);
    assert.match(contract, /Awaiting input/);
    assert.match(contract, /the requested work is complete/);
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
