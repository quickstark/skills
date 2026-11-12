import { spawnSync } from 'node:child_process';
for (const root of ['.', 'packages/qs-specialists', 'packages/qs-advanced', 'packages/qs-frontend', 'packages/qs-video', 'packages/qs-execution']) {
 const r = spawnSync('claude', ['plugin', 'validate', root, '--strict'], {encoding:'utf8'});
 process.stdout.write(r.stdout ?? ''); process.stderr.write(r.stderr ?? '');
 if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('CLAUDE_SIX_OK');
