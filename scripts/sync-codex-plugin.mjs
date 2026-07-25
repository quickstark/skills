import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { formatSkillForCodex } from "./codex-skill-format.mjs";
import { SKILLS } from "./qs-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(repositoryRoot, "codex", "plugins", "qs-skills");
const generatedRoot = join(pluginRoot, "skills");
const check = process.argv.includes("--check");

if (check) {
  await verify();
} else {
  await sync();
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function fileList(root, current = root) {
  const files = [];

  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await fileList(root, path)));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    } else {
      throw new Error(`Plugin skills must contain regular files, not symlinks: ${path}`);
    }
  }

  return files.sort();
}

async function sync() {
  if (generatedRoot !== join(pluginRoot, "skills")) {
    throw new Error("Refusing to modify an unexpected generated skills directory.");
  }

  await rm(generatedRoot, { recursive: true, force: true });
  await mkdir(generatedRoot, { recursive: true });

  for (const skill of SKILLS) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const destination = join(generatedRoot, skill.name);

    if (!(await exists(join(source, "SKILL.md")))) {
      throw new Error(`Cannot package a missing promoted skill: ${skill.name}`);
    }

    await cp(source, destination, {
      recursive: true,
      dereference: true,
      errorOnExist: true,
      force: false,
    });

    if (skill.userInvoked) {
      const skillPath = join(destination, "SKILL.md");
      const content = await readFile(skillPath, "utf8");
      await writeFile(skillPath, formatSkillForCodex(content, skill));
    }
  }

  console.log(`Packaged ${SKILLS.length} promoted QuickStark skills for Codex.`);
}

async function verify() {
  if (!(await exists(generatedRoot))) {
    throw new Error("Codex skill package is missing; run npm run sync:codex.");
  }

  const expectedNames = SKILLS.map((skill) => skill.name).sort();
  const packagedNames = (await readdir(generatedRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (JSON.stringify(packagedNames) !== JSON.stringify(expectedNames)) {
    throw new Error("Codex package does not contain exactly the promoted QuickStark skills.");
  }

  for (const skill of SKILLS) {
    const source = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const packaged = join(generatedRoot, skill.name);
    const sourceFiles = await fileList(source);
    const packagedFiles = await fileList(packaged);

    if (JSON.stringify(sourceFiles) !== JSON.stringify(packagedFiles)) {
      throw new Error(`Codex package has a stale file inventory for ${skill.name}.`);
    }

    for (const file of sourceFiles) {
      const [original, generated] = await Promise.all([
        readFile(join(source, file)),
        readFile(join(packaged, file)),
      ]);

      const expected =
        file === "SKILL.md"
          ? Buffer.from(formatSkillForCodex(original.toString("utf8"), skill))
          : original;

      if (!expected.equals(generated)) {
        throw new Error(`Codex package is out of date: ${skill.name}/${file}.`);
      }
    }
  }

  console.log(`Verified all ${SKILLS.length} packaged skills match their canonical sources.`);
}
