export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function isAdminAuthed(request: NextRequest): boolean {
  return request.cookies.get("mc_work_auth")?.value === "authenticated";
}

// DELETE /api/portal/users/[id] — deactivate or hard-delete a portal user (admin only)
// Pass ?hard=true to permanently delete, otherwise deactivates
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const hard = searchParams.get("hard") === "true";

  try {
    const convexId = id as Id<"portalUsers">;
    if (hard) {
      await fetchMutation(api.portalUsers.deleteUser, { id: convexId });
      return NextResponse.json({ success: true, deleted: true });
    } else {
      await fetchMutation(api.portalUsers.deactivateUser, { id: convexId });
      return NextResponse.json({ success: true, deactivated: true });
    }
  } catch (err) {
    console.error("[portal/users/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
