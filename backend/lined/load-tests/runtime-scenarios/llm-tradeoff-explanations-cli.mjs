#!/usr/bin/env node
import {
  parseTradeoffExplanationArgs,
  printTradeoffExplanationHelp,
  writeTradeoffExplanationWorkflow,
} from './llm-tradeoff-explanations.mjs';

try {
  const options = parseTradeoffExplanationArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printTradeoffExplanationHelp());
    process.exit(0);
  }
  const result = await writeTradeoffExplanationWorkflow(options);
  console.log(`Wrote LLM trade-off explanation outputs: ${result.outputs.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
