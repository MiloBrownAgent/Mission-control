# Mission Control — Build Brief

Build a Mission Control dashboard app using **Next.js** (App Router) and **Convex** as the database.

This is a personal dashboard for managing an AI assistant (OpenClaw). The user is Dave, a photographer/retoucher in Minneapolis.

## Tech Stack
- Next.js 14+ (App Router, TypeScript)
- Convex (database + real-time)
- Tailwind CSS + shadcn/ui for components
- Dark mode by default

## Phase 1 — Build These Screens:

### 1. Tasks Board
- Kanban-style board with columns: To Do, In Progress, Done
- Each task has: title, description, assignee (Dave or Milo), status, priority, created/updated dates
- Drag and drop between columns
- Real-time updates via Convex

### 2. Memory Browser
- Display all memory files in a beautiful document UI
- Search across all memories (global search)
- Memories shown as cards with date, preview text
- Click to expand full memory content
- Categories/tags for filtering

### 3. Calendar
- Monthly calendar view
- Shows scheduled tasks, cron jobs, reminders
- Click to see details of each event
- Ability to add new events

### 4. Sidebar Navigation
- Clean sidebar with icons for each screen
- App title: "Mission Control"
- User avatar area at top
- Collapsible on mobile

## Design Notes
- Dark theme (think VS Code / Linear vibes)
- Clean, minimal, professional
- Responsive — works on desktop and mobile
- Real-time updates where possible

## Setup
- Initialize with `npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm`
- Set up Convex: `npx convex dev`
- Install shadcn/ui components as needed

Build the full app. Make it production-quality. Commit when done.
