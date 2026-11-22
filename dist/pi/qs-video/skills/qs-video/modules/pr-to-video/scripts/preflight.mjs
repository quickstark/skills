#!/usr/bin/env node

import { selectedCli, runtimeEnvironment } from "../../../scripts/runtime.mjs";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function hasCliCommand(helpText, command) {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s+${escaped}(?:\\s+|$)`, "m").test(String(helpText));
}

export function runCliPreflight({ command = "check", spawn = spawnSync } = {}) {
  const result = spawn(selectedCli(), ["--help"], {
    encoding: "utf8",
    shell: false, env: runtimeEnvironment(),
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`unable to inspect HyperFrames CLI capabilities\n${output.trim()}`);
  }
  if (!hasCliCommand(output, command)) {
    throw new Error(
      `the installed HyperFrames CLI does not provide \`${command}\`, but the current pr-to-video skill requires it. This operation is blocked until runtime compatibility is resolved under separate upgrade authority.`,
    );
  }
  return true;
}

function main() {
  try {
    runCliPreflight();
    console.log("✓ pr-to-video preflight: required CLI capabilities are available");
  } catch (error) {
    console.error(`✗ pr-to-video preflight: ${error.message}`);
    process.exit(1);
  }
}

// realpath both sides: on macOS /tmp → /private/tmp, and node resolves the main
// module's symlinks in import.meta.url while argv[1] keeps the invoked spelling —
// a raw compare silently skips main() when invoked through any symlinked path.
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) main();
