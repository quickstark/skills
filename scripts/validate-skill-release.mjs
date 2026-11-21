import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runCli } from '../tooling/release/validate-skill-release.mjs';
export * from '../tooling/release/validate-skill-release.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1]).catch(() => process.argv[1])).href) {
  await runCli();
}
