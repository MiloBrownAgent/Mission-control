import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.toUpperCase().trim();
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } });
    const data = await res.json();

    const result = data?.chart?.result?.[0];
    if (!result) return NextResponse.json({ error: "Ticker not found" }, { status: 404 });

    const meta = result.meta;
    const closes: number[] = result.indicators.quote[0].close.filter((c: number | null) => c != null);

    // Log returns
    const logReturns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }

    const n = logReturns.length;
    const mean = logReturns.reduce((s, v) => s + v, 0) / n;
    const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const dailyVol = Math.sqrt(variance);

    const annualizedVol = dailyVol * Math.sqrt(252);
    const rawDrift = mean * 252;
    // Cap drift at realistic bounds — historical 1yr return is a terrible
    // predictor of future drift. Max 25% (aggressive growth), min -30%.
    const cappedDrift = Math.max(-0.30, Math.min(0.25, rawDrift));

    return NextResponse.json({
      ticker,
      name: meta.longName || meta.shortName || ticker,
      price: meta.regularMarketPrice,
      currency: meta.currency || "USD",
      volatility: annualizedVol,
      drift: cappedDrift,
      rawDrift,          // send raw so UI can warn if capped
      dataPoints: n,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
