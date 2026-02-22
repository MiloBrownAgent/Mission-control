import { NextResponse } from "next/server";

// Cache weather data for 30 minutes
let cachedData: { data: WeatherData; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

interface WeatherData {
  temp: number;
  feelsLike: number;
  high: number;
  low: number;
  description: string;
  emoji: string;
  location: string;
}

function getWeatherEmoji(weatherCode: string): string {
  const code = parseInt(weatherCode);
  if (code === 113) return "☀️";
  if (code === 116) return "⛅";
  if (code === 119 || code === 122) return "☁️";
  if (code >= 143 && code <= 185) return "🌫️";
  if (code >= 200 && code <= 230) return "🌧️";
  if (code >= 260 && code <= 350) return "🌨️";
  if (code >= 353 && code <= 395) return "⛈️";
  return "🌤️";
}

export async function GET() {
  try {
    if (cachedData && Date.now() - cachedData.fetchedAt < CACHE_TTL) {
      return NextResponse.json(cachedData.data);
    }

    const res = await fetch("https://wttr.in/Minneapolis?format=j1", {
      headers: { "User-Agent": "MissionControl/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error("Weather API failed");

    const json = await res.json();
    const current = json.current_condition?.[0];
    const weather = json.weather?.[0];

    const data: WeatherData = {
      temp: Math.round((parseInt(current?.temp_F ?? "50") * 9) / 5 / 9 + 32 - parseInt(current?.temp_F ?? "50") * 0 + parseInt(current?.temp_F ?? "50")),
      feelsLike: parseInt(current?.FeelsLikeF ?? "50"),
      high: parseInt(weather?.maxtempF ?? "55"),
      low: parseInt(weather?.mintempF ?? "35"),
      description: current?.weatherDesc?.[0]?.value ?? "Partly cloudy",
      emoji: getWeatherEmoji(current?.weatherCode ?? "116"),
      location: "Minneapolis",
    };

    // Actually just parse temp_F directly
    data.temp = parseInt(current?.temp_F ?? "50");

    cachedData = { data, fetchedAt: Date.now() };
    return NextResponse.json(data);
  } catch {
    // Fallback data
    return NextResponse.json({
      temp: 28,
      feelsLike: 18,
      high: 32,
      low: 22,
      description: "Partly cloudy",
      emoji: "⛅",
      location: "Minneapolis",
    });
  }
}
