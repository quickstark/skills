#!/usr/bin/env node
// QS adaptation: installed private modules use an explicitly selected runtime.
import { spawnSync } from 'node:child_process';
import { selectedCli, runtimeEnvironment } from '../../../scripts/runtime.mjs';
try {
  const result=spawnSync(selectedCli(),['media-use','resolve',...process.argv.slice(2)],{stdio:'inherit',env:runtimeEnvironment()});
  process.exitCode=result.status ?? 1;
} catch(error) {console.error(error.message);process.exitCode=1;}
