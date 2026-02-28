"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ExternalLink, CheckCircle2, Circle, Clock, GitCommit, AlertCircle } from "lucide-react";

interface ActionItem {
  text: string;
  done: boolean;
}

interface ProjectData {
  name: string;
  emoji: string;
  description: string;
  status: string;
  statusColor: string;
  progress: number;
  url?: string;
  urlLabel?: string;
  color: string;
  border: string;
  actionItems: ActionItem[];
  extra?: React.ReactNode;
}

const gitCommits = [
  { hash: "efbd24f", message: "feat: Add Client CRM system — pipeline, outreach tracking, 22 prospects seeded" },
  { hash: "5f33deb", message: "Add task edit dialog + status to update mutation" },
  { hash: "2c8297d", message: "Phase 2: Content Pipeline, Team, Office views" },
];

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-white/5">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

const projects: ProjectData[] = [
  {
    name: "OurFable",
    emoji: "📖",
    description: "AI storybook platform — upload a photo, AI generates a personalized storybook with that person as the main character.",
    status: "90% Launch-Ready",
    statusColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    progress: 90,
    url: "https://proper-rat-443.convex.cloud",
    urlLabel: "Convex Dashboard",
    color: "from-blue-500/10",
    border: "border-blue-500/20",
    actionItems: [
      { text: "COPPA consent flow (ConsentGate)", done: true },
      { text: "Data deletion + retention cron", done: true },
      { text: "User auth + Supabase DB", done: true },
      { text: "AI image generation (Replicate)", done: true },
      { text: "Story generation pipeline", done: true },
      { text: "Book layout & PDF export", done: true },
      { text: "Resend transactional email", done: true },
      { text: "Stripe webhook + payment processing", done: false },
      { text: "Order confirmation email", done: false },
    ],
  },
  {
    name: "Look & Seen",
    emoji: "📸",
    description: "Portfolio and business site for Look & Seen, Inc. — retouching, digital tech, and AI image generation services.",
    status: "Preview Ready",
    statusColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    progress: 75,
    url: "https://look-and-seen.vercel.app",
    urlLabel: "look-and-seen.vercel.app",
    color: "from-purple-500/10",
    border: "border-purple-500/20",
    actionItems: [
      { text: "Core portfolio build (Next.js + Vercel)", done: true },
      { text: "Removed legacy /pitch + /portal routes", done: true },
      { text: "Client portal architecture", done: true },
      { text: "Dropbox integration", done: false },
      { text: "Social media scheduling (Buffer setup)", done: false },
      { text: "Vercel env vars (Telegram, Dropbox keys)", done: false },
      { text: "Custom domain setup", done: false },
    ],
  },
  {
    name: "Mission Control",
    emoji: "🚀",
    description: "Personal command center for Dave & Milo. Tasks, calendar, memories, CRM, content pipeline, family hub, finance tracker, and more.",
    status: "Production",
    statusColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    progress: 100,
    url: "https://mc.lookandseen.com",
    urlLabel: "mc.lookandseen.com",
    color: "from-emerald-500/10",
    border: "border-emerald-500/20",
    actionItems: [
      { text: "Tasks board + Kanban drag-drop", done: true },
      { text: "Memory browser + search", done: true },
      { text: "Calendar + events", done: true },
      { text: "CRM + outreach pipeline", done: true },
      { text: "Content pipeline", done: true },
      { text: "Team directory", done: true },
      { text: "Family hub (/family)", done: true },
      { text: "Finance tracker (/finance)", done: true },
      { text: "Meal planner (/meals)", done: true },
      { text: "⌘K command palette", done: true },
      { text: "Production mode (pm2)", done: true },
    ],
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
            <p className="text-sm text-muted-foreground">Active builds — {projects.length} in flight</p>
          </div>
        </div>
      </div>

      {/* Project cards */}
      <div className="space-y-6">
        {projects.map((project) => {
          const done = project.actionItems.filter((a) => a.done).length;
          const total = project.actionItems.length;

          return (
            <Card
              key={project.name}
              className={`border ${project.border} bg-gradient-to-br ${project.color} to-transparent p-6 transition-all hover:shadow-xl`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{project.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">{project.name}</h2>
                      <Badge className={`text-[10px] ${project.statusColor}`}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
                  </div>
                </div>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {project.urlLabel}
                  </a>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-sm font-semibold">{project.progress}%</span>
                </div>
                <ProgressBar
                  value={project.progress}
                  color={
                    project.progress === 100
                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                      : project.progress >= 75
                      ? "bg-gradient-to-r from-blue-500 to-purple-500"
                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                  }
                />
              </div>

              {/* Action items */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Action Items
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {done}/{total} complete
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {project.actionItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={item.done ? "text-muted-foreground line-through" : "text-foreground"}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Git commits for Mission Control */}
              {project.name === "Mission Control" && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <GitCommit className="h-4 w-4 text-emerald-400" />
                    Recent Commits
                  </h3>
                  <div className="space-y-2">
                    {gitCommits.map((commit) => (
                      <div key={commit.hash} className="flex items-start gap-2.5 text-sm">
                        <code className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                          {commit.hash}
                        </code>
                        <span className="text-muted-foreground text-xs leading-relaxed">{commit.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next up for others */}
              {project.name !== "Mission Control" && (
                <div className="mt-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-amber-300 font-medium">Next up:</span>{" "}
                    {project.actionItems.find((a) => !a.done)?.text ?? "All done!"}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick status bar */}
      <Card className="border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-blue-400" />
          <h2 className="font-semibold text-sm">Status Overview</h2>
        </div>
        <div className="flex gap-6 flex-wrap">
          {projects.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-sm">
              <span>{p.emoji}</span>
              <span className="font-medium">{p.name}</span>
              <Badge className={`text-[10px] ${p.statusColor}`}>{p.progress}%</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
