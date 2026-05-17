# Capture Studio

<div align="center">
  <p><strong>A powerful, open-source ecosystem for recording, syncing, and managing high-quality screen captures.</strong></p>
</div>

## 🚀 Overview

Capture Studio is a complete monorepo ecosystem containing multiple clients connected to a central cloud architecture. Capture, record, and instantly sync your content seamlessly across devices.

### 📦 Ecosystem

This monorepo is powered by [Turborepo](https://turbo.build/) and contains the following applications and packages:

#### Applications
- `apps/web`: The central hub and dashboard built with Next.js 14 (App Router). Manage your cloud recordings, billing, and settings.
- `apps/desktop`: A high-performance Electron + React application for local system recording.
- `apps/chrome-extension`: A lightweight, robust Chrome extension for instantly capturing browser tabs and screen activity.

#### Packages
- `@workspace/ui`: A shared, highly customizable UI component library built with Tailwind CSS, Radix UI, and Framer Motion.
- `@workspace/eslint-config`: Shared ESLint configurations enforcing strict rules across the monorepo.
- `@workspace/typescript-config`: Shared `tsconfig.json` bases optimized for different environments (Next.js, React Library, Node).

## 🛠️ Tech Stack

- **Frameworks:** Next.js, React, Electron, Vite
- **Styling:** Tailwind CSS, Radix UI, Framer Motion
- **Database & Auth:** Prisma, PostgreSQL, Better Auth
- **Storage:** Cloudflare R2 (S3 Compatible)
- **Tooling:** pnpm, Turborepo, ESLint, Prettier, TypeScript

## 💻 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- PostgreSQL Database
- Cloudflare R2 (or AWS S3) bucket

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lwshakib/capture-screen-recorder.git
   cd capture-screen-recorder
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Duplicate `apps/web/.env.example` to `apps/web/.env` and fill in your database, auth, and cloud storage credentials.

4. **Initialize Database**
   ```bash
   cd apps/web
   pnpm prisma db push
   ```

5. **Run the Development Server**
   ```bash
   # From the root directory
   pnpm dev
   ```
   This will start all applications concurrently.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct, development workflow, and how to submit pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
