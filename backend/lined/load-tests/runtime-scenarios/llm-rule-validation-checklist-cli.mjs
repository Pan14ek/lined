#!/usr/bin/env node
import {
  parseChecklistArgs,
  printChecklistHelp,
  writeRuleValidationChecklist,
} from './llm-rule-validation-checklist.mjs';

try {
  const options = parseChecklistArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printChecklistHelp());
    process.exit(0);
  }
  const result = writeRuleValidationChecklist(options);
  console.log(`Wrote LLM rule validation checklist: ${result.outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
