# Mission Control

Personal dashboard for managing OpenClaw — built with Next.js, Convex, Tailwind CSS, and shadcn/ui.

## Features

- **Tasks Board** — Kanban-style board with drag-and-drop (To Do, In Progress, Done)
- **Memory Browser** — Full-text search across stored memories with category filtering
- **Calendar** — Monthly calendar view with events, tasks, cron jobs, and reminders
- **Dark Mode** — VS Code / Linear-inspired dark theme by default
- **Real-time** — Convex provides live updates across all connected clients

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Convex (database + real-time)
- Tailwind CSS v4 + shadcn/ui
- @dnd-kit for drag-and-drop
- Lucide React for icons
- date-fns for date formatting

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up Convex:

```bash
npx convex dev
```

This will prompt you to create a Convex project and will set your `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.

3. Run the Next.js dev server (in a separate terminal):

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

5. (Optional) Seed the database with sample data by calling the `seed.seed` mutation from the Convex dashboard.

## Project Structure

```
convex/           # Convex backend
  schema.ts       # Database schema (tasks, memories, events)
  tasks.ts        # Task CRUD operations
  memories.ts     # Memory CRUD + full-text search
  events.ts       # Calendar event operations
  seed.ts         # Sample data seeder

src/
  app/            # Next.js App Router pages
    tasks/        # Kanban board
    memories/     # Memory browser
    calendar/     # Calendar view
  components/
    sidebar.tsx   # Navigation sidebar
    tasks/        # Task board components
    memories/     # Memory browser components
    calendar/     # Calendar components
    ui/           # shadcn/ui primitives
```
