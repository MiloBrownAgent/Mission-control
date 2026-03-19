import { NextRequest, NextResponse } from "next/server";
import { getProvider, getDefaultProvider, listProviders } from "@/lib/image-gen";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, negativePrompt, numImages, quality, providerId, seed } = body as {
    prompt?: string;
    negativePrompt?: string;
    numImages?: number;
    quality?: "1k" | "2k" | "4k";
    providerId?: string;
    seed?: number;
  };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const provider = (() => {
    try {
      return providerId ? getProvider(providerId) : getDefaultProvider();
    } catch (err) {
      return null;
    }
  })();

  if (!provider) {
    return NextResponse.json(
      { error: `Unknown provider: ${providerId}` },
      { status: 400 }
    );
  }

  try {
    const result = await provider.generate({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt as string | undefined,
      numImages: typeof numImages === "number" ? Math.min(Math.max(1, numImages), 8) : 1,
      quality: quality ?? "2k",
      seed: typeof seed === "number" ? seed : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[image-gen] generate error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json(listProviders());
}
