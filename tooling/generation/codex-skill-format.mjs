/**
 * Claude uses a frontmatter flag for user-only skills. Codex rejects that flag
 * and reads the equivalent policy from agents/openai.yaml instead.
 */
export function formatSkillForCodex(content, skill) {
  let normalized = content;

  if (skill.userInvoked || skill.disableModelInvocation) {
    normalized = normalized.replace(
      /^disable-model-invocation:\s*true\s*\r?\n/m,
      "",
    );

    if (normalized === content) {
      throw new Error(
        `Explicitly invoked skill ${skill.name} is missing its Claude invocation flag.`,
      );
    }
  }

  return normalized.replace(/^argument-hint:\s*[^\r\n]*\r?\n/gm, "");
}

/**
 * Current Codex clients hide skills carrying this explicit-invocation policy
 * from the model-visible catalog, including when the user invokes them by name.
 * Canonical, Claude, and Pi metadata retain the policy; only Codex projections
 * omit the single-field policy block for compatibility.
 */
export function formatMetadataForCodex(content, skill) {
  if (!(skill.userInvoked || skill.disableModelInvocation)) return content;

  const normalized = content.replace(
    /^policy:[ \t]*\r?\n[ \t]+allow_implicit_invocation:[ \t]*false[ \t]*(?:\r?\n(?![ \t]+\S)|$)/m,
    "",
  );

  if (normalized === content) {
    throw new Error(
      `Explicitly invoked skill ${skill.name} is missing its canonical invocation policy.`,
    );
  }

  return normalized;
}
