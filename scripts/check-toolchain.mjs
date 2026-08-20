import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const expectedPnpm = pkg.packageManager?.match(/^pnpm@(.+)$/)?.[1];
const nodeMajor = Number(process.versions.node.split('.')[0]);
const userAgent = process.env.npm_config_user_agent ?? '';
const activePnpm = userAgent.match(/pnpm\/(\S+)/)?.[1];

if (nodeMajor !== 24) {
  throw new Error(
    `Expected Node 24.x; received ${process.versions.node}. Switch runtime before install.`,
  );
}
if (!expectedPnpm) {
  throw new Error('packageManager must pin one exact pnpm version.');
}
if (pkg.workspaces) {
  throw new Error(
    'This take-home is intentionally a single-package repository; nested workspace scripts are forbidden.',
  );
}
if (activePnpm && activePnpm !== expectedPnpm) {
  throw new Error(`Expected pnpm ${expectedPnpm}; active pnpm is ${activePnpm}.`);
}

console.log(
  `Toolchain gate: Node ${process.versions.node}; pnpm ${activePnpm ?? `${expectedPnpm} (expected)`}; PASS`,
);
