#!/usr/bin/env node
import {
  parseSupportArgs,
  printSupportHelp,
  writeLlmSupportAdvisory,
} from './llm-support-service.mjs';

try {
  const options = parseSupportArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printSupportHelp());
    process.exit(0);
  }
  const result = await writeLlmSupportAdvisory(options);
  console.log(`Wrote LLM support advisory: ${result.outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
