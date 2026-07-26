import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  normalizeSkillReadout,
  renderSkillReadout,
  startReadoutIngestionServer,
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";

const execFileAsync = promisify(execFile);
const readoutScript = fileURLToPath(new URL("../scripts/qs-skill-readout.mjs", import.meta.url));

const observedRun = Object.freeze({
  version: 1,
  measurementSource: "provider-response",
  attributionScope: "skill-run",
  capturedAt: "2026-07-26T18:02:00.000Z",
  inference: {
    provider: "openai",
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
  },
  tokens: {
    input: 1_200,
    cachedInput: 300,
    output: 280,
    reasoningOutput: 80,
    total: 1_480,
  },
  timing: {
    startedAt: "2026-07-26T18:01:00.000Z",
    finishedAt: "2026-07-26T18:02:00.000Z",
    activeDurationMs: 42_000,
  },
});

function nativeReadout(observation = observedRun) {
  return {
    skill: "qs-code-build",
    outcome: "Preserve the directly observed native skill-run measurements.",
    observation,
  };
}

function observedIngestionEnvelope(overrides = {}) {
  return {
    version: 1,
    producer: "observed-codex",
    harness: { name: "codex", version: "1.0.0" },
    collection: "quickstark/qs-skills",
    project: "https://github.com/quickstark/skills.git",
    runId: "f774a94c-ff79-4f75-af96-61b7c806fa31",
    generatedAt: "2026-07-26T18:03:00.000Z",
    skill: "qs-code-build",
    status: "Completed",
    outcome: "Preserve directly observed measurements through authorized hosted ingestion.",
    observation: observedRun,
    nextSkills: [],
    ...overrides,
  };
}

async function createObservedIngestion(context, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-observed-ingestion-test-"));
  const viewer = await startReadoutServer({
    directory,
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
    currentProject: "github.com/quickstark/skills",
    ...options.viewer,
  });
  const ingestion = await startReadoutIngestionServer({
    directory,
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["github.com/quickstark/skills"],
    producers: [{
      id: "observed-codex",
      token: "test-only-observed-codex-credential-1234567890",
      projects: ["github.com/quickstark/skills"],
    }],
    ...options.ingestion,
  });

  context.after(async () => {
    for (const running of [ingestion, viewer]) {
      if (!running.server.listening) continue;

      await new Promise((resolve, reject) => {
        running.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  return { directory, viewer, ingestion };
}

function submitObservedReadout(ingestion, envelope, options = {}) {
  return fetch(new URL("api/v1/readouts", ingestion.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token ?? "test-only-observed-codex-credential-1234567890"}`,
    },
    body: JSON.stringify(envelope),
  });
}

test("an actual native skill readout preserves and renders its directly observed model, effort, tokens, and active duration", () => {
  const normalized = normalizeSkillReadout(nativeReadout());

  assert.deepEqual(normalized.observation, observedRun);

  const html = renderSkillReadout(nativeReadout());

  assert.match(html, /Observed skill run/);
  assert.match(html, /provider-response/);
  assert.match(html, /skill-run/);
  assert.match(html, /openai/);
  assert.match(html, /gpt-5\.6-sol/);
  assert.match(html, /medium/);
  assert.match(html, /1,200/);
  assert.match(html, /1,480/);
  assert.match(html, /42,000 ms/);
  assert.match(html, /<meta name="quickstark:observation-source" content="provider-response">/);
  assert.match(html, /<meta name="quickstark:observation-scope" content="skill-run">/);
  assert.match(html, /<meta name="quickstark:model" content="gpt-5\.6-sol">/);
  assert.match(html, /<meta name="quickstark:total-tokens" content="1480">/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("a native observed skill run records independently verified passed and failed checks", () => {
  const quality = {
    source: "observed-checks",
    passedChecks: 2,
    failedChecks: 1,
  };
  const input = {
    ...nativeReadout({ ...observedRun, quality }),
    checks: [
      { title: "Native observation validation", status: "passed" },
      { title: "Immutable hosted delivery", status: "passed" },
      { title: "Independent review regression", status: "failed" },
    ],
  };
  const normalized = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);

  assert.deepEqual(normalized.observation.quality, quality);
  assert.match(html, /Independent quality evidence/);
  assert.match(html, /observed-checks/);
  assert.match(html, /Passed checks/);
  assert.match(html, /Failed checks/);
  assert.match(html, /Native observation validation/);
  assert.match(html, /Independent review regression/);
  assert.match(html, /<meta name="quickstark:quality-source" content="observed-checks">/);
  assert.match(html, /<meta name="quickstark:quality-passed-checks" content="2">/);
  assert.match(html, /<meta name="quickstark:quality-failed-checks" content="1">/);
});

test("explicit user and independently sourced review feedback remain separate from model efficiency", () => {
  for (const source of ["user-feedback", "review-rubric", "human-calibrated-evaluation"]) {
    for (const feedback of ["accepted", "needs-revision", "rejected"]) {
      const quality = { source, feedback };
      const input = nativeReadout({ ...observedRun, quality });
      const normalized = normalizeSkillReadout(input);
      const html = renderSkillReadout(input);

      assert.deepEqual(normalized.observation.quality, quality, `${source}: ${feedback}`);
      assert.match(html, /Independent quality evidence/);
      assert.match(html, new RegExp(`<meta name="quickstark:quality-source" content="${source}">`));
      assert.match(html, new RegExp(`<meta name="quickstark:quality-feedback" content="${feedback}">`));
      assert.doesNotMatch(html, /(?:token|duration|model|effort)[ -]*(?:quality|score|rating)/i);
    }
  }
});

test("fast or low-token runs never invent independent quality evidence", () => {
  const input = nativeReadout({
    ...observedRun,
    inference: { ...observedRun.inference, reasoningEffort: "low" },
    tokens: { input: 1, output: 0, total: 1 },
    timing: {
      startedAt: "2026-07-26T18:02:00.000Z",
      finishedAt: "2026-07-26T18:02:00.000Z",
      activeDurationMs: 0,
    },
  });
  const normalized = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);
  const qualitySection = html.match(/Independent quality evidence[\s\S]*?<\/section>/)?.[0];

  assert.equal(normalized.observation.quality, undefined);
  assert.ok(qualitySection);
  assert.match(qualitySection, /Quality evidence source/);
  assert.match(qualitySection, /Passed checks/);
  assert.match(qualitySection, /Failed checks/);
  assert.match(qualitySection, /Explicit feedback/);
  assert.equal((qualitySection.match(/Not captured/g) ?? []).length, 4);
  assert.doesNotMatch(html, /<meta name="quickstark:quality-/);
});

test("quality evidence rejects fabricated sources, unsupported fields, feedback, and inconsistent check counts", () => {
  const checks = [
    { title: "Observed passing behavior", status: "passed" },
    { title: "Observed failing behavior", status: "failed" },
  ];

  for (const [label, quality, expected] of [
    ["missing source", { passedChecks: 1 }, /quality source/i],
    ["efficiency-based source", { source: "estimated-from-tokens", passedChecks: 1 }, /quality source/i],
    ["model self-assessment", { source: "model-self-assessment", feedback: "accepted" }, /quality source/i],
    ["private feedback text", { source: "user-feedback", feedback: "accepted", prompt: "private" }, /unsupported observation field/i],
    ["negative check count", { source: "observed-checks", passedChecks: -1 }, /nonnegative safe integer/i],
    ["fractional check count", { source: "observed-checks", passedChecks: 1.5 }, /nonnegative safe integer/i],
    ["unsafe check count", { source: "observed-checks", passedChecks: Number.MAX_SAFE_INTEGER + 1 }, /nonnegative safe integer/i],
    ["fabricated passing checks", { source: "observed-checks", passedChecks: 2 }, /independently observed check results/i],
    ["fabricated failing checks", { source: "observed-checks", failedChecks: 0 }, /independently observed check results/i],
    ["unsupported feedback", { source: "user-feedback", feedback: "excellent" }, /quality feedback/i],
    ["missing user feedback", { source: "user-feedback" }, /requires an explicit observed feedback/i],
    ["feedback disguised as a check", { source: "observed-checks", passedChecks: 1, feedback: "accepted" }, /cannot claim independently sourced user feedback/i],
    ["empty review claim", { source: "review-rubric" }, /requires independently observed checks or explicit feedback/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout({
        ...nativeReadout({ ...observedRun, quality }),
        checks,
      }),
      expected,
      label,
    );
  }

  assert.throws(
    () => normalizeSkillReadout(nativeReadout({
      ...observedRun,
      quality: { source: "observed-checks", passedChecks: 0, failedChecks: 0 },
    })),
    /require independently recorded passed or failed checks/i,
  );
});

test("each supported native observation source is preserved and explicitly identified", () => {
  for (const measurementSource of [
    "provider-response",
    "codex-opentelemetry",
    "verified-harness",
    "user-reported",
  ]) {
    const input = nativeReadout({ ...observedRun, measurementSource });
    const normalized = normalizeSkillReadout(input);
    const html = renderSkillReadout(input);

    assert.equal(normalized.observation.measurementSource, measurementSource);
    assert.ok(html.includes(`<meta name="quickstark:observation-source" content="${measurementSource}">`));
  }
});

test("thread-turn observations remain explicitly thread-level and never acquire per-skill inference metadata", () => {
  const input = nativeReadout({ ...observedRun, attributionScope: "thread-turn" });
  const html = renderSkillReadout(input);

  assert.equal(normalizeSkillReadout(input).observation.attributionScope, "thread-turn");
  assert.match(html, /Observed thread-turn context/);
  assert.match(html, /Thread-turn model/);
  assert.match(html, /Thread-turn final response tokens/);
  assert.match(html, /Thread-turn active timing/);
  assert.match(html, /gpt-5\.6-sol/);
  assert.match(html, /1,480/);
  assert.match(html, /<meta name="quickstark:observation-scope" content="thread-turn">/);
  assert.doesNotMatch(html, /Observed skill run|Skill-run model|Skill-run final response tokens/);
  assert.doesNotMatch(html, /<meta name="quickstark:(?:provider|model|reasoning-effort|(?:input|output|total)-tokens|active-duration-ms)"/);
});

test("cumulative thread observations remain explicitly cumulative and never become an individual skill measurement", () => {
  const input = nativeReadout({ ...observedRun, attributionScope: "thread-cumulative" });
  const html = renderSkillReadout(input);

  assert.equal(normalizeSkillReadout(input).observation.attributionScope, "thread-cumulative");
  assert.match(html, /Observed thread-cumulative context/);
  assert.match(html, /Thread-cumulative model/);
  assert.match(html, /Thread-cumulative final response tokens/);
  assert.match(html, /<meta name="quickstark:observation-scope" content="thread-cumulative">/);
  assert.doesNotMatch(html, /Observed skill run|Skill-run model|Skill-run final response tokens/);
  assert.doesNotMatch(html, /<meta name="quickstark:(?:provider|model|reasoning-effort|(?:input|output|total)-tokens|active-duration-ms)"/);
});

test("an older or uninstrumented native readout remains valid without invented observations", () => {
  const input = {
    skill: "qs-code-build",
    outcome: "Preserve an older native report without inventing measurements.",
  };
  const normalized = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);

  assert.equal(normalized.observation, null);
  assert.doesNotMatch(html, /Observed skill run|Observed thread-turn|Observed thread-cumulative/);
  assert.doesNotMatch(html, /<meta name="quickstark:(?:observation-|provider|model|reasoning-effort|total-tokens|active-duration-ms)/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("a partially observed run displays every unavailable measurement as Not captured", () => {
  const input = nativeReadout({
    version: 1,
    measurementSource: "verified-harness",
    attributionScope: "skill-run",
    capturedAt: "2026-07-26T18:02:00.000Z",
  });
  const html = renderSkillReadout(input);

  assert.match(html, /Observed skill run/);
  assert.match(html, /verified-harness/);
  assert.ok((html.match(/Not captured/g) ?? []).length >= 12);
  assert.doesNotMatch(html, /<meta name="quickstark:(?:provider|model|reasoning-effort|total-tokens|active-duration-ms)"/);
});

test("genuinely observed zero tokens and zero active duration remain zero, not Not captured", () => {
  const input = nativeReadout({
    ...observedRun,
    tokens: { input: 0, cachedInput: 0, output: 0, reasoningOutput: 0, total: 0 },
    timing: {
      startedAt: "2026-07-26T18:02:00.000Z",
      finishedAt: "2026-07-26T18:02:00.000Z",
      activeDurationMs: 0,
    },
  });
  const html = renderSkillReadout(input);

  assert.match(html, /Input: 0/);
  assert.match(html, /Total: 0/);
  assert.match(html, /Active duration: 0 ms/);
  assert.match(html, /<meta name="quickstark:total-tokens" content="0">/);
  assert.match(html, /<meta name="quickstark:active-duration-ms" content="0">/);
});

test("catalog previews cannot claim an observed actual skill run", () => {
  const input = {
    ...nativeReadout(),
    status: "Preview",
    skillsUsed: [],
  };

  assert.throws(() => normalizeSkillReadout(input), /preview cannot claim an actual skill-run observation/i);
  assert.throws(() => renderSkillReadout(input), /preview cannot claim an actual skill-run observation/i);
});

test("observations reject absent, invented, or unsupported measurement sources and attribution scopes", () => {
  for (const [label, override, expected] of [
    ["missing source", { measurementSource: undefined }, /measurement source/i],
    ["invented source", { measurementSource: "estimated-from-output" }, /measurement source/i],
    ["missing attribution", { attributionScope: undefined }, /attribution scope/i],
    ["invented attribution", { attributionScope: "estimated-skill-run" }, /attribution scope/i],
    ["turn disguised as run", { attributionScope: "skill_run" }, /attribution scope/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, ...override })),
      expected,
      label,
    );
  }
});

test("observations reject unsupported versions and every unsupported top-level evidence field", () => {
  for (const [label, override, expected] of [
    ["missing version", { version: undefined }, /version/i],
    ["future version", { version: 2 }, /version/i],
    ["string version", { version: "1" }, /version/i],
    ["fabricated prompt", { prompt: "private prompt material" }, /unsupported observation field/i],
    ["fabricated response", { response: "private response material" }, /unsupported observation field/i],
    ["fabricated quality evidence", { quality: { source: "model-self-assessment" } }, /quality source/i],
    ["premature recommendation", { recommendationEvidence: { confidence: "high" } }, /unsupported observation field/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, ...override })),
      expected,
      label,
    );
  }
});

test("observations reject arrays, null, and objects with unexpected prototypes", () => {
  for (const [label, observation] of [
    ["null observation", null],
    ["array observation", []],
    ["custom prototype observation", Object.assign(Object.create({ inherited: true }), observedRun)],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout(observation)),
      /plain observation object/i,
      label,
    );
  }

  for (const [label, override, expected] of [
    ["null inference", { inference: null }, /inference.*plain observation object/i],
    ["array inference", { inference: [] }, /inference.*plain observation object/i],
    ["null tokens", { tokens: null }, /tokens.*plain observation object/i],
    ["array tokens", { tokens: [] }, /tokens.*plain observation object/i],
    ["null timing", { timing: null }, /timing.*plain observation object/i],
    ["array timing", { timing: [] }, /timing.*plain observation object/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, ...override })),
      expected,
      label,
    );
  }
});

test("observations reject unsafe providers, models, unknown inference fields, and unsupported reasoning efforts", () => {
  for (const [label, inference, expected] of [
    ["unsafe provider", { provider: "openai<script>" }, /safe provider identifier/i],
    ["uppercase provider", { provider: "OpenAI" }, /safe provider identifier/i],
    ["oversized provider", { provider: `o${"a".repeat(63)}` }, /safe provider identifier/i],
    ["unsafe model", { model: '<script>alert("model")</script>' }, /safe model identifier/i],
    ["model whitespace", { model: "gpt-5.6 sol" }, /safe model identifier/i],
    ["oversized model", { model: `m${"a".repeat(127)}` }, /safe model identifier/i],
    ["invented effort", { reasoningEffort: "turbo" }, /reasoning effort/i],
    ["secret-like extra inference", { provider: "openai", apiKey: "not-allowed" }, /unsupported observation field/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, inference })),
      expected,
      label,
    );
  }
});

test("all supported directly observed reasoning effort levels are accepted without changing the selected model", () => {
  for (const reasoningEffort of ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]) {
    const input = nativeReadout({
      ...observedRun,
      inference: { ...observedRun.inference, reasoningEffort },
    });
    const observation = normalizeSkillReadout(input).observation;

    assert.equal(observation.inference.reasoningEffort, reasoningEffort);
    assert.equal(observation.inference.model, "gpt-5.6-sol");
  }
});

test("token observations reject negative, fractional, nonnumeric, oversized, and unsupported values", () => {
  for (const [label, tokens, expected] of [
    ["negative input", { input: -1 }, /nonnegative safe integer/i],
    ["fractional output", { output: 1.5 }, /nonnegative safe integer/i],
    ["string total", { total: "1480" }, /nonnegative safe integer/i],
    ["oversized count", { total: Number.MAX_SAFE_INTEGER + 1 }, /nonnegative safe integer/i],
    ["infinite count", { input: Infinity }, /nonnegative safe integer/i],
    ["unsafe computed total", { input: Number.MAX_SAFE_INTEGER, output: 1 }, /token total.*safe integer/i],
    ["unsupported token", { input: 3, estimatedFromCharacters: 12 }, /unsupported observation field/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, tokens })),
      expected,
      label,
    );
  }
});

test("final response totals and token breakdowns must remain consistent with the observed counts", () => {
  for (const [label, tokens, expected] of [
    ["incorrect final total", { input: 1_200, output: 280, total: 1_479 }, /token total/i],
    ["total below observed input", { input: 1_200, total: 10 }, /token total/i],
    ["total below observed output", { output: 280, total: 10 }, /token total/i],
    ["total below observed cached input", { cachedInput: 300, total: 10 }, /token total/i],
    ["total below observed cache write", { cacheWrite: 300, total: 10 }, /token total/i],
    ["total below observed reasoning output", { reasoningOutput: 80, total: 10 }, /token total/i],
    ["cached input exceeds input", { input: 20, cachedInput: 21 }, /cached input tokens/i],
    ["reasoning exceeds output", { output: 20, reasoningOutput: 21 }, /reasoning output tokens/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, tokens })),
      expected,
      label,
    );
  }
});

test("capture and timing timestamps must be valid directly observed UTC instants", () => {
  for (const [label, override, expected] of [
    ["missing capture", { capturedAt: undefined }, /capturedAt.*UTC timestamp/i],
    ["invalid capture", { capturedAt: "not-an-observed-timestamp" }, /capturedAt.*UTC timestamp/i],
    ["impossible capture date", { capturedAt: "2026-02-30T18:02:00.000Z" }, /capturedAt.*valid observed UTC timestamp/i],
    ["generation time is not capture evidence", { capturedAt: 1_780_000_000_000 }, /capturedAt.*UTC timestamp/i],
    ["invalid start", { timing: { startedAt: "not-a-start" } }, /startedAt.*UTC timestamp/i],
    ["impossible finish", { timing: { finishedAt: "2026-02-30T18:02:00.000Z" } }, /finishedAt.*valid observed UTC timestamp/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, ...override })),
      expected,
      label,
    );
  }
});

test("active timing rejects reversed boundaries, unsafe durations, and durations beyond observed elapsed time", () => {
  for (const [label, timing, expected] of [
    [
      "reversed timestamps",
      { startedAt: "2026-07-26T18:02:00.000Z", finishedAt: "2026-07-26T18:01:00.000Z" },
      /cannot finish before/i,
    ],
    ["negative duration", { activeDurationMs: -1 }, /activeDurationMs.*nonnegative safe integer/i],
    [
      "oversized duration",
      { activeDurationMs: Number.MAX_SAFE_INTEGER + 1 },
      /activeDurationMs.*nonnegative safe integer/i,
    ],
    [
      "active duration exceeds elapsed time",
      {
        startedAt: "2026-07-26T18:01:00.000Z",
        finishedAt: "2026-07-26T18:02:00.000Z",
        activeDurationMs: 60_001,
      },
      /active duration cannot exceed/i,
    ],
    ["invented timing", { estimatedDurationMs: 42 }, /unsupported observation field/i],
  ]) {
    assert.throws(
      () => normalizeSkillReadout(nativeReadout({ ...observedRun, timing })),
      expected,
      label,
    );
  }
});

test("a directly observed report survives immutable storage and the protected read-only native viewer", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-observation-test-"));
  const input = {
    ...nativeReadout(),
    reportId: "d64f5874-f108-4783-a6e3-c7f0766a4201",
    generatedAt: "2026-07-26T18:03:00.000Z",
    projectIdentity: {
      host: "github.com",
      owner: "quickstark",
      repository: "skills",
      key: "github.com/quickstark/skills",
      label: "quickstark/skills",
      source: "explicit",
    },
  };
  const result = await writeSkillReadout(input, { directory, layout: "project" });
  const original = await readFile(result.path, "utf8");
  const viewer = await startReadoutServer({
    directory,
    port: 0,
    currentProject: "github.com/quickstark/skills",
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  const response = await fetch(new URL(result.relativePath, viewer.url));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.equal(await response.text(), original);
  assert.match(original, /Observed skill run/);
  assert.match(original, /gpt-5\.6-sol/);
  assert.match(original, /<meta name="quickstark:observation-scope" content="skill-run">/);
  assert.match(original, /<meta name="quickstark:total-tokens" content="1480">/);
  assert.doesNotMatch(original, /<script\b/i);

  await assert.rejects(
    () => writeSkillReadout(input, { directory, layout: "project" }),
    /EEXIST/,
  );
  assert.equal(await readFile(result.path, "utf8"), original);
});

test("authorized hosted native ingestion preserves the directly observed skill run in its immutable report", async (context) => {
  const { viewer, ingestion } = await createObservedIngestion(context);
  const response = await submitObservedReadout(ingestion, observedIngestionEnvelope());

  assert.equal(response.status, 201);

  const accepted = await response.json();
  const hosted = await fetch(accepted.url);
  const html = await hosted.text();

  assert.ok(accepted.url.startsWith(viewer.url));
  assert.equal(hosted.status, 200);
  assert.match(hosted.headers.get("content-security-policy"), /default-src 'none'/);
  assert.match(html, /Observed skill run/);
  assert.match(html, /provider-response/);
  assert.match(html, /gpt-5\.6-sol/);
  assert.match(html, /1,480/);
  assert.match(html, /42,000 ms/);
  assert.match(html, /<meta name="quickstark:observation-scope" content="skill-run">/);
  assert.match(html, /<meta name="quickstark:model" content="gpt-5\.6-sol">/);
  assert.match(html, /<meta name="quickstark:total-tokens" content="1480">/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("an opted-in native render preserves observed model and independent quality in its automatically published report", async (context) => {
  const { ingestion } = await createObservedIngestion(context);
  const localDirectory = await mkdtemp(join(tmpdir(), "quickstark-observed-local-test-"));
  const input = {
    ...nativeReadout({
      ...observedRun,
      quality: { source: "observed-checks", passedChecks: 1, failedChecks: 0 },
    }),
    checks: [{ title: "Automatically published observation", status: "passed" }],
    reportId: "f774a94c-ff79-4f75-af96-61b7c806fa34",
    generatedAt: "2026-07-26T18:03:00.000Z",
    projectIdentity: {
      host: "github.com",
      owner: "quickstark",
      repository: "skills",
      key: "github.com/quickstark/skills",
      label: "quickstark/skills",
      source: "explicit",
    },
    nextSkills: [],
  };

  context.after(async () => {
    await rm(localDirectory, { recursive: true, force: true });
  });

  const { stdout } = await execFileAsync(process.execPath, [
    readoutScript,
    "render",
    "--data", JSON.stringify(input),
    "--directory", localDirectory,
    "--no-serve",
    "--json",
  ], {
    env: {
      ...process.env,
      QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
      QS_READOUT_PRODUCER_ID: "observed-codex",
      QS_READOUT_PRODUCER_TOKEN: "test-only-observed-codex-credential-1234567890",
      QS_READOUT_PUBLISH_PROJECTS: "github.com/quickstark/skills",
      QS_READOUT_HARNESS: "codex",
      QS_READOUT_PUBLISH_RETRY_DELAY: "0",
    },
  });
  const result = JSON.parse(stdout);

  assert.equal(result.publication.status, "published");

  const local = await readFile(result.path, "utf8");
  const hosted = await fetch(result.publication.url);
  const html = await hosted.text();

  assert.equal(hosted.status, 200);
  assert.match(local, /<meta name="quickstark:model" content="gpt-5\.6-sol">/);
  assert.match(local, /<meta name="quickstark:quality-source" content="observed-checks">/);
  assert.match(html, /<meta name="quickstark:model" content="gpt-5\.6-sol">/);
  assert.match(html, /<meta name="quickstark:quality-source" content="observed-checks">/);
  assert.match(html, /Automatically published observation/);
  assert.doesNotMatch(stdout, /test-only-observed-codex-credential/i);
});

test("an authorized external producer preserves its observed skill run throughout hosted rendering", async (context) => {
  const { ingestion } = await createObservedIngestion(context);
  const response = await submitObservedReadout(ingestion, observedIngestionEnvelope({
    collection: "independent/agent-skills",
    harness: { name: "claude-code", version: "1.2.0" },
    skill: "external-observed-build",
    displayName: "Independently observed external build",
  }));

  assert.equal(response.status, 201);

  const accepted = await response.json();
  const hosted = await fetch(accepted.url);
  const html = await hosted.text();

  assert.equal(hosted.status, 200);
  assert.match(html, /Independently observed external build/);
  assert.match(html, /Observed skill run/);
  assert.match(html, /provider-response/);
  assert.match(html, /gpt-5\.6-sol/);
  assert.match(html, /1,480/);
  assert.match(html, /42,000 ms/);
  assert.match(html, /<meta name="quickstark:report-origin" content="external">/);
  assert.match(html, /<meta name="quickstark:observation-scope" content="skill-run">/);
  assert.match(html, /<meta name="quickstark:model" content="gpt-5\.6-sol">/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("authorized external delivery preserves independently verified quality and rejects conflicting quality retries", async (context) => {
  const { ingestion } = await createObservedIngestion(context);
  const checks = [
    { title: "External hosted delivery", status: "passed" },
    { title: "External regression evidence", status: "failed" },
  ];
  const envelope = observedIngestionEnvelope({
    collection: "independent/agent-skills",
    harness: { name: "claude-code", version: "1.2.0" },
    skill: "external-quality-review",
    displayName: "Independently reviewed external work",
    checks,
    observation: {
      ...observedRun,
      quality: { source: "observed-checks", passedChecks: 1, failedChecks: 1 },
    },
  });
  const first = await submitObservedReadout(ingestion, envelope);

  assert.equal(first.status, 201);

  const accepted = await first.json();
  const original = await (await fetch(accepted.url)).text();

  assert.match(original, /Independent quality evidence/);
  assert.match(original, /External hosted delivery/);
  assert.match(original, /External regression evidence/);
  assert.match(original, /<meta name="quickstark:quality-source" content="observed-checks">/);
  assert.match(original, /<meta name="quickstark:quality-passed-checks" content="1">/);
  assert.match(original, /<meta name="quickstark:quality-failed-checks" content="1">/);

  const retry = await submitObservedReadout(ingestion, envelope);

  assert.equal(retry.status, 200);

  const conflict = await submitObservedReadout(ingestion, {
    ...envelope,
    observation: {
      ...observedRun,
      quality: { source: "user-feedback", feedback: "accepted" },
    },
  });

  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: "run_conflict" });
  assert.equal(await (await fetch(accepted.url)).text(), original);
});

test("observed hosted retries are idempotent and conflicting measurements never replace an immutable report", async (context) => {
  const { ingestion } = await createObservedIngestion(context);
  const envelope = observedIngestionEnvelope();
  const first = await submitObservedReadout(ingestion, envelope);

  assert.equal(first.status, 201);

  const accepted = await first.json();
  const original = await (await fetch(accepted.url)).text();
  const retry = await submitObservedReadout(ingestion, envelope);

  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), {
    status: "existing",
    project: "github.com/quickstark/skills",
    skill: "qs-code-build",
    reportId: envelope.runId,
    url: accepted.url,
  });

  const conflict = await submitObservedReadout(ingestion, {
    ...envelope,
    observation: {
      ...observedRun,
      inference: { ...observedRun.inference, reasoningEffort: "high" },
    },
  });

  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: "run_conflict" });
  assert.equal(await (await fetch(accepted.url)).text(), original);
});

test("hosted ingestion preserves thread-level observation scope without publishing individual skill measurements", async (context) => {
  const { ingestion } = await createObservedIngestion(context);

  for (const [attributionScope, runId] of [
    ["thread-turn", "f774a94c-ff79-4f75-af96-61b7c806fa32"],
    ["thread-cumulative", "f774a94c-ff79-4f75-af96-61b7c806fa33"],
  ]) {
    const response = await submitObservedReadout(ingestion, observedIngestionEnvelope({
      runId,
      observation: { ...observedRun, attributionScope },
    }));

    assert.equal(response.status, 201, attributionScope);

    const hosted = await fetch((await response.json()).url);
    const html = await hosted.text();

    assert.equal(hosted.status, 200, attributionScope);
    assert.match(html, new RegExp(`Observed ${attributionScope} context`));
    assert.match(html, new RegExp(`<meta name="quickstark:observation-scope" content="${attributionScope}">`));
    assert.doesNotMatch(html, /Observed skill run|Skill-run model|Skill-run final response tokens/);
    assert.doesNotMatch(html, /<meta name="quickstark:(?:provider|model|reasoning-effort|(?:input|output|total)-tokens|active-duration-ms)"/);
  }
});

test("hosted observed delivery rejects malformed measurements and preserves independent project authorization", async (context) => {
  const { viewer, ingestion } = await createObservedIngestion(context);

  for (const [label, observation] of [
    ["unknown measurement source", { ...observedRun, measurementSource: "estimated-from-output" }],
    ["unsafe model", {
      ...observedRun,
      inference: { ...observedRun.inference, model: '<script>alert("unsafe")</script>' },
    }],
    ["inconsistent tokens", { ...observedRun, tokens: { input: 1_200, output: 280, total: 12 } }],
    ["private prompt", { ...observedRun, prompt: "private prompt material" }],
    ["private response", { ...observedRun, response: "private response material" }],
    ["unobserved quality", {
      ...observedRun,
      quality: { source: "observed-checks", passedChecks: 1 },
    }],
    ["invented quality source", {
      ...observedRun,
      quality: { source: "model-self-assessment", feedback: "accepted" },
    }],
  ]) {
    const response = await submitObservedReadout(ingestion, observedIngestionEnvelope({ observation }));

    assert.equal(response.status, 422, label);
    assert.deepEqual(await response.json(), { error: "invalid_readout" }, label);
  }

  const unapproved = await submitObservedReadout(ingestion, observedIngestionEnvelope({
    project: "https://github.com/quickstark/marketplace.git",
  }));

  assert.equal(unapproved.status, 403);

  const gallery = await fetch(viewer.url);

  assert.equal(gallery.status, 200);
  assert.doesNotMatch(await gallery.text(), /marketplace|unsafe|private prompt|private response/i);
});
