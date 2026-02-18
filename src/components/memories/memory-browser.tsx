"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, Trash2 } from "lucide-react";
import { CreateMemoryDialog } from "./create-memory-dialog";
import { formatDistanceToNow } from "date-fns";

export function MemoryBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [expandedMemory, setExpandedMemory] = useState<Doc<"memories"> | null>(
    null
  );

  const memories = useQuery(api.memories.search, {
    query: searchQuery,
    category: selectedCategory,
  });
  const categories = useQuery(api.memories.categories);
  const deleteMemory = useMutation(api.memories.remove);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Memories</h2>
          <p className="text-sm text-muted-foreground">
            {memories?.length ?? 0} memories stored
          </p>
        </div>
        <CreateMemoryDialog />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === undefined ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(undefined)}
          >
            All
          </Badge>
          {categories?.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? undefined : cat)
              }
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Memory Cards */}
      {!memories ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "No memories match your search"
              : "No memories yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <Card
              key={memory._id}
              className="group cursor-pointer border-border bg-card p-4 transition-colors hover:border-primary/30"
              onClick={() => setExpandedMemory(memory)}
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="mb-2 text-[10px]">
                  {memory.category}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMemory({ id: memory._id });
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
              <h3 className="text-sm font-semibold">{memory.title}</h3>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {memory.content}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                {memory.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {memory.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{memory.tags.length - 3}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatDistanceToNow(memory.createdAt, { addSuffix: true })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Expanded Memory Dialog */}
      <Dialog
        open={!!expandedMemory}
        onOpenChange={(open) => !open && setExpandedMemory(null)}
      >
        <DialogContent className="max-w-2xl">
          {expandedMemory && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{expandedMemory.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(expandedMemory.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <DialogTitle className="text-xl">
                  {expandedMemory.title}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {expandedMemory.content}
                </p>
              </ScrollArea>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {expandedMemory.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
