import type { GenerateParams, GenerateResult, GeneratedImage, ImageGenProvider } from "../types";

const QUALITY_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1k": { width: 1024, height: 1024 },
  "2k": { width: 1440, height: 1440 },
  "4k": { width: 2048, height: 2048 },
};

// Replicate Flux Pro pricing: ~$0.055 per image at base (1024×1024); scale by pixel area
const BASE_COST_1K = 0.055;
const BASE_PIXELS_1K = 1024 * 1024;

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
}

async function pollUntilDone(
  predictionId: string,
  apiKey: string
): Promise<string[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Replicate poll error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const prediction: ReplicatePrediction = await res.json();

    if (prediction.status === "succeeded") {
      return prediction.output ?? [];
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(
        `Replicate prediction ${prediction.status}: ${prediction.error ?? "unknown error"}`
      );
    }

    // Still starting/processing — keep polling
  }

  throw new Error(`Replicate prediction timed out after ${POLL_TIMEOUT_MS / 1000}s`);
}

export const replicateFluxPro: ImageGenProvider = {
  id: "replicate-flux-pro",
  name: "Flux Pro (Replicate)",
  description: "Flux Pro via Replicate — slightly lower cost, async inference",

  estimatedCostPerImage(params: GenerateParams): number {
    const quality = params.quality ?? "1k";
    const dims = QUALITY_DIMENSIONS[quality] ?? QUALITY_DIMENSIONS["1k"];
    const pixels = (params.width ?? dims.width) * (params.height ?? dims.height);
    return BASE_COST_1K * (pixels / BASE_PIXELS_1K);
  },

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) {
      throw new Error("REPLICATE_API_KEY environment variable is not set");
    }

    const quality = params.quality ?? "1k";
    const dims = QUALITY_DIMENSIONS[quality] ?? QUALITY_DIMENSIONS["1k"];
    const width = params.width ?? dims.width;
    const height = params.height ?? dims.height;
    const numImages = params.numImages ?? 1;

    const input: Record<string, unknown> = {
      prompt: params.prompt,
      width,
      height,
      num_outputs: numImages,
    };

    if (params.seed !== undefined) input.seed = params.seed;

    const startMs = Date.now();

    const res = await fetch(
      `${REPLICATE_API_BASE}/models/black-forest-labs/flux-pro/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({ input }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Replicate API error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const prediction: ReplicatePrediction = await res.json();

    let outputUrls: string[];

    if (prediction.status === "succeeded") {
      // Prefer: wait returned synchronously
      outputUrls = prediction.output ?? [];
    } else if (
      prediction.status === "starting" ||
      prediction.status === "processing"
    ) {
      // Prefer: wait timed out — fall back to polling
      outputUrls = await pollUntilDone(prediction.id, apiKey);
    } else {
      throw new Error(
        `Replicate prediction ${prediction.status}: ${prediction.error ?? "unknown error"}`
      );
    }

    const durationMs = Date.now() - startMs;

    const images: GeneratedImage[] = outputUrls.map((url) => ({
      url,
      seed: params.seed,
      width,
      height,
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
