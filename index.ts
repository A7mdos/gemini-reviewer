import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool, generateCommitMessageTool, generateMarkdownFileTool } from "./tools";

const codeReviewAgent = async (prompt: string) => {
  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    system: SYSTEM_PROMPT,
    tools: {
    getFileChangesInDirectoryTool,
    generateCommitMessageTool,
    generateMarkdownFileTool,
  },
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
};

// Example usage of the code review agent
// await codeReviewAgent(
//   "Review the code changes in '.' directory, make your reviews and suggestions file by file"
// );

// Example usage with markdown file generation including review
await codeReviewAgent(
  "Generate a markdown file with code review results for '.' directory and save it to 'review.md' with review comments"
);

// Example usage with specific commit type and scope
// await codeReviewAgent(
//   "Generate a commit message for the changes in '.' directory with type 'feat' and scope 'tools'"
// );

// Example usage for generating a markdown file with code review results
// await codeReviewAgent(
//   "Generate a markdown file with code review results for '../gemini-reviewer' directory and save it to './review.md'"
// );

// Example usage for generating a markdown file with custom options
// await codeReviewAgent(
//   "Generate a markdown file for '.' directory with title 'Sprint Review' and save it to './sprint-review.md', include commit message but exclude file changes"
// );

// Example usage for generating a markdown file with review comments
// await codeReviewAgent(
//   "Review the code changes in '.' directory and save the review to './code-review.md' with review comments"
// );

// Test change
