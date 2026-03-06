import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/gmail/auth";
import { syncGmailEmails } from "@/lib/gmail/sync";
import { db, schema } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json(
      { error: "No autenticado con Gmail. Conecta tu cuenta primero." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    if (force) {
      await db.delete(schema.emailsProcesados);
    }

    const result = await syncGmailEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Gmail Sync]", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
