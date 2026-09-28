// Shared metadata only. Importing a candidate catalog does not register or expose it.
export function defineOptionalCommand({ name, packageName, bucket = "engineering", displayName,
  shortDescription, prompt, outcome = shortDescription, mutationBoundary, position = 10,
  normal = ["qs-flow-handoff"], failure = ["qs-flow-handoff"], privateModules = [] }) {
  const route = (name, index, recovery) => Object.freeze({ name, order: index + 1, recovery });
  return Object.freeze({
    name, packageName, codexPlugin: packageName, collectionId: packageName,
    collection: "qs", distribution: "optional", bucket, displayName, shortDescription,
    prompt, outcome, mutationBoundary, sourcePath: `skills/${bucket}/${name}`,
    documentationPath: `docs/${bucket}/${name}.md`,
    lifecycle: Object.freeze({ group: bucket, position }),
    invocationPolicy: "explicit", disableModelInvocation: true, allowImplicitInvocation: false,
    effort: Object.freeze({ supported: Object.freeze(["quick", "standard", "deep"]), default: "standard" }),
    report: Object.freeze({ supported: Object.freeze(["brief", "full"]), default: "brief" }),
    resultContext: Object.freeze({ specProgress: true }),
    codexLiteral: `$${packageName}:${name}`, claudeLiteral: `/${name}`,
    privateModules: Object.freeze(privateModules),
    continuation: Object.freeze({
      normal: Object.freeze(normal.map((name, index) => route(name, index, false))),
      failure: Object.freeze(failure.map((name, index) => route(name, index, true))),
      approvedSkills: Object.freeze([...new Set([...normal, ...failure])]),
      maximumPrompts: 1, defaultPrompts: 0, preferredPromptIndex: 0,
      automaticPublicSkillHops: false,
      promptStates: Object.freeze(["complete", "continuation-required", "input-required", "failed"]),
    }),
  });
}
