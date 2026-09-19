import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronRoot = join(root, 'node_modules', 'electron');
const packageJson = JSON.parse(readFileSync(join(electronRoot, 'package.json'), 'utf8'));
const executable = process.platform === 'win32' ? 'electron.exe' : process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron';
const executablePath = join(electronRoot, 'dist', executable);

if (!existsSync(executablePath)) {
  const archive = await downloadArtifact({
    version: packageJson.version,
    artifactName: 'electron',
    platform: process.platform,
    arch: process.arch,
  });
  mkdirSync(join(electronRoot, 'dist'), { recursive: true });
  await extract(archive, { dir: join(electronRoot, 'dist') });
}

if (!existsSync(executablePath)) {
  throw new Error(`Electron runtime was not installed at ${executablePath}`);
}

// Electron reads this file verbatim, so it must not contain a trailing newline.
writeFileSync(join(electronRoot, 'path.txt'), executable);
console.log(`Electron runtime ready: ${executablePath}`);
