import { defineOptionalCommand } from "./optional-command-definition.mjs";

const definitions = [
  ["qs-design-frontend", "QS Design Frontend", "Build or revise a frontend within its existing constraints", "build or revise this selected frontend while preserving its authorized scope", ["brief", "design-direction", "redesign", "dimensional-style", "restrained-style", "implementation"]],
  ["qs-design-image-web", "QS Design Image Web", "Create web design images or reusable design prompts", "create the requested web design images or prompt-only output", ["brief", "design-direction", "prompt-construction", "web-images"]],
  ["qs-design-image-mobile", "QS Design Image Mobile", "Create platform-aware mobile images or design prompts", "create the requested mobile screen images or prompt-only output", ["brief", "prompt-construction", "mobile-images"]],
  ["qs-design-image-to-code", "QS Design Image to Code", "Implement a selected design reference as responsive code", "implement this authoritative design reference as responsive working code", ["brief", "prompt-construction", "design-direction", "implementation"]],
];

export const FRONTEND_PUBLIC_COMMANDS = Object.freeze(definitions.map(([name, displayName, shortDescription, prompt, privateModules], index) => defineOptionalCommand({
  name, displayName, shortDescription, prompt, privateModules, packageName: "qs-frontend", position: (index + 1) * 10,
  mutationBoundary: name.includes("image-") && !name.endsWith("to-code")
    ? "Requested images or prompt-only output; no product code or publication"
    : "Selected frontend implementation; audit-only is read-only; publication requires separate authority",
})));

export const FRONTEND_INTERNAL_CAPABILITIES = Object.freeze([...new Set(definitions.flatMap((entry) => entry[4]))].map((name) => Object.freeze({
  id: name, name, packageName: "qs-frontend", sourcePath: `skills/frontend/internal/${name}.md`,
  owners: Object.freeze(definitions.filter((entry) => entry[4].includes(name)).map((entry) => entry[0])),
})));
