import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  const { ticker, name, dataBlock, newsBlock } = await req.json();

  if (!ticker || !dataBlock) {
    return NextResponse.json({ error: "Missing ticker or dataBlock" }, { status: 400 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No API key" }, { status: 503 });
  }

  const prompt = `You are a sharp, data-driven investment analyst writing for an experienced investor. Write a concise opportunity thesis for ${ticker} (${name || ticker}).

VERIFIED DATA:
${dataBlock}
${newsBlock || ""}

Write a thesis in this EXACT format (plain text, no markdown, no headers):

Line 1: One sentence on what the company does and how it makes money.
Line 2-3: WHY this is an opportunity RIGHT NOW. Be specific — what catalyst, valuation gap, or market mispricing exists? Use real numbers from the data above.
Line 4: Valuation context — how does current valuation compare to growth rate and peers? Is the market over/under-pricing something specific?
Line 5: The key risk in one sentence.

Then return a JSON block with structured data:

THESIS_JSON:
{
  "opportunityType": "growth_catalyst|momentum_breakout|contrarian_recovery|asymmetric_setup|earnings_momentum|secular_growth|catalyst_pullback|growth_inflection",
  "catalysts": ["3 specific catalysts with numbers/dates where possible"],
  "risks": ["3 specific risks — not generic boilerplate"],
  "timeHorizon": "3-6 months or 6-12 months",
  "expectedUpside": "X-Y% (timeframe) with reasoning",
  "moralScreenPass": true
}

Rules:
- Use ACTUAL numbers from the data — market cap, revenue, P/E, margins, analyst targets
- Never say "N/A" when the data provides the number
- Never say "see thesis for details" — BE the details
- If the company is involved in surveillance, weapons targeting, or social media manipulation, set moralScreenPass to false
- Keep the thesis under 200 words — dense, not verbose`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json({ error: `Anthropic: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "";

    // Split thesis text from JSON block
    const jsonSplit = text.indexOf("THESIS_JSON:");
    let thesisText = jsonSplit > 0 ? text.slice(0, jsonSplit).trim() : text;
    let structured: Record<string, unknown> = {};

    if (jsonSplit > 0) {
      const jsonStr = text.slice(jsonSplit + "THESIS_JSON:".length).trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { structured = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    return NextResponse.json({
      thesis: thesisText,
      ...structured,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
