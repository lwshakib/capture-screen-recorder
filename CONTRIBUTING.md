# Contributing to Capture Studio

First off, thank you for considering contributing to Capture Studio! It's people like you that make open-source software such a great community to learn, inspire, and create.

## 🛠️ Development Setup

1. **Fork & Clone**
   Fork the repository and clone it locally.
   ```bash
   git clone https://github.com/YOUR-USERNAME/capture-screen-recorder.git
   ```

2. **Install Dependencies**
   We strictly use `pnpm` for package management.
   ```bash
   pnpm install
   ```

3. **Run the Project**
   Use Turborepo to spin up the entire ecosystem simultaneously:
   ```bash
   pnpm dev
   ```

## ✅ Pull Request Process

Before submitting a Pull Request, you **must** ensure the entire monorepo builds cleanly. We maintain strict CI standards.

1. **Format Code:** 
   ```bash
   pnpm format
   ```
2. **Run Linter:** 
   ```bash
   pnpm lint
   ```
3. **Verify Types:** 
   ```bash
   pnpm typecheck
   ```
4. **Test Build:** 
   ```bash
   pnpm build
   ```

If any of these commands throw errors, please fix them before submitting your PR!

## 📜 Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior directly to the maintainers.
