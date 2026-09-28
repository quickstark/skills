import { defineOptionalCommand } from "./optional-command-definition.mjs";

export const VIDEO_MODULE_NAMES = Object.freeze([
  "hyperframes", "hyperframes-core", "hyperframes-animation", "hyperframes-keyframes",
  "hyperframes-creative", "hyperframes-audio", "hyperframes-cli", "hyperframes-registry", "media-use",
  "remotion-to-hyperframes", "slideshow", "embedded-captions", "talking-head-recut",
  "music-to-video", "motion-graphics", "pr-to-video", "product-launch-video",
  "faceless-explainer", "general-video", "figma", "hyperframes-studio",
]);
export const VIDEO_PUBLIC_COMMANDS = Object.freeze([defineOptionalCommand({
  name: "qs-video", packageName: "qs-video", bucket: "video", displayName: "QS Video",
  shortDescription: "Create, edit, inspect, or render a selected video",
  prompt: "create, edit, inspect, or render this selected video within the authorized scope",
  mutationBoundary: "Selected video task; preserve project pins and provider/publication authority",
  privateModules: VIDEO_MODULE_NAMES,
})]);
export const VIDEO_INTERNAL_CAPABILITIES = Object.freeze(VIDEO_MODULE_NAMES.map((name) => Object.freeze({
  id: name, name, owner: "qs-video", packageName: "qs-video",
  sourcePath: `skills/video/qs-video/modules/${name}/instructions.md`,
  sourceRevision: "2734ee2c02ef858f3c877c18b56ebcfbb846cb4c",
})));
