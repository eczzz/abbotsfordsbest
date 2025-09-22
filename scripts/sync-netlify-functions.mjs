import { access, constants, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const candidateSources = [
  path.join(projectRoot, '.netlify', 'v1', 'functions'),
  path.join(projectRoot, '.netlify', 'functions'),
  path.join(projectRoot, '.netlify', 'functions-internal')
];
const outputFunctionsDir = path.join(projectRoot, 'netlify', 'functions');

async function pathExists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getFirstExistingDirectory(paths) {
  for (const dir of paths) {
    if (!(await pathExists(dir))) continue;

    const entries = await readdir(dir).catch(() => []);
    if (entries.length === 0) continue;

    return dir;
  }

  return null;
}

async function ensureNotEmpty(dir) {
  const contents = await readdir(dir);

  if (contents.length === 0) {
    throw new Error(`No server functions were copied into ${dir}.`);
  }

  const stats = await Promise.all(contents.map((entry) => stat(path.join(dir, entry))));
  const hasFunction = stats.some((entryStat) => entryStat.isDirectory() || entryStat.isFile());

  if (!hasFunction) {
    throw new Error(`The destination ${dir} does not contain any deployable functions.`);
  }
}

async function syncFunctions() {
  const sourceDir = await getFirstExistingDirectory(candidateSources);

  if (!sourceDir) {
    throw new Error(
      '[netlify] Unable to locate Astro\'s generated functions output. Ensure the Netlify adapter ran during the build.'
    );
  }

  await rm(outputFunctionsDir, { recursive: true, force: true });
  await mkdir(outputFunctionsDir, { recursive: true });

  await cp(sourceDir, outputFunctionsDir, { recursive: true });

  await ensureNotEmpty(outputFunctionsDir);

  console.info(`[netlify] Copied functions from ${path.relative(projectRoot, sourceDir)} to netlify/functions.`);
}

syncFunctions().catch((error) => {
  console.error('[netlify] Failed to sync generated functions:', error);
  process.exitCode = 1;
});
