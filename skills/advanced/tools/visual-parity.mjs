import { createHash } from 'node:crypto';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const signature = (capture) => `${capture.state}:${capture.viewport.width}x${capture.viewport.height}`;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());
const comparator = Object.freeze({ id: 'rgba-byte-difference', version: 1 });
function require(condition, message) { if (!condition) throw new Error(message); }
function validateEnvironment(environment) {
  require(object(environment) && Object.keys(environment).sort().join(',') === 'assetsDigest,fontDigest,renderer,scale', 'Capture environment must declare renderer, scale, fonts and assets.');
  require(typeof environment.renderer === 'string' && environment.renderer.length > 0 && Number.isFinite(environment.scale) && environment.scale > 0, 'Invalid renderer or capture scale.');
  require(['fontDigest', 'assetsDigest'].every((field) => typeof environment[field] === 'string' && /^[a-f0-9]{64}$/.test(environment[field])), 'Fonts and assets require content digests.');
}
function validateCaptures(captures) {
  require(Array.isArray(captures) && captures.length > 0, 'Actual captures are required.');
  const identities = new Set();
  for (const capture of captures) {
    require(object(capture) && typeof capture.state === 'string' && capture.state.length > 0 && object(capture.viewport), 'Capture state and viewport required.');
    require(['width', 'height'].every((dimension) => Number.isSafeInteger(capture.viewport[dimension]) && capture.viewport[dimension] > 0), 'Invalid viewport dimensions.');
    require(capture.pixels instanceof Uint8Array && capture.pixels.length === capture.viewport.width * capture.viewport.height * 4, 'Capture requires complete RGBA bytes, without resizing or cropping.');
    const id = signature(capture); require(!identities.has(id), 'Duplicate state/viewport capture.'); identities.add(id);
  }
}

/** Returns an immutable measurement contract. The owner must keep the original
 * contract in a trusted location; this function cannot confer approval itself.
 * RGBA bytes must be decoded without transformations by the existing capture adapter.
 */
export function freezeParityContract({ baselineCaptures, environment, tolerance }) {
  require(Number.isFinite(tolerance) && tolerance >= 0 && tolerance <= 1, 'An approved finite tolerance between zero and one is required.');
  validateEnvironment(environment); validateCaptures(baselineCaptures);
  const baselines = baselineCaptures.map((capture) => Object.freeze({ id: signature(capture), byteLength: capture.pixels.length, sha256: hash(capture.pixels) })).sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({ schemaVersion: 1, comparator, metric: 'different-rgba-byte-fraction', tolerance, environment: Object.freeze({ ...environment }), baselines: Object.freeze(baselines) });
}

/** Measures every required state from actual bytes. No supplied residual or
 * self-reported visual match is accepted as measurement evidence.
 */
export function evaluateParity({ contract, baselineCaptures, currentCaptures, environment, tolerance = contract?.tolerance, comparison = comparator }) {
  try {
    require(contract?.schemaVersion === 1 && contract.metric === 'different-rgba-byte-fraction', 'Unsupported parity contract.');
    require(comparison.id === contract.comparator.id && comparison.version === contract.comparator.version && comparison.id === comparator.id && comparison.version === comparator.version, 'Comparison implementation/settings changed.');
    require(tolerance === contract.tolerance, 'Approved tolerance changed.');
    validateEnvironment(environment);
    require(stable(environment) === stable(contract.environment), 'Capture environment changed.');
    validateCaptures(baselineCaptures); validateCaptures(currentCaptures);
    const expected = contract.baselines.map((entry) => entry.id).sort();
    require(JSON.stringify(baselineCaptures.map(signature).sort()) === JSON.stringify(expected), 'Baseline state/viewport coverage changed.');
    require(JSON.stringify(currentCaptures.map(signature).sort()) === JSON.stringify(expected), 'Required state/viewport coverage missing or changed.');
    const baselineMap = new Map(baselineCaptures.map((capture) => [signature(capture), capture]));
    const currentMap = new Map(currentCaptures.map((capture) => [signature(capture), capture]));
    const measurements = contract.baselines.map((entry) => {
      const original = baselineMap.get(entry.id).pixels;
      const actual = currentMap.get(entry.id).pixels;
      require(hash(original) === entry.sha256 && original.length === entry.byteLength, 'Immutable baseline bytes changed.');
      let differentBytes = 0;
      for (let index = 0; index < original.length; index++) if (original[index] !== actual[index]) differentBytes++;
      return { id: entry.id, differentBytes, comparedBytes: original.length, residual: differentBytes / original.length };
    });
    return { status: measurements.every((measurement) => measurement.residual <= tolerance) ? 'complete' : 'continuation-required', metric: contract.metric, tolerance, measurements };
  } catch (error) {
    return { status: 'failed', reason: error.message };
  }
}
