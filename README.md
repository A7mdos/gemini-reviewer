# Gemini Code Reviewer

A tool that uses Google's Gemini model to review code changes and generate commit messages.

## Features

### Code Review
- Analyzes code changes in a specified directory
- Provides constructive feedback on code quality, style, and best practices
- Identifies potential bugs and suggests improvements

### Commit Message Generation
- Automatically generates conventional commit messages based on code changes
- Analyzes the type of changes to determine the appropriate commit type (feat, fix, docs, etc.)
- Supports custom commit types and scopes
- Follows the [Conventional Commits](https://www.conventionalcommits.org/) format

### Markdown File Generation
- Saves code review results and commit information to markdown files
- Customizable output with options for title and content sections
- Includes formatted file changes with syntax highlighting
- Generates timestamps and structured documentation

## Usage

### Code Review
```typescript
await codeReviewAgent(
  "Review the code changes in '../my-project' directory, make your reviews and suggestions file by file"
);
```

### Generate Commit Message
```typescript
await codeReviewAgent(
  "Generate a commit message for the changes in '../my-project' directory"
);
```

### Generate Commit Message with Specific Type and Scope
```typescript
await codeReviewAgent(
  "Generate a commit message for the changes in '../my-project' directory with type 'feat' and scope 'auth'"
);
```

### Generate Markdown File with Code Review Results
```typescript
await codeReviewAgent(
  "Generate a markdown file with code review results for '../my-project' directory and save it to './review.md'"
);
```

### Generate Markdown File with Custom Options
```typescript
await codeReviewAgent(
  "Generate a markdown file for '../my-project' directory with title 'Sprint Review' and save it to './sprint-review.md', include commit message but exclude file changes"
);

## Installation

```bash
# Install dependencies
npm install

# Run the application
npm start
```

## Configuration

### Commit Message Generation
You can customize the commit message generation by modifying the `commitMessageConfig` in `tools.ts`.

### Markdown File Generation
The markdown file generation tool supports the following options:

- `rootDir`: The directory containing the code changes to review
- `outputPath`: The path where the markdown file will be saved
- `title` (optional): Custom title for the markdown document
- `includeChanges` (optional): Whether to include file changes in the markdown (default: true)
- `includeCommitMessage` (optional): Whether to include a generated commit message (default: true)
- `includeReview` (optional): Whether to include an AI-generated code review section (default: false)
- `reviewComments` (optional): Custom review comments to include in the markdown file
