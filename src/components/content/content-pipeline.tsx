"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  Trash2,
  FileText,
  Clock,
  Instagram,
  Twitter,
  Linkedin,
  BookOpen,
  Pencil,
} from "lucide-react";
import { CreateContentDialog } from "./create-content-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const platformConfig: Record<
  string,
  { label: string; icon: typeof Instagram; color: string }
> = {
  Instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  },
  Twitter: {
    label: "Twitter",
    icon: Twitter,
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  LinkedIn: {
    label: "LinkedIn",
    icon: Linkedin,
    color: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  },
  Blog: {
    label: "Blog",
    icon: BookOpen,
    color: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-border" },
  in_review: {
    label: "In Review",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  },
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  published: {
    label: "Published",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
};

const platforms = ["Instagram", "Twitter", "LinkedIn", "Blog"] as const;
const statuses = ["draft", "in_review", "scheduled", "published"] as const;

export function ContentPipeline() {
  const [filterPlatform, setFilterPlatform] = useState<string | undefined>(
    undefined
  );
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [editingItem, setEditingItem] = useState<Doc<"content"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMediaUrl, setEditMediaUrl] = useState("");

  const allContent = useQuery(api.content.list);
  const updateContent = useMutation(api.content.update);
  const deleteContent = useMutation(api.content.remove);

  const content = allContent?.filter((item) => {
    if (filterPlatform && item.platform !== filterPlatform) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  const openEdit = (item: Doc<"content">) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPlatform(item.platform);
    setEditStatus(item.status);
    setEditScheduledDate(item.scheduledDate ?? "");
    setEditNotes(item.notes);
    setEditMediaUrl(item.mediaUrl ?? "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;

    await updateContent({
      id: editingItem._id,
      title: editTitle.trim(),
      platform: editPlatform as "Instagram" | "Twitter" | "LinkedIn" | "Blog",
      status: editStatus as "draft" | "in_review" | "scheduled" | "published",
      scheduledDate: editScheduledDate || undefined,
      notes: editNotes.trim(),
      mediaUrl: editMediaUrl.trim() || undefined,
    });

    setEditingItem(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Content Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            <FileText className="mr-1 inline h-3.5 w-3.5" />
            {allContent?.length ?? 0} items in pipeline
          </p>
        </div>
        <CreateContentDialog />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center text-xs text-muted-foreground mr-1">
            Platform:
          </span>
          <button
            onClick={() => setFilterPlatform(undefined)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
              filterPlatform === undefined
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            All
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() =>
                setFilterPlatform(filterPlatform === p ? undefined : p)
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                filterPlatform === p
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center text-xs text-muted-foreground mr-1">
            Status:
          </span>
          <button
            onClick={() => setFilterStatus(undefined)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
              filterStatus === undefined
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() =>
                setFilterStatus(filterStatus === s ? undefined : s)
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
                filterStatus === s
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Cards */}
      {!content ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : content.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/50">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No content items yet
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.map((item, i) => {
            const pConfig = platformConfig[item.platform];
            const sConfig = statusConfig[item.status];
            const PlatformIcon = pConfig.icon;
            return (
              <Card
                key={item._id}
                className={cn(
                  "animate-fade-in-up group cursor-pointer border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-lg",
                  i < 6 && `stagger-${i + 1}`
                )}
                onClick={() => openEdit(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] border gap-1", pConfig.color)}
                    >
                      <PlatformIcon className="h-2.5 w-2.5" />
                      {pConfig.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] border", sConfig.color)}
                    >
                      {sConfig.label}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteContent({ id: item._id });
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
                <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                {item.notes && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.notes}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  {item.scheduledDate ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(item.scheduledDate + "T12:00:00"), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent>
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Content
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Platform</label>
                    <Select
                      value={editPlatform}
                      onValueChange={setEditPlatform}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="Twitter">Twitter</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Blog">Blog</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scheduled Date</label>
                  <Input
                    type="date"
                    value={editScheduledDate}
                    onChange={(e) => setEditScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Media URL</label>
                  <Input
                    value={editMediaUrl}
                    onChange={(e) => setEditMediaUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!editTitle.trim()}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
