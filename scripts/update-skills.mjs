import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runCli } from '../tooling/install/update-skills.mjs';
export * from '../tooling/install/update-skills.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1]).catch(() => process.argv[1])).href) {
  await runCli();
}
