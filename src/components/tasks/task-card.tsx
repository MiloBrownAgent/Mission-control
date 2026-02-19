"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const priorityConfig = {
  low: { label: "Low", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  medium: { label: "Medium", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  high: { label: "High", className: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  urgent: { label: "Urgent", className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const priorityDot = {
  low: "bg-emerald-400",
  medium: "bg-yellow-400",
  high: "bg-orange-400",
  urgent: "bg-red-400",
};

export function TaskCard({ task }: { task: Doc<"tasks"> }) {
  const deleteTask = useMutation(api.tasks.remove);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group cursor-grab border-border bg-card p-3 transition-all duration-150 hover:border-primary/20 hover:shadow-md active:cursor-grabbing",
        isDragging && "z-50 opacity-50 shadow-xl"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[task.priority])} />
              <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => deleteTask({ id: task._id })}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          {task.description && (
            <p className="mt-1 ml-3.5 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] border", priority.className)}>
              {priority.label}
            </Badge>
            <Avatar className="h-5 w-5">
              <AvatarFallback className={cn(
                "text-[9px] font-medium",
                task.assignee === "Dave"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-purple-500/15 text-purple-400"
              )}>
                {task.assignee === "Dave" ? "D" : "M"}
              </AvatarFallback>
            </Avatar>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
