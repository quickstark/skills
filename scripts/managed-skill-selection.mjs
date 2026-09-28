import { resolve } from "node:path";

const TARGET_SURFACES = {
  codex: new Set(["codex-user", "codex-plugin"]),
  "claude-code": new Set(["claude-user", "claude-plugin"]),
  pi: new Set(["pi-user", "pi-settings", "pi-package"]),
};

// This is selection inference, never proof authorizing retirement. Retirement
// additionally requires a migration's pinned payload, path and lock evidence.
export function inferManagedSelection({ agent, inventory, machine, packages, resources, repositoryRoot }) {
  if (!TARGET_SURFACES[agent]) throw new Error(`Unsupported selection target: ${agent}.`);
  const installed = Array.isArray(inventory) ? inventory : inventory?.installed ?? inventory?.plugins;
  if (!Array.isArray(installed) || !Array.isArray(machine?.resources)) throw new Error("Selection requires observed manager and resource inventories.");
  const selectedPackages = [];
  const selectedResources = [];
  const conflicts = [];
  const knownPackages = new Map(packages.map((item) => [item.name, item]));
  const knownResources = new Map(resources.map((item) => [item.name, item]));
  for (const entry of installed) {
    if (!entry || entry.installed === false) continue;
    const name = entry.name ?? entry.pluginId?.split("@")[0];
    const marketplace = entry.marketplaceName ?? entry.marketplace?.name ?? (typeof entry.marketplace === "string" ? entry.marketplace : undefined);
    const claimedOwner = entry.pluginId?.endsWith("@quickstark") || marketplace === "quickstark";
    if (!claimedOwner) {
      if (knownPackages.has(name) && !marketplace && !entry.pluginId) conflicts.push(`${name}: package owner is unknown`);
      continue; // Independently managed packages are preserved by their manager.
    }
    const package_ = knownPackages.get(name);
    if (!package_ || entry.pluginId && entry.pluginId !== `${name}@quickstark` || marketplace && marketplace !== "quickstark") {
      conflicts.push(`${name ?? "unnamed"}: unknown or conflicting QuickStark identity`);
      continue;
    }
    if (selectedPackages.includes(name)) { conflicts.push(`${name}: duplicate manager entries`); continue; }
    if (entry.enabled === false) { conflicts.push(`${name}: disabled selection needs an explicit preservation decision`); continue; }
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry.version ?? "")) {
      conflicts.push(`${name}: installed version is unverified`); continue;
    }
    const path = typeof entry.source === "string" ? entry.source : entry.source?.path;
    const packageRoot = agent === "pi" ? package_.piPackageRoot : agent === "codex" ? package_.codexPackageRoot : package_.claudePackageRoot;
    if (typeof path !== "string" || resolve(path) !== resolve(repositoryRoot, packageRoot)
      || typeof entry.source === "object" && entry.source?.source !== "local") {
      conflicts.push(`${name}: package source does not match the maintained checkout`); continue;
    }
    selectedPackages.push(name);
  }
  for (const observed of machine.resources) {
    const resource = knownResources.get(observed.name);
    if (!resource || !resource.placement.targets.includes(agent)) continue;
    if (resource.type === "pi-package") {
      if (agent !== "pi" || observed.surface !== "pi-package") continue;
      if (observed.classification === "managed") selectedResources.push(resource.name);
      else conflicts.push(`${resource.name}: ${observed.reason ?? "Pi resource ownership is not verified"}`);
      continue;
    }
    if (observed.surface === "agent-skills") {
      // Codex and Pi read the shared canonical skills. Claude exposure requires
      // its exact canonical alias; a canonical file alone never opts Claude in.
      const exposed = agent !== "claude-code" || machine.resources.some((alias) => alias.surface === "claude-user"
        && alias.classification === "alias" && alias.canonicalIdentity === observed.identity);
      if (!exposed) continue;
      if (["managed", "outdated-managed"].includes(observed.classification)) selectedResources.push(resource.name);
      else conflicts.push(`${resource.name}: ${observed.reason ?? "canonical ownership is not verified"}`);
    } else if (TARGET_SURFACES[agent].has(observed.surface)) {
      const canonical = machine.resources.find((item) => item.identity === observed.canonicalIdentity);
      if (observed.classification !== "alias" || !canonical || !["managed", "outdated-managed"].includes(canonical.classification)) {
        conflicts.push(`${resource.name}: ${observed.reason ?? "noncanonical selected resource"}`);
      }
    }
  }
  return { packages: selectedPackages, resources: [...new Set(selectedResources)], conflicts: [...new Set(conflicts)] };
}
