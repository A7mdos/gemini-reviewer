import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

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

// Schema for the markdown file generation tool
const markdownFileSchema = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
  outputPath: z.string().min(1).describe("The path where the markdown file will be saved"),
  title: z.string().optional().describe("The title of the markdown file"),
  includeChanges: z.boolean().optional().describe("Whether to include file changes in the markdown"),
  includeCommitMessage: z.boolean().optional().describe("Whether to include a generated commit message"),
  includeReview: z.boolean().optional().describe("Whether to include an AI-generated code review"),
  reviewComments: z.string().optional().describe("Custom review comments to include in the markdown file"),
});

type MarkdownFileInput = z.infer<typeof markdownFileSchema>;

/**
 * Analyzes file changes and generates basic review comments
 * @param diffs - Array of file changes with diffs
 * @returns Generated review comments
 */
function generateBasicReview(diffs: { file: string; diff: string }[]): string {
  if (diffs.length === 0) {
    return "No changes to review.";
  }
  
  const fileCount = diffs.length;
  const fileTypes = new Set(diffs.map(d => d.file.split('.').pop()));
  
  let totalAdditions = 0;
  let totalDeletions = 0;
  
  diffs.forEach(({ diff }) => {
    const addedLines = diff.split('\n').filter(line => line.startsWith('+')).length - 1;
    const removedLines = diff.split('\n').filter(line => line.startsWith('-')).length - 1;
    totalAdditions += addedLines;
    totalDeletions += removedLines;
  });
  
  const fileAnalysis = diffs.map(({ file, diff }) => {
    const addedLines = diff.split('\n').filter(line => line.startsWith('+')).length - 1;
    const removedLines = diff.split('\n').filter(line => line.startsWith('-')).length - 1;
    const netChange = addedLines - removedLines;
    
    let complexity = "low";
    if (diff.length > 1000) complexity = "high";
    else if (diff.length > 300) complexity = "medium";
    
    return `### ${file}
- Lines added: ${addedLines}
- Lines removed: ${removedLines}
- Net change: ${netChange > 0 ? '+' + netChange : netChange}
- Complexity: ${complexity}
`;
  }).join('\n');
  
  return `## Summary

This review covers ${fileCount} file${fileCount !== 1 ? 's' : ''} across ${fileTypes.size} file type${fileTypes.size !== 1 ? 's' : ''}.
- Total additions: ${totalAdditions}
- Total deletions: ${totalDeletions}
- Net change: ${totalAdditions - totalDeletions > 0 ? '+' + (totalAdditions - totalDeletions) : (totalAdditions - totalDeletions)}

## File Analysis

${fileAnalysis}`;
}

/**
 * Generates a markdown file with code review results and optionally includes file changes and commit message
 * @param options - The options for generating the markdown file
 * @returns Object containing the path to the generated file and status message
 */
async function generateMarkdownFile({ 
  rootDir, 
  outputPath, 
  title = "Code Review Results", 
  includeChanges = true, 
  includeCommitMessage = true,
  includeReview = false,
  reviewComments = ""
}: MarkdownFileInput) {
  try {
    // Ensure the output directory exists
    // Handle relative paths by resolving them against the current working directory
    const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
    const outputDir = path.dirname(resolvedOutputPath);
    
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (dirError) {
      console.error(`Error creating directory ${outputDir}:`, dirError);
      return {
        status: "error",
        message: `Failed to create directory for ${resolvedOutputPath}. Please check if the path is valid and you have write permissions.`,
        timestamp: new Date().toISOString()
      };
    }
    
    // Get file changes
    const diffs = await getFileChangesInDirectory({ rootDir });
    
    // Check if there are any changes to process
    if (diffs.length === 0) {
      return {
        status: "warning",
        message: `No changes detected in ${rootDir}. Make sure you have uncommitted changes and the directory exists.`,
        timestamp: new Date().toISOString()
      };
    }
    
    // Generate commit message if requested
    let commitMessageSection = "";
    if (includeCommitMessage) {
      const { commitMessage, details } = await generateCommitMessage({ rootDir });
      commitMessageSection = `
## Commit Message

\`\`\`
${commitMessage}
\`\`\`

### Details

\`\`\`
${details}
\`\`\`
`;
    }
    
    // Generate changes section if requested
    let changesSection = "";
    if (includeChanges) {
      changesSection = `
## File Changes

${diffs.map(({ file, diff }) => {
        return `### ${file}

\`\`\`diff
${diff}
\`\`\`
`;
      }).join('\n')}
`;
    }
    
    // Generate review section if requested
    let reviewSection = "";
    if (includeReview) {
      // If no review comments are provided, generate basic review
      const reviewContent = reviewComments || generateBasicReview(diffs);
      reviewSection = `
## Code Review

${reviewContent}
`;
    }

    // Generate the markdown content
    const timestamp = new Date().toISOString();
    const markdown = `# ${title}

*Generated on: ${timestamp}*

${reviewSection}${commitMessageSection}${changesSection}`;
    
    // Write the markdown file
    await fs.writeFile(resolvedOutputPath, markdown, 'utf-8');
    
    return {
      filePath: outputPath,
      status: "success",
      message: `Markdown file successfully generated at ${outputPath}`,
      timestamp
    };
  } catch (error) {
    return {
      status: "error",
      message: `Failed to generate markdown file: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString()
    };
  }
}

export const generateMarkdownFileTool = tool({
  description: "Generates a markdown file with code review results and optionally includes file changes and commit message",
  inputSchema: markdownFileSchema,
  execute: generateMarkdownFile,
});
