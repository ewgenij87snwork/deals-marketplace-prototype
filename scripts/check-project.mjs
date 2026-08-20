import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const thisFile = fileURLToPath(import.meta.url);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };

for (const banned of [
  '@nestjs/core',
  'express',
  'fastify',
  '@trpc/server',
  'graphql',
  'redux',
  'zustand',
  'firebase',
  'convex',
  'ioredis',
]) {
  if (allDependencies[banned]) throw new Error(`Unapproved layer/dependency: ${banned}`);
}

for (const file of [
  'src/app/page.tsx',
  'src/server/session/signed-session.ts',
  'src/domain/matching.ts',
  'prisma/schema.prisma',
  'README.md',
]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const ignored = fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split(/\r?\n/);
if (!ignored.includes('/shared')) throw new Error('shared/ must remain gitignored.');
if (fs.existsSync(path.join(root, 'prompts')))
  throw new Error('Execution prompts do not belong in the public repository.');

const prismaSchema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
const models = prismaSchema.match(/^model\s+\w+/gm) ?? [];
if (models.length !== 6) throw new Error(`Expected 6 lean Prisma models, found ${models.length}.`);
for (const speculative of ['AiSuggestionRun', 'DemoSession', 'SellerProfile', 'AssetStatus']) {
  if (prismaSchema.includes(speculative))
    throw new Error(`Speculative schema surface found: ${speculative}`);
}

const suspicious = [
  /-----BEGIN .*PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
];
const skip = new Set(['node_modules', '.next', '.git', 'src/generated', '.worktrees', 'shared']);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (fullPath === thisFile) continue;
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (fs.statSync(fullPath).size >= 1_000_000) continue;

    const text = fs.readFileSync(fullPath, 'utf8');
    if (text.includes('dangerouslySetInnerHTML'))
      throw new Error(`Unsafe rendering in ${fullPath}`);
    if (suspicious.some((pattern) => pattern.test(text)))
      throw new Error(`Possible secret in ${fullPath}`);
  }
}

walk(root);
console.log('Lean project checks: PASS');
