import { defineOptionalCommand } from "./optional-command-definition.mjs";

export const EXECUTION_PUBLIC_COMMANDS = Object.freeze([defineOptionalCommand({
  name: "qs-unlazy", packageName: "qs-execution", displayName: "QS Unlazy",
  shortDescription: "Complete substantial work against explicit acceptance gates",
  prompt: "complete this substantial scoped work using explicit acceptance gates and verified evidence",
  mutationBoundary: "Only the user's selected task; hooks and publication require their own authority",
  privateModules: ["unlazy"],
})]);

export const EXECUTION_INTERNAL_CAPABILITIES = Object.freeze([Object.freeze({
  id: "unlazy", name: "unlazy", owner: "qs-unlazy", packageName: "qs-execution",
  sourcePath: "skills/engineering/qs-unlazy/modules/unlazy/instructions.md",
  sourceRevision: "16671491f6679ad9378f52604d3bc2415b4120c7",
  runtime: { declaredNode: ">=16", tested: ["linux-x64/node16.20.2", "linux-x64/node24.21.0"] },
})]);
