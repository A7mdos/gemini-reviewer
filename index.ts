import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool, generateCommitMessageTool } from "./tools";

const codeReviewAgent = async (prompt: string) => {
  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    system: SYSTEM_PROMPT,
    tools: {
      getFileChangesInDirectoryTool,
      generateCommitMessageTool,
    },
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
};

// Example usage of the code review agent
// await codeReviewAgent(
//   "Review the code changes in '../gemini-reviewer' directory, make your reviews and suggestions file by file"
// );

// Example usage with commit message generation
await codeReviewAgent(
  "Generate a commit message for the changes in '../gemini-reviewer' directory"
);

// Example usage with specific commit type and scope
// await codeReviewAgent(
//   "Generate a commit message for the changes in '../gemini-reviewer' directory with type 'feat' and scope 'tools'"
// );
