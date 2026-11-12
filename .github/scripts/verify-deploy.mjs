// After a deploy: the host serves the dataset bytes of this commit.
// Usage: node .github/scripts/verify-deploy.mjs <base url>
// Tries for up to 3 minutes (the deploy may take a moment to reach every location).
// Exit 0 when the served bytes equal site/data/v1/deadlines.json, else 1.
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const { fetch, AbortSignal } = globalThis;

const base = process.argv[2]?.replace(/\/$/, '');
if (!base) {
  console.log('usage: node .github/scripts/verify-deploy.mjs <base url>');
  process.exit(1);
}
const sha = (b) => createHash('sha256').update(b).digest('hex');
const want = sha(readFileSync('site/data/v1/deadlines.json'));
const url = `${base}/data/v1/deadlines.json?commit=${process.env.GITHUB_SHA ?? want.slice(0, 12)}`;

let last = 'no attempt';
for (let attempt = 1; attempt <= 18; attempt += 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const got = sha(Buffer.from(await res.arrayBuffer()));
    if (res.ok && got === want) {
      console.log(`verify-deploy: ${url} serves sha256 ${want} (attempt ${attempt})`);
      process.exit(0);
    }
    last = `HTTP ${res.status}, sha256 ${got}`;
  } catch (error) {
    last = String(error);
  }
  await sleep(10_000);
}
console.log(`verify-deploy: ${url} does not serve sha256 ${want}; last: ${last}`);
process.exit(1);
