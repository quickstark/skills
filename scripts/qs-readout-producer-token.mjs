import { createHash, randomBytes, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export const DEFAULT_PRODUCER_CREDENTIAL_DIRECTORY = "/docker/appdata/quickstark-readouts-credentials";
export const DEFAULT_PRODUCER_GRANTS_FILE = "/docker/appdata/quickstark-readouts-config/readout-producers.json";

const producerIdentifier = /^[a-z0-9][a-z0-9._-]{0,95}$/i;
const producerLabel = /^[a-z0-9][a-z0-9 ._-]{0,95}$/i;
const producerPlatforms = new Set(["linux", "macos", "windows", "chatgpt"]);

async function readProducerGrants(path) {
  const metadata = await lstat(path);

  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 64 * 1024) {
    throw new Error("Producer grants must be a bounded, regular configuration file.");
  }

  let grants;

  try {
    grants = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error("Producer grants must contain valid JSON.");
  }

  if (
    !grants
    || typeof grants !== "object"
    || Array.isArray(grants)
    || grants.version !== 1
    || !Array.isArray(grants.producers)
  ) {
    throw new Error("Producer grants must use the supported version and producer collection.");
  }

  const seen = new Set();

  for (const producer of grants.producers) {
    if (
      !producer
      || typeof producer !== "object"
      || Array.isArray(producer)
      || !producerIdentifier.test(producer.id)
      || !/^[a-f0-9]{64}$/i.test(producer.tokenSha256)
      || !Array.isArray(producer.projects)
      || producer.projects.length === 0
      || (producer.label !== undefined && !producerLabel.test(producer.label))
      || (producer.platform !== undefined && !producerPlatforms.has(producer.platform))
      || (producer.createdAt !== undefined
        && (typeof producer.createdAt !== "string" || Number.isNaN(Date.parse(producer.createdAt))))
      || seen.has(producer.id)
    ) {
      throw new Error("Existing producer grants must contain unique, safely hashed identities.");
    }

    seen.add(producer.id);
  }

  return grants;
}

async function acquireProducerGrantLock(grantsPath) {
  const lockPath = `${grantsPath}.lock`;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      await mkdir(lockPath, { mode: 0o700 });

      return async () => {
        await rmdir(lockPath);
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      let metadata;

      try {
        metadata = await lstat(lockPath);
      } catch (inspectionError) {
        if (inspectionError.code === "ENOENT") continue;
        throw inspectionError;
      }

      if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
        throw new Error("Producer grants require a safe interprocess lock directory.");
      }

      await delay(Math.min(5 + attempt, 25));
    }
  }

  throw new Error("Producer grants are busy; retry credential creation after the current update.");
}

export async function issueReadoutProducerToken({
  producer,
  label = producer,
  platform = /chatgpt/i.test(producer ?? "")
    ? "chatgpt"
    : /mac(?:os|book)?/i.test(producer ?? "")
      ? "macos"
      : /windows|win32/i.test(producer ?? "")
        ? "windows"
        : "linux",
  credentialsDirectory = DEFAULT_PRODUCER_CREDENTIAL_DIRECTORY,
  producersFile = DEFAULT_PRODUCER_GRANTS_FILE,
  reveal = false,
} = {}) {
  if (typeof producer !== "string" || !producerIdentifier.test(producer)) {
    throw new Error("A safe producer identifier is required.");
  }

  if (typeof label !== "string" || !producerLabel.test(label)) {
    throw new Error("A safe producer display name is required.");
  }

  if (!producerPlatforms.has(platform)) {
    throw new Error("Producer creation requires a supported Linux, macOS, Windows, or ChatGPT platform.");
  }

  if (typeof reveal !== "boolean") {
    throw new Error("Producer token disclosure requires an explicit boolean decision.");
  }

  const credentialDirectory = resolve(credentialsDirectory);
  const grantsPath = resolve(producersFile);
  const releaseGrantLock = await acquireProducerGrantLock(grantsPath);

  try {
    const grants = await readProducerGrants(grantsPath);

    if (grants.producers.some((item) => item.id === producer)) {
      throw new Error(`The producer ${producer} is already registered.`);
    }

    await mkdir(credentialDirectory, { recursive: true, mode: 0o700 });

    const directoryMetadata = await lstat(credentialDirectory);

    if (!directoryMetadata.isDirectory() || directoryMetadata.isSymbolicLink()) {
      throw new Error("The producer credential directory must be a real directory.");
    }

    const credentialPath = join(credentialDirectory, `${producer}.token`);
    const temporaryGrantsPath = join(
      dirname(grantsPath),
      `.readout-producers.${randomUUID()}.tmp`,
    );
    const credential = randomBytes(48).toString("base64url");
    const createdAt = new Date().toISOString();
    const nextGrants = {
      ...grants,
      producers: [
        ...grants.producers,
        {
          id: producer,
          label,
          platform,
          createdAt,
          tokenSha256: createHash("sha256").update(credential).digest("hex"),
          projects: ["*"],
        },
      ],
    };
    let createdCredential = false;
    let createdTemporaryGrants = false;

    try {
      await writeFile(credentialPath, `${credential}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      createdCredential = true;

      await writeFile(temporaryGrantsPath, `${JSON.stringify(nextGrants, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      createdTemporaryGrants = true;

      await rename(temporaryGrantsPath, grantsPath);
      createdTemporaryGrants = false;
    } catch (error) {
      await Promise.allSettled([
        ...(createdCredential ? [unlink(credentialPath)] : []),
        ...(createdTemporaryGrants ? [unlink(temporaryGrantsPath)] : []),
      ]);

      if (error.code === "EEXIST") {
        throw new Error(`The producer ${producer} is already registered or has an existing credential.`);
      }

      throw error;
    }

    return {
      producer,
      label,
      platform,
      createdAt,
      credentialPath,
      producersFile: grantsPath,
      authorizedProjects: ["*"],
      tokenDisclosed: reveal,
      ...(reveal ? { token: credential } : {}),
    };
  } finally {
    await releaseGrantLock();
  }
}

async function replaceProducerGrants(grantsPath, grants) {
  const temporaryGrantsPath = join(dirname(grantsPath), `.readout-producers.${randomUUID()}.tmp`);
  let temporaryCreated = false;

  try {
    await writeFile(temporaryGrantsPath, `${JSON.stringify(grants, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    temporaryCreated = true;
    await rename(temporaryGrantsPath, grantsPath);
    temporaryCreated = false;
  } finally {
    if (temporaryCreated) {
      await unlink(temporaryGrantsPath).catch(() => {});
    }
  }
}

export async function updateReadoutProducerToken({
  producer,
  label,
  producersFile = DEFAULT_PRODUCER_GRANTS_FILE,
} = {}) {
  if (typeof producer !== "string" || !producerIdentifier.test(producer)) {
    throw new Error("A safe producer identifier is required.");
  }

  if (typeof label !== "string" || !producerLabel.test(label)) {
    throw new Error("A safe producer display name is required.");
  }

  const grantsPath = resolve(producersFile);
  const releaseGrantLock = await acquireProducerGrantLock(grantsPath);

  try {
    const grants = await readProducerGrants(grantsPath);
    const original = grants.producers.find((item) => item.id === producer);

    if (!original) {
      throw new Error("The selected producer is not registered.");
    }

    const updated = { ...original, label };

    await replaceProducerGrants(grantsPath, {
      ...grants,
      producers: grants.producers.map((item) => item.id === producer ? updated : item),
    });

    return updated;
  } finally {
    await releaseGrantLock();
  }
}

export async function revokeReadoutProducerToken({
  producer,
  credentialsDirectory = DEFAULT_PRODUCER_CREDENTIAL_DIRECTORY,
  producersFile = DEFAULT_PRODUCER_GRANTS_FILE,
} = {}) {
  if (typeof producer !== "string" || !producerIdentifier.test(producer)) {
    throw new Error("A safe producer identifier is required.");
  }

  const grantsPath = resolve(producersFile);
  const credentialDirectory = resolve(credentialsDirectory);
  const releaseGrantLock = await acquireProducerGrantLock(grantsPath);

  try {
    const grants = await readProducerGrants(grantsPath);
    const original = grants.producers.find((item) => item.id === producer);

    if (!original) {
      throw new Error("The selected producer is not registered.");
    }

    const credentialPath = join(credentialDirectory, `${producer}.token`);

    await replaceProducerGrants(grantsPath, {
      ...grants,
      producers: grants.producers.filter((item) => item.id !== producer),
    });

    try {
      const directoryMetadata = await lstat(credentialDirectory);

      if (directoryMetadata.isDirectory() && !directoryMetadata.isSymbolicLink()) {
        const credentialMetadata = await lstat(credentialPath);

        if (credentialMetadata.isFile() && !credentialMetadata.isSymbolicLink()) {
          await unlink(credentialPath);
        }
      }
    } catch {
      // A missing or damaged private file can never restore a revoked server-side grant.
    }

    return { producer, revoked: true };
  } finally {
    await releaseGrantLock();
  }
}

async function main(arguments_) {
  if (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0])) {
    console.log(`Usage: node scripts/qs-readout-producer-token.mjs --producer <safe-machine-id> [--json]

Creates a private, independently revocable reporting credential and atomically
registers its SHA-256 digest without printing the bearer token.

Options:
  --producer <id>                Unique machine or submitter identity.
  --credentials-directory <dir>  Optional private token directory.
  --producers-file <file>        Optional server-side producer grant file.
  --json                         Print safe metadata; never prints the token.`);
    return;
  }

  const options = {};

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--json") {
      options.json = true;
      continue;
    }

    const name = {
      "--producer": "producer",
      "--credentials-directory": "credentialsDirectory",
      "--producers-file": "producersFile",
    }[argument];

    if (!name || !arguments_[index + 1] || arguments_[index + 1].startsWith("--")) {
      throw new Error("Use --producer with a safe producer identifier and optional private credential paths.");
    }

    options[name] = arguments_[index + 1];
    index += 1;
  }

  const result = await issueReadoutProducerToken(options);

  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`Registered reporting producer: ${result.producer}`);
    console.log(`Private credential: ${result.credentialPath}`);
    console.log("Authorization: all projects; bearer token was not displayed.");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Could not create reporting producer: ${error.message}`);
    process.exitCode = 1;
  });
}
