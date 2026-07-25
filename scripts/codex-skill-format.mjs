/**
 * Claude uses a frontmatter flag for user-only skills. Codex rejects that flag
 * and reads the equivalent policy from agents/openai.yaml instead.
 */
export function formatSkillForCodex(content, skill) {
  let normalized = content;

  if (skill.userInvoked) {
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
