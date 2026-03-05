import { NextResponse } from "next/server";
import { getBackupStatus } from "@/lib/drive/sync";

export async function GET() {
  try {
    const status = await getBackupStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
