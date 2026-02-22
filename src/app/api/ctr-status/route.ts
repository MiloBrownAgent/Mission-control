import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min cache

interface DayStatus {
  status: "booked" | "not_booked" | "unknown";
  date: string;
  classId?: string;
}

function getNextWeekend(): { saturday: string; sunday: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);

  // If today is Saturday or Sunday, use this weekend
  if (day === 6) {
    sat.setDate(now.getDate());
    sun.setDate(now.getDate() + 1);
  } else if (day === 0) {
    sat.setDate(now.getDate() - 1);
    sun.setDate(now.getDate());
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { saturday: fmt(sat), sunday: fmt(sun) };
}

async function authenticate(): Promise<{ token: string; ssoId: string } | null> {
  try {
    const res = await fetch("https://api.lifetimefitness.com/auth/v2/login", {
      method: "POST",
      headers: {
        "ocp-apim-subscription-key": "924c03ce573d473793e184219a6a19bd",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "111814822",
        password: "Dt5weeney",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { token: data.token, ssoId: data.ssoId };
  } catch {
    return null;
  }
}

interface ProgramClass {
  id?: string;
  classId?: string;
  name?: string;
  startTime?: string;
  startDate?: string;
}

async function searchClasses(
  token: string,
  ssoId: string,
  startDate: string,
  endDate: string
): Promise<ProgramClass[]> {
  try {
    const url = `https://api.lifetimefitness.com/sys/experiences/V3/ux/programs?clubId=5&startDate=${startDate}&endDate=${endDate}&type=group_fitness`;
    const res = await fetch(url, {
      headers: {
        "ocp-apim-subscription-key": "924c03ce573d473793e184219a6a19bd",
        "x-ltf-jwe": token,
        "x-ltf-ssoid": ssoId,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // The API may return programs in various structures
    const programs: ProgramClass[] = Array.isArray(data) ? data : data.programs || data.classes || [];
    return programs;
  } catch {
    return [];
  }
}

interface Registration {
  classId?: string;
  programId?: string;
  name?: string;
  startTime?: string;
  startDate?: string;
}

async function getRegistrations(
  token: string,
  ssoId: string
): Promise<Registration[]> {
  try {
    const res = await fetch(
      "https://api.lifetimefitness.com/sys/registrations/V3/ux/members/111814823/registrations",
      {
        headers: {
          "ocp-apim-subscription-key": "924c03ce573d473793e184219a6a19bd",
          "x-ltf-jwe": token,
          "x-ltf-ssoid": ssoId,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.registrations || [];
  } catch {
    return [];
  }
}

function isCtrAt10AM(cls: ProgramClass): boolean {
  const name = (cls.name || "").toUpperCase();
  if (!name.includes("CTR")) return false;
  const time = cls.startTime || "";
  // Match 10:00 in various formats
  return time.includes("10:00") || time.includes("T10:00");
}

export async function GET() {
  const weekend = getNextWeekend();

  const auth = await authenticate();
  if (!auth) {
    return NextResponse.json({
      saturday: { status: "unknown" as const, date: weekend.saturday },
      sunday: { status: "unknown" as const, date: weekend.sunday },
    });
  }

  const [classes, registrations] = await Promise.all([
    searchClasses(auth.token, auth.ssoId, weekend.saturday, weekend.sunday),
    getRegistrations(auth.token, auth.ssoId),
  ]);

  // Find CTR classes at 10 AM on Saturday and Sunday
  const satClasses = classes.filter(
    (c) => (c.startDate || "").startsWith(weekend.saturday) && isCtrAt10AM(c)
  );
  const sunClasses = classes.filter(
    (c) => (c.startDate || "").startsWith(weekend.sunday) && isCtrAt10AM(c)
  );

  // Check registrations for CTR
  const regIds = new Set(
    registrations
      .filter((r) => {
        const name = (r.name || "").toUpperCase();
        return name.includes("CTR");
      })
      .map((r) => r.classId || r.programId)
  );

  function getDayStatus(
    dayClasses: ProgramClass[],
    date: string
  ): DayStatus {
    if (dayClasses.length === 0) {
      // No CTR class found at 10AM for this day — check registrations by date
      const regForDay = registrations.filter((r) => {
        const name = (r.name || "").toUpperCase();
        const rDate = r.startDate || "";
        return name.includes("CTR") && rDate.startsWith(date);
      });
      if (regForDay.length > 0) {
        return { status: "booked", date, classId: regForDay[0].classId || regForDay[0].programId };
      }
      return { status: "unknown", date };
    }

    const classId = dayClasses[0].id || dayClasses[0].classId;
    const isBooked = regIds.has(classId) ||
      registrations.some((r) => {
        const rDate = r.startDate || "";
        const name = (r.name || "").toUpperCase();
        return name.includes("CTR") && rDate.startsWith(date);
      });

    return {
      status: isBooked ? "booked" : "not_booked",
      date,
      classId: classId || undefined,
    };
  }

  return NextResponse.json({
    saturday: getDayStatus(satClasses, weekend.saturday),
    sunday: getDayStatus(sunClasses, weekend.sunday),
  });
}
