import { execFile } from "node:child_process";
import { stat, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_REPOSITORY = "github.com/quickstark/skills";

const FAILURE_MESSAGES = Object.freeze({
  repository_unavailable: "The repository checkout is unavailable. Verify the checkout path and try again.",
  git_config_unreadable: "The local Git config is unreadable. An operator must restore ordinary-user read access to the existing config file before tests run.",
  repository_root_mismatch: "Git resolved a different repository root. Run the test gate from the intended QuickStark checkout.",
  origin_unavailable: "The local origin is unavailable. Restore the existing origin in the checkout before tests run.",
  origin_unexpected: "The local origin is not the approved QuickStark skills repository. Use the intended checkout.",
  branch_unavailable: "The current Git branch is unavailable. Restore an attached branch before tests run.",
  revision_unavailable: "The current Git revision is unavailable. Restore a valid HEAD before tests run.",
  main_unavailable: "The local main reference is unavailable. Restore refs/heads/main before tests run.",
  worktree_unavailable: "The Git worktree cannot be inspected. Repair the checkout before tests run.",
});

function gitEnvironment(source = process.env) {
  const environment = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key.toUpperCase().startsWith("GIT_") && value !== undefined) {
      environment[key] = value;
    }
  }
  return environment;
}

function defaultRunGit(arguments_, { cwd, environment }) {
  return new Promise((complete) => {
    execFile("git", arguments_, {
      cwd,
      env: environment,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    }, (error, stdout = "", stderr = "") => {
      complete({
        ok: !error,
        stdout,
        stderr,
        errorCode: error?.code,
      });
    });
  });
}

function configWasUnreadable(result) {
  if (result?.errorCode === "EACCES") return true;
  const stderr = String(result?.stderr ?? "");
  return /(?:\.git\/config|config).*(?:permission denied|access denied)/i.test(stderr)
    || /(?:permission denied|access denied).*(?:\.git\/config|config)/i.test(stderr);
}

function failure(code) {
  return { ok: false, code };
}

function normalizeRepositoryIdentity(remote) {
  const candidate = String(remote ?? "").trim();
  if (!candidate) return null;

  const scpStyle = candidate.match(/^(?:[^@/]+@)?([^:/]+):(.+)$/);
  if (scpStyle && !candidate.includes("://")) {
    const host = scpStyle[1].toLowerCase();
    const pathname = scpStyle[2].replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
    return `${host}/${pathname}`.toLowerCase();
  }

  try {
    const url = new URL(candidate);
    const pathname = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
    return `${url.hostname.toLowerCase()}/${pathname}`.toLowerCase();
  } catch {
    return null;
  }
}

async function runCheck(runGit, arguments_, options, failureCode) {
  let result;
  try {
    result = await runGit(arguments_, options);
  } catch (error) {
    result = {
      ok: false,
      stderr: error?.stderr,
      errorCode: error?.code,
    };
  }

  if (result?.ok) return { ok: true, stdout: String(result.stdout ?? "") };
  return failure(configWasUnreadable(result) ? "git_config_unreadable" : failureCode);
}

export function formatGitPreflightFailure(result) {
  const code = result?.code && FAILURE_MESSAGES[result.code]
    ? result.code
    : "repository_unavailable";
  return `Git preflight failed (${code}): ${FAILURE_MESSAGES[code]}`;
}

export async function inspectGitBaseline({
  cwd,
  environment = process.env,
  expectedRepository = EXPECTED_REPOSITORY,
  statPath = stat,
  realpathPath = realpath,
  runGit = defaultRunGit,
} = {}) {
  if (typeof cwd !== "string" || !cwd) return failure("repository_unavailable");

  try {
    const checkout = await statPath(cwd);
    if (!checkout.isDirectory()) return failure("repository_unavailable");
  } catch {
    return failure("repository_unavailable");
  }

  const options = { cwd, environment: gitEnvironment(environment) };
  const topLevel = await runCheck(runGit, ["rev-parse", "--show-toplevel"], options, "repository_unavailable");
  if (!topLevel.ok) return topLevel;

  try {
    const [actualRoot, expectedRoot] = await Promise.all([
      realpathPath(topLevel.stdout.trim()),
      realpathPath(cwd),
    ]);
    if (actualRoot !== expectedRoot) return failure("repository_root_mismatch");
  } catch {
    return failure("repository_root_mismatch");
  }

  const origin = await runCheck(
    runGit,
    ["config", "--local", "--get", "remote.origin.url"],
    options,
    "origin_unavailable",
  );
  if (!origin.ok) return origin;
  const repository = normalizeRepositoryIdentity(origin.stdout);
  if (!repository) return failure("origin_unavailable");
  if (repository !== expectedRepository.toLowerCase()) return failure("origin_unexpected");

  const branch = await runCheck(runGit, ["branch", "--show-current"], options, "branch_unavailable");
  if (!branch.ok) return branch;
  if (!branch.stdout.trim()) return failure("branch_unavailable");

  const revision = await runCheck(runGit, ["rev-parse", "HEAD"], options, "revision_unavailable");
  if (!revision.ok) return revision;
  if (!/^[a-f0-9]{40}$/i.test(revision.stdout.trim())) return failure("revision_unavailable");

  const main = await runCheck(
    runGit,
    ["show-ref", "--verify", "--quiet", "refs/heads/main"],
    options,
    "main_unavailable",
  );
  if (!main.ok) return main;

  const worktree = await runCheck(runGit, ["status", "--short"], options, "worktree_unavailable");
  if (!worktree.ok) return worktree;

  return {
    ok: true,
    repository: EXPECTED_REPOSITORY,
    branchObserved: true,
    revisionObserved: true,
    mainObserved: true,
    worktreeObserved: true,
  };
}

async function main() {
  const result = await inspectGitBaseline({ cwd: repositoryRoot });
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else if (result.ok) {
    process.stdout.write("Git preflight passed: approved repository, branch, revision, main, and worktree are observable.\n");
  } else {
    process.stderr.write(`${formatGitPreflightFailure(result)}\n`);
  }
  return result.ok ? 0 : 2;
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  process.exitCode = await main();
}
