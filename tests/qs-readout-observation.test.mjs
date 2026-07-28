import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("Codex captures only provider usage belonging to one explicitly invoked skill task", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-codex-skill-observation-"));
  const threadId = "8472f96c-9fd4-4a40-973a-d4474a24d891";
  const session = join(directory, `rollout-2026-07-27T18-00-00-${threadId}.jsonl`);
  const usage = (input, output, cachedInput, reasoningOutput) => ({
    input_tokens: input,
    cached_input_tokens: cachedInput,
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: reasoningOutput,
    total_tokens: input + output,
  });
  const event = (timestamp, type, payload) => JSON.stringify({ timestamp, type, payload });
  const records = [
    event("2026-07-27T18:00:00.000Z", "event_msg", {
      type: "token_count",
      info: { total_token_usage: usage(1_000, 200, 100, 20) },
    }),
    event("2026-07-27T18:01:00.000Z", "event_msg", {
      type: "task_started",
      turn_id: "isolated-skill-turn",
    }),
    event("2026-07-27T18:01:01.000Z", "event_msg", {
      type: "user_message",
      message: "Use $qs-code-build to repair PRIVATE_FIXTURE_PROMPT_DO_NOT_LEAK.",
    }),
    event("2026-07-27T18:01:02.000Z", "turn_context", {
      model: "gpt-5.6-sol",
      effort: "high",
    }),
    event("2026-07-27T18:01:06.000Z", "response_item", {
      type: "message",
      content: "PRIVATE_FIXTURE_RESPONSE_DO_NOT_LEAK",
    }),
    event("2026-07-27T18:01:08.000Z", "event_msg", {
      type: "token_count",
      info: { total_token_usage: usage(1_180, 265, 130, 34) },
    }),
  ];

  await writeFile(session, `${records.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  context.after(async () => rm(directory, { recursive: true, force: true }));

  const module = await import("../scripts/qs-skill-readout.mjs");

  assert.equal(typeof module.captureCodexSkillObservation, "function",
    "the public readout boundary exposes a real Codex task-observation adapter");

  const observation = await module.captureCodexSkillObservation("qs-code-build", {
    threadId,
    sessionDirectory: directory,
    now: new Date("2026-07-27T18:01:12.000Z"),
  });

  assert.deepEqual(observation, {
    version: 1,
    measurementSource: "verified-harness",
    attributionScope: "skill-run",
    capturedAt: "2026-07-27T18:01:12.000Z",
    inference: { model: "gpt-5.6-sol", reasoningEffort: "high" },
    tokens: {
      input: 180,
      cachedInput: 30,
      cacheWrite: 0,
      output: 65,
      reasoningOutput: 14,
      total: 245,
    },
    timing: {
      startedAt: "2026-07-27T18:01:00.000Z",
      activeDurationMs: 12_000,
    },
  });
  assert.doesNotMatch(JSON.stringify(observation), /PRIVATE_FIXTURE_(?:PROMPT|RESPONSE)/,
    "the observation never exports source prompts, model responses, or tool output");
});

test("Codex captures the exact skill selected through its namespaced plugin picker", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-namespaced-skill-observation-"));
  context.after(async () => rm(directory, { recursive: true, force: true }));

  const fixtures = [
    {
      threadId: "ad4b0a10-6f34-4c63-9e60-47b33a5e4801",
      message: "Use [$qs-skills:qs-code-build](/private/qs-code-build/SKILL.md) for PRIVATE_PLUGIN_REQUEST.",
      captured: true,
    },
    {
      threadId: "ad4b0a10-6f34-4c63-9e60-47b33a5e4802",
      message: "Use $qs-skills:qs-code-build for PRIVATE_PLUGIN_REQUEST.",
      captured: true,
    },
    {
      threadId: "ad4b0a10-6f34-4c63-9e60-47b33a5e4803",
      message: "Use /qs-skills:qs-code-build for PRIVATE_PLUGIN_REQUEST.",
      captured: true,
    },
    {
      threadId: "ad4b0a10-6f34-4c63-9e60-47b33a5e4804",
      message: "Use $qs-skills:qs-code-build and $qs-skills:qs-test-tdd for PRIVATE_PLUGIN_REQUEST.",
      captured: false,
    },
  ];
  const usage = (input, output) => ({
    input_tokens: input,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: 0,
    total_tokens: input + output,
  });
  const event = (timestamp, type, payload) => JSON.stringify({ timestamp, type, payload });
  const { captureCodexSkillObservation } = await import("../scripts/qs-skill-readout.mjs");

  for (const fixture of fixtures) {
    const session = join(directory, `rollout-2026-07-27T18-00-00-${fixture.threadId}.jsonl`);
    const records = [
      event("2026-07-27T18:00:00.000Z", "event_msg", {
        type: "token_count",
        info: { total_token_usage: usage(1_000, 100) },
      }),
      event("2026-07-27T18:01:00.000Z", "event_msg", {
        type: "task_started",
        turn_id: `namespaced-${fixture.threadId}`,
      }),
      event("2026-07-27T18:01:01.000Z", "event_msg", {
        type: "user_message",
        message: fixture.message,
      }),
      event("2026-07-27T18:01:02.000Z", "turn_context", {
        model: "gpt-5.6-sol",
        effort: "high",
      }),
      event("2026-07-27T18:01:08.000Z", "event_msg", {
        type: "token_count",
        info: { total_token_usage: usage(1_400, 200) },
      }),
    ];
    await writeFile(session, `${records.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });

    const observation = await captureCodexSkillObservation("qs-code-build", {
      threadId: fixture.threadId,
      sessionDirectory: directory,
      now: new Date("2026-07-27T18:01:12.000Z"),
    });

    if (!fixture.captured) {
      assert.equal(observation, null, "mixed namespaced skills must never claim single-skill metrics");
      continue;
    }

    assert.deepEqual(observation, {
      version: 1,
      measurementSource: "verified-harness",
      attributionScope: "skill-run",
      capturedAt: "2026-07-27T18:01:12.000Z",
      inference: { model: "gpt-5.6-sol", reasoningEffort: "high" },
      tokens: {
        input: 400,
        cachedInput: 0,
        cacheWrite: 0,
        output: 100,
        reasoningOutput: 0,
        total: 500,
      },
      timing: {
        startedAt: "2026-07-27T18:01:00.000Z",
        activeDurationMs: 12_000,
      },
    }, `capture the exact namespaced invocation: ${fixture.message.replace(/PRIVATE_PLUGIN_REQUEST/g, "[private]")}`);
    assert.doesNotMatch(JSON.stringify(observation), /PRIVATE_PLUGIN_REQUEST|\/private\//,
      "plugin-selected metrics never export the user's prompt or skill path");
  }
});

test("long-running Codex tasks retain genuine skill metrics beyond the original four-megabyte session window", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-long-codex-observation-"));
  const threadId = "79ad94ef-6cf3-47a0-916b-e6604993b1c5";
  const session = join(directory, `rollout-2026-07-27T18-00-00-${threadId}.jsonl`);
  const usage = (input, output) => ({
    input_tokens: input,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: 0,
    total_tokens: input + output,
  });
  const event = (timestamp, type, payload) => JSON.stringify({ timestamp, type, payload });
  const records = [
    event("2026-07-27T18:00:00.000Z", "event_msg", {
      type: "token_count",
      info: { total_token_usage: usage(1_000, 100) },
    }),
    event("2026-07-27T18:01:00.000Z", "event_msg", {
      type: "task_started",
      turn_id: "long-running-verified-skill",
    }),
    event("2026-07-27T18:01:01.000Z", "event_msg", {
      type: "user_message",
      message: "Use $qs-code-build to fix PRIVATE_LONG_RUNNING_SKILL_REQUEST.",
    }),
    event("2026-07-27T18:01:02.000Z", "turn_context", {
      model: "gpt-5.6-sol",
      effort: "high",
    }),
    event("2026-07-27T18:01:03.000Z", "response_item", {
      type: "message",
      content: `PRIVATE_LONG_RUNNING_RESPONSE_${"x".repeat(5 * 1024 * 1024)}`,
    }),
    event("2026-07-27T18:02:00.000Z", "event_msg", {
      type: "token_count",
      info: { total_token_usage: usage(1_480, 240) },
    }),
  ];

  await writeFile(session, `${records.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  context.after(async () => rm(directory, { recursive: true, force: true }));

  const { captureCodexSkillObservation } = await import("../scripts/qs-skill-readout.mjs");
  const observation = await captureCodexSkillObservation("qs-code-build", {
    threadId,
    sessionDirectory: directory,
    now: new Date("2026-07-27T18:02:10.000Z"),
  });

  assert.ok(observation, "real skill usage survives a large, private long-running Codex task");
  assert.equal(observation.measurementSource, "verified-harness");
  assert.equal(observation.attributionScope, "skill-run");
  assert.deepEqual(observation.inference, { model: "gpt-5.6-sol", reasoningEffort: "high" });
  assert.equal(observation.tokens.input, 480);
  assert.equal(observation.tokens.output, 140);
  assert.equal(observation.tokens.total, 620);
  assert.equal(observation.timing.activeDurationMs, 70_000);
  assert.doesNotMatch(JSON.stringify(observation), /PRIVATE_LONG_RUNNING_(?:SKILL_REQUEST|RESPONSE)/,
    "no private prompt, response, or intermediate model output enters the observation");
});

test("Codex skill metrics reject another task, ambiguous skills, mixed models, and unsafe counter attribution", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-codex-observation-boundaries-"));
  const module = await import("../scripts/qs-skill-readout.mjs");
  const now = new Date("2026-07-27T18:01:12.000Z");
  const usage = (input, output) => ({
    input_tokens: input,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_output_tokens: 0,
    total_tokens: input + output,
  });
  const event = (timestamp, type, payload) => JSON.stringify({ timestamp, type, payload });
  const baseline = event("2026-07-27T18:00:00.000Z", "event_msg", {
    type: "token_count",
    info: { total_token_usage: usage(1_000, 100) },
  });
  const start = event("2026-07-27T18:01:00.000Z", "event_msg", {
    type: "task_started",
    turn_id: "exact-skill-turn",
  });
  const requested = event("2026-07-27T18:01:01.000Z", "event_msg", {
    type: "user_message",
    message: "Use $qs-code-build to safely process PRIVATE_BOUNDARY_PROMPT.",
  });
  const model = event("2026-07-27T18:01:02.000Z", "turn_context", {
    model: "gpt-5.6-sol",
    effort: "high",
  });
  const observed = event("2026-07-27T18:01:08.000Z", "event_msg", {
    type: "token_count",
    info: { total_token_usage: usage(1_200, 150) },
  });
  const cases = [
    {
      label: "a different first-invoked skill",
      lines: [baseline, start, event("2026-07-27T18:01:01.000Z", "event_msg", {
        type: "user_message",
        message: "Use $qs-review-code before $qs-code-build.",
      }), model, observed],
    },
    {
      label: "multiple user actions in one task",
      lines: [baseline, start, requested, event("2026-07-27T18:01:04.000Z", "event_msg", {
        type: "user_message",
        message: "Use $qs-design-modules as an additional independent task.",
      }), model, observed],
    },
    {
      label: "multiple different skills in one user message",
      lines: [baseline, start, event("2026-07-27T18:01:01.000Z", "event_msg", {
        type: "user_message",
        message: "Use $qs-code-build and $qs-design-modules in the same task.",
      }), model, observed],
    },
    {
      label: "inconsistent provider models",
      lines: [baseline, start, requested, model, event("2026-07-27T18:01:05.000Z", "turn_context", {
        model: "gpt-5.6-terra",
        effort: "high",
      }), observed],
    },
    {
      label: "provider counters that go backwards",
      lines: [baseline, start, requested, model, event("2026-07-27T18:01:08.000Z", "event_msg", {
        type: "token_count",
        info: { total_token_usage: usage(900, 90) },
      })],
    },
    {
      label: "missing pre-skill usage evidence",
      lines: [start, requested, model, observed],
    },
  ];

  context.after(async () => rm(directory, { recursive: true, force: true }));

  for (let index = 0; index < cases.length; index += 1) {
    const threadId = `a8f2d908-933a-4b94-9d5b-${String(index + 1).padStart(12, "0")}`;
    const session = join(directory, `rollout-2026-07-27T18-00-00-${threadId}.jsonl`);

    await writeFile(session, `${cases[index].lines.join("\n")}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    assert.equal(
      await module.captureCodexSkillObservation("qs-code-build", {
        threadId,
        sessionDirectory: directory,
        now,
      }),
      null,
      `${cases[index].label} must not be presented as verified individual skill usage`,
    );
  }
});

test("an ordinary skill render automatically publishes only its directly observed Codex invocation metrics", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-codex-automatic-observation-"));
  const { ingestion } = await createObservedIngestion(context);
  const threadId = "2c63a311-8dc9-495e-bf8d-f2778fd9f987";
  const session = join(directory, `rollout-2026-07-27T18-00-00-${threadId}.jsonl`);
  const input = join(directory, "input.json");
  const startedAt = new Date(Date.now() - 8_000).toISOString();
  const capturedAt = new Date(Date.now() - 2_000).toISOString();
  const usage = (inputTokens, outputTokens) => ({
    input_tokens: inputTokens,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: outputTokens,
    reasoning_output_tokens: 0,
    total_tokens: inputTokens + outputTokens,
  });
  const event = (timestamp, type, payload) => JSON.stringify({ timestamp, type, payload });
  const events = [
    event(new Date(Date.now() - 10_000).toISOString(), "event_msg", {
      type: "token_count",
      info: { total_token_usage: usage(900, 100) },
    }),
    event(startedAt, "event_msg", { type: "task_started", turn_id: "automatic-skill-task" }),
    event(startedAt, "event_msg", {
      type: "user_message",
      message: "Use $qs-code-build to verify PRIVATE_AUTOMATIC_PROMPT_DO_NOT_LEAK.",
    }),
    event(startedAt, "turn_context", { model: "gpt-5.6-sol", effort: "high" }),
    event(capturedAt, "event_msg", {
      type: "token_count",
      info: { total_token_usage: usage(1_140, 160) },
    }),
  ];

  await writeFile(session, `${events.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(input, JSON.stringify({
    skill: "qs-code-build",
    outcome: "Automatically preserve the actual skill-bounded Codex provider measurements.",
    nextSkills: [],
  }), { encoding: "utf8", mode: 0o600 });
  context.after(async () => rm(directory, { recursive: true, force: true }));

  const environment = {
    ...process.env,
    CODEX_THREAD_ID: threadId,
    QS_READOUT_CODEX_SESSION_DIRECTORY: directory,
    QS_READOUT_INGESTION_URL: new URL("api/v1/readouts", ingestion.url).href,
    QS_READOUT_PRODUCER_TOKEN: "test-only-observed-codex-credential-1234567890",
    QS_READOUT_PUBLISH_RETRY_DELAY: "0",
  };

  const { stdout } = await execFileAsync(process.execPath, [
    readoutScript,
    "render",
    "--input", input,
    "--directory", directory,
    "--no-serve",
    "--json",
  ], { env: environment });
  const result = JSON.parse(stdout);

  assert.equal(result.publication.status, "published");

  const local = await readFile(result.path, "utf8");
  const response = await fetch(result.publication.url);

  assert.equal(response.status, 200);

  const hosted = await response.text();

  for (const html of [local, hosted]) {
    assert.ok(html.includes('<meta name="quickstark:observation-source" content="verified-harness">'));
    assert.ok(html.includes('<meta name="quickstark:observation-scope" content="skill-run">'));
    assert.ok(html.includes('<meta name="quickstark:model" content="gpt-5.6-sol">'));
    assert.ok(html.includes('<meta name="quickstark:reasoning-effort" content="high">'));
    assert.ok(html.includes('<meta name="quickstark:input-tokens" content="240">'));
    assert.ok(html.includes('<meta name="quickstark:output-tokens" content="60">'));
    assert.ok(html.includes('<meta name="quickstark:total-tokens" content="300">'));
    assert.match(html, /<meta name="quickstark:active-duration-ms" content="\d+">/);
    assert.doesNotMatch(html, /PRIVATE_AUTOMATIC_PROMPT_DO_NOT_LEAK/);
  }

  assert.doesNotMatch(stdout, /test-only-observed-codex-credential/i);
});

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

test("verified Codex skill-run metrics appear near the top immediately after next prompts", () => {
  const html = renderSkillReadout(nativeReadout());
  const metrics = html.match(/<section class="section presentation-run-metrics"[\s\S]*?<\/section>/)?.[0];

  assert.ok(metrics, "a directly observed skill run has a concise top-level metrics section");
  assert.match(metrics, /<h2>Skill run metrics<\/h2>/);
  assert.match(metrics, /provider-response/);
  assert.match(metrics, /skill-run/);
  assert.match(metrics, /gpt-5\.6-sol/);
  assert.match(metrics, /medium/);
  assert.match(metrics, /1,200/);
  assert.match(metrics, /280/);
  assert.match(metrics, /1,480/);
  assert.match(metrics, /42,000 ms/);
  assert.ok(html.indexOf('<h2>Top next prompts</h2>') < html.indexOf('<h2>Skill run metrics</h2>'));
  assert.ok(html.indexOf('<h2>Skill run metrics</h2>') < html.indexOf('<h2>Execution context</h2>'));
});

test("uninstrumented Codex skill runs identify unavailable top-level metrics without inventing them", () => {
  const html = renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve an actual skill result without fabricating provider telemetry.",
  });
  const metrics = html.match(/<section class="section presentation-run-metrics"[\s\S]*?<\/section>/)?.[0];

  assert.ok(metrics, "an actual skill run explains when Codex metrics were not captured");
  assert.match(metrics, /<h2>Skill run metrics<\/h2>/);
  assert.ok((metrics.match(/Not captured/g) ?? []).length >= 6);
  assert.doesNotMatch(metrics, /gpt-5\.6|provider-response|\b\d{1,3}(?:,\d{3})+\b/);
});

test("top-level skill-run metrics never misattribute thread-level Codex telemetry", () => {
  for (const attributionScope of ["thread-turn", "thread-cumulative"]) {
    const html = renderSkillReadout(nativeReadout({ ...observedRun, attributionScope }));
    const metrics = html.match(/<section class="section presentation-run-metrics"[\s\S]*?<\/section>/)?.[0];

    assert.ok(metrics, `${attributionScope} explains the missing individual skill measurements`);
    assert.match(metrics, /<h2>Skill run metrics<\/h2>/);
    assert.ok((metrics.match(/Not captured/g) ?? []).length >= 6);
    assert.doesNotMatch(metrics, /gpt-5\.6-sol|\b1,200\b|\b1,480\b|42,000 ms/);
    assert.match(html, new RegExp(`Observed ${attributionScope} context`));
  }
});

test("an unrun catalog preview never claims a Codex skill-run metrics section", () => {
  const html = renderSkillReadout({
    skill: "qs-code-build",
    status: "Preview",
    skillsUsed: [],
    outcome: "Catalog preview only; no skill has run.",
  });

  assert.doesNotMatch(html, /<h2>Skill run metrics<\/h2>/);
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

test("independently observed quality uses the same 100-check boundary as the immutable Workbench snapshot", () => {
  const observedQuality = (passedChecks, failedChecks) => ({
    ...nativeReadout({
      ...observedRun,
      quality: { source: "observed-checks", passedChecks, failedChecks },
    }),
    checks: [
      ...Array.from({ length: passedChecks }, (_, index) => ({
        title: `Observed passing behavior ${index + 1}`,
        status: "passed",
      })),
      ...Array.from({ length: failedChecks }, (_, index) => ({
        title: `Observed failing behavior ${index + 1}`,
        status: "failed",
      })),
    ],
  });

  for (const [passedChecks, failedChecks] of [[98, 1], [99, 1], [100, 0]]) {
    const input = observedQuality(passedChecks, failedChecks);
    const normalized = normalizeSkillReadout(input);

    assert.deepEqual(normalized.observation.quality, {
      source: "observed-checks",
      passedChecks,
      failedChecks,
    });
    assert.match(renderSkillReadout(input), /Independent quality evidence/);
  }

  for (const [passedChecks, failedChecks] of [[100, 1], [100, 100]]) {
    assert.throws(
      () => normalizeSkillReadout(observedQuality(passedChecks, failedChecks)),
      /(?:100|bounded|maximum).*checks|checks.*(?:100|bounded|maximum)/i,
      `${passedChecks} passed and ${failedChecks} failed checks`,
    );
  }
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
  assert.match(original, /<h2>Skill run metrics<\/h2>/);
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
  assert.match(html, /<h2>Skill run metrics<\/h2>/);
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
