import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { constants as osConstants, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  sanitizeTestEnvironment,
  TEST_FILES,
} from "./qs-test-environment.mjs";
import { formatGitPreflightFailure, inspectGitBaseline } from "./qs-test-preflight.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FORWARDED_SIGNALS = ["SIGHUP", "SIGINT", "SIGTERM"];

async function createPrivateTempRoot() {
  const directory = await mkdtemp(join(tmpdir(), "qs-test-"));
  await chmod(directory, 0o700);
  return directory;
}

function signalExitCode(signal) {
  const signalNumber = osConstants.signals[signal];
  return Number.isInteger(signalNumber) ? 128 + signalNumber : 1;
}

export function spawnNodeTests({
  cwd,
  environment,
  testFiles = TEST_FILES,
  spawnImpl = spawn,
  processLike = process,
}) {
  return new Promise((complete) => {
    let settled = false;
    let child;
    const handlers = new Map();

    const removeHandlers = () => {
      for (const [signal, handler] of handlers) {
        processLike.off(signal, handler);
      }
      handlers.clear();
    };

    const finish = (code) => {
      if (settled) return;
      settled = true;
      removeHandlers();
      complete(code);
    };

    try {
      child = spawnImpl(process.execPath, ["--test", ...testFiles], {
        cwd,
        env: environment,
        stdio: "inherit",
      });
    } catch {
      finish(1);
      return;
    }

    for (const signal of FORWARDED_SIGNALS) {
      const handler = () => {
        if (!settled) child.kill(signal);
      };
      handlers.set(signal, handler);
      processLike.on(signal, handler);
    }

    child.once("error", () => finish(1));
    child.once("close", (code, signal) => {
      finish(Number.isInteger(code) ? code : signalExitCode(signal));
    });
  });
}

export async function runTestSuite({
  repositoryRoot: checkoutRoot = repositoryRoot,
  sourceEnvironment = process.env,
  inspect = inspectGitBaseline,
  makeTempRoot = createPrivateTempRoot,
  makeDirectory = mkdir,
  spawnTests = spawnNodeTests,
  removeTempRoot = (path) => rm(path, { recursive: true, force: true }),
  writeDiagnostic = (message) => process.stderr.write(`${message}\n`),
} = {}) {
  const preflight = await inspect({ cwd: checkoutRoot, environment: sourceEnvironment });
  if (!preflight.ok) {
    writeDiagnostic(formatGitPreflightFailure(preflight));
    return 2;
  }

  let tempRoot;
  let exitCode = 1;
  try {
    tempRoot = await makeTempRoot();
    const roots = {
      home: join(tempRoot, "home"),
      xdgConfigHome: join(tempRoot, "xdg"),
      codexHome: join(tempRoot, "codex"),
    };
    await Promise.all(Object.values(roots).map((path) => makeDirectory(path, {
      recursive: true,
      mode: 0o700,
    })));

    const environment = sanitizeTestEnvironment({
      ...sourceEnvironment,
    }, roots);
    exitCode = await spawnTests({
      cwd: checkoutRoot,
      environment,
      testFiles: TEST_FILES,
    });
  } catch {
    writeDiagnostic("Test runner failed to create or execute the private test environment.");
    exitCode = 1;
  } finally {
    if (tempRoot) {
      try {
        await removeTempRoot(tempRoot);
      } catch {
        writeDiagnostic("Test runner cleanup failed for the private test environment.");
        if (exitCode === 0) exitCode = 1;
      }
    }
  }

  return exitCode;
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  process.exitCode = await runTestSuite();
}
