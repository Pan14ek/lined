#!/usr/bin/env node
import {
  parseReportArgs,
  printReportHelp,
  writeExperimentResultsReport,
} from './experiment-results-report.mjs';

try {
  const options = parseReportArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printReportHelp());
    process.exit(0);
  }
  const result = writeExperimentResultsReport(options);
  console.log(`Wrote experiment results report: ${result.outputs.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
