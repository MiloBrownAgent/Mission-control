import type { GenerateParams, GenerateResult, GeneratedImage, ImageGenProvider } from "../types";

const QUALITY_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1k": { width: 1024, height: 1024 },
  "2k": { width: 2048, height: 2048 },
  "4k": { width: 4096, height: 4096 },
};

// Base cost per image at 2k resolution; scale by pixel area for other qualities
const BASE_COST_2K = 0.12;
const BASE_PIXELS_2K = 2048 * 2048;

export const falFluxPro: ImageGenProvider = {
  id: "fal-flux-pro",
  name: "Flux Pro (Fal.ai)",
  description: "High-quality photorealistic image generation via Fal.ai's Flux Pro model.",

  estimatedCostPerImage(params: GenerateParams): number {
    const quality = params.quality ?? "2k";
    const dims = QUALITY_DIMENSIONS[quality] ?? QUALITY_DIMENSIONS["2k"];
    const pixels = (params.width ?? dims.width) * (params.height ?? dims.height);
    return BASE_COST_2K * (pixels / BASE_PIXELS_2K);
  },

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
      throw new Error("FAL_API_KEY environment variable is not set");
    }

    const quality = params.quality ?? "2k";
    const dims = QUALITY_DIMENSIONS[quality] ?? QUALITY_DIMENSIONS["2k"];
    const width = params.width ?? dims.width;
    const height = params.height ?? dims.height;
    const numImages = params.numImages ?? 1;

    const body: Record<string, unknown> = {
      prompt: params.prompt,
      image_size: { width, height },
      num_images: numImages,
    };

    if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
    if (params.seed !== undefined) body.seed = params.seed;

    const startMs = Date.now();

    const res = await fetch("https://fal.run/fal-ai/flux-pro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const durationMs = Date.now() - startMs;

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Fal.ai API error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();

    // Fal.ai Flux Pro returns { images: [{ url, width, height, content_type }], seed }
    const rawImages: Array<{ url: string; width?: number; height?: number }> =
      data.images ?? [];

    const images: GeneratedImage[] = rawImages.map((img) => ({
      url: img.url,
      seed: data.seed ?? params.seed,
      width: img.width ?? width,
      height: img.height ?? height,
    }));

    const estimatedCostUsd =
      this.estimatedCostPerImage({ ...params, width, height }) * numImages;

    return {
      images,
      provider: this.id,
      model: "flux-pro",
      durationMs,
      estimatedCostUsd,
    };
  },
};
