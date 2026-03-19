"use client";

import { useState, useEffect, useCallback } from "react";
import { Wand2, Download, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Quality = "1k" | "2k" | "4k";

interface Provider {
  id: string;
  name: string;
  description: string;
}

interface GeneratedImage {
  url: string;
  seed?: number;
  width?: number;
  height?: number;
}

interface GenerateResult {
  images: GeneratedImage[];
  provider: string;
  model: string;
  durationMs: number;
  estimatedCostUsd: number;
}

const QUALITY_LABELS: Record<Quality, string> = { "1k": "1K", "2k": "2K", "4k": "4K" };

// Client-side cost estimate mirrors fal-flux-pro.ts logic
const BASE_COST_2K = 0.12;
const QUALITY_DIMS: Record<Quality, number> = {
  "1k": 1024 * 1024,
  "2k": 2048 * 2048,
  "4k": 4096 * 4096,
};
const BASE_PIXELS_2K = 2048 * 2048;

function estimateCost(quality: Quality, numImages: number): number {
  const pixels = QUALITY_DIMS[quality];
  const perImage = BASE_COST_2K * (pixels / BASE_PIXELS_2K);
  return perImage * numImages;
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [quality, setQuality] = useState<Quality>("2k");
  const [numImages, setNumImages] = useState(1);
  const [providerId, setProviderId] = useState<string>("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  // Fetch provider list on mount
  useEffect(() => {
    fetch("/api/generate/providers")
      .then((r) => r.json())
      .then((data: Provider[]) => {
        setProviders(data);
        if (data.length > 0 && !providerId) {
          setProviderId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const costEstimate = estimateCost(quality, numImages);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          numImages,
          quality,
          providerId: providerId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Generation failed");
      } else {
        setResult(data as GenerateResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [prompt, negativePrompt, numImages, quality, providerId, loading]);

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `generated-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#060606] text-[#E8E4DF]">
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B8956A]/10 border border-[#B8956A]/20">
            <Wand2 className="h-4.5 w-4.5 text-[#B8956A]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#E8E4DF] font-[family-name:var(--font-syne)]">
              Generate
            </h1>
            <p className="text-xs text-[#6B6560]">AI image generation</p>
          </div>
        </div>

        {/* Prompt area */}
        <div className="space-y-3 mb-5">
          <div className="rounded-xl border border-[#1A1816] bg-[#0A0908] overflow-hidden focus-within:border-[#B8956A]/40 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
              placeholder="Describe the image you want to generate…"
              className="w-full min-h-[120px] resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-[#E8E4DF] placeholder:text-[#3A3530] outline-none"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-[11px] text-[#3A3530]">⌘↵ to generate</span>
              <span className="text-[11px] text-[#3A3530]">{prompt.length}</span>
            </div>
          </div>

          {/* Negative prompt (collapsed by default) */}
          <div className="rounded-xl border border-[#1A1816] bg-[#0A0908] overflow-hidden focus-within:border-[#1A1816]/60 transition-colors">
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (optional) — what to avoid…"
              className="w-full min-h-[48px] max-h-[80px] resize-none bg-transparent px-4 py-3 text-sm text-[#9A9590] placeholder:text-[#2A2520] outline-none"
            />
          </div>
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Quality toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-[#1A1816] bg-[#0A0908] p-1">
            {(["1k", "2k", "4k"] as Quality[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  quality === q
                    ? "bg-[#B8956A]/15 text-[#B8956A] border border-[#B8956A]/20"
                    : "text-[#6B6560] hover:text-[#E8E4DF]"
                )}
              >
                {QUALITY_LABELS[q]}
              </button>
            ))}
          </div>

          {/* Num images */}
          <div className="flex items-center gap-2 rounded-lg border border-[#1A1816] bg-[#0A0908] px-3 py-2">
            <span className="text-xs text-[#6B6560]">Images</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNumImages((n) => Math.max(1, n - 1))}
                className="h-5 w-5 flex items-center justify-center rounded text-[#6B6560] hover:text-[#E8E4DF] hover:bg-[#1A1816] transition-colors text-sm"
              >
                −
              </button>
              <span className="w-4 text-center text-sm text-[#E8E4DF]">{numImages}</span>
              <button
                onClick={() => setNumImages((n) => Math.min(8, n + 1))}
                className="h-5 w-5 flex items-center justify-center rounded text-[#6B6560] hover:text-[#E8E4DF] hover:bg-[#1A1816] transition-colors text-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Provider dropdown */}
          {providers.length > 0 && (
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="rounded-lg border border-[#1A1816] bg-[#0A0908] px-3 py-2 text-xs text-[#9A9590] outline-none hover:border-[#2A2520] transition-colors cursor-pointer"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Cost estimate */}
          <div className="ml-auto text-xs text-[#6B6560]">
            ~${costEstimate.toFixed(2)} for {numImages} image{numImages !== 1 ? "s" : ""} at{" "}
            {QUALITY_LABELS[quality]}
          </div>
        </div>

        {/* Generate button */}
        <div className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
              prompt.trim() && !loading
                ? "bg-[#B8956A] text-[#060606] hover:bg-[#CDAA7E] shadow-lg shadow-[#B8956A]/10"
                : "bg-[#1A1816] text-[#3A3530] cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <Wand2 className="h-4 w-4" strokeWidth={1.5} />
            )}
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {result && result.images.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#6B6560]">
                {result.images.length} image{result.images.length !== 1 ? "s" : ""} ·{" "}
                {(result.durationMs / 1000).toFixed(1)}s · ${result.estimatedCostUsd.toFixed(2)}
              </p>
              <p className="text-xs text-[#3A3530]">
                {result.provider} / {result.model}
              </p>
            </div>
            <div
              className={cn(
                "grid gap-4",
                result.images.length === 1
                  ? "grid-cols-1 max-w-2xl"
                  : result.images.length <= 4
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {result.images.map((img, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl overflow-hidden border border-[#1A1816] bg-[#0A0908]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Generated image ${i + 1}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060606]/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                      <div>
                        {img.seed !== undefined && (
                          <p className="text-[10px] text-[#9A9590] font-mono">
                            seed: {img.seed}
                          </p>
                        )}
                        {img.width && img.height && (
                          <p className="text-[10px] text-[#6B6560]">
                            {img.width}×{img.height}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(img.url, i)}
                        className="flex items-center gap-1.5 rounded-lg bg-[#0A0908]/80 border border-[#1A1816] px-2.5 py-1.5 text-xs text-[#E8E4DF] hover:bg-[#1A1816] transition-colors backdrop-blur-sm"
                      >
                        <Download className="h-3 w-3" strokeWidth={1.5} />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !loading && !result ? (
          /* Empty state */
          <div
            className={cn(
              "grid gap-4",
              numImages === 1
                ? "grid-cols-1 max-w-2xl"
                : numImages <= 4
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            )}
          >
            {Array.from({ length: numImages }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border border-dashed border-[#1A1816] bg-[#0A0908] flex flex-col items-center justify-center gap-2"
              >
                <ImageIcon className="h-8 w-8 text-[#2A2520]" strokeWidth={1} />
                <p className="text-[11px] text-[#2A2520]">Image {i + 1}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
