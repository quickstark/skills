import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { FRONTEND_INTERNAL_CAPABILITIES } from './frontend-skill-catalog.mjs';
const digest = value => createHash('sha256').update(value).digest('hex');
const hash = /^[a-f0-9]{64}$/, revision = /^[a-f0-9]{40}$/;
const text = value => typeof value === 'string' && value.trim();
const taste = 'https://github.com/Leonxlnx/taste-skill';
export const motionRepository = 'https://github.com/Motionsites-AI/claude-skill';
export const motionRevision = 'faa30d512e3973e58675c72101a7ef42ed37ae83';
export function validateFrontendDependencies(index, { root, checkFiles = true } = {}) {
  const errors = [], require = (ok, message) => { if (!ok) errors.push('frontend: ' + message); };
  const file = path => {
    if (!text(path) || isAbsolute(path) || path.split('/').includes('..')) throw new Error('unsafe path');
    const full = resolve(root, path);
    if (relative(root, full).startsWith('..')) throw new Error('unsafe path');
    const actual = realpathSync(full), base = realpathSync(root);
    if (!actual.startsWith(base + '/') || !statSync(actual).isFile()) throw new Error('unsafe/nonregular resource');
    return readFileSync(actual);
  };
  try {
    require(index?.schemaVersion === 2, 'schema version 2 required');
    require(!Object.hasOwn(index, 'repository'), 'ambiguous top-level repository');
    require(index.licensePath === 'THIRD_PARTY_NOTICES.md', 'notice path');
    const sources = index.sources;
    require(Array.isArray(sources) && sources.length === 8, 'eight separate source identities required');
    const ids = new Set();
    for (const source of sources ?? []) {
      require(text(source.legacyName) && !ids.has(source.legacyName), 'duplicate/missing source identity'); ids.add(source.legacyName);
      require([taste, motionRepository].includes(source.repository), 'explicit repository identity required');
      require(revision.test(source.reviewedRevision), 'immutable reviewed revision required');
      require(Array.isArray(source.privateReferences) && source.privateReferences.length && new Set(source.privateReferences).size === source.privateReferences.length && source.privateReferences.every(id => FRONTEND_INTERNAL_CAPABILITIES.some(entry => entry.id === id)), 'invalid source/private mapping');
      require(['candidate', 'adopted'].includes(source.state), 'explicit adoption state required');
      if (source.repository === taste) {
        require(revision.test(source.baselineRevision) && hash.test(source.sourceFileSha256) && text(source.sourcePath), 'Taste original identity/hash required');
        continue;
      }
      require(source.legacyName === 'motionsites-web-builder' && source.reviewedRevision === motionRevision, 'MotionSites pin/identity mismatch');
      require(source.adoptedRevision === (source.state === 'adopted' ? motionRevision : null), 'candidate is not an adopted source');
      require(Array.isArray(source.evidence) && source.evidence.length > 0, 'new evidence paths required');
      require(Array.isArray(source.files) && source.files.length === 4, 'only three used techniques and LICENSE required');
      const paths = new Set();
      for (const original of source.files ?? []) {
        require(text(original.path) && !paths.has(original.path) && hash.test(original.sha256), 'original file path/hash missing or duplicate'); paths.add(original.path);
        require(Array.isArray(original.sections) && original.sections.length && original.sections.every(text), 'source section required');
        require(Array.isArray(original.derivedPaths) && original.derivedPaths.length && original.derivedPaths.every(path => index.derivedFiles.some(entry => entry.path === path) || path === index.licensePath), 'section-to-derived mapping missing');
      }
      require(paths.has('LICENSE') && [...paths].filter(p => /references\/techniques\/(type-and-text-motion|scroll|video-and-media)\.md$/.test(p)).length === 3, 'source file coverage differs');
      for (const category of ['examples', 'media-collections', 'promotional-instructions']) require(source.dispositions?.[category] === 'excluded', 'explicit exclusion required: ' + category);
    }
    require((sources ?? []).filter(s => s.repository === taste).length === 7, 'seven Taste sources retained');
    const actual = index.derivedFiles ?? [], paths = actual.map(entry => entry.path);
    require(paths.length === FRONTEND_INTERNAL_CAPABILITIES.length && new Set(paths).size === paths.length && FRONTEND_INTERNAL_CAPABILITIES.every(entry => paths.includes('internal/' + entry.id + '.md')), 'derived closure coverage differs');
    for (const derived of actual) {
      require(hash.test(derived.sha256), 'derived digest required');
      if (checkFiles) require(digest(file(derived.path)) === derived.sha256, 'derived digest mismatch: ' + derived.path);
    }
    if (checkFiles) {
      require(readdirSync(resolve(root, 'internal')).sort().join() === paths.map(p => p.split('/').at(-1)).sort().join(), 'unindexed private resource');
      const notice = file(index.licensePath).toString();
      require(notice.includes('Copyright (c) 2026 Leonxlnx') && notice.includes('Copyright (c) 2026 MotionSites'), 'both MIT notices required');
    }
  } catch (error) { errors.push('frontend: ' + error.message); }
  return { valid: errors.length === 0, errors };
}
