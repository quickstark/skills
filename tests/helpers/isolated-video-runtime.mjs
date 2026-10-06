// Current portable test instrumentation. Historical HyperFrames trial
// instrumentation remains untouched in fixtures/hyperframes-adoption/.
import os from 'node:os';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { appendFileSync, realpathSync, statSync } from 'node:fs';

const requested = process.env.HF_TEST_USER_DIRECTORY;
if (!requested || !path.isAbsolute(requested)) throw new Error('HF_TEST_USER_DIRECTORY must be an isolated temporary directory');
const dir = realpathSync(requested);
const relative = path.relative(realpathSync(os.tmpdir()), dir);
if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !statSync(dir).isDirectory()) {
  throw new Error('HF_TEST_USER_DIRECTORY must be an isolated temporary directory');
}
os.homedir = () => dir;
syncBuiltinESMExports();
globalThis.fetch = async (input) => {
  appendFileSync(process.env.HF_TEST_NETWORK_LOG, JSON.stringify({ url: String(input) }) + '\n');
  throw new Error('fixture transport disabled');
};
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = function (chunk, ...args) {
  const result = write(chunk, ...args);
  if (process.env.HF_TEST_STOP_BEFORE_PREVIEW === '1' && String(chunk).includes('Opening studio preview')) {
    write('\nFIXTURE_STOP_BEFORE_PREVIEW\n'); process.exit(73);
  }
  return result;
};
