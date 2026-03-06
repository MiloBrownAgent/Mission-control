import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=32.0835&longitude=-81.0998&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=2026-03-12&end_date=2026-03-16";

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
