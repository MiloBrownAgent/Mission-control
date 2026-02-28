"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ROOMS = ["Kitchen", "Bathrooms", "Living Room", "Bedrooms", "Other"] as const;
const PRIORITIES = ["must", "if_time", "skip"] as const;
type Room = typeof ROOMS[number];
type Priority = typeof PRIORITIES[number];

const priorityConfig = {
  must: { label: "MUST", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  if_time: { label: "IF TIME", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  skip: { label: "SKIP", bg: "bg-[#1A1816]", text: "text-[#6B6560]", border: "border-[#1A1816]" },
};

const roomEmojis: Record<string, string> = {
  Kitchen: "🍳",
  Bathrooms: "🚿",
  "Living Room": "🛋️",
  Bedrooms: "🛏️",
  Other: "🏠",
};

export default function CleaningPage() {
  const tasks = useQuery(api.cleaningTasks.list);
  const addTask = useMutation(api.cleaningTasks.add);
  const toggleComplete = useMutation(api.cleaningTasks.toggleComplete);
  const removeTask = useMutation(api.cleaningTasks.remove);
  const clearCompleted = useMutation(api.cleaningTasks.clearCompleted);
  const resetForNextVisit = useMutation(api.cleaningTasks.resetForNextVisit);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [newRoom, setNewRoom] = useState<Room>("Kitchen");
  const [newTask, setNewTask] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("must");
  const [newRecurring, setNewRecurring] = useState(true);
  const [adding, setAdding] = useState(false);

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#B8956A]/30 bg-gradient-to-br from-[#B8956A]/10 via-[#B8956A]/5 to-transparent p-6">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#B8956A]/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#B8956A] to-[#CDAA7E] shadow-lg text-xl">
              🧹
            </div>
            <div>
              <h1 className="text-2xl font-bold font-[family-name:var(--font-syne)] text-[#E8E4DF]">
                Lindsey&apos;s List 🧹
              </h1>
              <p className="text-sm text-[#6B6560]">Comes every other Friday</p>
            </div>
          </div>

          {/* Next visit callout */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#B8956A]/30 bg-[#B8956A]/10 px-4 py-3">
            <span className="text-lg">📅</span>
            <div>
              <p className="text-sm font-semibold text-[#E8E4DF]">Next visit: Tomorrow — Sat Feb 28</p>
              <p className="text-xs text-[#6B6560]">Get the house ready!</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#6B6560]">{completedCount} of {totalCount} tasks complete</span>
              <span className="text-xs font-semibold text-[#B8956A]">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#1A1816]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#B8956A] to-[#CDAA7E] transition-all duration-500"
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
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[#0D0C0A]" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {ROOMS.map((room) => {
            const roomTasks = byRoom(room);
            if (roomTasks.length === 0) return null;
            const roomDone = roomTasks.filter((t) => t.completedAt !== undefined).length;
            return (
              <Card key={room} className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1816] bg-[#0D0C0A]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{roomEmojis[room] ?? "🏠"}</span>
                    <h2 className="font-semibold font-[family-name:var(--font-syne)] text-[#E8E4DF]">{room}</h2>
                  </div>
                  <span className="text-xs text-[#6B6560]">{roomDone}/{roomTasks.length}</span>
                </div>
                <div className="divide-y divide-[#1A1816]">
                  {roomTasks.map((t) => {
                    const pc = priorityConfig[t.priority];
                    const done = t.completedAt !== undefined;
                    return (
                      <div key={t._id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${done ? "opacity-50" : ""}`}>
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleComplete({ id: t._id as Id<"cleaningTasks"> })}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            done
                              ? "border-[#B8956A] bg-[#B8956A]"
                              : "border-[#6B6560] hover:border-[#B8956A]"
                          }`}
                        >
                          {done && (
                            <svg className="h-3 w-3 text-[#0D0C0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${done ? "line-through text-[#6B6560]" : "text-[#E8E4DF]"}`}>
                              {t.task}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pc.bg} ${pc.text} ${pc.border}`}>
                              {pc.label}
                            </span>
                            {!t.recurring && (
                              <span className="text-[10px] text-[#6B6560] italic">one-time</span>
                            )}
                          </div>
                          {t.notes && (
                            <p className="text-xs text-[#6B6560] mt-0.5">{t.notes}</p>
                          )}
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => removeTask({ id: t._id as Id<"cleaningTasks"> })}
                          className="text-[#6B6560] hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
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
        <Card className="rounded-xl border border-[#B8956A]/30 bg-[#0D0C0A] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">Add a Task</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B6560] mb-1 block">Room</label>
              <select
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value as Room)}
                className="w-full rounded-lg border border-[#1A1816] bg-[#060606] text-[#E8E4DF] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#B8956A]/50"
              >
                {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6B6560] mb-1 block">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-[#1A1816] bg-[#060606] text-[#E8E4DF] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#B8956A]/50"
              >
                <option value="must">MUST</option>
                <option value="if_time">IF TIME</option>
                <option value="skip">SKIP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#6B6560] mb-1 block">Task</label>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-[#1A1816] bg-[#060606] text-[#E8E4DF] text-sm px-3 py-2 placeholder:text-[#6B6560] focus:outline-none focus:ring-1 focus:ring-[#B8956A]/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowForm(false); }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-[#6B6560] mb-1 block">Notes (optional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="w-full rounded-lg border border-[#1A1816] bg-[#060606] text-[#E8E4DF] text-sm px-3 py-2 placeholder:text-[#6B6560] focus:outline-none focus:ring-1 focus:ring-[#B8956A]/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewRecurring(!newRecurring)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                newRecurring
                  ? "border-[#B8956A]/40 bg-[#B8956A]/10 text-[#B8956A]"
                  : "border-[#1A1816] bg-[#0D0C0A] text-[#6B6560]"
              }`}
            >
              <span>{newRecurring ? "🔄" : "1️⃣"}</span>
              {newRecurring ? "Recurring" : "One-time"}
            </button>
            <p className="text-xs text-[#6B6560]">
              {newRecurring ? "Shows every visit" : "Removed after visit"}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAdd}
              disabled={adding || !newTask.trim()}
              className="bg-[#B8956A] hover:bg-[#CDAA7E] text-[#060606] font-semibold text-sm"
            >
              {adding ? "Adding..." : "Add Task"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="border-[#1A1816] text-[#6B6560] hover:text-[#E8E4DF]"
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-[#B8956A]/30 bg-[#B8956A]/5 hover:bg-[#B8956A]/10 px-4 py-3 text-sm text-[#B8956A] transition-colors font-medium"
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
          className="border-[#1A1816] text-[#6B6560] hover:text-red-400 hover:border-red-500/30 disabled:opacity-40"
        >
          🗑 Clear {completedCount > 0 ? `${completedCount} ` : ""}completed
        </Button>
        <Button
          variant="outline"
          onClick={() => resetForNextVisit()}
          className="border-[#1A1816] text-[#6B6560] hover:text-[#B8956A] hover:border-[#B8956A]/30"
        >
          🔄 Reset for next visit
        </Button>
      </div>

      <p className="text-center text-xs text-[#6B6560] pb-4">
        "Clear completed" — run after Lindsey leaves · "Reset for next visit" — run before next cleaning
      </p>
    </div>
  );
}
