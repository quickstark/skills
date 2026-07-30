import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PRODUCER_CREDENTIAL_DIRECTORY,
  DEFAULT_PRODUCER_GRANTS_FILE,
  issueReadoutProducerToken,
  revokeReadoutProducerToken,
  updateReadoutProducerToken,
} from "./qs-readout-producer-token.mjs";
import {
  decodeReadoutPreferences,
  encodeReadoutPreferences,
  loadReadoutPreferenceSecret,
  normalizeReadoutPreferences,
} from "./qs-skill-report-presentation.mjs";

const safeIdentity = /^[a-z0-9][a-z0-9._@-]{0,159}$/i;
const safeProducer = /^[a-z0-9][a-z0-9._-]{0,95}$/i;
const codexProfiles = new Set([".codex", ".codex-demo"]);

export { normalizeReadoutPreferences } from "./qs-skill-report-presentation.mjs";

function escape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function readoutPlatformSetup(token, { codexProfile = ".codex" } = {}) {
  if (token !== undefined && !/^[A-Za-z0-9_-]{64}$/.test(token)) {
    throw new Error("Platform setup requires the actual safely generated one-time producer token.");
  }

  if (!codexProfiles.has(codexProfile)) {
    throw new Error("Platform setup requires a safe supported Codex profile.");
  }

  const credential = token ?? "PASTE_NEWLY_GENERATED_TOKEN";

  return [
    {
      id: "linux",
      title: "Linux",
      detail: "Save the token with owner-only permissions and make it available to the current terminal and Linux user session.",
      command: [
        "install -d -m 700 ~/.config/quickstark",
        `(umask 077; printf '%s\\n' '${credential}' > ~/.config/quickstark/producer.token)`,
        'export QS_READOUT_PRODUCER_TOKEN="$(< ~/.config/quickstark/producer.token)"',
        "systemctl --user import-environment QS_READOUT_PRODUCER_TOKEN 2>/dev/null || true",
      ].join("\n"),
      after: "Restart Codex so its desktop or terminal session inherits the producer token.",
    },
    {
      id: "macos",
      title: "macOS",
      detail: `Store the token only for the selected ~/${codexProfile} Codex profile in its owner-only file and separately named macOS Keychain entry.`,
      command: [
        `quickstark_codex_home="$HOME/${codexProfile}"`,
        `quickstark_codex_profile="${codexProfile}"`,
        'quickstark_codex_directory="$quickstark_codex_home/quickstark"',
        'quickstark_codex_token="$quickstark_codex_directory/producer.token"',
        'if [ -L "$quickstark_codex_home" ] || [ -L "$quickstark_codex_directory" ] || [ -L "$quickstark_codex_token" ]; then',
        "  printf '%s\\n' 'QuickStark refused a symbolic-link Codex credential path.' >&2",
        "  exit 1",
        "fi",
        'install -d -m 700 "$quickstark_codex_directory" || exit 1',
        'if [ ! -O "$quickstark_codex_home" ] || [ ! -O "$quickstark_codex_directory" ]; then',
        "  printf '%s\\n' 'QuickStark refused a Codex credential path owned by another user.' >&2",
        "  exit 1",
        "fi",
        'quickstark_real_home="$(cd "$HOME" && pwd -P)" || exit 1',
        'quickstark_real_directory="$(cd "$quickstark_codex_directory" && pwd -P)" || exit 1',
        `if [ "$quickstark_real_directory" != "$quickstark_real_home/${codexProfile}/quickstark" ]; then`,
        "  printf '%s\\n' 'QuickStark refused a Codex credential outside the current user home.' >&2",
        "  exit 1",
        "fi",
        'if [ -e "$quickstark_codex_token" ] && [ ! -f "$quickstark_codex_token" ]; then',
        "  printf '%s\\n' 'QuickStark refused a non-regular Codex credential.' >&2",
        "  exit 1",
        "fi",
        'quickstark_codex_temporary="$(mktemp "$quickstark_codex_directory/.producer.token.XXXXXXXXXX")" || exit 1',
        `if ! (umask 077; printf '%s\\n' '${credential}' > "$quickstark_codex_temporary" && chmod 600 "$quickstark_codex_temporary"); then`,
        '  rm -f "$quickstark_codex_temporary"',
        "  exit 1",
        "fi",
        'if [ -L "$quickstark_codex_home" ] || [ -L "$quickstark_codex_directory" ] || [ -L "$quickstark_codex_token" ]; then',
        '  rm -f "$quickstark_codex_temporary"',
        "  printf '%s\\n' 'QuickStark refused a changed symbolic-link Codex credential path.' >&2",
        "  exit 1",
        "fi",
        'if ! mv -f "$quickstark_codex_temporary" "$quickstark_codex_token"; then',
        '  rm -f "$quickstark_codex_temporary"',
        "  exit 1",
        "fi",
        "security -i <<QUICKSTARK_KEYCHAIN_SETUP",
        `add-generic-password -U -a "$USER" -s "quickstark-readout-producer-token-$quickstark_codex_profile" -w '${credential}'`,
        "QUICKSTARK_KEYCHAIN_SETUP",
        'security find-generic-password \\',
        '  -a "$USER" -s "quickstark-readout-producer-token-$quickstark_codex_profile" >/dev/null',
      ].join("\n"),
      after: `Restart only the selected ~/${codexProfile} Codex application. Its private credential is discovered automatically; no shared macOS desktop token is configured.`,
    },
    {
      id: "windows",
      title: "Windows",
      detail: "Protect the token with the current Windows user and configure both the current PowerShell and future Codex desktop sessions.",
      command: [
        '$directory = Join-Path $env:USERPROFILE ".quickstark"',
        "New-Item -ItemType Directory -Force -Path $directory | Out-Null",
        'icacls $directory /inheritance:r "/grant:r" "${env:USERNAME}:(OI)(CI)F" | Out-Null',
        `$quickStarkProducerToken = '${credential}'`,
        '$path = Join-Path $directory "producer.token"',
        '[IO.File]::WriteAllText($path, $quickStarkProducerToken)',
        '[Environment]::SetEnvironmentVariable("QS_READOUT_PRODUCER_TOKEN", $quickStarkProducerToken, "User")',
        '$env:QS_READOUT_PRODUCER_TOKEN = $quickStarkProducerToken',
        "Remove-Variable quickStarkProducerToken -ErrorAction SilentlyContinue",
      ].join("\n"),
      after: "Restart the Codex desktop application.",
    },
    {
      id: "chatgpt",
      title: "ChatGPT",
      detail: "Configure the token only in the private ChatGPT GPT Action authentication setting; never paste it into a chat.",
      command: [
        "Server: https://reports.quickstark.com",
        "Authentication: API key → Bearer",
        `API key: ${credential}`,
        "OpenAPI schema: https://reports.quickstark.com/settings/chatgpt/openapi.json",
        "Route: POST /api/v1/readouts",
      ].join("\n"),
      after: "Save and test the GPT Action with its independently revocable producer token.",
    },
  ];
}

function producerList(producers) {
  if (!Array.isArray(producers)) {
    throw new Error("Dashboard producer metadata must be an array.");
  }

  return producers.map((producer) => {
    if (
      !producer
      || typeof producer !== "object"
      || !safeProducer.test(producer.id)
      || !Array.isArray(producer.projects)
    ) {
      throw new Error("Dashboard producer metadata contains an unsafe producer.");
    }

    const knownPlatform = ["linux", "macos", "windows", "chatgpt"].includes(producer.platform)
      ? producer.platform
      : "unknown";
    const label = producer.label === undefined ? producer.id : producer.label;

    if (typeof label !== "string" || !/^[a-z0-9][a-z0-9 ._-]{0,95}$/i.test(label)) {
      throw new Error("Dashboard producer metadata contains an unsafe display name.");
    }

    if (
      producer.createdAt !== undefined
      && producer.createdAt !== null
      && (typeof producer.createdAt !== "string" || Number.isNaN(Date.parse(producer.createdAt)))
    ) {
      throw new Error("Dashboard producer metadata contains an invalid creation date.");
    }

    return {
      id: producer.id,
      label,
      platform: knownPlatform,
      createdAt: producer.createdAt ?? null,
      fingerprint: typeof producer.tokenSha256 === "string" && /^[a-f0-9]{64}$/i.test(producer.tokenSha256)
        ? producer.tokenSha256.slice(0, 8)
        : null,
      projects: producer.projects,
    };
  });
}

function settingsIcon(name) {
  const paths = {
    profile: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
    token: '<path d="m14 8 2-2a4 4 0 1 1 5.7 5.6L16 17.3a4 4 0 0 1-5.7 0l-2-2"/><path d="m10 16-2 2a4 4 0 1 1-5.7-5.6L8 6.7a4 4 0 0 1 5.7 0l2 2"/>',
    view: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    edit: '<path d="m15 5 4 4M4 20l4-1 11-11a2.8 2.8 0 0 0-4-4L4 15l-1 5Z"/>',
    delete: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6"/>',
    plus: '<path d="M12 5v14m-7-7h14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
  };

  return '<svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + (paths[name] ?? paths.profile) + "</svg>";
}

export function renderReadoutSettings({
  user,
  csrf,
  nonce,
  producers = [],
  preferences = {},
  tab = "profile",
  administrator = true,
} = {}) {
  if (typeof user !== "string" || !safeIdentity.test(user)) {
    throw new Error("Dashboard Settings requires an authenticated user.");
  }

  if (!/^[a-f0-9]{64}$/i.test(csrf ?? "")) {
    throw new Error("Dashboard Settings requires a valid anti-CSRF token.");
  }

  if (!/^[a-z0-9_-]{16,64}$/i.test(nonce ?? "")) {
    throw new Error("Dashboard Settings requires a safe script nonce.");
  }

  if (!["profile", "producer-tokens"].includes(tab)) {
    throw new Error("Dashboard Settings requires a supported sidebar destination.");
  }

  if (typeof administrator !== "boolean") {
    throw new Error("Dashboard Settings requires an explicit producer-administrator decision.");
  }

  const selected = normalizeReadoutPreferences(preferences);
  const safeProducers = producerList(producers);
  const adapters = readoutPlatformSetup();
  const macosAdapters = Object.fromEntries([...codexProfiles].map((codexProfile) => [
    codexProfile,
    readoutPlatformSetup(undefined, { codexProfile }).find((adapter) => adapter.id === "macos"),
  ]));
  const platformTitle = Object.fromEntries(adapters.map((adapter) => [adapter.id, adapter.title]));
  const producerItems = safeProducers.length
    ? safeProducers.map((producer) => {
      const actions = administrator
        ? ["view", "edit", "delete"].map((action) =>
          '<button class="icon-action' + (action === "delete" ? " is-danger" : "")
          + '" type="button" data-producer-action="' + action
          + '" data-producer="' + escape(producer.id)
          + '" aria-label="' + action.charAt(0).toUpperCase() + action.slice(1)
          + " token " + escape(producer.id) + '">' + settingsIcon(action) + "</button>").join("")
        : '<span class="table-note">Read only</span>';

      return '<tr data-producer-row="' + escape(producer.id) + '"><td class="token-actions">'
        + actions + '</td><td><strong class="token-name">' + escape(producer.label)
        + '</strong><span class="token-id">' + escape(producer.id) + '</span></td><td>'
        + escape(platformTitle[producer.platform] ?? "Not recorded")
        + '</td><td><span class="badge">Active</span></td><td class="table-note">'
        + escape(producer.createdAt ? new Date(producer.createdAt).toISOString().slice(0, 10) : "Not recorded")
        + "</td></tr>";
    }).join("")
    : '<tr class="producer-empty"><td colspan="5">No producer tokens have been registered.</td></tr>';

  const style = [
    ":root{color-scheme:light;--ink:#191b2d;--muted:#737b93;--line:#e7e8f0;--violet:#7358f5;--violet-bg:#f2eeff;--green:#128562;--green-bg:#e9f7f1;--red:#b93849;--paper:#f6f7fb;--card:#fff;--settings-grid-gap:12px;--settings-panel-padding:15px;--settings-row-padding:10px;--feature:" + selected.featurePx + "px;--prompt:" + selected.promptPx + "px}",
    ".settings[data-preference-density=compact]{--settings-grid-gap:7px;--settings-panel-padding:10px;--settings-row-padding:7px}",
    "*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    ".settings{display:grid;grid-template-columns:230px minmax(0,1fr);width:100%;min-height:100dvh;margin:0}.settings-sidebar{display:flex;min-height:100dvh;flex-direction:column;gap:16px;border-right:1px solid var(--line);background:var(--card);padding:17px 12px}.settings-brand{display:flex;align-items:center;gap:9px;color:var(--ink);font-size:13px;font-weight:760;text-decoration:none}.settings-brand-mark{display:grid;width:33px;height:33px;place-items:center;border-radius:10px;background:var(--violet);color:#fff;font-size:16px}.settings-brand small{display:block;margin-top:2px;color:var(--muted);font-size:10px;font-weight:500}.settings-sidebar nav{display:grid;gap:5px}.settings-nav-item{display:flex;min-height:40px;align-items:center;gap:8px;border-radius:8px;padding:9px;color:var(--muted);font-size:12px;text-decoration:none}.settings-nav-item[aria-current=page]{background:var(--violet-bg);color:var(--violet);font-weight:680}.settings-sidebar footer{margin-top:auto;border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font-size:11px}.settings-icon{width:17px;height:17px;flex:none}",
    ".settings-content{width:min(1040px,100%);min-width:0;padding:24px clamp(15px,3vw,36px) 42px}.masthead{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:14px}.brand{color:var(--ink);font-size:14px;font-weight:750;text-decoration:none}.private{color:var(--muted);font-size:11px}.eyebrow{color:var(--muted);font-size:10px;font-weight:760;letter-spacing:.12em;text-transform:uppercase}h1{margin:7px 0 5px;font-size:clamp(27px,4vw,40px);letter-spacing:-.05em}.intro{color:var(--muted);font-size:var(--feature);line-height:1.55}.settings-tab-panel[hidden]{display:none}",
    ".grid{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--settings-grid-gap)}.panel{min-width:0;border:1px solid var(--line);border-radius:13px;background:var(--card);padding:var(--settings-panel-padding)}.panel h2{margin:6px 0;font-size:17px}.caption{color:var(--muted);font-size:var(--prompt);line-height:1.55}.row{display:flex;align-items:center;justify-content:space-between;gap:9px;border-top:1px solid var(--line);padding:var(--settings-row-padding) 0}.row strong{font-size:var(--prompt)}.row span{color:var(--muted);font-size:11px}.sizes{display:flex;gap:4px}.sizes button{border:1px solid var(--line);border-radius:7px;background:var(--card);padding:5px 8px;color:var(--muted);font-size:11px;cursor:pointer}.sizes .selected{border-color:#e0d8ff;background:var(--violet-bg);color:var(--violet)}",
    ".token-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.token-heading h2{margin:4px 0}.action,.copy{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #ddd5ff;border-radius:8px;background:var(--violet-bg);padding:8px 11px;color:var(--violet);font-size:12px;font-weight:680;cursor:pointer}.token-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px}.token-table{width:100%;min-width:590px;border-collapse:collapse;text-align:left}.token-table th{padding:10px;border-bottom:1px solid var(--line);background:#fafafe;color:var(--muted);font-size:10px;font-weight:710;letter-spacing:.04em}.token-table td{border-bottom:1px solid var(--line);padding:10px;font-size:var(--prompt)}.token-table tr:last-child td{border-bottom:0}.token-actions{white-space:nowrap}.icon-action{display:inline-grid;width:30px;height:30px;place-items:center;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--muted);cursor:pointer}.icon-action+.icon-action{margin-left:4px}.icon-action.is-danger{color:var(--red)}.token-name,.token-id{display:block}.token-id,.table-note{color:var(--muted);font-size:11px}.badge{display:inline-block;border-radius:999px;background:var(--green-bg);padding:4px 7px;color:var(--green);font-size:10px}.producer-empty td{padding:20px;color:var(--muted);text-align:center}",
    ".token-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.token-form input,.edit-form input{min-width:0;border:1px solid var(--line);border-radius:8px;padding:9px;font-size:var(--prompt)}.reveal{margin-top:10px;border:1px solid #ded6ff;border-radius:8px;padding:10px}.reveal[hidden]{display:none}.reveal code{overflow-wrap:anywhere;font:12px ui-monospace,SFMono-Regular,monospace}.setup-wizard,.settings-dialog{width:min(600px,calc(100vw - 28px));max-height:min(760px,calc(100dvh - 36px));overflow:auto;border:1px solid var(--line);border-radius:15px;background:var(--card);padding:18px;color:var(--ink);box-shadow:0 22px 80px rgba(24,27,45,.18)}.setup-wizard::backdrop,.settings-dialog::backdrop{background:rgba(21,24,40,.43)}.wizard-top{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}.wizard-top h2{margin:5px 0;font-size:21px;letter-spacing:-.035em}.wizard-close{display:grid;width:31px;height:31px;place-items:center;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--muted);cursor:pointer}.wizard-step{margin-top:14px}.wizard-step>strong{font-size:var(--feature)}.wizard-options,.wizard-platforms{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}.wizard-platforms{grid-template-columns:repeat(3,minmax(0,1fr))}.wizard-options button,.wizard-platforms button{min-width:0;border:1px solid var(--line);border-radius:9px;background:var(--card);padding:9px;text-align:left;color:var(--ink);font-size:var(--prompt);cursor:pointer}.wizard-options button.selected,.wizard-platforms button.selected{border-color:#d8ceff;background:var(--violet-bg);color:var(--violet)}.wizard-command{margin:8px 0;overflow-x:auto;border:1px solid var(--line);border-radius:9px;background:#faf9ff;padding:10px}.wizard-command code{font:var(--prompt)/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre}.wizard-guide{color:var(--muted);font-size:var(--prompt);line-height:1.55}.wizard-number{display:inline-grid;width:20px;height:20px;margin-right:6px;place-items:center;border-radius:50%;background:var(--violet-bg);color:var(--violet);font-size:10px;font-weight:750}.dialog-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:12px}.danger-action{border-color:#f2ccd1;background:#fff3f4;color:var(--red)}",
    "@media(max-width:650px){.settings{grid-template-columns:minmax(0,1fr)}.settings-sidebar{min-height:0;gap:8px;padding:10px}.settings-sidebar nav{grid-template-columns:repeat(2,minmax(0,1fr))}.settings-sidebar footer{display:none}.settings-content{padding:14px 11px 28px}.masthead{flex-wrap:wrap}.token-heading{flex-wrap:wrap}.wizard-platforms{grid-template-columns:minmax(0,1fr)}.token-table{min-width:560px}}",
  ].join("");

  const script = [
    'const adapters=' + JSON.stringify(adapters)
      + ';const macosAdapters=' + JSON.stringify(macosAdapters)
      + ';let revealedToken=null;let selectedPlatform="linux";let selectedCodexProfile=".codex";',
    'const root=document.querySelector(".settings");const form=document.querySelector("#wizard-token-form");const csrf=form.elements.csrf.value;const requestHeaders={"Content-Type":"application/json","X-QuickStark-CSRF":csrf};async function copyValue(value,button){try{await navigator.clipboard.writeText(value);button.textContent="Copied"}catch{button.textContent="Copy failed"}}',
    'async function savePreferences(change){const preferences={size:root.dataset.preferenceSize,density:root.dataset.preferenceDensity,...change};const response=await fetch("/settings/preferences",{method:"POST",headers:requestHeaders,body:JSON.stringify(preferences)});if(!response.ok)return;const saved=await response.json();root.dataset.preferenceSize=saved.size;root.dataset.preferenceDensity=saved.density;document.documentElement.style.setProperty("--feature",saved.featurePx+"px");document.documentElement.style.setProperty("--prompt",saved.promptPx+"px");for(const button of document.querySelectorAll("button[data-preference-size]"))button.classList.toggle("selected",button.dataset.preferenceSize===saved.size);for(const button of document.querySelectorAll("button[data-preference-density]"))button.classList.toggle("selected",button.dataset.preferenceDensity===saved.density)}for(const button of document.querySelectorAll("button[data-preference-size]"))button.addEventListener("click",()=>savePreferences({size:button.dataset.preferenceSize}));for(const button of document.querySelectorAll("button[data-preference-density]"))button.addEventListener("click",()=>savePreferences({density:button.dataset.preferenceDensity}));',
    'const wizard=document.querySelector("#producer-setup-wizard");const command=document.querySelector("#wizard-command");const guide=document.querySelector("#wizard-guide");const schema=document.querySelector("#wizard-openapi");const os=document.querySelector("#wizard-os-step");const profileStep=document.querySelector("#wizard-profile-step");const reveal=document.querySelector("#wizard-token-reveal");function choosePlatform(id){const adapter=id==="macos"?macosAdapters[selectedCodexProfile]:adapters.find(item=>item.id===id);if(!adapter)return;selectedPlatform=id;command.textContent=adapter.command.replaceAll("PASTE_NEWLY_GENERATED_TOKEN",revealedToken||"PASTE_NEWLY_GENERATED_TOKEN");guide.textContent=adapter.detail+" "+adapter.after;schema.hidden=id!=="chatgpt";profileStep.hidden=id!=="macos";for(const button of document.querySelectorAll("[data-wizard-platform]"))button.classList.toggle("selected",button.dataset.wizardPlatform===id)}function chooseCodexProfile(id){if(!Object.hasOwn(macosAdapters,id))return;selectedCodexProfile=id;for(const button of document.querySelectorAll("[data-wizard-profile]"))button.classList.toggle("selected",button.dataset.wizardProfile===id);if(selectedPlatform==="macos")choosePlatform("macos")}function clearReveal(){revealedToken=null;reveal.replaceChildren();reveal.hidden=true;choosePlatform(selectedPlatform)}const launch=document.querySelector("#open-setup-wizard");if(launch)launch.addEventListener("click",()=>{selectedCodexProfile=".codex";clearReveal();wizard.showModal();chooseCodexProfile(".codex");choosePlatform("linux")});document.querySelector("#close-setup-wizard").addEventListener("click",()=>{clearReveal();wizard.close()});wizard.addEventListener("close",clearReveal);for(const option of document.querySelectorAll("[data-wizard-platform]"))option.addEventListener("click",()=>choosePlatform(option.dataset.wizardPlatform));for(const option of document.querySelectorAll("[data-wizard-profile]"))option.addEventListener("click",()=>chooseCodexProfile(option.dataset.wizardProfile));for(const option of document.querySelectorAll("[data-wizard-harness]"))option.addEventListener("click",()=>{for(const item of document.querySelectorAll("[data-wizard-harness]"))item.classList.toggle("selected",item===option);const chat=option.dataset.wizardHarness==="chatgpt";os.hidden=chat;choosePlatform(chat?"chatgpt":"linux")});document.querySelector("#copy-wizard-command").addEventListener("click",event=>copyValue(command.textContent,event.currentTarget));',
    'function actionButton(action,id){const button=document.createElement("button");button.type="button";button.className="icon-action"+(action==="delete"?" is-danger":"");button.dataset.producerAction=action;button.dataset.producer=id;button.setAttribute("aria-label",action.charAt(0).toUpperCase()+action.slice(1)+" token "+id);const template=document.querySelector("#icon-"+action);if(template)button.append(template.content.cloneNode(true));return button}function upsertRow(producer){const body=document.querySelector(".producer-list");body.querySelector(".producer-empty")?.remove();let row=body.querySelector("[data-producer-row="+CSS.escape(producer.producer||producer.id)+"]");if(!row){row=document.createElement("tr");row.dataset.producerRow=producer.producer||producer.id;for(let i=0;i<5;i++)row.append(document.createElement("td"));body.append(row)}const id=producer.producer||producer.id;row.cells[0].className="token-actions";row.cells[0].replaceChildren(...["view","edit","delete"].map(action=>actionButton(action,id)));const strong=document.createElement("strong");strong.className="token-name";strong.textContent=producer.label||id;const sub=document.createElement("span");sub.className="token-id";sub.textContent=id;row.cells[1].replaceChildren(strong,sub);row.cells[2].textContent=adapters.find(item=>item.id===producer.platform)?.title||"Not recorded";const badge=document.createElement("span");badge.className="badge";badge.textContent="Active";row.cells[3].replaceChildren(badge);row.cells[4].className="table-note";row.cells[4].textContent=producer.createdAt?producer.createdAt.slice(0,10):"Not recorded"}',
    'form.addEventListener("submit",async event=>{event.preventDefault();const payload={producer:form.elements.producer.value,label:form.elements.label.value,platform:selectedPlatform,...(selectedPlatform==="macos"?{codexProfile:selectedCodexProfile}:{})};const response=await fetch("/settings/tokens",{method:"POST",headers:requestHeaders,body:JSON.stringify(payload)});const result=await response.json();reveal.hidden=false;reveal.replaceChildren();if(!response.ok){reveal.textContent=result.error||"Token generation failed.";return}revealedToken=result.token;if(result.codexProfile)selectedCodexProfile=result.codexProfile;const explanation=document.createElement("p");explanation.textContent="Copy this token and its install command now. Neither can be viewed after you close this window.";const secret=document.createElement("code");secret.textContent=result.token;const copy=document.createElement("button");copy.type="button";copy.className="copy";copy.textContent="Copy token";copy.addEventListener("click",event=>copyValue(result.token,event.currentTarget));reveal.append(explanation,secret,copy);upsertRow(result);choosePlatform(result.platform)});',
    'const detail=document.querySelector("#producer-detail-dialog");const edit=document.querySelector("#producer-edit-dialog");const removal=document.querySelector("#producer-delete-dialog");let activeProducer=null;document.querySelector(".producer-list")?.addEventListener("click",async event=>{const button=event.target.closest("[data-producer-action]");if(!button)return;activeProducer=button.dataset.producer;const endpoint="/settings/tokens/"+encodeURIComponent(activeProducer);if(button.dataset.producerAction==="delete"){document.querySelector("#delete-producer-name").textContent=activeProducer;removal.showModal();return}const response=await fetch(endpoint);if(!response.ok)return;const producer=await response.json();if(button.dataset.producerAction==="view"){document.querySelector("#detail-producer-name").textContent=producer.label;document.querySelector("#detail-producer-id").textContent=producer.id;document.querySelector("#detail-producer-platform").textContent=adapters.find(item=>item.id===producer.platform)?.title||"Not recorded";document.querySelector("#detail-producer-fingerprint").textContent=producer.fingerprint?"SHA-256 · "+producer.fingerprint+"…":"Not recorded";document.querySelector("#detail-producer-created").textContent=producer.createdAt||"Not recorded";detail.showModal();return}document.querySelector("#producer-edit-label").value=producer.label;edit.showModal()});',
    'for(const button of document.querySelectorAll("[data-close-dialog]"))button.addEventListener("click",()=>button.closest("dialog").close());document.querySelector("#producer-edit-form").addEventListener("submit",async event=>{event.preventDefault();if(!activeProducer)return;const response=await fetch("/settings/tokens/"+encodeURIComponent(activeProducer),{method:"PATCH",headers:requestHeaders,body:JSON.stringify({label:document.querySelector("#producer-edit-label").value})});if(!response.ok)return;upsertRow(await response.json());edit.close()});document.querySelector("#confirm-delete-producer").addEventListener("click",async()=>{if(!activeProducer)return;const response=await fetch("/settings/tokens/"+encodeURIComponent(activeProducer),{method:"DELETE",headers:requestHeaders,body:"{}"});if(!response.ok)return;document.querySelector("[data-producer-row="+CSS.escape(activeProducer)+"]")?.remove();const body=document.querySelector(".producer-list");if(!body.rows.length){const row=body.insertRow();row.className="producer-empty";const cell=row.insertCell();cell.colSpan=5;cell.textContent="No producer tokens have been registered."}removal.close();activeProducer=null});',
  ].join(";");

  return "<!doctype html><html lang=\"en\"><head>"
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + "<title>QuickStark Dashboard Settings</title><style>" + style + "</style></head><body>"
    + '<main class="settings" data-preference-size="' + escape(selected.size)
    + '" data-preference-density="' + escape(selected.density)
    + '"><aside class="settings-sidebar" aria-label="Dashboard Settings">'
    + '<a class="settings-brand" href="/"><span class="settings-brand-mark">Q</span><span>QuickStark<small>Reports</small></span></a>'
    + '<span class="eyebrow">Dashboard settings</span><nav>'
    + '<a class="settings-nav-item" href="/settings"' + (tab === "profile" ? ' aria-current="page"' : "") + ">"
    + settingsIcon("profile") + "<span>Profile &amp; personal settings</span></a>"
    + (administrator
      ? '<a class="settings-nav-item" href="/settings?tab=producer-tokens"'
        + (tab === "producer-tokens" ? ' aria-current="page"' : "") + ">"
        + settingsIcon("token") + "<span>Producer tokens</span></a>"
      : "")
    + "</nav>"
    + '<footer>Authenticated as<br><strong>' + escape(user) + "</strong></footer></aside>"
    + '<section class="settings-content"><header class="masthead"><a class="brand" href="/">'
    + settingsIcon("back") + ' Back to reports</a><span class="private">Authenticated settings · '
    + escape(user) + "</span></header>"
    + '<section class="settings-tab-panel" id="profile-settings"' + (tab === "profile" ? "" : " hidden") + ">"
    + '<p class="eyebrow">Personal settings</p><h1>Profile &amp; personal settings</h1>'
    + '<p class="intro">Your appearance preferences apply to this dashboard and your Project Workbench. Immutable reports never change.</p>'
    + '<section class="grid"><article class="panel"><span class="eyebrow">Your preferences</span><h2>Appearance</h2>'
    + '<p class="caption">The approved B defaults preserve 13 px featured details and 12 px native prompt content.</p>'
    + '<div class="row"><strong>Text size</strong><div class="sizes">'
    + ["default", "comfortable", "large"].map((size) =>
      '<button class="' + (selected.size === size ? "selected" : "") + '" type="button" data-preference-size="'
      + escape(size) + '">' + escape(size.charAt(0).toUpperCase() + size.slice(1)) + "</button>").join("")
    + "</div></div>"
    + '<div class="row"><strong>Information density</strong><div class="sizes">'
    + ["balanced", "compact"].map((density) =>
      '<button class="' + (selected.density === density ? "selected" : "")
      + '" type="button" data-preference-density="' + escape(density) + '">'
      + escape(density.charAt(0).toUpperCase() + density.slice(1)) + "</button>").join("")
    + "</div></div></article>"
    + '<article class="panel"><span class="eyebrow">Signed-in account</span><h2>Profile</h2>'
    + '<div class="row"><strong>User</strong><span>' + escape(user) + "</span></div>"
    + '<div class="row"><strong>Authentication</strong><span>Protected dashboard session</span></div>'
    + "</article></section></section>"
    + '<section class="settings-tab-panel" id="producer-token-settings"'
    + (tab === "producer-tokens" ? "" : " hidden") + ">"
    + '<p class="eyebrow">Access management</p><div class="token-heading"><div><h1>Producer tokens</h1>'
    + '<p class="intro">Create one independently revocable token for each Codex or ChatGPT producer.</p></div>'
    + (administrator ? '<button class="action" id="open-setup-wizard" type="button">'
      + settingsIcon("plus") + "Create new token</button>" : "")
    + '</div><section class="token-table-wrap"><table class="token-table" aria-label="Producer tokens">'
    + "<thead><tr><th>Actions</th><th>Producer</th><th>Platform</th><th>Status</th><th>Created</th></tr></thead>"
    + '<tbody class="producer-list">' + producerItems + "</tbody></table></section></section></section>"
    + '<dialog class="setup-wizard" id="producer-setup-wizard" aria-labelledby="wizard-title">'
    + '<header class="wizard-top"><div><span class="eyebrow">New producer credential</span><h2 id="wizard-title">Create new token</h2></div>'
    + '<button class="wizard-close" id="close-setup-wizard" type="button" aria-label="Close token creation">'
    + settingsIcon("close") + "</button></header>"
    + '<section class="wizard-step"><strong><span class="wizard-number">1</span>Where will the skill run?</strong>'
    + '<div class="wizard-options"><button type="button" class="selected" data-wizard-harness="codex">Codex desktop or CLI</button>'
    + '<button type="button" data-wizard-harness="chatgpt">ChatGPT GPT Action</button></div></section>'
    + '<section class="wizard-step" id="wizard-os-step"><strong><span class="wizard-number">2</span>Choose the operating system</strong>'
    + '<div class="wizard-platforms"><button type="button" class="selected" data-wizard-platform="linux">Linux</button>'
    + '<button type="button" data-wizard-platform="macos">macOS</button>'
    + '<button type="button" data-wizard-platform="windows">Windows</button></div></section>'
    + '<section class="wizard-step" id="wizard-profile-step" hidden>'
    + '<strong>Choose the macOS Codex profile</strong><div class="wizard-options">'
    + '<button type="button" class="selected" data-wizard-profile=".codex">Default · ~/.codex</button>'
    + '<button type="button" data-wizard-profile=".codex-demo">Demo · ~/.codex-demo</button>'
    + '</div><p class="wizard-guide">Each Codex application receives its own private, independently revocable token.</p></section>'
    + '<section class="wizard-step"><strong><span class="wizard-number">3</span>Name and create your producer token</strong>'
    + '<p class="wizard-guide">This credential and its tailored installation command are shown only while this window remains open.</p>'
    + '<form class="token-form" id="wizard-token-form"><input type="hidden" name="csrf" value="' + escape(csrf) + '">'
    + '<input name="producer" aria-label="Wizard producer identity" placeholder="personal-linux-codex" required maxlength="96" pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,95}">'
    + '<input type="hidden" name="label" value="">'
    + '<button class="action" id="wizard-generate-token" type="submit">Generate token</button></form>'
    + '<section class="reveal" id="wizard-token-reveal" aria-live="polite" hidden></section></section>'
    + '<section class="wizard-step"><strong><span class="wizard-number">4</span>Copy this token’s install command</strong>'
    + '<p class="wizard-guide" id="wizard-guide"></p>'
    + '<a class="copy" id="wizard-openapi" href="/settings/chatgpt/openapi.json" hidden>Open ChatGPT OpenAPI schema</a>'
    + '<pre class="wizard-command"><code id="wizard-command"></code></pre>'
    + '<button class="copy" id="copy-wizard-command" type="button">Copy setup instructions</button>'
    + '<p class="wizard-guide">Restart Codex after installation. For ChatGPT, save the bearer token in the GPT Action authentication field, never in a conversation.</p></section>'
    + "</dialog>"
    + '<dialog class="settings-dialog" id="producer-detail-dialog" aria-labelledby="detail-title"><header class="wizard-top">'
    + '<h2 id="detail-title">Producer token details</h2><button class="wizard-close" type="button" data-close-dialog aria-label="Close token details">'
    + settingsIcon("close") + '</button></header><dl><dt>Name</dt><dd id="detail-producer-name"></dd>'
    + '<dt>Producer</dt><dd id="detail-producer-id"></dd><dt>Platform</dt><dd id="detail-producer-platform"></dd>'
    + '<dt>Fingerprint</dt><dd id="detail-producer-fingerprint"></dd><dt>Created</dt><dd id="detail-producer-created"></dd></dl>'
    + '<p class="caption">For your security, a token can be viewed only when it is created. Create a new token if its original credential was not saved.</p></dialog>'
    + '<dialog class="settings-dialog" id="producer-edit-dialog" aria-labelledby="edit-title"><header class="wizard-top">'
    + '<h2 id="edit-title">Edit producer name</h2><button class="wizard-close" type="button" data-close-dialog aria-label="Close token editor">'
    + settingsIcon("close") + '</button></header><form class="edit-form" id="producer-edit-form">'
    + '<label for="producer-edit-label">Display name</label><input id="producer-edit-label" required maxlength="96" pattern="[A-Za-z0-9][A-Za-z0-9 ._-]{0,95}">'
    + '<div class="dialog-actions"><button class="action" type="submit">Save changes</button></div></form></dialog>'
    + '<dialog class="settings-dialog" id="producer-delete-dialog" aria-labelledby="delete-title"><header class="wizard-top">'
    + '<h2 id="delete-title">Delete producer token</h2><button class="wizard-close" type="button" data-close-dialog aria-label="Close token deletion">'
    + settingsIcon("close") + '</button></header><p class="caption">Delete <strong id="delete-producer-name"></strong>? '
    + 'This immediately revokes its reporting access and cannot be undone.</p><div class="dialog-actions">'
    + '<button class="action" type="button" data-close-dialog>Cancel</button>'
    + '<button class="action danger-action" id="confirm-delete-producer" type="button">Delete token</button></div></dialog>'
    + ["view", "edit", "delete"].map((action) => '<template id="icon-' + action + '">' + settingsIcon(action) + "</template>").join("")
    + '</main><script nonce="' + escape(nonce) + '">' + script + "</script></body></html>";
}

function send(response, status, body, type, headers = {}) {
  response.writeHead(status, {
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(body);
}

function sendJson(response, status, payload) {
  send(response, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function signedCsrf(secret, user) {
  return createHmac("sha256", secret).update(user).digest("hex");
}

function validCsrf(secret, user, supplied) {
  if (typeof supplied !== "string" || !/^[a-f0-9]{64}$/i.test(supplied)) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(supplied, "hex"),
    Buffer.from(signedCsrf(secret, user), "hex"),
  );
}

function sameOrigin(request) {
  const supplied = request.headers.origin;

  if (supplied === undefined) {
    return true;
  }

  if (typeof supplied !== "string" || supplied === "null") {
    return false;
  }

  try {
    const forwardedHost = request.headers["x-forwarded-host"];
    const forwardedProtocol = request.headers["x-forwarded-proto"];
    const host = typeof forwardedHost === "string" && forwardedHost
      ? forwardedHost
      : request.headers.host;
    const protocol = typeof forwardedProtocol === "string" && forwardedProtocol
      ? forwardedProtocol
      : "http";

    return new URL(supplied).origin === new URL(protocol + "://" + host).origin;
  } catch {
    return false;
  }
}

async function readBoundedJson(request) {
  const declared = request.headers["content-length"];

  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 4096)) {
    throw new Error("Dashboard request exceeds its safe maximum.");
  }

  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;

    if (size > 4096) {
      throw new Error("Dashboard request exceeds its safe maximum.");
    }

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Dashboard request requires valid JSON.");
  }
}

async function loadProducers(path) {
  const metadata = await lstat(path);

  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 64 * 1024) {
    throw new Error("Dashboard producer grants must be a bounded, regular file.");
  }

  const parsed = JSON.parse(await readFile(path, "utf8"));

  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.producers)) {
    throw new Error("Dashboard producer grants must use the supported format.");
  }

  return producerList(parsed.producers);
}

function headerIdentity(request) {
  const value = request.headers["remote-user"];

  return typeof value === "string" && safeIdentity.test(value) ? value : null;
}

function hasAdminAccess(request, user, adminUsers, adminGroups) {
  if (adminUsers.has(user)) return true;

  const groups = request.headers["remote-groups"];

  if (typeof groups !== "string") return false;

  return groups.split(",").map((group) => group.trim()).some((group) => adminGroups.has(group));
}

export async function startReadoutSettingsServer(options = {}) {
  const host = options.host ?? process.env.QS_READOUT_SETTINGS_HOST ?? "127.0.0.1";
  const port = options.port ?? Number(process.env.QS_READOUT_SETTINGS_PORT ?? 4175);
  const trustedProxy = options.trustedProxy ?? process.env.QS_READOUT_SETTINGS_TRUSTED_PROXY === "true";
  const configuredProxyAddresses = options.trustedProxyAddresses
    ?? process.env.QS_READOUT_SETTINGS_TRUSTED_PROXY_ADDRESSES?.split(",")
      .map((address) => address.trim()).filter(Boolean)
    ?? ["127.0.0.1", "::1"];
  const adminUsers = new Set(options.adminUsers
    ?? (process.env.QS_READOUT_SETTINGS_ADMIN_USERS ?? "").split(",").map((user) => user.trim()).filter(Boolean));
  const adminGroups = new Set(options.adminGroups
    ?? (process.env.QS_READOUT_SETTINGS_ADMIN_GROUPS ?? "").split(",").map((group) => group.trim()).filter(Boolean));
  const credentialsDirectory = resolve(
    options.credentialsDirectory ?? process.env.QS_READOUT_CREDENTIALS_DIRECTORY
    ?? DEFAULT_PRODUCER_CREDENTIAL_DIRECTORY,
  );
  const producersFile = resolve(
    options.producersFile ?? process.env.QS_READOUT_PRODUCERS_FILE
    ?? DEFAULT_PRODUCER_GRANTS_FILE,
  );
  const maxRequestsPerMinute = options.maxRequestsPerMinute
    ?? Number(process.env.QS_READOUT_SETTINGS_MAX_REQUESTS_PER_MINUTE ?? 30);

  if (typeof host !== "string" || !host || host === "0.0.0.0" || host === "::") {
    throw new Error("Bind Dashboard Settings to one specific trusted host, not every network interface.");
  }

  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new Error("Dashboard Settings requires a valid network port.");
  }

  if (trustedProxy !== true) {
    throw new Error("Privileged Dashboard Settings requires its explicitly trusted authentication proxy.");
  }

  if (
    !Array.isArray(configuredProxyAddresses)
    || configuredProxyAddresses.length === 0
    || configuredProxyAddresses.length > 8
    || configuredProxyAddresses.some((address) => typeof address !== "string" || isIP(address) === 0)
  ) {
    throw new Error("Privileged Dashboard Settings requires explicit, valid authentication-proxy IP addresses.");
  }

  const trustedProxyAddresses = new Set(configuredProxyAddresses.map((address) =>
    address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address));

  if (adminUsers.size === 0 && adminGroups.size === 0) {
    throw new Error("Privileged Dashboard Settings requires an explicit administrator or administrator group.");
  }

  if (
    !Number.isSafeInteger(maxRequestsPerMinute)
    || maxRequestsPerMinute < 1
    || maxRequestsPerMinute > 10_000
  ) {
    throw new Error("Privileged Dashboard Settings requires a bounded positive token-generation rate.");
  }

  for (const identity of [...adminUsers, ...adminGroups]) {
    if (!safeIdentity.test(identity)) {
      throw new Error("Dashboard administrator identities must be safe.");
    }
  }

  const csrfSecret = randomBytes(32);
  const preferenceSecret = await loadReadoutPreferenceSecret({
    secret: options.preferenceSecret,
    path: options.preferenceSecretFile ?? process.env.QS_READOUT_PREFERENCE_SECRET_FILE,
  }) ?? csrfSecret;
  const issuanceRates = new Map();
  let issuanceQueue = Promise.resolve();
  const server = createServer((request, response) => {
    (async () => {
      let requestUrl;
      let pathname;

      try {
        requestUrl = new URL(request.url ?? "/", "http://quickstark.invalid");
        pathname = requestUrl.pathname;
      } catch {
        sendJson(response, 400, { error: "invalid_request" });
        return;
      }

      if (pathname === "/__quickstark_settings_health" && request.method === "GET") {
        sendJson(response, 200, { service: "quickstark-readout-settings", version: 1 });
        return;
      }

      const producerRoute = pathname.match(/^\/settings\/tokens\/([^/]+)$/);

      if (
        pathname !== "/settings"
        && pathname !== "/settings/tokens"
        && pathname !== "/settings/preferences"
        && pathname !== "/settings/chatgpt/openapi.json"
        && !producerRoute
      ) {
        sendJson(response, 404, { error: "not_found" });
        return;
      }

      const remoteAddress = request.socket.remoteAddress?.startsWith("::ffff:")
        ? request.socket.remoteAddress.slice("::ffff:".length)
        : request.socket.remoteAddress;

      if (!trustedProxyAddresses.has(remoteAddress)) {
        sendJson(response, 403, { error: "untrusted_proxy" });
        return;
      }

      const user = headerIdentity(request);

      if (!user) {
        sendJson(response, 401, { error: "authentication_required" });
        return;
      }

      if (pathname === "/settings/chatgpt/openapi.json") {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "method_not_allowed" });
          return;
        }

        const schema = JSON.parse(await readFile(
          new URL("../docs/specs/quickstark-chatgpt-readout.openapi.json", import.meta.url),
          "utf8",
        ));

        sendJson(response, 200, schema);
        return;
      }

      if (pathname === "/settings") {
        if (request.method !== "GET" && request.method !== "HEAD") {
          sendJson(response, 405, { error: "method_not_allowed" });
          return;
        }

        const tab = requestUrl.searchParams.get("tab") ?? "profile";

        if (!["profile", "producer-tokens"].includes(tab)) {
          sendJson(response, 404, { error: "not_found" });
          return;
        }

        const administrator = hasAdminAccess(request, user, adminUsers, adminGroups);

        if (tab === "producer-tokens" && !administrator) {
          sendJson(response, 403, { error: "administrator_required" });
          return;
        }

        const nonce = randomBytes(18).toString("base64url");
        const html = renderReadoutSettings({
          user,
          csrf: signedCsrf(csrfSecret, user),
          nonce,
          producers: administrator ? await loadProducers(producersFile) : [],
          preferences: decodeReadoutPreferences(preferenceSecret, user, request.headers.cookie),
          tab,
          administrator,
        });
        const policy = "default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"
          + nonce + "'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'";

        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": Buffer.byteLength(html),
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Cross-Origin-Resource-Policy": "same-origin",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": policy,
        });
        response.end(request.method === "HEAD" ? undefined : html);
        return;
      }

      if (producerRoute) {
        let producer;

        try {
          producer = decodeURIComponent(producerRoute[1]);
        } catch {
          sendJson(response, 404, { error: "not_found" });
          return;
        }

        if (!safeProducer.test(producer)) {
          sendJson(response, 404, { error: "not_found" });
          return;
        }

        if (!hasAdminAccess(request, user, adminUsers, adminGroups)) {
          sendJson(response, 403, { error: "administrator_required" });
          return;
        }

        if (request.method === "GET") {
          const current = (await loadProducers(producersFile)).find((item) => item.id === producer);

          if (!current) {
            sendJson(response, 404, { error: "producer_not_found" });
            return;
          }

          sendJson(response, 200, current);
          return;
        }

        if (request.method !== "PATCH" && request.method !== "DELETE") {
          sendJson(response, 405, { error: "method_not_allowed" });
          return;
        }

        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: "cross_origin_denied" });
          return;
        }

        if (!validCsrf(csrfSecret, user, request.headers["x-quickstark-csrf"])) {
          sendJson(response, 403, { error: "invalid_csrf" });
          return;
        }

        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "")) {
          sendJson(response, 415, { error: "unsupported_content_type" });
          return;
        }

        let payload;

        try {
          payload = await readBoundedJson(request);
        } catch {
          sendJson(response, 400, { error: "invalid_request" });
          return;
        }

        if (
          !payload
          || typeof payload !== "object"
          || Array.isArray(payload)
          || (request.method === "PATCH"
            && (typeof payload.label !== "string" || !/^[a-z0-9][a-z0-9 ._-]{0,95}$/i.test(payload.label)))
        ) {
          sendJson(response, 422, { error: "invalid_producer_label" });
          return;
        }

        const action = request.method === "PATCH" ? "producer-updated" : "producer-revoked";
        const mutation = issuanceQueue.catch(() => {}).then(() => request.method === "PATCH"
          ? updateReadoutProducerToken({ producer, label: payload.label, producersFile })
          : revokeReadoutProducerToken({ producer, credentialsDirectory, producersFile }));

        issuanceQueue = mutation;

        try {
          const changed = await mutation;

          if (typeof options.audit === "function") {
            options.audit({ action, user, producer });
          }

          sendJson(response, 200, request.method === "PATCH"
            ? producerList([changed])[0]
            : changed);
        } catch (error) {
          const missing = /not registered/i.test(error.message);

          sendJson(response, missing ? 404 : 503, {
            error: missing ? "producer_not_found" : "producer_update_unavailable",
          });
        }

        return;
      }

      if (request.method !== "POST") {
        sendJson(response, 405, { error: "method_not_allowed" });
        return;
      }

      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: "cross_origin_denied" });
        return;
      }

      if (pathname === "/settings/preferences") {
        if (!validCsrf(csrfSecret, user, request.headers["x-quickstark-csrf"])) {
          sendJson(response, 403, { error: "invalid_csrf" });
          return;
        }

        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "")) {
          sendJson(response, 415, { error: "unsupported_content_type" });
          return;
        }

        let preferences;

        try {
          preferences = normalizeReadoutPreferences(await readBoundedJson(request));
        } catch {
          sendJson(response, 422, { error: "invalid_preferences" });
          return;
        }

        const cookie = "qs_readout_preferences=" + encodeReadoutPreferences(preferenceSecret, user, preferences)
          + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000";

        send(response, 200, JSON.stringify(preferences), "application/json; charset=utf-8", {
          "Set-Cookie": cookie,
        });
        return;
      }

      if (!hasAdminAccess(request, user, adminUsers, adminGroups)) {
        sendJson(response, 403, { error: "administrator_required" });
        return;
      }

      if (!validCsrf(csrfSecret, user, request.headers["x-quickstark-csrf"])) {
        sendJson(response, 403, { error: "invalid_csrf" });
        return;
      }

      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "")) {
        sendJson(response, 415, { error: "unsupported_content_type" });
        return;
      }

      let payload;

      try {
        payload = await readBoundedJson(request);
      } catch {
        sendJson(response, 400, { error: "invalid_request" });
        return;
      }

      if (!payload || typeof payload !== "object" || !safeProducer.test(payload.producer ?? "")) {
        sendJson(response, 422, { error: "invalid_producer" });
        return;
      }

      const label = payload.label === undefined || payload.label === ""
        ? payload.producer
        : payload.label;

      if (typeof label !== "string" || !/^[a-z0-9][a-z0-9 ._-]{0,95}$/i.test(label)) {
        sendJson(response, 422, { error: "invalid_producer_label" });
        return;
      }

      if (
        payload.platform !== undefined
        && !["linux", "macos", "windows", "chatgpt"].includes(payload.platform)
      ) {
        sendJson(response, 422, { error: "invalid_producer_platform" });
        return;
      }

      if (
        payload.codexProfile !== undefined
        && (payload.platform !== "macos" || !codexProfiles.has(payload.codexProfile))
      ) {
        sendJson(response, 422, { error: "invalid_codex_profile" });
        return;
      }

      const now = Date.now();
      const observedRate = issuanceRates.get(user);
      const rate = observedRate && observedRate.resetAt > now
        ? observedRate
        : { count: 0, resetAt: now + 60_000 };

      if (rate.count >= maxRequestsPerMinute) {
        send(response, 429, JSON.stringify({ error: "rate_limited" }), "application/json; charset=utf-8", {
          "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - now) / 1000))),
        });
        return;
      }

      rate.count += 1;
      issuanceRates.set(user, rate);

      const issuance = issuanceQueue.catch(() => {}).then(() => issueReadoutProducerToken({
        producer: payload.producer,
        label,
        ...(payload.platform === undefined ? {} : { platform: payload.platform }),
        credentialsDirectory,
        producersFile,
        reveal: true,
      }));
      issuanceQueue = issuance;

      try {
        const result = await issuance;

        if (typeof options.audit === "function") {
          options.audit({ action: "producer-created", user, producer: result.producer });
        }

        const codexProfile = payload.codexProfile ?? ".codex";
        const adapter = readoutPlatformSetup(result.token, { codexProfile })
          .find((item) => item.id === result.platform);

        sendJson(response, 201, {
          producer: result.producer,
          label: result.label,
          platform: result.platform,
          ...(result.platform === "macos" ? { codexProfile } : {}),
          createdAt: result.createdAt,
          authorizedProjects: result.authorizedProjects,
          tokenDisclosed: true,
          token: result.token,
          installation: {
            platform: adapter.id,
            ...(result.platform === "macos" ? { codexProfile } : {}),
            title: adapter.title,
            command: adapter.command,
            after: adapter.after,
          },
        });
      } catch (error) {
        const duplicate = /already registered|existing credential/i.test(error.message);

        sendJson(response, duplicate ? 409 : 503, {
          error: duplicate ? "producer_already_exists" : "token_generation_unavailable",
        });
      }
    })().catch(() => {
      if (!response.headersSent) {
        sendJson(response, 503, { error: "settings_unavailable" });
      } else {
        response.end();
      }
    });
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;

  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => {
      server.removeListener("error", fail);
      done();
    });
  });

  const address = server.address();

  return {
    server,
    host,
    port: address.port,
    url: "http://" + (host.includes(":") ? "[" + host + "]" : host) + ":" + address.port + "/",
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startReadoutSettingsServer().then((settings) => {
    console.log("QuickStark Dashboard Settings listening on " + settings.host + ":" + settings.port);
  }).catch((error) => {
    console.error("QuickStark Dashboard Settings: " + error.message);
    process.exitCode = 1;
  });
}
