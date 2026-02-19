"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Doc } from "../../../convex/_generated/dataModel";
import { TaskCard } from "./task-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const columnConfig = {
  todo: { title: "To Do", color: "bg-muted-foreground", accent: "border-muted-foreground/30" },
  in_progress: { title: "In Progress", color: "bg-blue-500", accent: "border-blue-500/30" },
  done: { title: "Done", color: "bg-emerald-500", accent: "border-emerald-500/30" },
};

type Status = "todo" | "in_progress" | "done";

export function TaskColumn({
  status,
  tasks,
}: {
  status: Status;
  tasks: Doc<"tasks">[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = columnConfig[status];

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-muted/20 transition-all duration-200",
        isOver && "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
      )}
    >
      <div className={cn("flex items-center gap-2.5 border-b px-4 py-3", config.accent)}>
        <div className={cn("h-2.5 w-2.5 rounded-full", config.color)} />
        <h3 className="text-sm font-semibold">{config.title}</h3>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div ref={setNodeRef} className="min-h-[200px] space-y-2 p-3">
          <SortableContext
            items={tasks.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/50">
              <p className="text-xs text-muted-foreground/60">
                Drop tasks here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
