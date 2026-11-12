// Decides what release.yml does for the version in package.json:
//   not on npm, not tagged  -> stage    (npm stage publish; a maintainer approves it with 2FA)
//   on npm, not tagged      -> tag      (after approval: tag v<version>, move v<major>)
//   on npm, tagged          -> done     (nothing to do; every other merge lands here)
//   tagged, not on npm      -> conflict (fails; a person looks at it)
//   no package.json, 0.0.0  -> none     (nothing released yet)
// Usage: node .github/scripts/release-state.mjs [--npm yes|no] [--tagged yes|no]
// --npm and --tagged replace the lookups (tests and dry runs). Writes action, version and major
// to $GITHUB_OUTPUT when set. Exit 0 with a decision; 1 when npm or git cannot be read.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The release action for a version, given whether it is on npm and whether its tag exists. */
export function decide({ version, onNpm, tagged }) {
  if (!version || version === '0.0.0') return { action: 'none', why: 'no released version yet' };
  if (!onNpm && !tagged) return { action: 'stage', why: `${version} is not on npm and not tagged` };
  if (onNpm && !tagged) return { action: 'tag', why: `${version} is on npm and not tagged yet` };
  if (onNpm && tagged) return { action: 'done', why: `${version} is on npm and tagged` };
  return { action: 'conflict', why: `v${version} is tagged but ${version} is not on npm` };
}

const flag = (args, name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  if (value !== 'yes' && value !== 'no') throw new Error(`${name} needs yes or no`);
  return value === 'yes';
};

/** true, false, or null when npm gave neither the version nor a 404. */
function onNpm(name, version) {
  const r = spawnSync('npm', ['view', `${name}@${version}`, 'version', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.status === 0) return r.stdout.trim() !== '' && JSON.parse(r.stdout) === version;
  if (/E404|404 Not Found/.test(`${r.stdout}${r.stderr}`)) return false;
  return null;
}

/** true, false, or null when the remote cannot be read. */
function hasTag(tag) {
  const r = spawnSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], {
    encoding: 'utf8',
  });
  if (r.status !== 0) return null;
  return r.stdout.trim() !== '';
}

function main(args) {
  const pkg = existsSync('package.json') ? JSON.parse(readFileSync('package.json', 'utf8')) : {};
  const version = pkg.version ?? null;
  const npm = flag(args, '--npm') ?? (version ? onNpm(pkg.name, version) : false);
  const tagged = flag(args, '--tagged') ?? (version ? hasTag(`v${version}`) : false);
  if (npm === null || tagged === null) {
    console.log(
      `release-state: cannot read ${npm === null ? 'npm' : 'the remote tags'}; nothing done`,
    );
    return 1;
  }
  const { action, why } = decide({ version, onNpm: npm, tagged });
  const major = version ? version.split('.')[0] : '';
  console.log(`release-state: version ${version ?? 'none'}, on npm ${npm}, tagged ${tagged}`);
  console.log(`release-state: ${action} (${why})`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `action=${action}\nversion=${version ?? ''}\nmajor=${major}\n`,
    );
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
