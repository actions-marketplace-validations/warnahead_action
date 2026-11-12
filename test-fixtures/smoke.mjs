// npm run smoke: checks the published bundle over the synthetic repos in test-fixtures/.
// Runs on ubuntu, macOS and Windows with Node 22 and 24 (smoke.yml). No network: --offline.
// Expectations are in test-fixtures/expected.json; they name findings, not whole reports, so a
// data update does not need new expectations. Exit 0 when every check passes, else 1.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let passed = 0;
const check = (ok, what) => {
  if (ok) passed += 1;
  else failures.push(what);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
};
const read = (path) => readFileSync(join(root, path));
const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const cli = join(root, 'dist', 'cli.mjs');
const released = existsSync(cli);
// before the first release the repository has no package.json, action.yml or bundle
const pkg = existsSync(join(root, 'package.json'))
  ? JSON.parse(read('package.json').toString('utf8'))
  : null;
if (released || pkg !== null) {
  check(pkg?.name === 'warnahead', 'package.json name is warnahead');
  check(pkg?.bin?.warnahead === 'dist/cli.mjs', 'package.json bin points to dist/cli.mjs');
  const yml = existsSync(join(root, 'action.yml')) ? read('action.yml').toString('utf8') : '';
  check(/^\s+using: node24$/m.test(yml), 'action.yml runs on node24');
}
const distFiles = existsSync(join(root, 'dist'))
  ? readdirSync(join(root, 'dist'), { recursive: true }).map(String)
  : [];
check(!distFiles.some((p) => p.endsWith('.map')), 'no source maps in dist/');

// the dataset, when this ref has one: parses, has entries, the site copy is byte-identical
let asOf = null;
if (existsSync(join(root, 'dist/data/deadlines.json'))) {
  const raw = read('dist/data/deadlines.json');
  const data = JSON.parse(raw.toString('utf8'));
  check(Array.isArray(data.entries) && data.entries.length > 0, 'dataset has entries');
  asOf = String(data.generated ?? '').slice(0, 10);
  check(/^\d{4}-\d{2}-\d{2}$/.test(asOf), `dataset generated date ${asOf}`);
  if (existsSync(join(root, 'site/data/v1/deadlines.json'))) {
    check(
      read('site/data/v1/deadlines.json').equals(raw),
      'site data is byte-identical to dist/data',
    );
  }
}

const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', timeout: 60_000 });

if (!released) {
  console.log('smoke: no CLI bundle on this ref; bundle checks start with the first release');
} else {
  const v = run(['--version']);
  check(v.status === 0 && v.stdout.trim() === pkg?.version, `--version prints ${pkg?.version}`);
  const list = run(['deadlines', '--json']);
  const parsed = parseJson(list.stdout);
  const count = (Array.isArray(parsed) ? parsed : (parsed?.entries ?? [])).length;
  check(list.status === 0 && count > 0, `deadlines --json lists ${count} entries`);
  check(run(['--no-such-option']).status === 2, 'an unknown option exits 2');

  const { fixtures } = JSON.parse(read('test-fixtures/expected.json').toString('utf8'));
  for (const f of fixtures) {
    const args = ['--offline', '--format', 'json', '--fail-within', String(f.failWithin)];
    if (asOf) args.push('--as-of', asOf);
    const r = run([...args, join('test-fixtures', f.dir)]);
    check(r.status === f.exit, `${f.dir}: exit ${r.status}, expected ${f.exit}`);
    const report = parseJson(r.stdout);
    if (report === null) {
      check(false, `${f.dir}: output is JSON (${r.stderr.trim().slice(0, 200)})`);
      continue;
    }
    check(report.schema === 'warnahead.findings/1', `${f.dir}: schema warnahead.findings/1`);
    check(
      report.apps.length === f.apps,
      `${f.dir}: ${report.apps.length} apps, expected ${f.apps}`,
    );
    check(report.notUnderstood.length === 0, `${f.dir}: no files left not understood`);
    const all = report.apps.flatMap((a) => a.findings);
    for (const want of f.findings) {
      const got = all.find((x) => x.entry === want.entry);
      const ev = got?.evidence?.find((e) => e.file === want.evidence.file);
      check(
        got !== undefined &&
          got.result === want.result &&
          got.group === want.group &&
          got.confidence === want.confidence &&
          ev?.line === want.evidence.line,
        `${f.dir}: ${want.entry} ${want.result}/${want.group}/${want.confidence} at ${want.evidence.file}:${want.evidence.line}`,
      );
    }
    if (f.findings.length === 0) {
      check(
        all.every((x) => x.group !== 'due'),
        `${f.dir}: nothing due`,
      );
    }
  }
}

console.log(
  failures.length === 0
    ? `smoke: PASS ${passed} checks`
    : `smoke: FAIL ${failures.length} of ${passed + failures.length}: ${failures[0]}`,
);
process.exit(failures.length === 0 ? 0 : 1);
