# ddu-campus-guide

Dire Dawa University (DDU) campus navigation and service information system.

## Overview

A modern web application designed to help students, staff, and visitors navigate the Dire Dawa University campus, discover buildings, facilities, rooms, and access campus services.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 and shadcn/ui
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **Maps**: Leaflet with OpenStreetMap tiles
- **Testing**: Vitest
- **Tooling**: ESLint, Prettier, and pnpm

## Getting Started

### Prerequisites

- Node.js (v20 or newer recommended)
- pnpm (v10 or newer)

### Installation

1. Clone the repository and navigate into the root directory:

```bash
git clone <repository-url>
cd ddu_guide
```

2. Install dependencies using pnpm:

```bash
pnpm install
```

3. Configure environment variables:

Copy the sample environment file to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional, for administrative scripts)

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Available Scripts

All scripts must be run with `pnpm`:

- `pnpm dev`: Starts the Next.js local development server.
- `pnpm build`: Builds the production application bundle.
- `pnpm start`: Starts the Next.js production server.
- `pnpm lint`: Runs ESLint across the codebase.
- `pnpm typecheck`: Runs TypeScript compiler type checking without emitting files.
- `pnpm test`: Runs unit tests using Vitest.
- `pnpm test:watch`: Runs Vitest in watch mode.
- `pnpm format`: Formats code files using Prettier.
- `pnpm format:check`: Validates formatting using Prettier without altering files.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI workflow (lint, typecheck, test)
├── docs/                        # Project documentation and specifications
│   ├── design-notes.md          # Architecture and design notes
│   └── requirements.md          # System and functional requirements
├── public/                      # Static assets
├── src/
│   ├── app/                     # Next.js App Router routes and layouts
│   │   ├── globals.css          # Tailwind CSS global styles
│   │   ├── layout.tsx           # Mobile-first root layout with Header
│   │   └── page.tsx             # Home page scaffold
│   ├── components/              # Shared React and UI components
│   │   ├── header.tsx           # Navigation header
│   │   └── ui/                  # shadcn/ui components (e.g., button.tsx)
│   └── lib/                     # Utilities and client helpers
│       ├── supabase/            # Supabase client helpers and TypeScript definitions
│       │   ├── client.ts        # Browser Supabase client
│       │   ├── database.types.ts# Generated database schema types
│       │   └── server.ts        # Server-side Supabase client
│       ├── utils.ts             # Tailwind class merging utility (cn)
│       └── utils.test.ts        # Vitest unit test suite
├── supabase/                    # Supabase database configuration
│   ├── migrations/              # SQL schema migrations with RLS policies
│   └── seed.sql                 # Sample campus locations and services seed data
├── .env.example                 # Environment variables template
├── components.json              # shadcn/ui configuration
├── package.json                 # Project dependencies, scripts, and package manager
├── pnpm-lock.yaml               # Pnpm dependency lockfile
└── vitest.config.ts             # Vitest test configuration
```

## Database and Migrations

Database migrations and seed files are located in the `supabase/` folder:

- `supabase/migrations/20261013000000_initial_schema.sql`: Contains tables (`categories`, `locations`, `services`, `feedback_reports`, `profiles`) with Row Level Security (RLS) policies.
- `supabase/seed.sql`: Contains 5 sample locations across the Dire Dawa University campus, sample categories, and services for testing navigation.

## Contributing and CI

Every pull request triggers the CI workflow (`.github/workflows/ci.yml`), which automatically runs linting, typechecking, and unit tests using `pnpm`.
