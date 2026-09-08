import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const reportOnly = process.argv.includes('--report-only');
const jscpd = process.platform === 'win32' ? 'node_modules/.bin/jscpd.cmd' : 'node_modules/.bin/jscpd';

execFileSync(jscpd, ['--config', '.jscpd.json'], { stdio: 'inherit' });

if (reportOnly) process.exit(0);

const report = JSON.parse(readFileSync('build/reports/jscpd/jscpd-report.json', 'utf8'));
const baselineLine = readFileSync('quality/jscpd-baseline.properties', 'utf8')
  .split('\n')
  .find((line) => line.startsWith('duplicates='));
const baseline = Number.parseInt(baselineLine?.split('=')[1] ?? '', 10);
const current = report.duplicates.length;

if (!Number.isInteger(baseline)) {
  throw new Error('quality/jscpd-baseline.properties must define an integer duplicates value.');
}

if (current > baseline) {
  throw new Error(`jscpd baseline increased from ${baseline} to ${current}; inspect the report before merging.`);
}

console.log(`jscpd baseline check passed: ${current} duplicate groups (baseline ${baseline}).`);
