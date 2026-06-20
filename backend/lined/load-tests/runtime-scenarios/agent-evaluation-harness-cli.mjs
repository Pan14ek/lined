#!/usr/bin/env node
import {
  parseHarnessArgs,
  printHarnessHelp,
  writeAgentEvaluationReport,
} from './agent-evaluation-harness.mjs';

try {
  const options = parseHarnessArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printHarnessHelp());
    process.exit(0);
  }
  const result = writeAgentEvaluationReport(options);
  console.log(`Wrote agent evaluation report: ${result.outputPath}`);
  process.exit(result.status === 'pass' ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
