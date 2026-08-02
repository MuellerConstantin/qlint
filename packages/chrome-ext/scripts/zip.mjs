/**
 * Packs `dist/` into an upload-ready ZIP for the Chrome Web Store.
 *
 * The store expects `manifest.json` at the archive root, so the *contents* of
 * `dist/` are zipped, not the directory itself. The version in the filename is
 * read from the built manifest rather than from `package.json`, so the artifact
 * is always named after the version Chrome will actually see.
 */

import { createWriteStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import yazl from 'yazl';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(packageRoot, 'dist');

/** Collects every file below `dir`, depth first. */
async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
      continue;
    }

    files.push(path);
  }

  return files;
}

async function readManifestVersion() {
  const manifestPath = join(distDir, 'manifest.json');

  try {
    const raw = await readFile(manifestPath, 'utf8');
    return JSON.parse(raw).version;
  } catch (err) {
    throw new Error(`Cannot read ${manifestPath} — run the build first`, { cause: err });
  }
}

const version = await readManifestVersion();
const files = (await collectFiles(distDir)).sort();

if (files.length === 0) {
  throw new Error(`No files in ${distDir} — run the build first`);
}

const zip = new yazl.ZipFile();

for (const file of files) {
  zip.addFile(file, relative(distDir, file).replaceAll('\\', '/'));
}

zip.end();

const target = join(packageRoot, `qlint-chrome-ext-${version}.zip`);
await pipeline(zip.outputStream, createWriteStream(target));

console.log(`Packaged ${files.length} files into ${relative(packageRoot, target)}`);
