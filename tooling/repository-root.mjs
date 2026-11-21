import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
