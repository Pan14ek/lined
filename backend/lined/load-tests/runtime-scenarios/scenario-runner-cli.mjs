#!/usr/bin/env node
import {
  ScenarioRunError,
  parseArgs,
  printHelp,
  runScenario,
} from './scenario-runner.mjs';

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printHelp());
    process.exit(0);
  }

  const result = runScenario(options);
  console.log(`Wrote collector summary: ${result.summaryPath}`);
  console.log(`Wrote summary manifest: ${result.manifestPath}`);
} catch (error) {
  if (error instanceof ScenarioRunError && error.result?.manifestPath) {
    console.error(error.message);
    console.error(`Wrote summary manifest: ${error.result.manifestPath}`);
    process.exit(1);
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
