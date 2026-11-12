import { PUBLIC_COMMANDS_BY_NAME, piPublicSkillLiteral } from './skill-collection-registry.mjs';

// A narrow qualification check for response-only mobile trials, not a response
// rewriter or a substitute for independent semantic/authority review.
export function mobileReportPolicy({ host = 'codex' } = {}) {
  const literal = {
    codex: command => command.codexLiteral,
    claude: command => command.claudeLiteral,
    pi: command => piPublicSkillLiteral(command.name),
  }[host];
  if (!literal) throw new Error(`Unsupported report host: ${host}`);
  const root = PUBLIC_COMMANDS_BY_NAME.get('qs-design-image-mobile');
  const routes = [...root.continuation.normal, ...root.continuation.failure];
  return { host, root: root.claudeLiteral, allowedContinuations: [...new Set(routes.map(route => literal(PUBLIC_COMMANDS_BY_NAME.get(route.name))))].sort(), maximumPrompts: root.continuation.maximumPrompts };
}

export function checkMobileReport(markdown, options) {
  const policy = mobileReportPolicy(options);
  const allowed = new Set(policy.allowedContinuations);
  const errors = [], reportedRoots = [], prompts = [];
  let fence = null, nextLabels = 0, nextValue = '';
  const routeLiteral = /\$[a-z][\w-]*:qs-[\w-]+|\/(?:skill:)?qs-[\w-]+/i;
  // Conservatively leave HTML/comment representations unqualified. Never strip
  // or repair literal fence bytes to make an ineligible command look eligible.
  if (markdown.includes('<!--')) errors.push('HTML comments are unqualified report markup');
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.marker[0] && marker[1].length >= fence.marker.length && !marker[2].trim()) {
        if (fence.prompt) prompts.push({ info: fence.info, text: fence.lines.join('\n').trim() });
        fence = null;
      } else fence.lines.push(line);
      continue;
    }
    if (marker) {
      fence = { marker: marker[1], info: marker[2].trim(), prompt: nextLabels > 0, lines: [] };
      continue;
    }
    const identity = line.match(/^(?:\*\*)?Skills used:(?:\*\*)?\s*(.*?)\s*$/);
    if (identity) reportedRoots.push(identity[1].replace(/^`([^`]+)`$/, '$1'));
    const next = line.match(/^(?:\*\*)?Next work prompt:(?:\*\*)?\s*(.*?)\s*$/);
    if (next) { nextLabels++; nextValue = next[1]; }
    if (/<\/?[a-z][^>]*>/i.test(line)) errors.push('Raw HTML report markup is unqualified');
    if (nextLabels && /^\s*>/.test(line)) errors.push('Quoted continuation markup is unqualified');
    if (nextLabels && routeLiteral.test(line)) errors.push('Continuation literals must be inside the sole text fence');
  }
  if (fence) errors.push('Unclosed report fence');
  if (reportedRoots.length !== 1 || reportedRoots[0] !== policy.root) errors.push('Owning mobile root is missing, duplicated or replaced');
  if (nextLabels !== 1) errors.push('Exactly one Next work prompt field is required');
  if (prompts.length > policy.maximumPrompts) errors.push('Too many continuation prompts');
  if (!prompts.length && !/^None(?:\s|$|[—-])/.test(nextValue)) errors.push('Continuation must be None or a fenced prompt');
  if (prompts.length && nextValue) errors.push('Continuation field conflicts with its fenced prompt');
  for (const prompt of prompts) {
    if (prompt.info !== 'text') errors.push('Continuation fence must use text');
    const first = prompt.text.split(/\s/)[0];
    if (!allowed.has(first)) errors.push(`Ineligible continuation literal: ${first || '(empty)'}`);
  }
  return { scope: 'mobile-report-identity-and-route-only', passed: errors.length === 0, reportedRoots, continuations: prompts.map(p => p.text.split(/\s/)[0]), errors };
}
