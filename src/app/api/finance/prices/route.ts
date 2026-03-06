import { NextResponse } from "next/server";

const TICKERS = ["SEZL", "ONDS", "IREN", "HIMS"];

const TICKER_NAMES: Record<string, string> = {
  SEZL: "Sezzle",
  ONDS: "Ondas Holdings",
  IREN: "Iris Energy",
  HIMS: "Hims & Hers",
};

interface PriceData {
  price: number;
  prevClose: number;
  changePercent: number;
  name: string;
}

// In-memory cache: returns stale data on error
let cache: { data: Record<string, PriceData>; fetchedAt: number } | null = null;

async function fetchTickerPrice(ticker: string): Promise<PriceData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ticker}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No result for ${ticker}`);

  const closes: number[] = result.indicators.quote[0].close;
  // Filter out nulls (current partial day may be null)
  const validCloses = closes.filter((c: number | null) => c != null);
  if (validCloses.length < 2) throw new Error(`Not enough close data for ${ticker}`);

  const price = validCloses[validCloses.length - 1];
  const prevClose = validCloses[validCloses.length - 2];
  const changePercent = ((price - prevClose) / prevClose) * 100;

  return {
    price,
    prevClose,
    changePercent,
    name: TICKER_NAMES[ticker] ?? ticker,
  };
}

export async function GET() {
  try {
    const results = await Promise.all(
      TICKERS.map(async (ticker) => {
        try {
          const data = await fetchTickerPrice(ticker);
          return [ticker, data] as const;
        } catch (err) {
          console.error(`Failed to fetch ${ticker}:`, err);
          // If we have cached data, use it
          if (cache?.data[ticker]) {
            return [ticker, cache.data[ticker]] as const;
          }
          throw err;
        }
      })
    );

    const data = Object.fromEntries(results);
    cache = { data, fetchedAt: Date.now() };

    return NextResponse.json({ data, fetchedAt: Date.now() });
  } catch (err) {
    console.error("Finance prices fetch error:", err);

    // Return cached data if available
    if (cache) {
      return NextResponse.json(
        { data: cache.data, fetchedAt: cache.fetchedAt, stale: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
