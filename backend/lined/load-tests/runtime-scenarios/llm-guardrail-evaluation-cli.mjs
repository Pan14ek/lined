#!/usr/bin/env node
import {
  parseGuardrailArgs,
  printGuardrailHelp,
  writeGuardrailEvaluation,
} from './llm-guardrail-evaluation.mjs';

try {
  const options = parseGuardrailArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printGuardrailHelp());
    process.exit(0);
  }
  const result = writeGuardrailEvaluation(options);
  console.log(`Wrote LLM guardrail evaluation: ${result.outputPath}`);
  process.exit(result.laneStatus === 'pass' ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
