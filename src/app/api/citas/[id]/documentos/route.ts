import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citaId = parseInt(id, 10);

    const links = await db
      .select({ documentoId: schema.citasDocumentos.documentoId })
      .from(schema.citasDocumentos)
      .where(eq(schema.citasDocumentos.citaId, citaId));

    if (links.length === 0) return NextResponse.json([]);

    const docIds = links.map((l) => l.documentoId);
    const docs = await db
      .select()
      .from(schema.documentos)
      .where(inArray(schema.documentos.id, docIds));

    return NextResponse.json(docs);
  } catch (error) {
    console.error("[GET /api/citas/[id]/documentos]", error);
    return NextResponse.json({ error: "Error al obtener documentos" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citaId = parseInt(id, 10);
    const { documentoIds } = await request.json() as { documentoIds: number[] };

    // Clear existing links
    await db
      .delete(schema.citasDocumentos)
      .where(eq(schema.citasDocumentos.citaId, citaId));

    // Insert new links
    if (documentoIds.length > 0) {
      await db.insert(schema.citasDocumentos).values(
        documentoIds.map((documentoId) => ({ citaId, documentoId }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUT /api/citas/[id]/documentos]", error);
    return NextResponse.json({ error: "Error al actualizar documentos" }, { status: 500 });
  }
}
