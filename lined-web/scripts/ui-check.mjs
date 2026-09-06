#!/usr/bin/env node
/**
 * UI architecture validation for the Lined public Design System / patterns
 * layers and their consumption from feature code.
 *
 * Kept intentionally as a small, dependency-free script (fs/path only)
 * rather than an AST-based tool — see lined-web/AGENTS.md, "UI Design
 * System workflow".
 *
 * Checks:
 *  1. Every public design-system/patterns component has a `*.stories.tsx`.
 *  2. Every public design-system/patterns component has a test file.
 *  3. No public component imports from `features/**` (domain-agnostic boundary).
 *  4. No new hard-coded hex/rgb colors in design-system/patterns source
 *     (semantic tokens only — Tailwind arbitrary color values are the smell).
 *  5. Feature code does not import `@/components/ui/*` or `@base-ui/react/*`
 *     directly, except through an explicit, commented `eslint-disable-next-line`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const PUBLIC_DIRS = [join(SRC, 'components/design-system'), join(SRC, 'components/patterns')];

const errors = [];

const walk = (dir, onFile) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
};

const listComponentDirs = (root) => {
  // A "component directory" is any dir directly containing an index.tsx.
  const dirs = [];
  walk(root, (file) => {
    if (file.endsWith('/index.tsx')) dirs.push(file.slice(0, -'/index.tsx'.length));
  });
  return dirs;
};

// 1 & 2: every public component has a story + a test.
for (const root of PUBLIC_DIRS) {
  for (const dir of listComponentDirs(root)) {
    const rel = relative(SRC, dir);
    const entries = readdirSync(dir);
    const hasStory = entries.some((f) => f.endsWith('.stories.tsx'));
    const hasTestDir = entries.includes('__tests__') && statSync(join(dir, '__tests__')).isDirectory();
    const hasTest = hasTestDir && readdirSync(join(dir, '__tests__')).some((f) => /\.test\.tsx?$/.test(f));

    if (!hasStory) errors.push(`[missing story] src/${rel} has no *.stories.tsx`);
    if (!hasTest) errors.push(`[missing test] src/${rel} has no __tests__/*.test.tsx`);
  }
}

// 3: public components must not import feature code.
const FEATURE_IMPORT_RE = /from\s+['"]@\/features\//;
for (const root of PUBLIC_DIRS) {
  walk(root, (file) => {
    if (!/\.(ts|tsx)$/.test(file)) return;
    const content = readFileSync(file, 'utf8');
    if (FEATURE_IMPORT_RE.test(content)) {
      errors.push(`[domain leak] ${relative(SRC, file)} imports from @/features/** — the public layer must stay domain-agnostic`);
    }
  });
}

// 4: no new hard-coded colors in design-system/patterns.
// Allows: Tailwind semantic tokens, `currentColor`, `transparent`, and CSS
// variables. Flags: literal hex codes and rgb()/rgba() function colors.
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR_RE = /\brgba?\(/;
for (const root of PUBLIC_DIRS) {
  walk(root, (file) => {
    if (!/\.tsx?$/.test(file) || file.includes('__tests__') || file.endsWith('.stories.tsx')) return;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (HEX_COLOR_RE.test(line) || RGB_COLOR_RE.test(line)) {
        errors.push(`[hard-coded color] ${relative(SRC, file)}:${i + 1} — use a semantic token instead`);
      }
    });
  });
}

// 5: feature code must not import internal ui/* or @base-ui/react directly,
// unless explicitly suppressed via a documented eslint-disable comment.
const FEATURES_DIR = join(SRC, 'features');
const RESTRICTED_IMPORT_RE = /from\s+['"](@\/components\/ui\/|@base-ui\/react)/;
walk(FEATURES_DIR, (file) => {
  if (!/\.tsx?$/.test(file)) return;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (RESTRICTED_IMPORT_RE.test(line)) {
      const prevLine = lines[i - 1] ?? '';
      if (!/eslint-disable-next-line no-restricted-imports/.test(prevLine)) {
        errors.push(
          `[restricted import] ${relative(SRC, file)}:${i + 1} imports an internal primitive without a ` +
            'documented eslint-disable exception',
        );
      }
    }
  });
});

if (errors.length > 0) {
  console.error(`ui:check found ${errors.length} problem(s):\n`);
  for (const err of errors) console.error(`  - ${err}`);
  console.error('\nSee lined-web/AGENTS.md, "UI Design System workflow", for the rules being enforced.');
  process.exit(1);
}

console.log(`ui:check passed — ${PUBLIC_DIRS.length} public directories, no violations found.`);
