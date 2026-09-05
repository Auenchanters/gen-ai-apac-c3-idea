import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const serverEntry = path.resolve('dist/server/index.js');
const clientEntry = path.resolve('dist/client/index.html');

await Promise.all([access(serverEntry), access(clientEntry)]);

const clientFiles = await readdir(path.resolve('dist/client'), { recursive: true });
assert.equal(
  clientFiles.some((file) => file.endsWith('.map')),
  false,
  'Production client output must not include source maps.'
);

const html = await readFile(clientEntry, 'utf8');
assert.match(html, /<div[^>]+id=["']root["']/u, 'Client entry must contain the React root.');
assert.doesNotMatch(html, /GEMINI_API_KEY/u, 'Client entry must not expose server secret names.');
