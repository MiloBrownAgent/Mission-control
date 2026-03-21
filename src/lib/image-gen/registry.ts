import type { ImageGenProvider } from "./types";
import { falFluxPro } from "./providers/fal-flux-pro";
import { replicateFluxPro } from "./providers/replicate-flux-pro";

const providerRegistry: Map<string, ImageGenProvider> = new Map([
  [falFluxPro.id, falFluxPro],
  [replicateFluxPro.id, replicateFluxPro],
]);

export function getProvider(id: string): ImageGenProvider {
  const provider = providerRegistry.get(id);
  if (!provider) {
    throw new Error(
      `Unknown image provider "${id}". Available: ${[...providerRegistry.keys()].join(", ")}`
    );
  }
  return provider;
}

export function listProviders(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return [...providerRegistry.values()].map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}

export function getDefaultProvider(): ImageGenProvider {
  // Use fal.ai if FAL_API_KEY is set, otherwise fall back to Replicate
  if (process.env.FAL_API_KEY) return falFluxPro;
  return replicateFluxPro;
}
