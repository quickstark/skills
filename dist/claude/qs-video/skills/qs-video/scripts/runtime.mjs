import { existsSync, lstatSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export function selectedCli(env=process.env) {
  const cli=env.QS_VIDEO_CLI;
  if (!cli || !isAbsolute(cli) || !existsSync(cli) || !lstatSync(cli).isFile()) throw new Error('QS_VIDEO_CLI must name an existing absolute executable file; resolve its symlink and verify the project-compatible version first. No runtime is downloaded.');
  return cli;
}

export function requireLocalProvider(provider, env=process.env) {
  // This records a prerequisite check by the owning run, not authority to install.
  const verified=(env.QS_VIDEO_VERIFIED_LOCAL_PROVIDERS || '').split(',');
  if (!verified.includes(provider)) throw new Error(`Local ${provider} prerequisites have not been verified. Check the existing tool, complete cached model, runtime compatibility and selected operation before adding it to QS_VIDEO_VERIFIED_LOCAL_PROVIDERS. No setup or model download is authorized by this variable.`);
}

export function runtimeEnvironment(env=process.env) {
  return {...env,HYPERFRAMES_MEDIA_USE_SFX_DIR:fileURLToPath(new URL('../modules/media-use/audio/assets/sfx/',import.meta.url)),HYPERFRAMES_SKIP_SKILLS:'1',HYPERFRAMES_NO_TELEMETRY:'1',DO_NOT_TRACK:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'};
}
