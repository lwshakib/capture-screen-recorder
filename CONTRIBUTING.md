# Contributing Guide

First off, thank you for taking the time to contribute to **Capture Screen Recorder**! We appreciate all contributions, from bug fixes and documentation upgrades to new features.

---

## 🛠️ Contribution Workflow

Follow these steps to set up your environment, synchronize changes, and submit code cleanly.

### 1. Fork the Repository
Head over to `https://github.com/lwshakib/capture-screen-recorder` and click the **Fork** button in the top right to create your own copy of the codebase.

### 2. Clone the Repository
Clone your fork locally:
```bash
git clone https://github.com/YOUR-USERNAME/capture-screen-recorder.git
cd capture-screen-recorder
```

### 3. Configure Upstream
To synchronize your fork with future changes from the official master repository, configure an **upstream remote branch**:
```bash
git remote add upstream https://github.com/lwshakib/capture-screen-recorder.git
```
You can verify your remotes at any time by running `git remote -v`.

### 4. Setup Development Environment
Install the monorepo dependencies cleanly using `pnpm`:
```bash
pnpm install
```

### 5. Create a Feature Branch
Always create a new branch from `main` to work on your specific feature or fix:
```bash
git checkout main
git checkout -b feature/your-awesome-feature
```

### 6. Streaming/Syncing with Upstream
Before making commits or launching pull requests, merge the latest upstream code into your current branch to avoid conflicts:
```bash
git checkout main
git fetch upstream
git merge upstream/main
git checkout feature/your-awesome-feature
git merge main
```

---

## ✅ CI Validation & Submission Standards

We enforce high-quality, strict validation pipelines in our CI. Your Pull Request **must** pass all verification steps successfully before it can be merged. 

Run these commands locally to verify your code:

1. **Format Code (Prettier):** Ensure all files conform to strict style standards.
   ```bash
   pnpm format
   ```
2. **Lint Code (ESLint):** Check for styling inconsistencies and strict typing guidelines.
   ```bash
   pnpm lint
   ```
3. **Verify Type-Safety (TypeScript):** Ensure there are zero compiler or unused variable errors.
   ```bash
   pnpm typecheck
   ```
4. **Compile Production Targets (Vite & Next.js):** Verify that all workspaces build cleanly.
   ```bash
   pnpm build
   ```

### 🚀 Submitting a Pull Request
1. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: implement an awesome capability"
   ```
2. Push to your branch on your fork:
   ```bash
   git push origin feature/your-awesome-feature
   ```
3. Navigate to `https://github.com/lwshakib/capture-screen-recorder` and click **Compare & pull request**!

We look forward to merging your pull requests! Thank you for helping build the future of Capture Screen Recorder. 🚀
