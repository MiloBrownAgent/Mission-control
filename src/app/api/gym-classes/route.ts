import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min cache

const API_KEY = "924c03ce573d473793e184219a6a19bd";
const AMANDA_MEMBER_ID = "111814823";
const DAVE_MEMBER_ID = "111814822";

function getNextWeekend(): { saturday: string; sunday: string } {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  if (day === 6) { sat.setDate(now.getDate()); sun.setDate(now.getDate() + 1); }
  else if (day === 0) { sat.setDate(now.getDate() - 1); sun.setDate(now.getDate()); }
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { saturday: fmt(sat), sunday: fmt(sun) };
}

async function authenticate() {
  try {
    const res = await fetch("https://api.lifetimefitness.com/auth/v2/login", {
      method: "POST",
      headers: { "ocp-apim-subscription-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ username: "111814822", password: "Dt5weeney" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { token: data.token, ssoId: data.ssoId };
  } catch { return null; }
}

interface Reg {
  classId?: string;
  programId?: string;
  eventId?: string;
  name?: string;
  startDate?: string;
  startTime?: string;
  location?: string;
}

async function getRegistrations(token: string, ssoId: string, memberId: string): Promise<Reg[]> {
  try {
    const res = await fetch(
      `https://api.lifetimefitness.com/sys/registrations/V3/ux/members/${memberId}/registrations`,
      { headers: { "ocp-apim-subscription-key": API_KEY, "x-ltf-jwe": token, "x-ltf-ssoid": ssoId } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.registrations || [];
  } catch { return []; }
}

function formatClassEntry(reg: Reg) {
  return {
    name: reg.name || "Class",
    date: reg.startDate?.slice(0, 10) || "",
    time: reg.startTime || "",
  };
}

export async function GET() {
  const weekend = getNextWeekend();
  const auth = await authenticate();

  if (!auth) {
    return NextResponse.json({
      amanda: { saturday: { status: "unknown", date: weekend.saturday }, sunday: { status: "unknown", date: weekend.sunday } },
      dave: { upcoming: [] },
    });
  }

  const [amandaRegs, daveRegs] = await Promise.all([
    getRegistrations(auth.token, auth.ssoId, AMANDA_MEMBER_ID),
    getRegistrations(auth.token, auth.ssoId, DAVE_MEMBER_ID),
  ]);

  // Amanda: check CTR on Saturday + Sunday
  function amandaCtrStatus(date: string) {
    const booked = amandaRegs.some((r) => {
      const name = (r.name || "").toUpperCase();
      const d = r.startDate || "";
      return name.includes("CTR") && d.startsWith(date);
    });
    return { status: booked ? "booked" as const : "not_booked" as const, date };
  }

  // Dave: all upcoming classes this weekend
  const daveWeekend = daveRegs
    .filter((r) => {
      const d = r.startDate || "";
      return d.startsWith(weekend.saturday) || d.startsWith(weekend.sunday);
    })
    .map(formatClassEntry);

  return NextResponse.json({
    amanda: {
      saturday: amandaCtrStatus(weekend.saturday),
      sunday: amandaCtrStatus(weekend.sunday),
    },
    dave: { upcoming: daveWeekend },
  });
}
