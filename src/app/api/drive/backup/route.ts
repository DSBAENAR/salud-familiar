import { NextResponse } from "next/server";
import { backupToDrive } from "@/lib/drive/sync";

export async function POST() {
  try {
    const result = await backupToDrive();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
