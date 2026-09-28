import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync, mkdtempSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { FRONTEND_PUBLIC_COMMANDS, FRONTEND_INTERNAL_CAPABILITIES } from "../scripts/frontend-skill-catalog.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const privateRoot = join(root, "skills/frontend");
const index = JSON.parse(readFileSync(join(privateRoot, "dependency-index.json")));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function verifyPrivateClosure(base) {
  const inventory = readdirSync(join(base, "internal")).sort();
  assert.deepEqual(inventory, index.derivedFiles.map((entry) => entry.path.split("/").at(-1)).sort());
  for (const entry of index.derivedFiles) assert.equal(hash(readFileSync(join(base, entry.path))), entry.sha256);
  assert.match(readFileSync(join(base, index.licensePath), "utf8"), /Copyright \(c\) 2026 Leonxlnx/);
}

test("four explicit frontend roots have exact package metadata and locally resolvable private references", () => {
  assert.deepEqual(FRONTEND_PUBLIC_COMMANDS.map((entry) => entry.name), ["qs-design-frontend", "qs-design-image-web", "qs-design-image-mobile", "qs-design-image-to-code"]);
  for (const command of FRONTEND_PUBLIC_COMMANDS) {
    const directory = join(root, command.sourcePath);
    const body = readFileSync(join(directory, "SKILL.md"), "utf8");
    const metadata = readFileSync(join(directory, "agents/openai.yaml"), "utf8");
    assert.match(body, new RegExp(`^name: ${command.name}$`, "m"));
    assert.match(body, /^disable-model-invocation: true$/m);
    assert.ok(metadata.includes(command.codexLiteral));
    assert.match(metadata, /allow_implicit_invocation: false/);
    for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
      const path = match[1];
      if (/^https?:/.test(path)) continue;
      const target = resolve(directory, path);
      assert.ok(target.startsWith(privateRoot + "/"));
      assert.ok(existsSync(target), target);
    }
  }
});

test("seven upstream identities retain separate source/derived records and all private owners", () => {
  assert.equal(index.sources.length, 7);
  assert.equal(new Set(index.sources.map((entry) => entry.legacyName)).size, 7);
  for (const source of index.sources) {
    assert.match(source.sourceFileSha256, /^[a-f0-9]{64}$/);
    assert.match(source.baselineRevision, /^[a-f0-9]{40}$/);
    assert.equal(source.state, "candidate");
    assert.ok(source.privateReferences.every((id) => FRONTEND_INTERNAL_CAPABILITIES.some((entry) => entry.id === id)));
  }
  for (const module of FRONTEND_INTERNAL_CAPABILITIES) {
    assert.ok(module.owners.length);
    assert.ok(module.owners.every((owner) => FRONTEND_PUBLIC_COMMANDS.some((entry) => entry.name === owner)));
    assert.ok(existsSync(join(root, module.sourcePath)));
  }
  verifyPrivateClosure(privateRoot);
});

test("isolated private package resources remain complete and changes or omissions fail verification", () => {
  const fixture = mkdtempSync(join(tmpdir(), "qs-frontend-private-"));
  try {
    const destination = join(fixture, "resources");
    cpSync(privateRoot, destination, { recursive: true });
    verifyPrivateClosure(destination);
    writeFileSync(join(destination, "internal/prompt-construction.md"), "Missing the prompt-building contract.");
    assert.throws(() => verifyPrivateClosure(destination));
    rmSync(join(destination, "internal/prompt-construction.md"));
    assert.throws(() => verifyPrivateClosure(destination));
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
