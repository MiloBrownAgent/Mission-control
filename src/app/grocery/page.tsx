"use client";

import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/lib/app-mode";
import { useEffect } from "react";
import {
  Heart,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowLeft,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

const CATEGORIES = ["Produce", "Dairy", "Proteins", "Pantry", "Baby", "Other"] as const;

const categoryColors: Record<string, string> = {
  Produce: "bg-green-500/20 text-green-400 border-green-500/30",
  Dairy: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Proteins: "bg-red-500/20 text-red-400 border-red-500/30",
  Pantry: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Baby: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function GroceryListPage() {
  const mode = useAppMode();
  const router = useRouter();

  useEffect(() => {
    if (mode === "work") {
      router.replace("/");
    }
  }, [mode, router]);

  const items = useQuery(api.groceryItems.getAll);
  const addItem = useMutation(api.groceryItems.addItem);
  const toggleItem = useMutation(api.groceryItems.toggleItem);
  const deleteItem = useMutation(api.groceryItems.deleteItem);
  const clearChecked = useMutation(api.groceryItems.clearChecked);

  const [newText, setNewText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const unchecked = items?.filter((i) => !i.checked) ?? [];
  const checked = items?.filter((i) => i.checked) ?? [];

  async function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    await addItem({
      text,
      category: selectedCategory || undefined,
    });
    setNewText("");
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/30 bg-gradient-to-br from-rose-50/10 via-amber-50/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/family-home")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-amber-500 shadow-lg hover:shadow-xl transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Grocery List 🛒
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {unchecked.length} item{unchecked.length !== 1 ? "s" : ""} remaining
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add item */}
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add an item..."
            className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {/* Category selector */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={() => setSelectedCategory("")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              selectedCategory === ""
                ? "bg-white/10 text-white border-white/30"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            No category
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? categoryColors[cat]
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Unchecked items */}
      {items === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          {unchecked.length > 0 && (
            <div className="space-y-1.5">
              {unchecked.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 group"
                >
                  <button
                    onClick={() => toggleItem({ id: item._id as Id<"groceryItems"> })}
                    className="shrink-0 text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <span className="flex-1 text-sm">{item.text}</span>
                  {item.category && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${categoryColors[item.category] || categoryColors.Other}`}
                    >
                      {item.category}
                    </span>
                  )}
                  <button
                    onClick={() => deleteItem({ id: item._id as Id<"groceryItems"> })}
                    className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {unchecked.length === 0 && checked.length === 0 && (
            <div className="rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 p-8 text-center">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm text-muted-foreground">Your grocery list is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Add items above to get started</p>
            </div>
          )}

          {/* Checked items */}
          {checked.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Checked ({checked.length})
                </p>
                <button
                  onClick={() => clearChecked({})}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear checked
                </button>
              </div>
              {checked.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 group"
                >
                  <button
                    onClick={() => toggleItem({ id: item._id as Id<"groceryItems"> })}
                    className="shrink-0 text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <span className="flex-1 text-sm text-muted-foreground line-through">
                    {item.text}
                  </span>
                  {item.category && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium border border-white/10 text-muted-foreground">
                      {item.category}
                    </span>
                  )}
                  <button
                    onClick={() => deleteItem({ id: item._id as Id<"groceryItems"> })}
                    className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-[10px] text-muted-foreground/50 flex items-center justify-center gap-1.5">
          <Heart className="h-2.5 w-2.5 text-rose-400/50" />
          Sweeney Family Hub · Family Mode
          <Heart className="h-2.5 w-2.5 text-rose-400/50" />
        </p>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(GroceryListPage), { ssr: false });
