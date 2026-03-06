"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { GripVertical, X, Plus, Save, RefreshCw, Grid2X2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCredits {
  client?: string;
  clientUrl?: string;
  agency?: string;
  agencyUrl?: string;
  creativeDirector?: string;
  creativeDirectorUrl?: string;
  artDirector?: string;
  artDirectorUrl?: string;
  photographer?: string;
  photographerUrl?: string;
  producer?: string;
  producerUrl?: string;
  role?: string;
  roleUrl?: string;
}

interface Project {
  id: string;
  category: "Campaign" | "Portrait" | "Product" | "Generated Imagery";
  aspectRatio: string;
  imageSrc: string;
  alt: string;
  credits?: ProjectCredits;
}

const CATEGORY_COLORS: Record<string, string> = {
  Campaign: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Portrait: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  Product: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Generated Imagery": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const CREDITS_FIELDS: { key: keyof ProjectCredits; urlKey: keyof ProjectCredits; label: string; placeholder: string }[] = [
  { key: "client",           urlKey: "clientUrl",           label: "Client",            placeholder: "e.g. Life Time" },
  { key: "agency",           urlKey: "agencyUrl",           label: "Agency",            placeholder: "e.g. McCann Minneapolis" },
  { key: "creativeDirector", urlKey: "creativeDirectorUrl", label: "Creative Director", placeholder: "Name" },
  { key: "artDirector",      urlKey: "artDirectorUrl",      label: "Art Director",      placeholder: "Name" },
  { key: "photographer",     urlKey: "photographerUrl",     label: "Photographer",      placeholder: "Name" },
  { key: "producer",         urlKey: "producerUrl",         label: "Producer",          placeholder: "Name" },
  { key: "role",             urlKey: "roleUrl",             label: "Look & Seen",       placeholder: "e.g. Retouching" },
];

function hasCredits(c?: ProjectCredits): boolean {
  return !!c && Object.values(c).some(Boolean);
}

function filenameToId(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function guessAspectRatio(filename: string): string {
  if (filename.startsWith("lt-")) return "1334/2000";
  if (/\.(mp4|webm|mov)$/i.test(filename)) return "1920/1080";
  return "2000/1333";
}

function defaultProject(filename: string): Project {
  return {
    id: filenameToId(filename),
    category: "Product",
    aspectRatio: guessAspectRatio(filename),
    imageSrc: `/work/${filename}`,
    alt: filenameToId(filename),
  };
}

function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(src);
}

function ImageCard({
  project,
  index,
  draggable,
  onRemove,
  onCreditsChange,
}: {
  project: Project;
  index: number;
  draggable?: boolean;
  onRemove?: () => void;
  onCreditsChange?: (credits: ProjectCredits) => void;
}) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const filename = project.imageSrc.replace("/work/", "");
  const thumbUrl = isVideo(filename)
    ? null
    : `https://look-and-seen.vercel.app/work/${filename}`;
  const catColor = CATEGORY_COLORS[project.category] ?? "bg-neutral-700 text-neutral-300";
  const credited = hasCredits(project.credits);

  const handleField = (key: keyof ProjectCredits, value: string) => {
    const updated = { ...(project.credits ?? {}), [key]: value || undefined };
    // remove empty keys
    (Object.keys(updated) as (keyof ProjectCredits)[]).forEach((k) => {
      if (!updated[k]) delete updated[k];
    });
    onCreditsChange?.(updated);
  };

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] hover:border-[#B8956A]/30 transition-colors">
      <div className="relative flex gap-3 items-start p-3">
        {draggable && (
          <div className="mt-1 shrink-0 text-[#4A4540] group-hover:text-[#6B6560] cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        {/* Thumbnail */}
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#1A1816] flex items-center justify-center">
          {thumbUrl ? (
            <img src={thumbUrl} alt={project.alt} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-[9px] text-[#6B6560] font-mono uppercase tracking-wider">MP4</span>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-[#E8E4DF] truncate">{filename}</p>
          <span className={cn("mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", catColor)}>
            {project.category}
          </span>
          <p className="mt-1 text-[10px] text-[#6B6560] font-mono">{project.aspectRatio}</p>
        </div>
        {/* Position + controls */}
        <div className="shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
          {draggable && (
            <span className="text-[10px] font-mono text-[#4A4540]">#{index + 1}</span>
          )}
          {/* Credits toggle */}
          <button
            onClick={() => setCreditsOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors",
              credited
                ? "border-[#B8956A]/40 text-[#B8956A] bg-[#B8956A]/10 hover:bg-[#B8956A]/20"
                : "border-[#2A2520] text-[#4A4540] bg-transparent hover:border-[#B8956A]/30 hover:text-[#B8956A]"
            )}
            title="Edit credits"
          >
            {credited ? "Credits ✓" : "Credits"}
            {creditsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        {/* Remove */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 rounded-md text-[#4A4540] hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Remove from grid"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Credits panel */}
      {creditsOpen && (
        <div className="border-t border-[#1A1816] px-3 pb-3 pt-2.5">
          <p className="text-[9px] tracking-[0.15em] uppercase text-[#4A4540] mb-2">Credits — leave blank to hide</p>
          <div className="space-y-2.5">
            {CREDITS_FIELDS.map(({ key, urlKey, label, placeholder }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[9px] tracking-[0.1em] uppercase text-[#6B6560]">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={project.credits?.[key] ?? ""}
                    placeholder={placeholder}
                    onChange={(e) => handleField(key, e.target.value)}
                    className="flex-1 h-7 px-2 rounded-md bg-[#060606] border border-[#2A2520] text-[11px] text-[#E8E4DF] placeholder-[#3A3530] focus:outline-none focus:border-[#B8956A]/50 transition-colors"
                  />
                  <input
                    type="text"
                    value={project.credits?.[urlKey] ?? ""}
                    placeholder="https://..."
                    onChange={(e) => handleField(urlKey, e.target.value)}
                    className="w-36 h-7 px-2 rounded-md bg-[#060606] border border-[#2A2520] text-[11px] text-[#6B6560] placeholder-[#2A2520] focus:outline-none focus:border-[#B8956A]/30 transition-colors font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotInGridCard({
  filename,
  onAdd,
}: {
  filename: string;
  onAdd: () => void;
}) {
  const isVid = isVideo(filename);
  const imgUrl = isVid ? null : `https://look-and-seen.vercel.app/work/${filename}`;

  return (
    <div className="group relative flex gap-3 items-center rounded-xl border border-[#1A1816] bg-[#0A0908] p-3 hover:border-[#B8956A]/20 transition-colors">
      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#1A1816] flex items-center justify-center">
        {imgUrl ? (
          <img src={imgUrl} alt={filename} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" loading="lazy" />
        ) : (
          <span className="text-[9px] text-[#6B6560] font-mono uppercase">MP4</span>
        )}
      </div>
      <p className="flex-1 text-sm font-mono text-[#6B6560] group-hover:text-[#E8E4DF] transition-colors truncate">
        {filename}
      </p>
      <button
        onClick={onAdd}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B8956A]/10 border border-[#B8956A]/20 text-[#B8956A] text-xs font-medium hover:bg-[#B8956A]/20 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}

export default function LsGridPage() {
  const [inGrid, setInGrid] = useState<Project[]>([]);
  const [notInGrid, setNotInGrid] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setDirty(false);
    try {
      const res = await fetch("/api/ls-grid");
      const data = await res.json();
      setInGrid(data.inGrid ?? []);
      setNotInGrid(data.notInGrid ?? []);
    } catch (e) {
      showToast("error", `Load failed: ${e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(inGrid);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setInGrid(items);
    setDirty(true);
  };

  const removeFromGrid = (idx: number) => {
    const item = inGrid[idx];
    const filename = item.imageSrc.replace("/work/", "");
    setInGrid((prev) => prev.filter((_, i) => i !== idx));
    setNotInGrid((prev) => [...prev, filename].sort());
    setDirty(true);
  };

  const addToGrid = (filename: string) => {
    const proj = defaultProject(filename);
    setNotInGrid((prev) => prev.filter((f) => f !== filename));
    setInGrid((prev) => [...prev, proj]);
    setDirty(true);
  };

  const updateCredits = (idx: number, credits: ProjectCredits) => {
    setInGrid((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, credits: Object.keys(credits).length ? credits : undefined } : p))
    );
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ls-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: inGrid }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("success", "Saved! data.ts updated.");
        setDirty(false);
      } else {
        showToast("error", data.error ?? "Save failed");
      }
    } catch (e) {
      showToast("error", `Save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#B8956A]/20 to-[#CDAA7E]/10 border border-[#B8956A]/20">
            <Grid2X2 className="h-4 w-4 text-[#B8956A]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold font-[family-name:var(--font-syne)] text-[#E8E4DF]">
              LS Grid Manager
            </h1>
            <p className="text-xs text-[#6B6560]">
              {inGrid.length} in grid · {notInGrid.length} available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1A1816] bg-[#0D0C0A] text-[#6B6560] hover:text-[#E8E4DF] hover:border-[#2A2520] text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              dirty
                ? "bg-[#B8956A] text-[#060606] hover:bg-[#CDAA7E] shadow-lg shadow-[#B8956A]/20"
                : "bg-[#1A1816] text-[#4A4540] cursor-not-allowed"
            )}
          >
            <Save className={cn("h-4 w-4", saving && "animate-pulse")} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl",
          toast.type === "success"
            ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
            : "bg-red-950/90 border-red-500/30 text-red-300"
        )}>
          {toast.type === "success" ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-[#6B6560] text-sm">Loading grid data…</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* ── In Grid ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">In Grid</h2>
              <span className="text-xs text-[#6B6560] bg-[#1A1816] rounded-full px-2 py-0.5">{inGrid.length} images</span>
            </div>
            <div className="rounded-xl border border-[#1A1816] bg-[#060606] p-3">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="in-grid">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[120px] rounded-lg transition-colors",
                        snapshot.isDraggingOver && "bg-[#B8956A]/5"
                      )}
                    >
                      {inGrid.map((project, idx) => (
                        <Draggable
                          key={`${project.imageSrc}-${idx}`}
                          draggableId={`${project.imageSrc}-${idx}`}
                          index={idx}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "transition-shadow",
                                snapshot.isDragging && "shadow-2xl shadow-black/50 rotate-1 scale-[1.02]"
                              )}
                            >
                              <ImageCard
                                project={project}
                                index={idx}
                                draggable
                                onRemove={() => removeFromGrid(idx)}
                                onCreditsChange={(credits) => updateCredits(idx, credits)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {inGrid.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-[#4A4540] text-sm">
                          Drag images here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>

          {/* ── Not in Grid ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Not in Grid</h2>
              <span className="text-xs text-[#6B6560] bg-[#1A1816] rounded-full px-2 py-0.5">{notInGrid.length} available</span>
            </div>
            <div className="rounded-xl border border-[#1A1816] bg-[#060606] p-3">
              <div className="space-y-2 max-h-[800px] overflow-y-auto">
                {notInGrid.map((filename) => (
                  <NotInGridCard key={filename} filename={filename} onAdd={() => addToGrid(filename)} />
                ))}
                {notInGrid.length === 0 && (
                  <div className="flex items-center justify-center py-12 text-[#4A4540] text-sm">
                    All images are in the grid
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
