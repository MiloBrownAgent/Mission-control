export const runtime = "edge";
export const revalidate = 300;

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("tickers") || "";
  const tickers = raw.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 20);

  if (tickers.length < 2) {
    return NextResponse.json({ tickers, matrix: [[1]] });
  }

  try {
    const fetchCloses = async (ticker: string): Promise<number[]> => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await res.json();
      return (
        (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as (number | null)[]) || []
      ).filter((c): c is number => c != null);
    };

    const allCloses = await Promise.all(tickers.map(fetchCloses));

    // Log returns per ticker
    const allReturns = allCloses.map((closes) => {
      const returns: number[] = [];
      for (let i = 1; i < closes.length; i++) {
        returns.push(Math.log(closes[i] / closes[i - 1]));
      }
      return returns;
    });

    // Align to shortest series
    const minLen = Math.min(...allReturns.map((r) => r.length));
    if (minLen < 10) throw new Error("Insufficient data");
    const aligned = allReturns.map((r) => r.slice(r.length - minLen));

    const n = tickers.length;
    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = (arr: number[], m: number) =>
      Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);

    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) { matrix[i][j] = 1; continue; }
        const mi = mean(aligned[i]);
        const mj = mean(aligned[j]);
        const si = std(aligned[i], mi);
        const sj = std(aligned[j], mj);
        if (si === 0 || sj === 0) { matrix[i][j] = 0; continue; }
        let cov = 0;
        for (let k = 0; k < minLen; k++) {
          cov += (aligned[i][k] - mi) * (aligned[j][k] - mj);
        }
        matrix[i][j] = cov / minLen / (si * sj);
      }
    }

    return NextResponse.json({ tickers, matrix });
  } catch {
    // Fallback: identity matrix
    const n = tickers.length;
    const matrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );
    return NextResponse.json({ tickers, matrix });
  }
}
