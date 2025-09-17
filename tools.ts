import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";

const excludeFiles = ["dist", "bun.lock"];

// Configuration for commit message generation
const commitMessageConfig = {
  maxChangesForSummary: 5,
  defaultType: "chore",
  typeMapping: {
    feat: ["add", "implement", "create", "feature"],
    fix: ["fix", "resolve", "bug", "issue"],
    docs: ["document", "comment", "readme"],
    style: ["format", "style", "css"],
    refactor: ["refactor", "restructure", "reorganize"],
    test: ["test", "spec", "coverage"],
    chore: ["config", "setup", "dependency"]
  }
};

const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

const commitMessageSchema = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
  type: z.enum(["feat", "fix", "docs", "style", "refactor", "test", "chore"]).optional().describe("The type of change (optional)"),
  scope: z.string().optional().describe("The scope of the change (optional)"),
});

type CommitMessageInput = z.infer<typeof commitMessageSchema>;

async function generateCommitMessage({ rootDir, type, scope }: CommitMessageInput) {
  const git = simpleGit(rootDir);
  const diffSummary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];
  
  // Get detailed changes for analysis
  for (const file of diffSummary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  // Analyze changes to determine commit type if not provided
  let commitType = type || commitMessageConfig.defaultType;
  if (!type) {
    commitType = determineCommitType(diffs);
  }

  // Generate commit message
  const scopeText = scope ? `(${scope}): ` : ": ";
  const summary = generateChangeSummary(diffs);
  
  return {
    commitMessage: `${commitType}${scopeText}${summary}`,
    details: generateCommitDetails(diffs)
  };
}

function determineCommitType(diffs: { file: string; diff: string }[]): string {
  // Count occurrences of keywords in diffs
  const typeCounts: Record<string, number> = {
    feat: 0,
    fix: 0,
    docs: 0,
    style: 0,
    refactor: 0,
    test: 0,
    chore: 0
  };

  // Analyze diffs to determine the most likely commit type
  for (const { diff } of diffs) {
    const lowerDiff = diff.toLowerCase();
    
    for (const [type, keywords] of Object.entries(commitMessageConfig.typeMapping)) {
      for (const keyword of keywords) {
        if (lowerDiff.includes(keyword)) {
          if (type in typeCounts) {
            typeCounts[type]++;
          }
        }
      }
    }
  }

  // Find the type with the highest count
  let maxCount = 0;
  let maxType = commitMessageConfig.defaultType;
  
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }

  return maxType;
}

function generateChangeSummary(diffs: { file: string; diff: string }[]): string {
  if (diffs.length === 0) {
    return "No changes detected";
  }
  
  if (diffs.length === 1) {
    const file = diffs[0]?.file ?? 'unknown';
    return `Update ${file}`;
  }
  
  if (diffs.length <= commitMessageConfig.maxChangesForSummary) {
    const fileNames = diffs.map(d => d.file.split('/').pop()).join(', ');
    return `Update ${fileNames}`;
  }
  
  // For many changes, create a more general summary
  const fileTypes = new Set(diffs.map(d => d.file.split('.').pop()));
  const fileCount = diffs.length;
  
  if (fileTypes.size === 1) {
    return `Update ${fileCount} ${Array.from(fileTypes)[0]} files`;
  }
  
  return `Update ${fileCount} files across ${fileTypes.size} file types`;
}

function generateCommitDetails(diffs: { file: string; diff: string }[]): string {
  if (diffs.length === 0) {
    return "No changes detected";
  }
  
  return diffs.map(({ file, diff }) => {
    const addedLines = diff.split('\n').filter(line => line.startsWith('+')).length - 1;
    const removedLines = diff.split('\n').filter(line => line.startsWith('-')).length - 1;
    
    return `${file}: +${addedLines} -${removedLines}`;
  }).join('\n');
}

export const generateCommitMessageTool = tool({
  description: "Generates a commit message based on the changes in the given directory",
  inputSchema: commitMessageSchema,
  execute: generateCommitMessage,
});
