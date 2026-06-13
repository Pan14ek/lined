#!/usr/bin/env node
import {
  parseReviewWorkflowArgs,
  printReviewWorkflowHelp,
  writeRuleReviewWorkflow,
} from './llm-rule-review-workflow.mjs';

try {
  const options = parseReviewWorkflowArgs(process.argv.slice(2));
  if (options.help) {
    console.log(printReviewWorkflowHelp());
    process.exit(0);
  }
  const result = writeRuleReviewWorkflow(options);
  console.log(`Wrote LLM rule review workflow outputs: ${result.outputs.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
