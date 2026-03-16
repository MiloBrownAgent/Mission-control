import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-3-5-haiku-20241022";

const SOURCE_NAMES: Record<string, string> = {
  loopnet: "LoopNet",
  crexi: "Crexi",
  hennepin_sheriff: "Hennepin County Foreclosure Sale",
  ramsey_sheriff: "Ramsey County Sheriff Sale",
  hennepin_tax: "Hennepin County Tax Forfeited Land",
  ramsey_tax: "Ramsey County Tax Forfeited Land",
  court_filing: "MN Courts (Receivership/Bankruptcy)",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    address, city, state, propertyType, askPrice, score,
    scoreJustification, source, pricePerSF, squareFeet,
    capRate, units, yearBuilt, daysOnMarket, lotSize,
    assessedValue, assessedValueSource, sourceUrl,
    description, flags, riskFlags, comps,
  } = body;

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No API key configured" }, { status: 503 });
  }

  const sourceName = SOURCE_NAMES[source] || source || "Unknown";

  const metrics: Record<string, unknown> = {
    address, city, state,
    propertyType: (propertyType || "unknown").replace(/_/g, " "),
    askPrice, score, scoreJustification, source: sourceName,
  };

  // Add optional fields
  for (const [key, val] of Object.entries({
    pricePerSF, squareFeet, capRate, units, yearBuilt,
    daysOnMarket, lotSize, assessedValue, assessedValueSource,
    sourceUrl, description, flags, riskFlags, comps,
  })) {
    if (val != null) metrics[key] = val;
  }

  const prompt = `Write a concise investment memo for this commercial real estate property in the Minneapolis/St. Paul market. Be direct and analytical — this is for an experienced investor.

Property data:
\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

Source: ${sourceName}

Write the memo with these sections (use markdown headings):
## Why This Is An Opportunity — Lead with the specific reason this property stands out. What market inefficiency, pricing dislocation, or catalyst makes this worth attention RIGHT NOW? Be concrete: is it underpriced vs. assessed value? A distressed seller? Below-market $/SF for the submarket? Zoning upside? Don't be generic — explain the specific edge.
## Key Metrics — markdown table with all available metrics
## Risk Analysis — specific risks based on the data (not generic boilerplate)
## Recommendation — clear BUY/INVESTIGATE/MONITOR/PASS signal with 1-2 sentence reasoning

Guidelines:
- Score ${score}/100 context: 75+ = strong, 60-74 = worth investigating, 45-59 = monitor, <45 = pass
- If it's a distressed asset (sheriff sale, tax forfeiture, court filing), explain the discount mechanism and what due diligence is needed
- If assessed value is available, analyze the ask-to-assessed ratio as a value signal
- Compare $/SF to typical submarket rates when possible
- Keep it under 400 words
- End with source attribution`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.log(`CRE memo API error: ${res.status} ${errText.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Anthropic API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    let memo = data.content?.[0]?.text?.trim() || "";

    if (!memo || memo.length < 100) {
      return NextResponse.json({ error: "Empty memo generated" }, { status: 502 });
    }

    // Append source link
    if (sourceUrl) {
      memo += `\n\n---\n*Source: ${sourceName}*\n*[View listing](${sourceUrl})*`;
    }

    return NextResponse.json({ memo, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`CRE memo generation error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
