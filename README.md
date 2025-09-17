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

## Installation

```bash
# Install dependencies
npm install

# Run the application
npm start
```

## Configuration

You can customize the commit message generation by modifying the `commitMessageConfig` in `tools.ts`.
