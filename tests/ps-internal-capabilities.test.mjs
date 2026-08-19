import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { PS_INTERNAL_CAPABILITIES } from "../scripts/ps-skill-catalog.mjs";

const requiredHeadings = [
  "## Purpose",
  "## Entry conditions",
  "## Method",
  "## Stop conditions",
  "## Evidence",
  "## Owners",
];

test("PS-04 defines sixteen concise non-command internal capabilities", async () => {
  assert.equal(PS_INTERNAL_CAPABILITIES.length, 16);

  for (const capability of PS_INTERNAL_CAPABILITIES) {
    const fileUrl = new URL(`../${capability.sourcePath}`, import.meta.url);
    const metadata = await stat(fileUrl);
    const content = await readFile(fileUrl, "utf8");

    assert.ok(metadata.isFile(), `${capability.name} must be a regular file`);
    assert.match(content, new RegExp(`^# ${capability.name.replaceAll("-", " ")} capability$`, "mi"));
    for (const heading of requiredHeadings) assert.ok(content.includes(heading), `${capability.name} omits ${heading}`);
    for (const owner of capability.owners) assert.match(content, new RegExp(`\\b${owner}\\b`));
    assert.doesNotMatch(content, /^---$/m, `${capability.name} must not have installable skill frontmatter`);
    assert.doesNotMatch(content, /separate (?:status|readout|continuation)|automatically invoke another public skill/i);
    assert.match(content, /part of the owning root run/i);
  }
});

test("PS-04 internal capabilities are host-neutral and never require delegation", async () => {
  const forbidden = /\.cursor|\bcursor\b|task tool|grok-|claude-[a-z0-9]|\/loop|\bgraphite\b|\bgt\s/i;

  for (const capability of PS_INTERNAL_CAPABILITIES) {
    const content = await readFile(new URL(`../${capability.sourcePath}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, forbidden, `${capability.name} contains a host-specific mechanism`);
    assert.doesNotMatch(content, /must (?:spawn|delegate|use a subagent)/i);
    if (/subagent|helper/i.test(content)) {
      assert.match(content, /optional|when available/i);
      assert.match(content, /inherit(?:s)? the parent model/i);
    }
  }
});
