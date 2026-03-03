"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Calendar, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ROOMS = ["Kitchen", "Bathrooms", "Living Room", "Bedrooms", "Other"] as const;
const PRIORITIES = ["must", "if_time", "skip"] as const;
type Room = typeof ROOMS[number];
type Priority = typeof PRIORITIES[number];

const priorityConfig = {
  must: { label: "MUST", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  if_time: { label: "IF TIME", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  skip: { label: "SKIP", bg: "bg-[#F7F4EF]", text: "text-[#5C6B5E]", border: "border-[#E8E4DD]" },
};

const roomEmojis: Record<string, string> = {
  Kitchen: "🍳",
  Bathrooms: "🚿",
  "Living Room": "🛋️",
  Bedrooms: "🛏️",
  Other: "🏠",
};

function formatNextVisit(ts: number): { label: string; sub: string } {
  const now = new Date();
  const visit = new Date(ts);
  // Normalize to midnight for day diff
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visitMidnight = new Date(visit.getFullYear(), visit.getMonth(), visit.getDate());
  const diffDays = Math.round((visitMidnight.getTime() - nowMidnight.getTime()) / 86400000);

  const weekday = visit.toLocaleDateString("en-US", { weekday: "short" });
  const month = visit.toLocaleDateString("en-US", { month: "short" });
  const day = visit.getDate();
  const dateStr = `${weekday} ${month} ${day}`;

  if (diffDays < 0) {
    return { label: `Next visit: ${dateStr}`, sub: "Date is in the past — update it!" };
  } else if (diffDays === 0) {
    return { label: `Next visit: Today — ${dateStr}`, sub: "She's coming today!" };
  } else if (diffDays === 1) {
    return { label: `Next visit: Tomorrow — ${dateStr}`, sub: "Get the house ready!" };
  } else if (diffDays <= 7) {
    return { label: `Next visit: In ${diffDays} days — ${dateStr}`, sub: "Coming up soon" };
  } else {
    return { label: `Next visit: ${dateStr}`, sub: `In ${diffDays} days` };
  }
}

// Pencil icon
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

export default function CleaningPage() {
  const tasks = useQuery(api.cleaningTasks.list);
  const config = useQuery(api.cleaningTasks.getConfig);
  const addTask = useMutation(api.cleaningTasks.add);
  const toggleComplete = useMutation(api.cleaningTasks.toggleComplete);
  const removeTask = useMutation(api.cleaningTasks.remove);
  const clearCompleted = useMutation(api.cleaningTasks.clearCompleted);
  const resetForNextVisit = useMutation(api.cleaningTasks.resetForNextVisit);
  const updateTask = useMutation(api.cleaningTasks.updateTask);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [newRoom, setNewRoom] = useState<Room>("Kitchen");
  const [newTask, setNewTask] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("must");
  const [newRecurring, setNewRecurring] = useState(true);
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("must");
  const [saving, setSaving] = useState(false);

  const startEdit = (id: string, currentTask: string, currentPriority: Priority) => {
    setEditingId(id);
    setEditTask(currentTask);
    setEditPriority(currentPriority);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTask("");
    setEditPriority("must");
  };

  const saveEdit = async (id: Id<"cleaningTasks">) => {
    if (!editTask.trim()) return;
    setSaving(true);
    await updateTask({ id, task: editTask.trim(), priority: editPriority });
    setSaving(false);
    cancelEdit();
  };

  const handleAdd = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    await addTask({
      room: newRoom,
      task: newTask.trim(),
      notes: newNotes.trim() || undefined,
      priority: newPriority,
      recurring: newRecurring,
    });
    setNewTask("");
    setNewNotes("");
    setAdding(false);
    setShowForm(false);
  };

  const completedCount = tasks?.filter((t) => t.completedAt !== undefined).length ?? 0;
  const totalCount = tasks?.length ?? 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group by room
  const byRoom = (room: string) =>
    tasks?.filter((t) => t.room === room) ?? [];

  // Next visit display
  const visitInfo = config?.nextVisitDate
    ? formatNextVisit(config.nextVisitDate)
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E4DD] bg-[#FDFCFA] p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8965A]/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B8965A]/10">
              <Sparkles className="h-5 w-5 text-[#B8965A]" />
            </div>
            <div>
              <h1 className="text-2xl font-light font-[family-name:var(--font-display)] text-[#2C2C2C]">
                Lindsey&apos;s List
              </h1>
              <p className="text-sm text-[#5C6B5E]">Comes every other Friday</p>
            </div>
          </div>

          {/* Next visit callout */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#B8965A]/20 bg-[#B8965A]/5 px-4 py-3">
            <Calendar className="h-4 w-4 text-[#B8965A] shrink-0" />
            <div>
              {visitInfo ? (
                <>
                  <p className="text-sm font-medium text-[#2C2C2C]">{visitInfo.label}</p>
                  <p className="text-xs text-[#5C6B5E]">{visitInfo.sub}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-[#2C2C2C]">Loading visit date...</p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#5C6B5E]">{completedCount} of {totalCount} tasks complete</span>
              <span className="text-xs font-semibold text-[#B8965A]">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E8E4DD]">
              <div
                className="h-2 rounded-full bg-[#B8965A] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Task list by room */}
      {tasks === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[#F7F4EF] border border-[#E8E4DD]" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {ROOMS.map((room) => {
            const roomTasks = byRoom(room);
            if (roomTasks.length === 0) return null;
            const roomDone = roomTasks.filter((t) => t.completedAt !== undefined).length;
            return (
              <Card key={room} className="rounded-xl border border-[#E8E4DD] bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DD] bg-[#F7F4EF]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#B8965A]" />
                    <h2 className="font-medium text-[#2C2C2C]">{room}</h2>
                  </div>
                  <span className="text-xs text-[#5C6B5E]">{roomDone}/{roomTasks.length}</span>
                </div>
                <div className="divide-y divide-[#E8E4DD]">
                  {roomTasks.map((t) => {
                    const pc = priorityConfig[t.priority];
                    const done = t.completedAt !== undefined;
                    const isEditing = editingId === t._id;

                    if (isEditing) {
                      // Inline edit mode
                      return (
                        <div key={t._id} className="px-4 py-3 bg-[#F7F4EF] space-y-2">
                          <input
                            type="text"
                            value={editTask}
                            onChange={(e) => setEditTask(e.target.value)}
                            className="w-full rounded-lg border border-[#B8965A]/40 bg-white text-[#2C2C2C] text-sm px-3 py-2 placeholder:text-[#5C6B5E]/40 focus:outline-none focus:ring-1 focus:ring-[#B8965A]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(t._id as Id<"cleaningTasks">);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Priority pills */}
                            {PRIORITIES.map((p) => {
                              const pCfg = priorityConfig[p];
                              const active = editPriority === p;
                              return (
                                <button
                                  key={p}
                                  onClick={() => setEditPriority(p)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                                    active
                                      ? `${pCfg.bg} ${pCfg.text} ${pCfg.border} ring-1 ring-offset-0 ${p === "must" ? "ring-red-300" : p === "if_time" ? "ring-amber-300" : "ring-[#E8E4DD]"}`
                                      : "bg-white text-[#5C6B5E] border-[#E8E4DD] hover:border-[#B8965A]/30"
                                  }`}
                                >
                                  {pCfg.label}
                                </button>
                              );
                            })}
                            {/* Save / Cancel */}
                            <div className="ml-auto flex gap-1.5">
                              <button
                                onClick={() => saveEdit(t._id as Id<"cleaningTasks">)}
                                disabled={saving || !editTask.trim()}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B8965A]/10 text-[#B8965A] hover:bg-[#B8965A]/20 disabled:opacity-40 transition-colors"
                                title="Save"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8E4DD] text-[#5C6B5E] hover:text-[#2C2C2C] transition-colors"
                                title="Cancel"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Normal view mode
                    return (
                      <div
                        key={t._id}
                        className={`group flex items-start gap-3 px-4 py-3 transition-colors ${done ? "opacity-50" : ""}`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleComplete({ id: t._id as Id<"cleaningTasks"> })}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            done
                              ? "border-[#B8965A] bg-[#B8965A]"
                              : "border-[#B8B0A4] hover:border-[#B8965A]"
                          }`}
                        >
                          {done && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${done ? "line-through text-[#B8B0A4]" : "text-[#2C2C2C]"}`}>
                              {t.task}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pc.bg} ${pc.text} ${pc.border}`}>
                              {pc.label}
                            </span>
                            {!t.recurring && (
                              <span className="text-[10px] text-[#5C6B5E]/60 italic">one-time</span>
                            )}
                          </div>
                          {t.notes && (
                            <p className="text-xs text-[#5C6B5E] mt-0.5">{t.notes}</p>
                          )}
                        </div>
                        {/* Edit button (visible on hover) */}
                        <button
                          onClick={() => startEdit(t._id, t.task, t.priority as Priority)}
                          className="text-[#B8B0A4] hover:text-[#B8965A] transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 mr-1"
                          title="Edit task"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => removeTask({ id: t._id as Id<"cleaningTasks"> })}
                          className="text-[#B8B0A4] hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
                          title="Remove task"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add task form */}
      {showForm ? (
        <Card className="rounded-xl border border-[#B8965A]/20 bg-[#FDFCFA] p-4 space-y-3">
          <h3 className="text-sm font-medium text-[#2C2C2C]">Add a Task</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#5C6B5E]/60 mb-1 block">Room</label>
              <select
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value as Room)}
                className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#B8965A]/30"
              >
                {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#5C6B5E]/60 mb-1 block">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#B8965A]/30"
              >
                <option value="must">MUST</option>
                <option value="if_time">IF TIME</option>
                <option value="skip">SKIP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#5C6B5E]/60 mb-1 block">Task</label>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2 placeholder:text-[#5C6B5E]/40 focus:outline-none focus:ring-1 focus:ring-[#B8965A]/30"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowForm(false); }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-[#5C6B5E]/60 mb-1 block">Notes (optional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="w-full rounded-lg border border-[#E8E4DD] bg-[#F7F4EF] text-[#2C2C2C] text-sm px-3 py-2 placeholder:text-[#5C6B5E]/40 focus:outline-none focus:ring-1 focus:ring-[#B8965A]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewRecurring(!newRecurring)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                newRecurring
                  ? "border-[#B8956A]/40 bg-[#B8956A]/10 text-[#B8956A]"
                  : "border-[#E8E4DD] bg-[#F7F4EF] text-[#5C6B5E]"
              }`}
            >
              <span>{newRecurring ? "🔄" : "1️⃣"}</span>
              {newRecurring ? "Recurring" : "One-time"}
            </button>
            <p className="text-xs text-[#5C6B5E]">
              {newRecurring ? "Shows every visit" : "Removed after visit"}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAdd}
              disabled={adding || !newTask.trim()}
              className="bg-[#B8965A] hover:bg-[#A6854F] text-white font-semibold text-sm"
            >
              {adding ? "Adding..." : "Add Task"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="border-[#E8E4DD] text-[#5C6B5E] hover:text-[#2C2C2C]"
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-[#B8965A]/20 bg-[#B8965A]/5 hover:bg-[#B8965A]/10 px-4 py-3 text-sm text-[#B8965A] transition-colors font-medium"
        >
          + Add a task
        </button>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => clearCompleted()}
          disabled={completedCount === 0}
          className="border-[#E8E4DD] text-[#5C6B5E] hover:text-red-500 hover:border-red-300 disabled:opacity-40"
        >
          🗑 Clear {completedCount > 0 ? `${completedCount} ` : ""}completed
        </Button>
        <Button
          variant="outline"
          onClick={() => resetForNextVisit()}
          className="border-[#E8E4DD] text-[#5C6B5E] hover:text-[#B8965A] hover:border-[#B8965A]/30"
        >
          🔄 Reset for next visit
        </Button>
      </div>

      <p className="text-center text-xs text-[#5C6B5E]/60 pb-4">
        "Clear completed" — run after Lindsey leaves · "Reset for next visit" — run before next cleaning
      </p>
    </div>
  );
}
