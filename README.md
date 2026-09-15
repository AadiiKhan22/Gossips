# Gossips

Modern full-stack messaging application built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Phase 1 — Foundation (Complete)

This phase establishes the project foundation without messaging features.

### Included

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui components
- Supabase client/server/middleware helpers
- Environment variable template (`.env.example`)
- Gossips branding and design tokens
- Light/dark theme support
- Responsive app shell layout
- Database migration foundation (`profiles` table)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Add your Supabase project URL and anon key to `.env.local`.

### 3. Apply database migration

See [supabase/migrations/README.md](./supabase/migrations/README.md).

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/
│   ├── brand/           # Gossips branding
│   ├── home/            # Landing page components
│   ├── layout/          # App shell layout
│   ├── theme/           # Theme provider & toggle
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── supabase/        # Supabase clients & middleware
│   └── utils.ts         # Shared utilities
└── types/
    └── database.ts      # Supabase database types
supabase/
└── migrations/          # SQL migrations
```

## Development Phases

Development proceeds in 15 phases. Phase 1 is complete. Say **"Continue to Phase 2"** to begin authentication and profiles.

## Phase 1 Record

- **Implemented:** Project scaffold, design system, Supabase config, responsive layout, profiles migration
- **Not implemented:** Auth, messaging, chat UI (later phases)
