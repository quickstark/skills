import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright-core";

import {
  normalizeReadoutPreferences,
  readoutPlatformSetup,
  renderReadoutSettings,
  startReadoutSettingsServer,
} from "../scripts/qs-readout-settings.mjs";
import {
  startReadoutIngestionServer,
  startReadoutServer,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";

const execFileAsync = promisify(execFile);
const producerTokenScript = fileURLToPath(new URL("../scripts/qs-readout-producer-token.mjs", import.meta.url));

async function createSettings(context, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-settings-test-"));
  const credentialsDirectory = join(directory, "credentials");
  const producersFile = join(directory, "readout-producers.json");

  await writeFile(producersFile, JSON.stringify({
    version: 1,
    producers: [],
  }), { encoding: "utf8", mode: 0o600 });

  const settings = await startReadoutSettingsServer({
    host: "127.0.0.1",
    port: 0,
    credentialsDirectory,
    producersFile,
    adminUsers: ["quickstark-admin"],
    trustedProxy: true,
    ...overrides,
  });

  context.after(async () => {
    if (settings.server.listening) {
      await new Promise((resolve, reject) => {
        settings.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  return { settings, directory, credentialsDirectory, producersFile };
}

async function administratorPage(settings) {
  return fetch(new URL("/settings", settings.url), {
    headers: { "Remote-User": "quickstark-admin" },
  });
}

function csrfFrom(html) {
  const csrf = html.match(/name="csrf"\s+value="([a-f0-9]{64})"/i);

  assert.ok(csrf, "Settings supplies a user-bound anti-CSRF token.");

  return csrf[1];
}

test("settings normalize the approved B defaults and bounded user typography preferences", () => {
  const defaults = normalizeReadoutPreferences();

  assert.deepEqual(defaults, {
    size: "default",
    density: "balanced",
    featurePx: 13,
    promptPx: 12,
  });

  assert.deepEqual(normalizeReadoutPreferences({ size: "comfortable", density: "compact" }), {
    size: "comfortable",
    density: "compact",
    featurePx: 15,
    promptPx: 14,
  });

  assert.throws(() => normalizeReadoutPreferences({ size: "javascript:alert(1)" }), /size|preference/i);
  assert.throws(() => normalizeReadoutPreferences({ density: "overflow" }), /density|preference/i);
});

test("one platform interface gives Linux, macOS, Windows, and ChatGPT truthful bearer setup", () => {
  const adapters = readoutPlatformSetup();

  assert.deepEqual(adapters.map((adapter) => adapter.id), ["linux", "macos", "windows", "chatgpt"]);
  assert.match(adapters[0].command, /QS_READOUT_PRODUCER_TOKEN/);
  assert.match(adapters[1].command, /security find-generic-password/);
  assert.doesNotMatch(adapters[1].command, /launchctl\s+setenv/,
    "macOS setup must never place a profile-specific bearer in the shared desktop environment");
  assert.match(adapters[2].command, /SetEnvironmentVariable/);
  assert.match(adapters[3].command, /Bearer/);
  assert.match(adapters[3].command, /OpenAPI/);

  for (const adapter of adapters) {
    assert.doesNotMatch(adapter.command, /Bearer\s+[A-Za-z0-9_-]{24,}/);
    assert.doesNotMatch(adapter.command, /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/);
  }
});

test("macOS token setup installs an independently discoverable credential for the active Codex profile", async () => {
  const token = "m".repeat(64);
  const macos = readoutPlatformSetup(token).find((adapter) => adapter.id === "macos");

  assert.ok(macos);
  assert.match(macos.command, /\$HOME\/\.codex(?:["']|\s|$)/,
    "an ordinary macOS Terminal can install the default Codex profile without inheriting CODEX_HOME");
  assert.match(macos.command, /\$quickstark_codex_home\/quickstark/,
    "the macOS setup selects the active Codex profile's private QuickStark directory");
  assert.match(macos.command, /\$quickstark_codex_directory\/producer\.token/,
    "the macOS setup creates the secure profile credential the renderer can actually discover");
  assert.match(macos.command, /quickstark-readout-producer-token-/,
    "each Codex profile receives an independently named Keychain credential");
  assert.match(macos.command, /install -d -m 700/,
    "profile credential storage is restricted to its owning macOS user");
  assert.doesNotMatch(macos.command, /launchctl\s+setenv|QS_READOUT_PRODUCER_TOKEN/,
    "profile-specific macOS installation never overrides another desktop application's producer");
  assert.ok(macos.command.includes(token),
    "the ready-to-paste instruction contains the exact one-time token");
  await execFileAsync("zsh", ["-n", "-c", macos.command]);
});

test("macOS setup executes independent default and demo installations from an ordinary Terminal", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-macos-profile-setup-"));
  const home = join(directory, "home");
  const bin = join(directory, "bin");
  const keychainLog = join(directory, "keychain.log");

  context.after(async () => rm(directory, { recursive: true, force: true }));
  await mkdir(home, { recursive: true, mode: 0o700 });
  await mkdir(bin, { recursive: true, mode: 0o700 });
  await writeFile(join(bin, "security"), [
    "#!/bin/sh",
    'case "$1" in',
    '  -i) cat >> "$QUICKSTARK_TEST_KEYCHAIN_LOG" ;;',
    '  find-generic-password) printf "%s\\n" "$*" >> "$QUICKSTARK_TEST_KEYCHAIN_LOG" ;;',
    "  *) exit 64 ;;",
    "esac",
    "",
  ].join("\n"), { encoding: "utf8", mode: 0o755 });

  const environment = {
    ...process.env,
    HOME: home,
    USER: "quickstark-test-user",
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    QUICKSTARK_TEST_KEYCHAIN_LOG: keychainLog,
  };

  delete environment.CODEX_HOME;
  delete environment.QS_READOUT_PRODUCER_TOKEN;

  const profiles = [
    { name: ".codex", token: "a".repeat(64) },
    { name: ".codex-demo", token: "b".repeat(64) },
  ];

  for (const profile of profiles) {
    const macos = readoutPlatformSetup(profile.token, {
      codexProfile: profile.name,
    }).find((adapter) => adapter.id === "macos");

    assert.ok(macos);
    assert.ok(macos.command.includes(`$HOME/${profile.name}`),
      `${profile.name} must be explicitly selected in the copy-ready Terminal command`);
    assert.doesNotMatch(macos.command, /launchctl\s+setenv|QS_READOUT_PRODUCER_TOKEN/,
      `${profile.name} never changes the shared macOS application environment`);

    await execFileAsync("zsh", ["-f", "-c", macos.command], { env: environment });

    const path = join(home, profile.name, "quickstark", "producer.token");

    assert.equal((await readFile(path, "utf8")).trim(), profile.token,
      `${profile.name} receives only its own one-time token`);
    assert.equal((await stat(path)).mode & 0o777, 0o600,
      `${profile.name} stores its bearer with owner-only permissions`);
  }

  assert.equal(
    (await readFile(join(home, ".codex", "quickstark", "producer.token"), "utf8")).trim(),
    profiles[0].token,
    "installing the demo profile never overwrites the original default-profile producer",
  );

  const recordedKeychain = await readFile(keychainLog, "utf8");

  for (const profile of profiles) {
    assert.ok(recordedKeychain.includes(`quickstark-readout-producer-token-${profile.name}`),
      `${profile.name} receives a separately named Keychain credential`);
  }
});

test("macOS setup rejects unsafe and unsupported Codex profile names", () => {
  const token = "m".repeat(64);

  for (const codexProfile of ["", "../.codex", ".codex/../../other-home", ".codex-custom", "/tmp/.codex"]) {
    assert.throws(
      () => readoutPlatformSetup(token, { codexProfile }),
      /safe|supported|codex profile/i,
      `the Settings command must never interpolate the unsafe profile ${JSON.stringify(codexProfile)}`,
    );
  }
});

test("macOS profile installation rejects symbolic links before disclosing its producer token", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-macos-unsafe-installer-"));
  const bin = join(directory, "bin");
  const keychainLog = join(directory, "keychain.log");
  const token = "s".repeat(64);

  context.after(async () => rm(directory, { recursive: true, force: true }));
  await mkdir(bin, { recursive: true, mode: 0o700 });
  await writeFile(join(bin, "security"), [
    "#!/bin/sh",
    'case "$1" in',
    '  -i) cat >> "$QUICKSTARK_TEST_KEYCHAIN_LOG" ;;',
    '  find-generic-password) printf "%s\\n" "$*" >> "$QUICKSTARK_TEST_KEYCHAIN_LOG" ;;',
    "  *) exit 64 ;;",
    "esac",
    "",
  ].join("\n"), { encoding: "utf8", mode: 0o755 });

  for (const scenario of ["profile", "directory", "token"]) {
    const home = join(directory, `${scenario}-home`);
    const outside = join(directory, `${scenario}-outside`);
    const profile = join(home, ".codex-demo");
    const credentialDirectory = join(profile, "quickstark");
    const outsideToken = join(outside, "producer.token");

    await mkdir(home, { recursive: true, mode: 0o700 });
    await mkdir(outside, { recursive: true, mode: 0o700 });
    await writeFile(outsideToken, "unchanged external credential\n", {
      encoding: "utf8",
      mode: 0o600,
    });

    if (scenario === "profile") {
      await mkdir(join(outside, "quickstark"), { recursive: true, mode: 0o700 });
      await symlink(outside, profile, "dir");
    } else if (scenario === "directory") {
      await mkdir(profile, { recursive: true, mode: 0o700 });
      await symlink(outside, credentialDirectory, "dir");
    } else {
      await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
      await symlink(outsideToken, join(credentialDirectory, "producer.token"));
    }

    const environment = {
      ...process.env,
      HOME: home,
      USER: "quickstark-test-user",
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      QUICKSTARK_TEST_KEYCHAIN_LOG: keychainLog,
    };

    delete environment.CODEX_HOME;
    delete environment.QS_READOUT_PRODUCER_TOKEN;

    const adapter = readoutPlatformSetup(token, { codexProfile: ".codex-demo" })
      .find((item) => item.id === "macos");

    await assert.rejects(
      execFileAsync("zsh", ["-f", "-c", adapter.command], { env: environment }),
      `the installer refuses a symbolic-link ${scenario} before writing its token`,
    );

    assert.equal(
      await readFile(outsideToken, "utf8"),
      "unchanged external credential\n",
      `a symbolic-link ${scenario} cannot redirect the new token outside its selected profile`,
    );
  }

  await assert.rejects(readFile(keychainLog, "utf8"), /ENOENT/,
    "an unsafe installer path never reaches macOS Keychain token disclosure");
});

test("macOS profile token rotation repairs existing unsafe permissions without sharing its credential", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-macos-token-rotation-"));
  const home = join(directory, "home");
  const bin = join(directory, "bin");
  const keychainLog = join(directory, "keychain.log");
  const credentialDirectory = join(home, ".codex-demo", "quickstark");
  const credentialPath = join(credentialDirectory, "producer.token");
  const token = "r".repeat(64);

  context.after(async () => rm(directory, { recursive: true, force: true }));
  await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });
  await mkdir(bin, { recursive: true, mode: 0o700 });
  await writeFile(credentialPath, "old-world-readable-token\n", {
    encoding: "utf8",
    mode: 0o644,
  });
  await chmod(credentialPath, 0o644);
  await writeFile(join(bin, "security"), [
    "#!/bin/sh",
    'case "$1" in',
    '  -i) cat >> "$QUICKSTARK_TEST_KEYCHAIN_LOG" ;;',
    '  find-generic-password) printf "%s\\n" "$*" >> "$QUICKSTARK_TEST_KEYCHAIN_LOG" ;;',
    "  *) exit 64 ;;",
    "esac",
    "",
  ].join("\n"), { encoding: "utf8", mode: 0o755 });

  const environment = {
    ...process.env,
    HOME: home,
    USER: "quickstark-test-user",
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    QUICKSTARK_TEST_KEYCHAIN_LOG: keychainLog,
  };

  delete environment.CODEX_HOME;
  delete environment.QS_READOUT_PRODUCER_TOKEN;

  const adapter = readoutPlatformSetup(token, { codexProfile: ".codex-demo" })
    .find((item) => item.id === "macos");

  await execFileAsync("zsh", ["-f", "-c", adapter.command], { env: environment });

  assert.equal((await readFile(credentialPath, "utf8")).trim(), token,
    "rotation replaces the selected profile's old regular credential");
  assert.equal((await stat(credentialPath)).mode & 0o777, 0o600,
    "the newly issued bearer is never left with the previous world-readable mode");
  assert.doesNotMatch(adapter.command, /launchctl\s+setenv|QS_READOUT_PRODUCER_TOKEN/);
});

test("the unified Settings document renders private preferences, token controls, and four setup paths", () => {
  const html = renderReadoutSettings({
    user: "quickstark-admin",
    csrf: "a".repeat(64),
    nonce: "b".repeat(32),
    producers: [{ id: "existing-linux", projects: ["*"] }],
  });

  assert.match(html, /Dashboard Settings/);
  assert.match(html, /Appearance/);
  assert.match(html, /Producer tokens/);
  assert.match(html, /Linux/);
  assert.match(html, /macOS/);
  assert.match(html, /Windows/);
  assert.match(html, /ChatGPT/);
  assert.match(html, /existing-linux/);
  assert.match(html, /13\s*px/);
  assert.match(html, /12\s*px/);
  assert.match(html, /name="csrf"\s+value="a{64}"/);
  assert.doesNotMatch(html, /tokenSha256/);
});

test("Dashboard Settings mirrors the report sidebar and separates personal settings from the producer-token table", () => {
  const shared = {
    user: "quickstark-admin",
    csrf: "a".repeat(64),
    nonce: "b".repeat(32),
    producers: [{ id: "existing-linux", projects: ["*"] }],
  };
  const profile = renderReadoutSettings(shared);
  const tokens = renderReadoutSettings({ ...shared, tab: "producer-tokens" });

  assert.match(profile, /<aside\b[^>]*aria-label="Dashboard Settings"/i,
    "Settings uses a real accessible report-style left sidebar");
  assert.match(profile, /href="\/settings"[^>]*aria-current="page"/i,
    "Profile and personal settings is the default sidebar destination");
  assert.match(profile, /Profile\s*(?:&amp;|and)\s*personal settings/i);
  assert.match(profile, /href="\/settings\?tab=producer-tokens"/i,
    "producer tokens have their own independently selectable sidebar destination");
  assert.match(tokens, /href="\/settings\?tab=producer-tokens"[^>]*aria-current="page"/i);
  assert.match(tokens, /<table\b[^>]*aria-label="Producer tokens"/i,
    "each producer appears in a conventional, accessible SaaS token table");
  assert.match(tokens, /existing-linux/);
  assert.match(tokens, />Create new token</i);
  assert.doesNotMatch(tokens, /<article\b[^>]*class="[^"]*platform-card/i,
    "platform setup is part of new token creation, not a separate dashboard section");
  assert.doesNotMatch(tokens, /tokenSha256/,
    "persisted bearer-token material never appears in the token management table");
});

test("the authenticated Settings route restores the requested sidebar tab without exposing an unsupported destination", async (context) => {
  const { settings } = await createSettings(context);
  const headers = { "Remote-User": "quickstark-admin" };
  const profile = await fetch(new URL("/settings", settings.url), { headers });
  const tokens = await fetch(new URL("/settings?tab=producer-tokens", settings.url), { headers });
  const unsupported = await fetch(new URL("/settings?tab=platform-setup", settings.url), { headers });

  assert.equal(profile.status, 200);
  assert.ok(
    /href="\/settings"\s+aria-current="page"/i.test(await profile.text()),
    "personal profile is the actual default protected destination",
  );
  assert.equal(tokens.status, 200);
  assert.ok(
    /href="\/settings\?tab=producer-tokens"\s+aria-current="page"/i.test(await tokens.text()),
    "the producer-token table restores from its actual sidebar URL",
  );
  assert.equal(unsupported.status, 404,
    "the removed Platform setup page cannot silently return as a third Settings destination");
});

test("administrator Settings renders pre-existing legacy producer grants without changing or inventing their metadata", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const historical = {
    version: 1,
    producers: [
      {
        id: "personal-codex-laptop",
        tokenSha256: createHash("sha256").update("test-only-existing-personal-producer").digest("hex"),
        projects: ["*"],
      },
      {
        id: "openai-codex-laptop",
        tokenSha256: createHash("sha256").update("test-only-existing-openai-producer").digest("hex"),
        projects: ["*"],
      },
      {
        id: "linux-codex-dev-server",
        tokenSha256: createHash("sha256").update("test-only-existing-linux-producer").digest("hex"),
        projects: ["*"],
      },
    ],
  };
  const immutable = `${JSON.stringify(historical, null, 2)}\n`;

  await writeFile(producersFile, immutable, { encoding: "utf8", mode: 0o600 });

  for (const route of ["/settings", "/settings?tab=producer-tokens"]) {
    const response = await fetch(new URL(route, settings.url), {
      headers: { "Remote-User": "quickstark-admin" },
    });

    assert.equal(response.status, 200,
      `the actual protected ${route} supports producer grants created before table metadata existed`);

    const html = await response.text();

    for (const producer of historical.producers) {
      assert.ok(html.includes(producer.id), "existing independently authorized producers remain visible");
      assert.ok(!html.includes(producer.tokenSha256), "the full server-side credential digest remains private");

      const row = html.match(new RegExp(
        `<tr data-producer-row="${producer.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">([\\s\\S]*?)<\\/tr>`,
      ));

      assert.ok(row, "each historical producer remains a distinct accessible table row");
      assert.match(row[1], /<td>Not recorded<\/td>/,
        "an unrecorded historical platform is never inferred from a Linux, macOS, Windows, or ChatGPT-looking machine name");
    }

    assert.match(html, /Not recorded/,
      "legacy creation dates are honestly marked rather than fabricated");
  }

  assert.equal(await readFile(producersFile, "utf8"), immutable,
    "opening the token table never migrates, rewrites, or invalidates historical producer grants");
});

test("anonymous requests never view the protected settings or generate a producer token", async (context) => {
  const { settings, producersFile } = await createSettings(context);

  const page = await fetch(new URL("/settings", settings.url));
  const issuance = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ producer: "anonymous-attacker" }),
  });

  assert.equal(page.status, 401);
  assert.equal(issuance.status, 401);
  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);
});

test("forged administrator headers from an untrusted proxy never expose Settings or issue credentials", async (context) => {
  const { settings, producersFile } = await createSettings(context, {
    adminUsers: [],
    adminGroups: ["admins"],
    trustedProxyAddresses: ["127.0.0.2"],
  });
  const forgedIdentity = {
    "Remote-User": "forged-administrator",
    "Remote-Groups": "admins",
  };

  const page = await fetch(new URL("/settings", settings.url), {
    headers: forgedIdentity,
  });
  const issuance = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      ...forgedIdentity,
      "Content-Type": "application/json",
      "X-QuickStark-CSRF": "a".repeat(64),
    },
    body: JSON.stringify({ producer: "forged-proxy-credential" }),
  });

  assert.equal(page.status, 403, "a caller outside the exact trusted proxy address cannot reach Settings");
  assert.deepEqual(await page.json(), { error: "untrusted_proxy" });
  assert.equal(issuance.status, 403, "forged administrator groups never reach privileged issuance");
  assert.deepEqual(await issuance.json(), { error: "untrusted_proxy" });
  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);
});

test("privileged Settings uses a proxy-exclusive network and an exact authenticated proxy address", async () => {
  const compose = await readFile(new URL("../deploy/readouts/compose.yaml", import.meta.url), "utf8");
  const settings = compose.match(/\n  quickstark-readout-settings:\n([\s\S]*?)(?=\n  [a-z][a-z0-9-]*:\n|\nnetworks:\n|$)/)?.[1];

  assert.ok(settings, "the production template defines the protected Settings service");
  assert.match(settings, /QS_READOUT_SETTINGS_TRUSTED_PROXY_ADDRESSES:\s*["']?10\.250\.12\.2["']?/);
  assert.match(settings, /traefik\.docker\.network=quickstark-readout-settings-auth/);
  assert.match(settings, /networks:\s*\n\s+settings_auth:\s*\n\s+ipv4_address:\s*10\.250\.12\.3/);
  assert.doesNotMatch(settings, /networks:\s*\n\s+-\s*proxy\b/,
    "arbitrary services on the shared proxy network cannot reach privileged Settings");
  assert.match(compose, /settings_auth:\s*\n\s+name:\s*quickstark-readout-settings-auth/);
  assert.match(compose, /internal:\s*true/);
  assert.match(compose, /subnet:\s*10\.250\.12\.0\/29/);
});

test("authenticated non-administrators cannot generate producer credentials", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const response = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "ordinary-reader",
    },
    body: JSON.stringify({ producer: "forbidden-producer" }),
  });

  assert.equal(response.status, 403);
  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);
});

test("ordinary dashboard users never receive administrator producer inventory through visible or hidden Settings tabs", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const issuedResponse = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({
      producer: "confidential-openai-macbook",
      label: "Confidential OpenAI MacBook",
      platform: "macos",
    }),
  });

  assert.equal(issuedResponse.status, 201);

  const issued = await issuedResponse.json();
  const ordinary = { "Remote-User": "ordinary-reader" };
  const profile = await fetch(new URL("/settings", settings.url), { headers: ordinary });

  assert.equal(profile.status, 200,
    "an authenticated non-administrator retains access to their own appearance and profile");

  const profileHtml = await profile.text();

  assert.match(profileHtml, /Profile\s*&amp;\s*personal settings/i);
  assert.match(profileHtml, /ordinary-reader/);
  assert.ok(!profileHtml.includes(issued.producer),
    "the private producer identity never enters a reader's hidden HTML");
  assert.ok(!profileHtml.includes(issued.label),
    "the private producer display name never enters a reader's hidden HTML");
  assert.ok(!profileHtml.includes(issued.token),
    "a reader never receives the administrator's original bearer credential");

  const unauthorizedTab = await fetch(new URL("/settings?tab=producer-tokens", settings.url), {
    headers: ordinary,
  });

  assert.equal(unauthorizedTab.status, 403,
    "an ordinary user cannot open the administrator-only producer token table");
  assert.deepEqual(await unauthorizedTab.json(), { error: "administrator_required" });

  const administrativeTab = await fetch(new URL("/settings?tab=producer-tokens", settings.url), {
    headers: { "Remote-User": "quickstark-admin" },
  });

  assert.equal(administrativeTab.status, 200);
  assert.ok((await administrativeTab.text()).includes(issued.producer),
    "authorized administrators retain their actual producer-token table");
  assert.equal(JSON.parse(await readFile(producersFile, "utf8")).producers.length, 1,
    "unauthorized read attempts never change an independently issued producer");
});

test("producer creation rejects missing, invalid, and cross-user anti-CSRF tokens", async (context) => {
  const { settings, producersFile } = await createSettings(context);

  for (const token of [undefined, "not-a-valid-token", "f".repeat(64)]) {
    const response = await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Remote-User": "quickstark-admin",
        ...(token ? { "X-QuickStark-CSRF": token } : {}),
      },
      body: JSON.stringify({ producer: "csrf-protected-producer" }),
    });

    assert.equal(response.status, 403);
  }

  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);
});

test("appearance preferences persist privately without rewriting immutable report files", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const page = await administratorPage(settings);
  const csrf = csrfFrom(await page.text());
  const grantsBefore = await readFile(producersFile, "utf8");

  const saved = await fetch(new URL("/settings/preferences", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
      Origin: new URL(settings.url).origin,
    },
    body: JSON.stringify({ size: "comfortable", density: "compact" }),
  });

  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), {
    size: "comfortable",
    density: "compact",
    featurePx: 15,
    promptPx: 14,
  });

  const cookie = saved.headers.get("set-cookie");

  assert.match(cookie, /qs_readout_preferences=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);

  const restored = await fetch(new URL("/settings", settings.url), {
    headers: {
      "Remote-User": "quickstark-admin",
      Cookie: cookie.split(";")[0],
    },
  });

  assert.equal(restored.status, 200);
  assert.match(await restored.text(), /--feature:15px;--prompt:14px/);
  assert.equal(await readFile(producersFile, "utf8"), grantsBefore);
});

test("signed user preferences reach the real Project Workbench without changing immutable reports", async (context) => {
  const preferenceSecret = Buffer.alloc(32, 7);
  const { settings, directory } = await createSettings(context, { preferenceSecret });
  const reportDirectory = join(directory, "immutable-reports");
  const readout = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Preserve the complete immutable report while applying private dashboard preferences.",
  }, {
    directory: reportDirectory,
    githubFetcher: async () => ({ ok: false, status: 503 }),
  });
  const original = await readFile(readout.path, "utf8");
  const viewer = await startReadoutServer({
    directory: reportDirectory,
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
    currentProject: "github.com/quickstark/skills",
    trustedProxy: true,
    preferenceSecret,
  });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const saved = await fetch(new URL("/settings/preferences", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({ size: "large", density: "compact" }),
  });

  assert.equal(saved.status, 200);

  const signedCookie = saved.headers.get("set-cookie");

  assert.match(signedCookie, /(?:^|;\s*)Path=\/(?:;|$)/i,
    "the authenticated Workbench must receive the signed preference");

  const workbench = await fetch(viewer.url, {
    headers: {
      "Remote-User": "quickstark-admin",
      Cookie: signedCookie.split(";")[0],
    },
  });
  const html = await workbench.text();

  assert.equal(workbench.status, 200);
  assert.match(html, /data-preference-size="large"/);
  assert.match(html, /data-preference-density="compact"/);
  assert.match(html, /--presentation-feature:\s*17px/);
  assert.match(html, /--presentation-body:\s*16px/);

  const crossUser = await fetch(viewer.url, {
    headers: {
      "Remote-User": "another-dashboard-user",
      Cookie: signedCookie.split(";")[0],
    },
  });
  const crossUserHtml = await crossUser.text();

  assert.equal(crossUser.status, 200);
  assert.match(crossUserHtml, /data-preference-size="default"/);
  assert.match(crossUserHtml, /data-preference-density="balanced"/);
  assert.doesNotMatch(crossUserHtml, /--presentation-feature:\s*17px/,
    "the authenticated Workbench never transfers signed preferences to another user");
  assert.equal(await readFile(readout.path, "utf8"), original,
    "private appearance never rewrites the stored historical report");
});

test("signed appearance preferences cannot be transferred to another dashboard user", async (context) => {
  const { settings } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const saved = await fetch(new URL("/settings/preferences", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({ size: "large", density: "compact" }),
  });

  assert.equal(saved.status, 200);

  const cookie = saved.headers.get("set-cookie").split(";")[0];
  const crossUser = await fetch(new URL("/settings", settings.url), {
    headers: {
      "Remote-User": "another-dashboard-user",
      Cookie: cookie,
    },
  });

  assert.equal(crossUser.status, 200);

  const html = await crossUser.text();

  assert.match(html, /data-preference-size="default"/);
  assert.match(html, /data-preference-density="balanced"/);
  assert.match(html, /--feature:13px;--prompt:12px/);
  assert.doesNotMatch(html, /<main class="settings" data-preference-size="large"/);
});

test("cross-origin settings mutations are rejected even with a valid anti-CSRF token", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const page = await administratorPage(settings);
  const csrf = csrfFrom(await page.text());
  const response = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
      Origin: "https://unrelated.example",
    },
    body: JSON.stringify({ producer: "cross-origin-attacker" }),
  });

  assert.equal(response.status, 403);
  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);
});

test("an administrator reveals a new producer token once without storing plaintext in its grant", async (context) => {
  const { settings, credentialsDirectory, producersFile } = await createSettings(context);
  const page = await administratorPage(settings);

  assert.equal(page.status, 200);

  const csrf = csrfFrom(await page.text());
  const response = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({ producer: "personal-chatgpt" }),
  });

  assert.equal(response.status, 201);
  assert.match(response.headers.get("cache-control"), /no-store/);

  const issued = await response.json();

  assert.equal(issued.producer, "personal-chatgpt");
  assert.match(issued.token, /^[A-Za-z0-9_-]{64}$/);
  assert.equal(issued.tokenDisclosed, true);

  const credentialPath = join(credentialsDirectory, "personal-chatgpt.token");
  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.equal((await stat(credentialPath)).mode & 0o777, 0o600);
  assert.equal((await readFile(credentialPath, "utf8")).trim(), issued.token);
  assert.equal(grants.producers[0].tokenSha256, createHash("sha256").update(issued.token).digest("hex"));
  assert.doesNotMatch(await readFile(producersFile, "utf8"), new RegExp(issued.token));

  const nextPage = await administratorPage(settings);
  const html = await nextPage.text();

  assert.match(html, /personal-chatgpt/);
  assert.doesNotMatch(html, new RegExp(issued.token));
  assert.doesNotMatch(html, /tokenSha256/);
});

test("creating a producer returns its exact one-time token inside the selected platform's installation command", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const cases = [
    { platform: "linux", producer: "token-linux-codex", expected: /install -d -m 700|systemctl --user set-environment/ },
    { platform: "macos", producer: "token-macos-codex", expected: /security -i|add-generic-password/ },
    { platform: "windows", producer: "token-windows-codex", expected: /SetEnvironmentVariable|icacls/ },
    { platform: "chatgpt", producer: "token-chatgpt-web", expected: /Authentication: API key.*Bearer|OpenAPI schema/ },
  ];
  const revealed = [];

  for (const entry of cases) {
    const response = await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Remote-User": "quickstark-admin",
        "X-QuickStark-CSRF": csrf,
      },
      body: JSON.stringify({
        producer: entry.producer,
        label: `${entry.platform} personal producer`,
        platform: entry.platform,
      }),
    });

    assert.equal(response.status, 201, `${entry.platform} receives its own independently authorized token`);

    const issued = await response.json();

    assert.match(issued.token, /^[A-Za-z0-9_-]{64}$/);
    assert.equal(issued.platform, entry.platform);
    assert.equal(issued.installation.platform, entry.platform);
    assert.ok(issued.installation.command.includes(issued.token),
      `${entry.platform} receives its actual generated credential inside its copy-ready instructions`);
    assert.match(issued.installation.command, entry.expected,
      `${entry.platform} receives an installation command appropriate to the real platform`);
    assert.doesNotMatch(issued.installation.command, /PASTE_NEWLY_GENERATED_TOKEN/,
      "a completed one-time setup never asks the user to manually substitute a placeholder");
    revealed.push(issued.token);
  }

  const grantsText = await readFile(producersFile, "utf8");
  const grants = JSON.parse(grantsText);

  assert.equal(new Set(revealed).size, cases.length,
    "each independently revocable platform receives its own producer credential");

  for (const entry of cases) {
    const registered = grants.producers.find((producer) => producer.id === entry.producer);

    assert.equal(registered?.platform, entry.platform);
    assert.equal(registered?.label, `${entry.platform} personal producer`);
    assert.match(registered?.createdAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
  }

  for (const token of revealed) {
    assert.ok(!grantsText.includes(token), "the persistent producer grant contains only a credential digest");
  }

  const table = await (await fetch(new URL("/settings?tab=producer-tokens", settings.url), {
    headers: { "Remote-User": "quickstark-admin" },
  })).text();

  for (const token of revealed) {
    assert.ok(!table.includes(token), "the producer table cannot reveal a past one-time token");
  }
});

test("macOS producer creation returns an independently executable command for the selected Codex profile", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const profiles = [
    { name: ".codex", producer: "macos-primary-codex" },
    { name: ".codex-demo", producer: "macos-demo-codex" },
  ];

  for (const profile of profiles) {
    const response = await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Remote-User": "quickstark-admin",
        "X-QuickStark-CSRF": csrf,
      },
      body: JSON.stringify({
        producer: profile.producer,
        platform: "macos",
        codexProfile: profile.name,
      }),
    });

    assert.equal(response.status, 201,
      `${profile.name} receives a separately generated macOS producer`);

    const issued = await response.json();

    assert.equal(issued.codexProfile, profile.name);
    assert.equal(issued.installation.codexProfile, profile.name);
    assert.ok(issued.installation.command.includes(`$HOME/${profile.name}`),
      `${profile.name} is explicitly encoded in its ready-to-paste Terminal command`);
    assert.ok(issued.installation.command.includes(issued.token));
    assert.doesNotMatch(issued.installation.command, /launchctl\s+setenv|\$\{CODEX_HOME/,
      `${profile.name} never relies on a shared desktop token or an inherited Terminal profile`);
  }

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.deepEqual(
    grants.producers.map((producer) => producer.id).sort(),
    profiles.map((profile) => profile.producer).sort(),
    "both independently authorized profile grants survive issuance",
  );

  for (const invalid of ["../.codex", "/tmp/.codex", ".codex-other"]) {
    const response = await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Remote-User": "quickstark-admin",
        "X-QuickStark-CSRF": csrf,
      },
      body: JSON.stringify({
        producer: `rejected-profile-${invalid.replace(/[^a-z0-9]+/gi, "-")}`,
        platform: "macos",
        codexProfile: invalid,
      }),
    });

    assert.equal(response.status, 422,
      `the authenticated Settings API rejects unsafe macOS profile ${JSON.stringify(invalid)}`);
  }
});

test("token-specific Linux, macOS, and Windows installation commands pass their native shell parsers", async () => {
  const token = "q".repeat(64);
  const adapters = readoutPlatformSetup(token);
  const linux = adapters.find((adapter) => adapter.id === "linux");
  const macos = adapters.find((adapter) => adapter.id === "macos");
  const windows = adapters.find((adapter) => adapter.id === "windows");
  const chatgpt = adapters.find((adapter) => adapter.id === "chatgpt");

  await execFileAsync("bash", ["-n", "-c", linux.command]);
  await execFileAsync("zsh", ["-n", "-c", macos.command]);

  const parsePowerShell = [
    "$parseTokens = $null",
    "$parseErrors = $null",
    "[System.Management.Automation.Language.Parser]::ParseInput($args[0], [ref]$parseTokens, [ref]$parseErrors) | Out-Null",
    "if ($parseErrors.Count) { foreach ($parseError in $parseErrors) { [Console]::Error.WriteLine($parseError.Message) }; exit 1 }",
  ].join("; ");

  await execFileAsync("pwsh", ["-NoLogo", "-NoProfile", "-Command", parsePowerShell, windows.command]);

  for (const adapter of [linux, macos, windows, chatgpt]) {
    assert.ok(adapter.command.includes(token), `${adapter.title} contains the actual one-time token`);
    assert.ok(!adapter.command.includes("PASTE_NEWLY_GENERATED_TOKEN"));
  }

  assert.match(chatgpt.command, /Authentication: API key.*Bearer/);
  assert.match(chatgpt.command, /https:\/\/reports\.quickstark\.com\/settings\/chatgpt\/openapi\.json/);
  assert.match(chatgpt.command, /POST \/api\/v1\/readouts/);
  assert.match(linux.command, /systemctl --user import-environment QS_READOUT_PRODUCER_TOKEN/,
    "Linux imports the current environment without putting its bearer token in systemctl process arguments");
  assert.doesNotMatch(linux.command, /systemctl --user set-environment/);
  assert.match(macos.command, /security -i\s*<</,
    "macOS sends the token-bearing Keychain command through security standard input");
  assert.doesNotMatch(macos.command, /security\s+add-generic-password\b/,
    "the bearer credential is never passed as a Keychain subprocess command-line argument");
  assert.throws(() => readoutPlatformSetup("not-a-real-token"), /safely generated|token/i,
    "only validated actual one-time credentials can be embedded in setup commands");
});

test("producer-token rows support safe viewing, display-name editing, and immediate independent revocation", async (context) => {
  const { settings, directory, credentialsDirectory, producersFile } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const headers = {
    "Content-Type": "application/json",
    "Remote-User": "quickstark-admin",
    "X-QuickStark-CSRF": csrf,
  };
  const create = async (producer, platform) => {
    const response = await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers,
      body: JSON.stringify({ producer, platform }),
    });

    assert.equal(response.status, 201);
    return response.json();
  };
  const original = await create("editable-linux-codex", "linux");
  const unrelated = await create("preserved-personal-chatgpt", "chatgpt");
  const endpoint = new URL(`/settings/tokens/${original.producer}`, settings.url);
  const detailResponse = await fetch(endpoint, {
    headers: { "Remote-User": "quickstark-admin" },
  });

  assert.equal(detailResponse.status, 200, "View returns the safe metadata for the selected row");

  const detail = await detailResponse.json();

  assert.equal(detail.id, original.producer);
  assert.equal(detail.platform, "linux");
  assert.equal(detail.label, original.producer);
  assert.equal(detail.fingerprint, createHash("sha256").update(original.token).digest("hex").slice(0, 8));
  assert.ok(!JSON.stringify(detail).includes(original.token),
    "viewing an existing producer never retrieves its previously revealed bearer token");

  const edited = await fetch(endpoint, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ label: "My personal Linux Codex" }),
  });

  assert.equal(edited.status, 200, "Edit changes only the user-visible display name");

  const updated = await edited.json();

  assert.equal(updated.id, original.producer);
  assert.equal(updated.label, "My personal Linux Codex");
  assert.ok(!JSON.stringify(updated).includes(original.token));

  const renamedGrants = JSON.parse(await readFile(producersFile, "utf8"));
  const renamed = renamedGrants.producers.find((producer) => producer.id === original.producer);

  assert.equal(renamed.label, "My personal Linux Codex");
  assert.equal(renamed.tokenSha256, createHash("sha256").update(original.token).digest("hex"),
    "editing a label does not rotate or disable the actual producer credential");

  const reportDirectory = join(directory, "producer-revocation-reports");
  const viewer = await startReadoutServer({
    directory: reportDirectory,
    host: "127.0.0.1",
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["*"],
  });
  const ingestion = await startReadoutIngestionServer({
    directory: reportDirectory,
    host: "127.0.0.1",
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["*"],
    producersFile,
  });

  context.after(async () => {
    for (const running of [ingestion, viewer]) {
      if (!running.server.listening) continue;

      await new Promise((resolve, reject) => {
        running.server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  const envelope = {
    version: 1,
    producer: original.producer,
    harness: { name: "codex" },
    collection: "quickstark/qs-skills",
    project: "https://github.com/quickstark/skills.git",
    runId: "85167a87-a6a8-4637-babd-7039681b4caf",
    generatedAt: "2026-07-27T22:40:00.000Z",
    skill: "qs-code-build",
    status: "Completed",
    outcome: "A renamed producer remains independently authenticated until explicitly revoked.",
    nextSkills: [],
  };
  const submit = () => fetch(new URL("/api/v1/readouts", ingestion.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${original.token}`,
    },
    body: JSON.stringify(envelope),
  });

  assert.equal((await submit()).status, 201,
    "the edited producer still publishes through the actual authenticated reports API");

  const deletion = await fetch(endpoint, {
    method: "DELETE",
    headers,
    body: "{}",
  });

  assert.equal(deletion.status, 200, "Delete explicitly revokes the selected producer");
  assert.deepEqual(await deletion.json(), {
    producer: original.producer,
    revoked: true,
  });
  assert.equal((await submit()).status, 401,
    "the actually running reporting API immediately rejects the revoked bearer token");
  await assert.rejects(stat(join(credentialsDirectory, `${original.producer}.token`)), {
    code: "ENOENT",
  });

  const remaining = JSON.parse(await readFile(producersFile, "utf8"));

  assert.deepEqual(remaining.producers.map((producer) => producer.id), [unrelated.producer],
    "deleting one producer never changes another machine's independently authorized token");
  assert.equal((await readFile(join(credentialsDirectory, `${unrelated.producer}.token`), "utf8")).trim(),
    unrelated.token);
});

test("an administrator can immediately revoke a lost or tampered token without possessing its original credential file", async (context) => {
  for (const condition of ["missing", "tampered"]) {
    const { settings, directory, credentialsDirectory, producersFile } = await createSettings(context);
    const csrf = csrfFrom(await (await administratorPage(settings)).text());
    const headers = {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    };
    const create = async (producer, platform) => {
      const response = await fetch(new URL("/settings/tokens", settings.url), {
        method: "POST",
        headers,
        body: JSON.stringify({ producer, platform }),
      });

      assert.equal(response.status, 201);
      return response.json();
    };
    const target = await create(`${condition}-credential-codex`, "linux");
    const unaffected = await create(`${condition}-preserved-chatgpt`, "chatgpt");
    const credentialPath = join(credentialsDirectory, `${target.producer}.token`);

    if (condition === "missing") {
      await rm(credentialPath);
    } else {
      await writeFile(credentialPath, "not-the-registered-producer-token\n", {
        encoding: "utf8",
        mode: 0o600,
      });
    }

    const reportDirectory = join(directory, "compromised-producer-reports");
    const viewer = await startReadoutServer({
      directory: reportDirectory,
      host: "127.0.0.1",
      port: 0,
      publicationMode: "hosted",
      allowedProjects: ["*"],
    });
    const ingestion = await startReadoutIngestionServer({
      directory: reportDirectory,
      host: "127.0.0.1",
      port: 0,
      baseUrl: viewer.url,
      allowedProjects: ["*"],
      producersFile,
    });

    context.after(async () => {
      for (const running of [ingestion, viewer]) {
        if (!running.server.listening) continue;

        await new Promise((resolve, reject) => {
          running.server.close((error) => error ? reject(error) : resolve());
        });
      }
    });

    const deletion = await fetch(new URL(`/settings/tokens/${target.producer}`, settings.url), {
      method: "DELETE",
      headers,
      body: "{}",
    });

    assert.equal(deletion.status, 200,
      `administrator revocation succeeds when the ${condition} private file cannot prove token possession`);
    assert.deepEqual(await deletion.json(), { producer: target.producer, revoked: true });

    const submission = await fetch(new URL("/api/v1/readouts", ingestion.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${target.token}`,
      },
      body: JSON.stringify({
        version: 1,
        producer: target.producer,
        harness: { name: "codex" },
        collection: "quickstark/qs-skills",
        project: "https://github.com/quickstark/skills.git",
        runId: condition === "missing"
          ? "fa3383f3-9b05-42a5-ac4a-b7b81269d901"
          : "ca021b99-5a03-44d8-8a7a-fb8f6f61e402",
        generatedAt: "2026-07-27T23:00:00.000Z",
        skill: "qs-code-build",
        status: "Completed",
        outcome: "A compromised producer must lose reporting access immediately.",
        nextSkills: [],
      }),
    });

    assert.equal(submission.status, 401,
      `live report ingestion rejects the ${condition} producer immediately after revocation`);

    const remaining = JSON.parse(await readFile(producersFile, "utf8")).producers;

    assert.deepEqual(remaining.map((producer) => producer.id), [unaffected.producer],
      "emergency revocation preserves every unrelated, independently authorized machine");
    await assert.rejects(stat(credentialPath), { code: "ENOENT" },
      "a remaining regular tampered credential is safely removed after its grant is revoked");
  }
});

test("token row view, edit, and deletion reject anonymous users, non-administrators, invalid CSRF, and hostile origins", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const created = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({ producer: "protected-linux-codex", platform: "linux" }),
  });

  assert.equal(created.status, 201);

  const { token } = await created.json();
  const endpoint = new URL("/settings/tokens/protected-linux-codex", settings.url);
  const attempts = [
    {
      title: "anonymous users cannot inspect a token row",
      options: {},
      expected: 401,
    },
    {
      title: "ordinary authenticated users cannot inspect administrator-owned token metadata",
      options: { headers: { "Remote-User": "ordinary-reader" } },
      expected: 403,
    },
    {
      title: "display-name changes require the user-bound anti-CSRF token",
      options: {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Remote-User": "quickstark-admin" },
        body: JSON.stringify({ label: "forged edit" }),
      },
      expected: 403,
    },
    {
      title: "revocation requires the user-bound anti-CSRF token",
      options: {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Remote-User": "quickstark-admin" },
        body: "{}",
      },
      expected: 403,
    },
    {
      title: "another website cannot revoke a producer with a stolen CSRF value",
      options: {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Remote-User": "quickstark-admin",
          "X-QuickStark-CSRF": csrf,
          Origin: "https://unrelated.example",
        },
        body: "{}",
      },
      expected: 403,
    },
    {
      title: "unsafe display names cannot be stored or rendered",
      options: {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Remote-User": "quickstark-admin",
          "X-QuickStark-CSRF": csrf,
        },
        body: JSON.stringify({ label: '<script>alert("token")</script>' }),
      },
      expected: 422,
    },
  ];

  for (const attempt of attempts) {
    const response = await fetch(endpoint, attempt.options);

    assert.equal(response.status, attempt.expected, attempt.title);
  }

  const grantsText = await readFile(producersFile, "utf8");
  const registered = JSON.parse(grantsText).producers;

  assert.equal(registered.length, 1, "rejected operations never revoke the protected producer");
  assert.equal(registered[0].id, "protected-linux-codex");
  assert.equal(registered[0].label, "protected-linux-codex");
  assert.ok(!grantsText.includes(token));
});

test("concurrent Codex and ChatGPT setup reveals each credential once without overwriting producer grants", async (context) => {
  const audit = [];
  const { settings, producersFile } = await createSettings(context, {
    audit: (event) => audit.push(event),
  });
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const issue = (producer) => fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({ producer }),
  });
  const responses = await Promise.all([
    issue("linux-codex"),
    issue("personal-chatgpt"),
    issue("linux-codex"),
    issue("macos-codex"),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort((left, right) => left - right),
    [201, 201, 201, 409],
  );

  const bodies = await Promise.all(responses.map((response) => response.json()));
  const accepted = bodies.filter((body) => body.tokenDisclosed);
  const duplicate = bodies.find((body) => body.error === "producer_already_exists");

  assert.equal(accepted.length, 3);
  assert.equal(new Set(accepted.map((body) => body.token)).size, 3);
  assert.deepEqual(duplicate, { error: "producer_already_exists" });

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.deepEqual(grants.producers.map((producer) => producer.id).sort(), [
    "linux-codex",
    "macos-codex",
    "personal-chatgpt",
  ]);
  assert.equal(audit.length, 3);

  for (const issued of accepted) {
    assert.doesNotMatch(JSON.stringify(audit), new RegExp(issued.token));
    assert.doesNotMatch(JSON.stringify(grants), new RegExp(issued.token));
  }
});

test("separate producer processes preserve every concurrently authorized machine credential", async (context) => {
  const { producersFile, credentialsDirectory } = await createSettings(context);
  const producers = Array.from({ length: 12 }, (_, index) => `independent-machine-${index + 1}`);

  const issued = await Promise.all(producers.map(async (producer) => {
    const { stdout } = await execFileAsync(process.execPath, [
      producerTokenScript,
      "--producer", producer,
      "--credentials-directory", credentialsDirectory,
      "--producers-file", producersFile,
      "--json",
    ]);

    return JSON.parse(stdout);
  }));

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.deepEqual(
    grants.producers.map((producer) => producer.id).sort(),
    [...producers].sort(),
    "every successful independent process must remain registered",
  );

  for (const result of issued) {
    const credential = (await readFile(result.credentialPath, "utf8")).trim();
    const registered = grants.producers.find((producer) => producer.id === result.producer);

    assert.ok(registered, "every successfully issued credential remains independently authorized");
    assert.equal(registered.tokenSha256, createHash("sha256").update(credential).digest("hex"));
    assert.equal((await stat(result.credentialPath)).mode & 0o777, 0o600);
    assert.equal(result.tokenDisclosed, false);
  }
});

test("privileged token generation enforces a bounded per-administrator request rate", async (context) => {
  const { settings, producersFile } = await createSettings(context, {
    maxRequestsPerMinute: 2,
  });
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const responses = [];

  for (const producer of ["codex-linux", "personal-chatgpt", "unexpected-third-producer"]) {
    responses.push(await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Remote-User": "quickstark-admin",
        "X-QuickStark-CSRF": csrf,
      },
      body: JSON.stringify({ producer }),
    }));
  }

  assert.deepEqual(responses.map((response) => response.status), [201, 201, 429]);
  assert.match(responses[2].headers.get("retry-after") ?? "", /^\d+$/);
  assert.deepEqual(await responses[2].json(), { error: "rate_limited" });

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.deepEqual(grants.producers.map((producer) => producer.id), [
    "codex-linux",
    "personal-chatgpt",
  ]);
});

test("Settings preserves a route-specific restrictive browser security policy", async (context) => {
  const { settings } = await createSettings(context);
  const response = await administratorPage(settings);
  const policy = response.headers.get("content-security-policy");

  assert.equal(response.status, 200);
  assert.match(policy, /default-src 'none'/);
  assert.match(policy, /script-src 'nonce-[A-Za-z0-9_-]+'/);
  assert.match(policy, /style-src 'unsafe-inline'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("the privileged settings module rejects unsupported token identities and duplicate credentials", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const page = await administratorPage(settings);
  const csrf = csrfFrom(await page.text());

  for (const producer of ["../private", "contains spaces", "", "x".repeat(100)]) {
    const response = await fetch(new URL("/settings/tokens", settings.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Remote-User": "quickstark-admin",
        "X-QuickStark-CSRF": csrf,
      },
      body: JSON.stringify({ producer }),
    });

    assert.equal(response.status, 422);
  }

  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);
});

test("the settings server refuses a wildcard listener or untrusted privileged proxy", async () => {
  await assert.rejects(
    startReadoutSettingsServer({
      host: "0.0.0.0",
      port: 0,
      trustedProxy: true,
      adminUsers: ["quickstark-admin"],
    }),
    /specific|trusted|interface|host/i,
  );

  await assert.rejects(
    startReadoutSettingsServer({
      host: "127.0.0.1",
      port: 0,
      trustedProxy: false,
      adminUsers: ["quickstark-admin"],
    }),
    /trusted|proxy/i,
  );
});

test("the Project Workbench exposes a real protected Dashboard Settings destination", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-settings-workbench-"));
  const viewer = await startReadoutServer({ directory, port: 0 });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<a\b[^>]*href="\/settings"[^>]*>\s*Settings\s*<\/a>/i);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.doesNotMatch(html, /<script\b/i);
});

test("the production portfolio homepage exposes the same protected Dashboard Settings destination", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "quickstark-settings-portfolio-"));
  const viewer = await startReadoutServer({ directory, port: 0, homepage: "portfolio" });

  context.after(async () => {
    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }

    await rm(directory, { recursive: true, force: true });
  });

  const response = await fetch(viewer.url);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(
    /<a\b[^>]*href="\/settings"[^>]*>[\s\S]*?Settings\s*(?:<\/span>\s*)?<\/a>/i.test(html),
    "users can open authenticated Settings directly from the actual portfolio homepage",
  );
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
});

test("the ChatGPT platform uses a valid readout OpenAPI document with the same bearer authentication", async () => {
  const schema = JSON.parse(await readFile(
    new URL("../docs/specs/quickstark-chatgpt-readout.openapi.json", import.meta.url),
    "utf8",
  ));

  assert.equal(schema.openapi, "3.1.0");
  assert.equal(schema.servers[0].url, "https://reports.quickstark.com");
  assert.equal(
    schema.paths["/api/v1/readouts"].post.operationId,
    "publishQuickStarkSkillReadout",
  );
  assert.equal(schema.components.securitySchemes.producerBearer.type, "http");
  assert.equal(schema.components.securitySchemes.producerBearer.scheme, "bearer");
  assert.deepEqual(
    schema.paths["/api/v1/readouts"].post.security,
    [{ producerBearer: [] }],
  );
});

test("authenticated ChatGPT setup serves its actual bearer-protected OpenAPI schema", async (context) => {
  const { settings } = await createSettings(context);
  const route = new URL("/settings/chatgpt/openapi.json", settings.url);
  const anonymous = await fetch(route);
  const response = await fetch(route, {
    headers: { "Remote-User": "ordinary-reader" },
  });

  assert.equal(anonymous.status, 401, "the setup schema remains behind authenticated Settings");
  assert.equal(response.status, 200, "ChatGPT can use the actual documented schema");
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);

  const schema = await response.json();

  assert.equal(schema.openapi, "3.1.0");
  assert.equal(schema.servers[0].url, "https://reports.quickstark.com");
  assert.equal(schema.components.securitySchemes.producerBearer.scheme, "bearer");
  assert.equal(schema.paths["/api/v1/readouts"].post.operationId, "publishQuickStarkSkillReadout");

  const page = await administratorPage(settings);

  assert.match(
    await page.text(),
    /href="\/settings\/chatgpt\/openapi\.json"/,
    "the setup flow exposes a real, browser-openable ChatGPT schema",
  );
});

test("a one-time ChatGPT setup token publishes a browser-openable immutable QuickStark report", async (context) => {
  const { settings, directory, producersFile } = await createSettings(context);
  const csrf = csrfFrom(await (await administratorPage(settings)).text());
  const issuedResponse = await fetch(new URL("/settings/tokens", settings.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Remote-User": "quickstark-admin",
      "X-QuickStark-CSRF": csrf,
    },
    body: JSON.stringify({ producer: "personal-chatgpt" }),
  });

  assert.equal(issuedResponse.status, 201);

  const issued = await issuedResponse.json();
  const reportDirectory = join(directory, "reports");
  const viewer = await startReadoutServer({
    directory: reportDirectory,
    host: "127.0.0.1",
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["*"],
  });
  const ingestion = await startReadoutIngestionServer({
    directory: reportDirectory,
    host: "127.0.0.1",
    port: 0,
    baseUrl: viewer.url,
    allowedProjects: ["*"],
    producersFile,
  });

  context.after(async () => {
    for (const running of [ingestion, viewer]) {
      if (!running.server.listening) continue;

      await new Promise((resolve, reject) => {
        running.server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  const envelope = {
    version: 1,
    producer: issued.producer,
    harness: { name: "chatgpt" },
    collection: "quickstark/qs-skills",
    project: "https://github.com/quickstarkdemo/reporting-sandbox.git",
    runId: "76ac430c-f4e5-4aaa-9347-b5f236369946",
    generatedAt: "2026-07-27T20:30:00.000Z",
    skill: "qs-design-modules",
    status: "Completed",
    outcome: "Publish an actual ChatGPT skill run through the shared bearer-authenticated reporting API.",
    findings: [{ title: "One-time ChatGPT bearer authentication" }],
    nextSkills: [],
  };
  const submit = (body) => fetch(new URL("/api/v1/readouts", ingestion.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${issued.token}`,
    },
    body: JSON.stringify(body),
  });
  const created = await submit(envelope);

  assert.equal(created.status, 201);

  const accepted = await created.json();

  assert.equal(accepted.project, "github.com/quickstarkdemo/reporting-sandbox");
  assert.equal(accepted.skill, "qs-design-modules");
  assert.ok(accepted.url.startsWith(viewer.url), "the accepted report is a real browser URL");

  const originalResponse = await fetch(accepted.url);

  assert.equal(originalResponse.status, 200);

  const original = await originalResponse.text();

  assert.match(original, /One-time ChatGPT bearer authentication/);
  assert.match(original, /quickstark:harness" content="chatgpt/);
  assert.doesNotMatch(original, new RegExp(issued.token));

  const replay = await submit(envelope);

  assert.equal(replay.status, 200, "an exact historical retry is safely idempotent");

  const conflict = await submit({
    ...envelope,
    outcome: "This changed outcome must never overwrite the historical ChatGPT report.",
  });

  assert.equal(conflict.status, 409, "a changed retry cannot alter immutable history");
  assert.equal(await (await fetch(accepted.url)).text(), original);
});

test("the setup wizard asks whether the producer runs in Codex or ChatGPT", () => {
  const html = renderReadoutSettings({
    user: "quickstark-admin",
    csrf: "a".repeat(64),
    nonce: "b".repeat(32),
  });

  assert.match(html, /id="open-setup-wizard"/);
  assert.match(html, /<dialog\b[^>]*id="producer-setup-wizard"/);
  assert.match(html, /data-wizard-harness="codex"/);
  assert.match(html, /data-wizard-harness="chatgpt"/);
  assert.match(html, /data-wizard-platform="linux"/);
  assert.match(html, /data-wizard-platform="macos"/);
  assert.match(html, /data-wizard-platform="windows"/);
  assert.match(html, /Name and create your producer token/);
  assert.match(html, /Copy this token’s install command/);
  assert.doesNotMatch(html, /<article\b[^>]*class="[^"]*platform-card/i,
    "platform choices belong only to the token-creation modal");
});

test("Chromium saves readable font sizes and information density without resetting user preferences", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const browserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "Remote-User": "quickstark-admin" },
  });
  const page = await browserContext.newPage();

  await page.goto(new URL("/settings", settings.url).href, { waitUntil: "networkidle" });

  const compact = page.locator('button[data-preference-density="compact"]');

  assert.equal(await compact.count(), 1, "information density has a real, actionable compact preference");

  const [densityResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/settings/preferences") && response.request().method() === "POST"),
    compact.click(),
  ]);

  assert.equal(densityResponse.status(), 200, "the density selection is accepted by authenticated Settings");

  const savedDensity = await densityResponse.json();

  assert.equal(savedDensity.density, "compact", "the browser submits and saves the selected density");

  const densityCookie = (await browserContext.cookies())
    .find((cookie) => cookie.name === "qs_readout_preferences");

  assert.ok(densityCookie, "the browser actually stores the signed density preference");

  const independentlyRestored = await fetch(new URL("/settings", settings.url), {
    headers: {
      "Remote-User": "quickstark-admin",
      Cookie: `${densityCookie.name}=${densityCookie.value}`,
    },
  });

  assert.match(
    await independentlyRestored.text(),
    /data-preference-density="compact"/,
    "the actual signed cookie restores the selected density through the public Settings route",
  );

  await page.waitForFunction(() =>
    document.querySelector("main.settings")?.dataset.preferenceDensity === "compact", undefined, {
    timeout: 2_500,
  });

  assert.equal(
    await page.locator('button[data-preference-density="compact"]').evaluate((button) =>
      button.classList.contains("selected")),
    true,
    "the selected density is restored from the actual signed preference",
  );

  const [sizeResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/settings/preferences") && response.request().method() === "POST"),
    page.locator('button[data-preference-size="large"]').click(),
  ]);

  assert.equal(sizeResponse.status(), 200, "the selected font size is accepted without resetting density");

  await page.waitForFunction(() => {
    const settings = document.querySelector("main.settings");

    return settings?.dataset.preferenceSize === "large"
      && settings.dataset.preferenceDensity === "compact";
  });

  const preferences = await page.evaluate(() => ({
    feature: getComputedStyle(document.documentElement).getPropertyValue("--feature").trim(),
    prompt: getComputedStyle(document.documentElement).getPropertyValue("--prompt").trim(),
    density: document.querySelector('button[data-preference-density="compact"]').classList.contains("selected"),
    overflows: document.documentElement.scrollWidth > innerWidth,
  }));

  assert.deepEqual(preferences, {
    feature: "17px",
    prompt: "16px",
    density: true,
    overflows: false,
  });

  const cookies = await browserContext.cookies();
  const preference = cookies.find((cookie) => cookie.name === "qs_readout_preferences");

  assert.ok(preference, "Settings persists preferences in a real browser cookie");
  assert.equal(preference.httpOnly, true);
  assert.equal(preference.secure, true);
  assert.equal(preference.sameSite, "Strict");
  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, []);

  await browserContext.close();
});

test("Chromium compact preferences measurably tighten responsive Settings and the actual Workbench", async (context) => {
  const preferenceSecret = Buffer.alloc(32, 11);
  const { settings, directory } = await createSettings(context, { preferenceSecret });
  const reportDirectory = join(directory, "density-reports");
  const readout = await writeSkillReadout({
    skill: "qs-code-build",
    outcome: "Verify responsive dashboard density without modifying an immutable report.",
  }, {
    directory: reportDirectory,
    githubFetcher: async () => ({ ok: false, status: 503 }),
  });
  const original = await readFile(readout.path, "utf8");
  const viewer = await startReadoutServer({
    directory: reportDirectory,
    port: 0,
    publicationMode: "hosted",
    allowedProjects: ["github.com/quickstark/skills"],
    currentProject: "github.com/quickstark/skills",
    trustedProxy: true,
    preferenceSecret,
  });
  const browser = await chromium.launch({ headless: true });

  context.after(async () => {
    await browser.close();

    if (viewer.server.listening) {
      await new Promise((resolve, reject) => {
        viewer.server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  const browserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "Remote-User": "quickstark-admin" },
  });
  const page = await browserContext.newPage();

  await page.goto(new URL("/settings", settings.url).href, { waitUntil: "networkidle" });

  const dimensions = async () => page.evaluate(() => ({
    gridGap: Number.parseFloat(getComputedStyle(document.querySelector(".grid")).rowGap),
    panelPadding: Number.parseFloat(getComputedStyle(document.querySelector(".panel")).paddingTop),
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  const balanced = await dimensions();

  const [saved] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/settings/preferences") && response.request().method() === "POST"),
    page.locator('button[data-preference-density="compact"]').click(),
  ]);

  assert.equal(saved.status(), 200);

  const compact = await dimensions();

  assert.ok(compact.gridGap < balanced.gridGap, "compact density reduces actual responsive grid spacing");
  assert.ok(compact.panelPadding < balanced.panelPadding, "compact density reduces actual panel padding");
  assert.ok(compact.width <= compact.viewport + 1, "compact Settings never overflow a narrow viewport");

  const cookies = await browserContext.cookies();
  const preference = cookies.find((cookie) => cookie.name === "qs_readout_preferences");

  assert.ok(preference);

  await browserContext.addCookies([{
    ...preference,
    domain: new URL(viewer.url).hostname,
    path: "/",
  }]);
  await page.goto(viewer.url, { waitUntil: "networkidle" });

  const workbench = await page.evaluate(() => {
    const root = document.querySelector(".workbench-page");
    const sidebar = document.querySelector(".workbench-sidebar");

    return {
      density: root?.dataset.preferenceDensity,
      sidebarPadding: Number.parseFloat(getComputedStyle(sidebar).paddingTop),
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
    };
  });

  assert.equal(workbench.density, "compact");
  assert.ok(workbench.sidebarPadding < 12,
    "the authenticated Workbench applies compact layout geometry rather than only its label");
  assert.ok(workbench.width <= workbench.viewport + 1);
  assert.equal(await readFile(readout.path, "utf8"), original);

  await browserContext.close();
});

test("Chromium manages tokens from the report-style Settings sidebar with one-time platform commands and real row controls", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const browserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
    extraHTTPHeaders: { "Remote-User": "quickstark-admin" },
  });
  const page = await browserContext.newPage();

  await page.goto(new URL("/settings", settings.url).href, { waitUntil: "networkidle" });

  assert.equal(await page.getByRole("complementary", { name: "Dashboard Settings" }).count(), 1,
    "personal Settings use a real report-style accessible sidebar");
  assert.equal(await page.getByRole("heading", { name: "Profile & personal settings" }).count(), 1);

  await page.getByRole("link", { name: "Producer tokens" }).click();

  assert.ok(new URL(page.url()).searchParams.get("tab") === "producer-tokens",
    "the producer table is its own restorable Settings destination");
  assert.equal(await page.getByRole("table", { name: "Producer tokens" }).count(), 1);
  assert.equal(await page.locator(".platform-card").count(), 0,
    "the token table does not contain an unnecessary standalone platform-setup section");

  await page.getByRole("button", { name: "Create new token" }).click();

  const wizard = page.locator("#producer-setup-wizard");

  assert.equal(await wizard.evaluate((dialog) => dialog.open), true);

  await wizard.locator('[data-wizard-platform="macos"]').click();
  assert.equal(await wizard.locator("#wizard-profile-step").isVisible(), true,
    "macOS token creation explicitly offers both independent Codex profiles");
  await wizard.locator('[data-wizard-profile=".codex-demo"]').click();
  await wizard.getByRole("textbox", { name: "Wizard producer identity" }).fill("browser-macbook");

  const [response] = await Promise.all([
    page.waitForResponse((candidate) =>
      candidate.url().endsWith("/settings/tokens") && candidate.request().method() === "POST"),
    wizard.locator("#wizard-generate-token").click(),
  ]);

  assert.equal(response.status(), 201);

  const issued = await response.json();
  const command = await wizard.locator("#wizard-command").innerText();

  assert.equal(issued.platform, "macos");
  assert.equal(issued.codexProfile, ".codex-demo");
  assert.equal(issued.installation.codexProfile, ".codex-demo");
  assert.ok(command.includes(issued.token),
    "the macOS installation command already contains the exact one-time token");
  assert.match(command, /\$HOME\/\.codex-demo/,
    "the copied browser command installs directly into the selected demo profile");
  assert.match(command, /security -i/);
  assert.match(command, /add-generic-password/);
  assert.doesNotMatch(command, /launchctl\s+setenv|QS_READOUT_PRODUCER_TOKEN/,
    "the browser command never changes the shared macOS desktop producer token");

  await wizard.getByRole("button", { name: "Copy setup instructions" }).click();

  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), command,
    "copy produces the actual complete, token-specific macOS installation command");

  await wizard.getByRole("button", { name: "Close token creation" }).click();

  assert.equal(await wizard.evaluate((dialog) => dialog.open), false);
  assert.ok(!(await page.content()).includes(issued.token),
    "closing token creation immediately removes its plaintext and token-bearing command");

  let row = page.getByRole("row").filter({ hasText: "browser-macbook" });

  assert.equal(await row.count(), 1);
  assert.match(await row.innerText(), /macOS/);
  assert.equal(await row.getByRole("button", { name: "View token browser-macbook" }).count(), 1);
  assert.equal(await row.getByRole("button", { name: "Edit token browser-macbook" }).count(), 1);
  assert.equal(await row.getByRole("button", { name: "Delete token browser-macbook" }).count(), 1);

  await row.getByRole("button", { name: "View token browser-macbook" }).click();

  const detail = page.locator("#producer-detail-dialog");

  await page.waitForFunction(() => document.querySelector("#producer-detail-dialog")?.open === true);
  assert.equal(await detail.evaluate((dialog) => dialog.open), true);
  assert.match(await detail.innerText(), /SHA-256/);
  assert.match(await detail.innerText(), /viewed only when it is created/i);
  assert.ok(!(await detail.innerText()).includes(issued.token));

  await detail.getByRole("button", { name: "Close token details" }).click();
  await row.getByRole("button", { name: "Edit token browser-macbook" }).click();

  const editor = page.locator("#producer-edit-dialog");

  await editor.getByLabel("Display name").fill("Personal MacBook");

  const [edited] = await Promise.all([
    page.waitForResponse((candidate) =>
      candidate.url().endsWith("/settings/tokens/browser-macbook")
      && candidate.request().method() === "PATCH"),
    editor.getByRole("button", { name: "Save changes" }).click(),
  ]);

  assert.equal(edited.status(), 200);

  row = page.getByRole("row").filter({ hasText: "Personal MacBook" });

  assert.equal(await row.count(), 1, "saving updates only the selected row's display name");

  await row.getByRole("button", { name: "Delete token browser-macbook" }).click();

  const deletion = page.locator("#producer-delete-dialog");

  assert.equal(await deletion.evaluate((dialog) => dialog.open), true,
    "deleting a token requires an explicit confirmation");

  const [revoked] = await Promise.all([
    page.waitForResponse((candidate) =>
      candidate.url().endsWith("/settings/tokens/browser-macbook")
      && candidate.request().method() === "DELETE"),
    deletion.getByRole("button", { name: "Delete token" }).click(),
  ]);

  assert.equal(revoked.status(), 200);
  assert.equal(await page.getByRole("row").filter({ hasText: "Personal MacBook" }).count(), 0);
  assert.deepEqual(JSON.parse(await readFile(producersFile, "utf8")).producers, [],
    "the real dashboard row removal immediately revokes the underlying producer grant");
  assert.ok(!(await page.content()).includes(issued.token));

  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));

  assert.ok(layout.width <= layout.viewport + 1,
    "the sidebar, token table, and action dialogs remain usable on a narrow mobile viewport");

  await browserContext.close();
});

test("Chromium reveals a generated producer token once and never restores plaintext after reload", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const browserContext = await browser.newContext({
    viewport: { width: 760, height: 900 },
    extraHTTPHeaders: { "Remote-User": "quickstark-admin" },
  });
  const page = await browserContext.newPage();

  await page.goto(new URL("/settings?tab=producer-tokens", settings.url).href, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Create new token" }).click();
  await page.locator('[data-wizard-harness="chatgpt"]').click();
  await page.getByRole("textbox", { name: "Wizard producer identity" }).fill("browser-chatgpt");

  const [response] = await Promise.all([
    page.waitForResponse((candidate) =>
      candidate.url().endsWith("/settings/tokens") && candidate.request().method() === "POST"),
    page.locator("#wizard-generate-token").click(),
  ]);

  assert.equal(response.status(), 201);

  const issued = await response.json();
  const reveal = page.locator("#wizard-token-reveal");

  await page.waitForFunction(() => !document.querySelector("#wizard-token-reveal").hidden);

  assert.equal(await reveal.locator("code").textContent(), issued.token);
  assert.match(await reveal.innerText(), /can be viewed|only.*window|shown only/i);
  assert.equal(await reveal.getByRole("button", { name: "Copy token" }).count(), 1);
  assert.ok((await page.locator("#wizard-command").innerText()).includes(issued.token),
    "the real selected-platform installation instructions embed this exact one-time token");

  await page.reload({ waitUntil: "networkidle" });

  assert.match(await page.locator(".producer-list").innerText(), /browser-chatgpt/);
  assert.equal(await page.locator("#wizard-token-reveal").evaluate((panel) => panel.hidden), true);
  assert.doesNotMatch(await page.content(), new RegExp(issued.token));

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.equal(grants.producers.length, 1);
  assert.equal(grants.producers[0].id, "browser-chatgpt");
  assert.doesNotMatch(JSON.stringify(grants), new RegExp(issued.token));

  await browserContext.close();
});

test("Chromium runs the responsive Codex and ChatGPT producer setup wizard", async (context) => {
  const { settings } = await createSettings(context);
  const browser = await chromium.launch({ headless: true });

  context.after(async () => {
    await browser.close();
  });

  for (const viewport of [
    { width: 1440, height: 980 },
    { width: 390, height: 844 },
  ]) {
    const browserContext = await browser.newContext({
      viewport,
      extraHTTPHeaders: { "Remote-User": "quickstark-admin" },
    });
    const page = await browserContext.newPage();

    await page.goto(new URL("/settings?tab=producer-tokens", settings.url).href, { waitUntil: "networkidle" });
    await page.locator("#open-setup-wizard").click();

    assert.equal(await page.locator("#producer-setup-wizard").evaluate((dialog) => dialog.open), true);

    await page.locator('[data-wizard-harness="codex"]').click();
    await page.locator('[data-wizard-platform="linux"]').click();
    assert.equal(
      await page.locator("#wizard-openapi").isVisible(),
      false,
      "Codex setup does not show ChatGPT-only instructions",
    );
    await assert.match(
      await page.locator("#wizard-command").innerText(),
      /QS_READOUT_PRODUCER_TOKEN/,
    );

    await page.locator('[data-wizard-platform="macos"]').click();
    assert.match(
      await page.locator("#wizard-command").innerText(),
      /security find-generic-password/,
    );

    await page.locator('[data-wizard-platform="windows"]').click();
    assert.match(
      await page.locator("#wizard-command").innerText(),
      /SetEnvironmentVariable/,
    );

    await page.locator('[data-wizard-harness="chatgpt"]').click();

    const guide = await page.locator("#wizard-guide").innerText();
    const chatgptCommand = await page.locator("#wizard-command").innerText();

    assert.match(guide, /GPT Action/);
    assert.match(chatgptCommand, /Bearer/);
    assert.match(chatgptCommand, /OpenAPI/);
    assert.match(chatgptCommand, /api\/v1\/readouts/);
    assert.equal(
      await page.locator("#wizard-openapi").isVisible(),
      true,
      "ChatGPT setup exposes its real browser-openable OpenAPI schema",
    );
    assert.equal(
      await page.locator("#wizard-openapi").getAttribute("href"),
      "/settings/chatgpt/openapi.json",
    );

    const layout = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      dialogWidth: document.querySelector("#producer-setup-wizard").getBoundingClientRect().width,
    }));

    assert.ok(layout.pageWidth <= layout.viewport + 1, "Settings never overflows its viewport.");
    assert.ok(layout.dialogWidth <= layout.viewport, "The wizard remains visible on mobile.");
    assert.doesNotMatch(guide, /Bearer\s+[A-Za-z0-9_-]{24,}/);

    await browserContext.close();
  }
});

test("Chromium completes one-time Codex and ChatGPT token generation entirely inside the setup wizard", async (context) => {
  const { settings, producersFile } = await createSettings(context);
  const browser = await chromium.launch({ headless: true });

  context.after(async () => browser.close());

  const browserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "Remote-User": "quickstark-admin" },
  });
  const page = await browserContext.newPage();

  await page.goto(new URL("/settings?tab=producer-tokens", settings.url).href, { waitUntil: "networkidle" });
  await page.locator("#open-setup-wizard").click();

  const wizard = page.locator("#producer-setup-wizard");
  const identity = wizard.getByRole("textbox", { name: "Wizard producer identity" });

  assert.equal(await identity.count(), 1, "the modal itself accepts an independent producer identity");

  await identity.fill("wizard-linux-codex");

  const [codexResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/settings/tokens") && response.request().method() === "POST"),
    wizard.locator("#wizard-generate-token").click(),
  ]);

  assert.equal(codexResponse.status(), 201);

  const codexToken = (await codexResponse.json()).token;
  const reveal = wizard.locator("#wizard-token-reveal");

  assert.equal(await reveal.locator("code").textContent(), codexToken,
    "the newly generated token is revealed once inside the modal");
  assert.equal(await reveal.getByRole("button", { name: "Copy token" }).count(), 1);

  const linux = await wizard.locator("#wizard-command").innerText();

  assert.match(linux, /install -d -m 700/);
  assert.match(linux, /QS_READOUT_PRODUCER_TOKEN/);
  assert.ok(linux.includes(codexToken),
    "the Linux command embeds the actual just-created token and needs no manual substitution");

  await wizard.locator('[data-wizard-platform="macos"]').click();

  const macos = await wizard.locator("#wizard-command").innerText();

  assert.match(macos, /security -i/);
  assert.match(macos, /add-generic-password/);
  assert.match(macos, /security find-generic-password/);
  assert.doesNotMatch(macos, /launchctl\s+setenv|QS_READOUT_PRODUCER_TOKEN/,
    "switching an issued credential to macOS never changes the shared desktop environment");
  assert.ok(macos.includes(codexToken), "the macOS command contains the selected one-time token");

  await wizard.locator('[data-wizard-platform="windows"]').click();

  const windows = await wizard.locator("#wizard-command").innerText();

  assert.match(windows, /SetEnvironmentVariable/);
  assert.ok(windows.includes(codexToken), "the PowerShell command contains the selected one-time token");

  await wizard.locator('[data-wizard-harness="chatgpt"]').click();
  await identity.fill("wizard-personal-chatgpt");

  const [chatgptResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/settings/tokens") && response.request().method() === "POST"),
    wizard.locator("#wizard-generate-token").click(),
  ]);

  assert.equal(chatgptResponse.status(), 201);

  const chatgptToken = (await chatgptResponse.json()).token;

  assert.notEqual(chatgptToken, codexToken);
  assert.equal(await reveal.locator("code").textContent(), chatgptToken);
  assert.equal(await wizard.locator("#wizard-openapi").isVisible(), true);
  const chatgptCommand = await wizard.locator("#wizard-command").innerText();

  assert.match(chatgptCommand, /Bearer/);
  assert.ok(chatgptCommand.includes(chatgptToken),
    "ChatGPT setup includes its own bearer token only during one-time credential creation");

  const grants = JSON.parse(await readFile(producersFile, "utf8"));

  assert.deepEqual(grants.producers.map((producer) => producer.id).sort(), [
    "wizard-linux-codex",
    "wizard-personal-chatgpt",
  ]);
  assert.doesNotMatch(JSON.stringify(grants), new RegExp(`${codexToken}|${chatgptToken}`));

  await page.reload({ waitUntil: "networkidle" });

  const reloaded = await page.content();

  assert.doesNotMatch(reloaded, new RegExp(`${codexToken}|${chatgptToken}`),
    "one-time browser-visible secrets never return after reload");

  await browserContext.close();
});
