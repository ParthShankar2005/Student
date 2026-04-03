import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ROOT_DIST = path.join(ROOT, 'dist');
const STD_NAME_REGEX = /^Std\s+(\d+)$/i;

function discoverStdModules(rootDir) {
  const entries = readdirSync(rootDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const match = entry.name.match(STD_NAME_REGEX);
      if (!match) return null;

      const stdNumber = Number(match[1]);
      if (!Number.isInteger(stdNumber) || stdNumber <= 0) return null;

      return {
        name: entry.name,
        number: stdNumber,
        dir: path.join(rootDir, entry.name),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
}

function runBuild(moduleInfo) {
  console.log(`\n[build] ${moduleInfo.name}`);

  const packageJsonPath = path.join(moduleInfo.dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    console.warn(`[skip] Missing package.json in ${moduleInfo.name}`);
    return false;
  }

  const localViteBinary = path.join(
    moduleInfo.dir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'vite.cmd' : 'vite'
  );
  if (!existsSync(localViteBinary)) {
    console.error(`[fail] Missing local dependencies in ${moduleInfo.name}.`);
    console.error(`       Run "npm install" inside ${moduleInfo.name} and retry.`);
    return false;
  }

  const result = spawnSync('npm', ['run', 'build'], {
    cwd: moduleInfo.dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`[fail] Build failed for ${moduleInfo.name}`);
    return false;
  }

  return true;
}

function aggregateDist(moduleInfo) {
  const moduleDist = path.join(moduleInfo.dir, 'dist');
  if (!existsSync(moduleDist)) {
    console.warn(`[warn] No dist folder found for ${moduleInfo.name}`);
    return;
  }

  const targetDir = path.join(ROOT_DIST, moduleInfo.name);
  cpSync(moduleDist, targetDir, { recursive: true, force: true });
  console.log(`[copy] ${moduleInfo.name} -> dist/${moduleInfo.name}`);
}

function main() {
  const modules = discoverStdModules(ROOT);
  if (modules.length === 0) {
    console.error('No valid Std modules found (expected folders like "Std 1").');
    process.exit(1);
  }

  console.log('[info] Building project modules only (Std 1..n).');
  console.log('[info] Skipping Std 00 and non-standard folders by design.');

  rmSync(ROOT_DIST, { recursive: true, force: true });
  mkdirSync(ROOT_DIST, { recursive: true });

  const failed = [];
  for (const moduleInfo of modules) {
    const ok = runBuild(moduleInfo);
    if (!ok) {
      failed.push(moduleInfo.name);
      continue;
    }
    aggregateDist(moduleInfo);
  }

  if (failed.length > 0) {
    console.error(`\nBuild completed with failures: ${failed.join(', ')}`);
    process.exit(1);
  }

  console.log('\nBuild completed successfully.');
  console.log(`Output: ${ROOT_DIST}`);
}

main();
