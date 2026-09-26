import { readFileSync } from 'node:fs';

export const controlFields = ['model', 'model_reasoning_effort', 'sandbox_mode', 'approval_policy', 'approvals_reviewer'];
export function assertControls(expected, actual) {
  if (Object.keys(expected).sort().join() !== [...controlFields].sort().join()) throw new Error('Frozen controls must contain exactly all five fields');
  const changed = controlFields.filter(k => typeof expected[k] !== 'string' || actual[k] !== expected[k]);
  if (changed.length) throw new Error('Selected controls changed: ' + changed.join(', '));
  return actual;
}
export function processIdentity(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() + ':' + raw.slice(raw.lastIndexOf(')') + 2).split(' ')[19];
  } catch { return null; }
}
export function signalExactProcess(record, signal, { identity = processIdentity, kill = process.kill } = {}) {
  if (!Number.isInteger(record?.pid) || record.pid <= 1 || !record.identity || identity(record.pid) !== record.identity) return false;
  kill(-record.pid, signal);
  return true;
}
export function captureSucceeded(result, interruptionSignal) {
  const t = result.telemetry;
  return !result.captureError && result.snapshotErrors.length === 0 && !interruptionSignal &&
    t?.exitCode === 0 && t.completedTurn && t.responsePresent && t.nativeStreamComplete &&
    !t.timedOut && !t.stopReason && t.protocolErrors.length === 0 &&
    t.processObservation?.complete && t.observedOwnedResidualProcesses.length === 0;
}
