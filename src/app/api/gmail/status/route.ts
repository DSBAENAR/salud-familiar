import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/gmail/auth";

export async function GET() {
  return NextResponse.json({ connected: isAuthenticated() });
}
