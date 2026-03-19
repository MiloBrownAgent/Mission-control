import { NextResponse } from "next/server";
import { listProviders } from "@/lib/image-gen";

export async function GET() {
  return NextResponse.json(listProviders());
}
