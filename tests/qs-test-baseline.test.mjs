import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { constants as osConstants } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  isStrippedTestEnvironmentKey,
  playwrightBrowsersPathFromExecutable,
  sanitizeTestEnvironment,
  TEST_FILES,
} from "../scripts/qs-test-environment.mjs";
import {
  formatGitPreflightFailure,
  inspectGitBaseline,
} from "../scripts/qs-test-preflight.mjs";
import {
  runTestSuite,
  spawnNodeTests,
} from "../scripts/qs-test-runner.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const expectedTestFiles = [
  "tests/qs-v3.test.mjs",
  "tests/qs-skills.test.mjs",
  "tests/qs-readout-workbench.test.mjs",
  "tests/qs-readout-observation.test.mjs",
  "tests/qs-report-presentation.test.mjs",
  "tests/qs-readout-visual-artifact.test.mjs",
  "tests/qs-readout-settings.test.mjs",
  "tests/qs-readout-portfolio.test.mjs",
  "tests/ps-skill-catalog.test.mjs",
  "tests/ps-behavior.test.mjs",
  "tests/skill-collection-registry.test.mjs",
  "tests/ps-internal-capabilities.test.mjs",
  "tests/ps-readout.test.mjs",
  "tests/ps-projection-integrity.test.mjs",
  "tests/ps-skills.test.mjs",
  "tests/qs-test-baseline.test.mjs",
];

function successfulGitFixture(overrides = {}) {
  const outputs = new Map([
    [["rev-parse", "--show-toplevel"].join("\0"), { ok: true, stdout: "/repo\n", stderr: "" }],
    [["config", "--local", "--get", "remote.origin.url"].join("\0"), { ok: true, stdout: "git@github.com:quickstark/skills.git\n", stderr: "" }],
    [["branch", "--show-current"].join("\0"), { ok: true, stdout: "main\n", stderr: "" }],
    [["rev-parse", "HEAD"].join("\0"), { ok: true, stdout: `${"a".repeat(40)}\n`, stderr: "" }],
    [["show-ref", "--verify", "--quiet", "refs/heads/main"].join("\0"), { ok: true, stdout: "", stderr: "" }],
    [["status", "--short"].join("\0"), { ok: true, stdout: "", stderr: "" }],
  ]);

  for (const [arguments_, result] of Object.entries(overrides)) {
    outputs.set(arguments_.split(" ").join("\0"), result);
  }

  return async (arguments_) => outputs.get(arguments_.join("\0")) ?? {
    ok: false,
    stdout: "",
    stderr: "unexpected synthetic Git command",
  };
}

test("the test environment strips host-owned reporting, session, and Git state", () => {
  const source = {
    PATH: "/usr/bin",
    LANG: "en_US.UTF-8",
    HOME: "/real/home",
    USERPROFILE: "C:\\real-home",
    XDG_CONFIG_HOME: "/real/config",
    CODEX_HOME: "/real/codex",
    CODEX_THREAD_ID: "thread-secret",
    QS_READOUT_PRODUCER_TOKEN: "producer-secret",
    qs_readout_harness: "case-insensitive-host-state",
    QS_PROTOTYPE_ENDPOINT: "prototype-secret",
    GIT_DIR: "/other/repository",
    git_config_global: "/other/config",
  };
  const snapshot = structuredClone(source);
  const sanitized = sanitizeTestEnvironment(source, {
    home: "/private/home",
    xdgConfigHome: "/private/xdg",
    codexHome: "/private/codex",
  });

  assert.deepEqual(source, snapshot);
  assert.equal(sanitized.PATH, "/usr/bin");
  assert.equal(sanitized.LANG, "en_US.UTF-8");
  assert.equal(sanitized.HOME, "/private/home");
  assert.equal(sanitized.USERPROFILE, "/private/home");
  assert.equal(sanitized.XDG_CONFIG_HOME, "/private/xdg");
  assert.equal(sanitized.CODEX_HOME, "/private/codex");

  for (const key of Object.keys(sanitized)) {
    assert.equal(isStrippedTestEnvironmentKey(key), false, `unexpected host key ${key}`);
  }
  assert.doesNotMatch(JSON.stringify(sanitized), /secret|other\/repository|other\/config/);

  const fixtureEnvironment = {
    ...sanitized,
    QS_READOUT_PRODUCER_TOKEN: "fixture-only",
    CODEX_THREAD_ID: "fixture-thread",
  };
  assert.equal(fixtureEnvironment.QS_READOUT_PRODUCER_TOKEN, "fixture-only");
  assert.equal(fixtureEnvironment.CODEX_THREAD_ID, "fixture-thread");
});

test("the exported inventory is complete and package.json delegates to one runner", async () => {
  assert.deepEqual(TEST_FILES, expectedTestFiles);

  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.test, "node scripts/qs-test-runner.mjs");
  assert.equal(packageJson.scripts["test:preflight"], "node scripts/qs-test-preflight.mjs");
});

test("the browser installation root can be preserved without reusing the real home", () => {
  assert.equal(
    playwrightBrowsersPathFromExecutable(
      "/home/tester/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
    ),
    "/home/tester/.cache/ms-playwright",
  );
  assert.equal(playwrightBrowsersPathFromExecutable("/usr/bin/chromium"), null);
});

test("the Git preflight returns only safe positive evidence and strips Git redirection", async () => {
  const observedEnvironments = [];
  const fixture = successfulGitFixture();
  const result = await inspectGitBaseline({
    cwd: "/repo",
    environment: {
      HOME: "/ordinary/home",
      PATH: "/usr/bin",
      GIT_DIR: "/escape",
      GIT_CONFIG_GLOBAL: "/secret/config",
    },
    statPath: async () => ({ isDirectory: () => true }),
    realpathPath: async (path) => path,
    runGit: async (arguments_, options) => {
      observedEnvironments.push(options.environment);
      return fixture(arguments_, options);
    },
  });

  assert.deepEqual(result, {
    ok: true,
    repository: "github.com/quickstark/skills",
    branchObserved: true,
    revisionObserved: true,
    mainObserved: true,
    worktreeObserved: true,
  });
  assert.ok(observedEnvironments.length >= 6);
  for (const environment of observedEnvironments) {
    assert.equal(environment.HOME, "/ordinary/home");
    assert.equal(environment.PATH, "/usr/bin");
    assert.equal(environment.GIT_DIR, undefined);
    assert.equal(environment.GIT_CONFIG_GLOBAL, undefined);
  }
});

test("the Git preflight classifies an unreadable config without leaking stderr", async () => {
  const secret = "credential-bearing-origin-secret";
  const result = await inspectGitBaseline({
    cwd: "/repo",
    statPath: async () => ({ isDirectory: () => true }),
    realpathPath: async (path) => path,
    runGit: async () => ({
      ok: false,
      stdout: "",
      stderr: `fatal: unable to access '.git/config': Permission denied ${secret}`,
    }),
  });

  assert.deepEqual(result, { ok: false, code: "git_config_unreadable" });
  const message = formatGitPreflightFailure(result);
  assert.match(message, /git_config_unreadable/);
  assert.match(message, /operator/i);
  assert.doesNotMatch(message, new RegExp(secret));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});

test("the Git preflight rejects an unexpected origin without returning it", async () => {
  const fixture = successfulGitFixture({
    "config --local --get remote.origin.url": {
      ok: true,
      stdout: "https://token@example.com/unrelated/project.git\n",
      stderr: "",
    },
  });
  const result = await inspectGitBaseline({
    cwd: "/repo",
    statPath: async () => ({ isDirectory: () => true }),
    realpathPath: async (path) => path,
    runGit: fixture,
  });

  assert.deepEqual(result, { ok: false, code: "origin_unexpected" });
  assert.doesNotMatch(JSON.stringify(result), /token|unrelated|example\.com/);
});

test("the Git preflight returns each stable failure code at its owning boundary", async () => {
  const cases = [
    {
      code: "repository_unavailable",
      options: { statPath: async () => { throw new Error("missing"); } },
    },
    {
      code: "repository_root_mismatch",
      overrides: { "rev-parse --show-toplevel": { ok: true, stdout: "/elsewhere\n", stderr: "" } },
    },
    {
      code: "origin_unavailable",
      overrides: { "config --local --get remote.origin.url": { ok: false, stdout: "", stderr: "" } },
    },
    {
      code: "branch_unavailable",
      overrides: { "branch --show-current": { ok: true, stdout: "", stderr: "" } },
    },
    {
      code: "revision_unavailable",
      overrides: { "rev-parse HEAD": { ok: true, stdout: "not-a-revision\n", stderr: "" } },
    },
    {
      code: "main_unavailable",
      overrides: { "show-ref --verify --quiet refs/heads/main": { ok: false, stdout: "", stderr: "" } },
    },
    {
      code: "worktree_unavailable",
      overrides: { "status --short": { ok: false, stdout: "", stderr: "" } },
    },
  ];

  for (const fixtureCase of cases) {
    const result = await inspectGitBaseline({
      cwd: "/repo",
      statPath: async () => ({ isDirectory: () => true }),
      realpathPath: async (path) => path,
      runGit: successfulGitFixture(fixtureCase.overrides),
      ...fixtureCase.options,
    });
    assert.deepEqual(result, { ok: false, code: fixtureCase.code });
    assert.match(formatGitPreflightFailure(result), new RegExp(fixtureCase.code));
  }
});

test("the runner creates private homes, uses the sanitized environment, and cleans up", async () => {
  const events = [];
  const sourceEnvironment = {
    PATH: "/usr/bin",
    HOME: "/real/home",
    QS_READOUT_PRODUCER_TOKEN: "do-not-forward",
  };
  const result = await runTestSuite({
    repositoryRoot: "/repo",
    sourceEnvironment,
    inspect: async () => ({ ok: true }),
    makeTempRoot: async () => "/tmp/qs-test-private",
    makeDirectory: async (path, options) => events.push(["mkdir", path, options]),
    findPlaywrightBrowsersPath: async () => "/opt/playwright-browsers",
    spawnTests: async (options) => {
      events.push(["spawn", options]);
      return 0;
    },
    removeTempRoot: async (path) => events.push(["remove", path]),
    writeDiagnostic: (message) => events.push(["diagnostic", message]),
  });

  assert.equal(result, 0);
  const spawnEvent = events.find(([name]) => name === "spawn");
  assert.ok(spawnEvent);
  assert.equal(spawnEvent[1].cwd, "/repo");
  assert.deepEqual(spawnEvent[1].testFiles, expectedTestFiles);
  assert.equal(spawnEvent[1].environment.HOME, "/tmp/qs-test-private/home");
  assert.equal(spawnEvent[1].environment.XDG_CONFIG_HOME, "/tmp/qs-test-private/xdg");
  assert.equal(spawnEvent[1].environment.CODEX_HOME, "/tmp/qs-test-private/codex");
  assert.equal(spawnEvent[1].environment.PLAYWRIGHT_BROWSERS_PATH, "/opt/playwright-browsers");
  assert.equal(spawnEvent[1].environment.QS_READOUT_PRODUCER_TOKEN, undefined);
  assert.ok(events.some(([name, path]) => name === "remove" && path === "/tmp/qs-test-private"));
  assert.ok(events.filter(([name]) => name === "mkdir").every(([, , options]) => options.mode === 0o700));
});

test("the runner stops at preflight failure without creating a test home", async () => {
  let created = false;
  const messages = [];
  const result = await runTestSuite({
    repositoryRoot: "/repo",
    inspect: async () => ({ ok: false, code: "git_config_unreadable" }),
    makeTempRoot: async () => {
      created = true;
      return "/should-not-exist";
    },
    writeDiagnostic: (message) => messages.push(message),
  });

  assert.equal(result, 2);
  assert.equal(created, false);
  assert.match(messages.join("\n"), /git_config_unreadable/);
});

test("the runner preserves a test failure when cleanup also fails", async () => {
  const messages = [];
  const result = await runTestSuite({
    repositoryRoot: "/repo",
    inspect: async () => ({ ok: true }),
    makeTempRoot: async () => "/tmp/qs-test-private",
    makeDirectory: async () => {},
    spawnTests: async () => 7,
    removeTempRoot: async () => {
      throw new Error("synthetic cleanup failure");
    },
    writeDiagnostic: (message) => messages.push(message),
  });

  assert.equal(result, 7);
  assert.match(messages.join("\n"), /cleanup/i);
});

test("the Node subprocess reports pass, failure, and signal exits truthfully", async () => {
  async function runChild({ code, signal, triggerSignal }) {
    const processLike = new EventEmitter();
    const forwarded = [];
    const child = new EventEmitter();
    child.kill = (receivedSignal) => forwarded.push(receivedSignal);
    const spawnImpl = (executable, arguments_, options) => {
      assert.equal(executable, process.execPath);
      assert.deepEqual(arguments_, ["--test", ...expectedTestFiles]);
      assert.equal(options.cwd, "/repo");
      assert.equal(options.stdio, "inherit");
      queueMicrotask(() => {
        if (triggerSignal) processLike.emit(triggerSignal);
        child.emit("close", code, signal);
      });
      return child;
    };

    const exitCode = await spawnNodeTests({
      cwd: "/repo",
      environment: { PATH: "/usr/bin" },
      testFiles: expectedTestFiles,
      spawnImpl,
      processLike,
    });
    return { exitCode, forwarded };
  }

  assert.deepEqual(await runChild({ code: 0, signal: null }), { exitCode: 0, forwarded: [] });
  assert.deepEqual(await runChild({ code: 9, signal: null }), { exitCode: 9, forwarded: [] });
  assert.deepEqual(
    await runChild({ code: null, signal: "SIGTERM", triggerSignal: "SIGTERM" }),
    { exitCode: 128 + osConstants.signals.SIGTERM, forwarded: ["SIGTERM"] },
  );
});
