import { access, constants, cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const generatedFunctionsDir = path.join(projectRoot, '.netlify', 'v1', 'functions');
const outputFunctionsDir = path.join(projectRoot, 'netlify', 'functions');

async function directoryExists(dir) {
  try {
    await access(dir, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function syncFunctions() {
  const hasGeneratedFunctions = await directoryExists(generatedFunctionsDir);

  if (!hasGeneratedFunctions) {
    console.warn('[netlify] No generated functions found. Skipping function sync.');
    return;
  }

  await rm(outputFunctionsDir, { recursive: true, force: true });
  await mkdir(outputFunctionsDir, { recursive: true });

  await cp(generatedFunctionsDir, outputFunctionsDir, { recursive: true });

  console.info('[netlify] Copied generated functions to netlify/functions for deployment compatibility.');
}

syncFunctions().catch((error) => {
  console.error('[netlify] Failed to sync generated functions:', error);
  process.exitCode = 1;
});
