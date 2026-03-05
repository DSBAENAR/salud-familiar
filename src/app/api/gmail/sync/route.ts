import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/gmail/auth";
import { syncGmailEmails } from "@/lib/gmail/sync";

export async function POST() {
  if (!isAuthenticated()) {
    return NextResponse.json(
      { error: "No autenticado con Gmail. Conecta tu cuenta primero." },
      { status: 401 }
    );
  }

  try {
    const result = await syncGmailEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Gmail Sync]", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
