import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/gmail/auth";
import { syncGmailEmails } from "@/lib/gmail/sync";
import { db, schema } from "@/lib/db";
import { isNotNull, sql } from "drizzle-orm";

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
      // Delete all records created by email sync (those with emailId set)
      // Order matters due to foreign key constraints:
      // tareas -> ordenes, tareas -> autorizaciones, citas -> autorizaciones
      await db.delete(schema.tareas).where(
        sql`${schema.tareas.ordenId} IN (SELECT id FROM ordenes WHERE email_id IS NOT NULL)
            OR ${schema.tareas.autorizacionId} IN (SELECT id FROM autorizaciones WHERE email_id IS NOT NULL)`
      );
      await db.delete(schema.documentos).where(isNotNull(schema.documentos.emailId));
      await db.delete(schema.citas).where(isNotNull(schema.citas.emailId));
      await db.delete(schema.ordenes).where(isNotNull(schema.ordenes.emailId));
      await db.delete(schema.autorizaciones).where(isNotNull(schema.autorizaciones.emailId));
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
