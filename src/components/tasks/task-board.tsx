"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useState } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import { TaskColumn } from "./task-column";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";
import { Badge } from "@/components/ui/badge";

type Status = "todo" | "in_progress" | "done";

export function TaskBoard() {
  const tasks = useQuery(api.tasks.list);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  if (!tasks) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  const columns: Record<Status, Doc<"tasks">[]> = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const urgentCount = tasks.filter((t) => t.priority === "urgent" && t.status !== "done").length;

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Doc<"tasks">;
    if (task) setActiveTask(task);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by useDroppable
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Doc<"tasks">;
    if (!task) return;

    let targetStatus: Status;
    const overId = over.id as string;

    if (["todo", "in_progress", "done"].includes(overId)) {
      targetStatus = overId as Status;
    } else {
      const overTask = tasks.find((t) => t._id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    if (task.status !== targetStatus) {
      updateStatus({ id: task._id, status: targetStatus });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {tasks.length} total
            </p>
            {urgentCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 text-[10px]">
                {urgentCount} urgent
              </Badge>
            )}
          </div>
        </div>
        <CreateTaskDialog />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TaskColumn status="todo" tasks={columns.todo} />
          <TaskColumn status="in_progress" tasks={columns.in_progress} />
          <TaskColumn status="done" tasks={columns.done} />
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
