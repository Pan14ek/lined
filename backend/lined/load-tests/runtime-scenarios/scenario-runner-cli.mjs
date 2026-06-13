#!/usr/bin/env node
import {
  ScenarioRunError,
  ScenarioSetRunError,
  parseArgs,
  printHelp,
  runScenario,
  runScenarioSet,
} from './scenario-runner.mjs';

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printHelp());
    process.exit(0);
  }

  if (options.scenarioSet) {
    const result = runScenarioSet(options);
    console.log(`Wrote scenario set index: ${result.indexPath}`);
    console.log(`Collector-ready scenarios: ${result.index.collector_ready_scenarios.length}`);
  } else {
    const result = runScenario(options);
    console.log(`Wrote collector summary: ${result.summaryPath}`);
    console.log(`Wrote summary manifest: ${result.manifestPath}`);
  }
} catch (error) {
  if (error instanceof ScenarioSetRunError && error.result?.indexPath) {
    console.error(error.message);
    console.error(`Wrote scenario set index: ${error.result.indexPath}`);
    process.exit(1);
  }
  if (error instanceof ScenarioRunError && error.result?.manifestPath) {
    console.error(error.message);
    console.error(`Wrote summary manifest: ${error.result.manifestPath}`);
    process.exit(1);
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
