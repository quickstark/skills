import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { constants as osConstants } from "node:os";
import test from "node:test";

import {
  isStrippedTestEnvironmentKey,
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

const expectedTestFiles = [
  "tests/qs-v3.test.mjs",
  "tests/qs-skills.test.mjs",
  "tests/ps-skill-catalog.test.mjs",
  "tests/ps-behavior.test.mjs",
  "tests/skill-collection-registry.test.mjs",
  "tests/ps-internal-capabilities.test.mjs",
  "tests/ps-projection-integrity.test.mjs",
  "tests/ps-skills.test.mjs",
  "tests/qs-test-baseline.test.mjs",
  "tests/personal-skills.test.mjs",
  "tests/personal-skills-v2.test.mjs",
  "tests/managed-skills.test.mjs",
  "tests/pi-package-projection.test.mjs",
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
  for (const [arguments_, result] of Object.entries(overrides)) outputs.set(arguments_.split(" ").join("\0"), result);
  return async (arguments_) => outputs.get(arguments_.join("\0")) ?? { ok: false, stdout: "", stderr: "unexpected command" };
}

test("the test environment strips session and Git state without reporting-service setup", () => {
  const source = {
    PATH: "/usr/bin",
    HOME: "/real/home",
    USERPROFILE: "C:\\real-home",
    XDG_CONFIG_HOME: "/real/config",
    CODEX_HOME: "/real/codex",
    CODEX_THREAD_ID: "thread-secret",
    GIT_DIR: "/other/repository",
    QS_UNRELATED_SETTING: "preserved",
  };
  const sanitized = sanitizeTestEnvironment(source, {
    home: "/private/home",
    xdgConfigHome: "/private/xdg",
    codexHome: "/private/codex",
  });
  assert.equal(sanitized.PATH, "/usr/bin");
  assert.equal(sanitized.QS_UNRELATED_SETTING, "preserved");
  assert.equal(sanitized.HOME, "/private/home");
  assert.equal(sanitized.USERPROFILE, "/private/home");
  assert.equal(sanitized.XDG_CONFIG_HOME, "/private/xdg");
  assert.equal(sanitized.CODEX_HOME, "/private/codex");
  for (const key of Object.keys(sanitized)) assert.equal(isStrippedTestEnvironmentKey(key), false);
  assert.doesNotMatch(JSON.stringify(sanitized), /thread-secret|other\/repository/);
});

test("the exported test inventory is complete and reporting-free", () => {
  assert.deepEqual(TEST_FILES, expectedTestFiles);
  assert.ok(TEST_FILES.every((path) => !/readout|report-presentation/i.test(path)));
});

test("the Git preflight observes the approved repository without leaking worktree details", async () => {
  const result = await inspectGitBaseline({
    cwd: "/repo",
    statPath: async () => ({ isDirectory: () => true }),
    realpathPath: async (path) => path,
    runGit: successfulGitFixture(),
  });
  assert.deepEqual(result, {
    ok: true,
    repository: "github.com/quickstark/skills",
    branchObserved: true,
    revisionObserved: true,
    mainObserved: true,
    worktreeObserved: true,
  });
});

test("the Git preflight classifies unreadable configuration and unexpected origins", async () => {
  const options = {
    cwd: "/repo",
    statPath: async () => ({ isDirectory: () => true }),
    realpathPath: async (path) => path,
  };
  const unreadable = await inspectGitBaseline({
    ...options,
    runGit: successfulGitFixture({ "config --local --get remote.origin.url": { ok: false, stderr: ".git/config: permission denied", errorCode: "EACCES" } }),
  });
  assert.equal(unreadable.code, "git_config_unreadable");
  assert.doesNotMatch(formatGitPreflightFailure(unreadable), /\.git\/config|permission denied/i);

  const unexpected = await inspectGitBaseline({
    ...options,
    runGit: successfulGitFixture({ "config --local --get remote.origin.url": { ok: true, stdout: "https://github.com/other/repo.git\n", stderr: "" } }),
  });
  assert.equal(unexpected.code, "origin_unexpected");
});

test("the runner creates private homes, executes the suite, and cleans up", async () => {
  const made = [];
  const removed = [];
  let observed;
  const code = await runTestSuite({
    repositoryRoot: "/repo",
    sourceEnvironment: { PATH: "/usr/bin", CODEX_THREAD_ID: "secret" },
    inspect: async () => ({ ok: true }),
    makeTempRoot: async () => "/tmp/private-suite",
    makeDirectory: async (path) => { made.push(path); },
    spawnTests: async (input) => { observed = input; return 0; },
    removeTempRoot: async (path) => { removed.push(path); },
  });
  assert.equal(code, 0);
  assert.equal(made.length, 3);
  assert.deepEqual(removed, ["/tmp/private-suite"]);
  assert.equal(observed.environment.HOME, "/tmp/private-suite/home");
  assert.equal(observed.environment.CODEX_THREAD_ID, undefined);
  assert.deepEqual(observed.testFiles, TEST_FILES);
});

test("the runner stops at preflight failure", async () => {
  let created = false;
  const messages = [];
  const code = await runTestSuite({
    repositoryRoot: "/repo",
    inspect: async () => ({ ok: false, code: "origin_unexpected" }),
    makeTempRoot: async () => { created = true; return "/tmp/unused"; },
    writeDiagnostic: (message) => messages.push(message),
  });
  assert.equal(code, 2);
  assert.equal(created, false);
  assert.match(messages[0], /origin_unexpected/);
});

test("the Node subprocess reports pass and signal exits truthfully", async () => {
  class Child extends EventEmitter {
    kill(signal) { this.emit("close", null, signal); }
  }
  const processLike = new EventEmitter();
  const pass = await spawnNodeTests({
    cwd: "/repo",
    environment: {},
    testFiles: ["tests/example.test.mjs"],
    spawnImpl: () => {
      const child = new Child();
      queueMicrotask(() => child.emit("close", 0, null));
      return child;
    },
    processLike,
  });
  assert.equal(pass, 0);

  const child = new Child();
  const signaledPromise = spawnNodeTests({
    cwd: "/repo",
    environment: {},
    spawnImpl: () => child,
    processLike,
  });
  processLike.emit("SIGTERM");
  assert.equal(await signaledPromise, 128 + osConstants.signals.SIGTERM);
});
