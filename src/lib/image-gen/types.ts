export interface GenerateParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numImages?: number;
  quality?: "1k" | "2k" | "4k";
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  seed?: number;
  width?: number;
  height?: number;
}

export interface GenerateResult {
  images: GeneratedImage[];
  provider: string;
  model: string;
  durationMs: number;
  estimatedCostUsd: number;
}

export interface ImageGenProvider {
  id: string;
  name: string;
  description: string;
  estimatedCostPerImage(params: GenerateParams): number;
  generate(params: GenerateParams): Promise<GenerateResult>;
}
