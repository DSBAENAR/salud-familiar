import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const especialidad = searchParams.get("especialidad");

    const conditions = [eq(schema.citas.pacienteId, PACIENTE_ID)];

    if (estado) {
      conditions.push(eq(schema.citas.estado, estado));
    }

    if (especialidad) {
      conditions.push(eq(schema.citas.especialidad, especialidad));
    }

    const citas = await db
      .select()
      .from(schema.citas)
      .where(and(...conditions))
      .orderBy(schema.citas.fecha);

    return NextResponse.json(citas);
  } catch (error) {
    console.error("[GET /api/citas]", error);
    return NextResponse.json(
      { error: "Error al obtener las citas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { especialidad, fecha, hora, lugar, profesional, estado, notas, especialidadId, autorizacionId, emailId } = body;

    if (!especialidad || !fecha) {
      return NextResponse.json(
        { error: "Los campos especialidad y fecha son obligatorios" },
        { status: 400 }
      );
    }

    const [nueva] = await db
      .insert(schema.citas)
      .values({
        pacienteId: PACIENTE_ID,
        especialidadId: especialidadId ?? null,
        especialidad,
        profesional: profesional ?? null,
        fecha,
        hora: hora ?? null,
        lugar: lugar ?? null,
        estado: estado ?? "pendiente",
        notas: notas ?? null,
        autorizacionId: autorizacionId ?? null,
        emailId: emailId ?? null,
      })
      .returning();

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error("[POST /api/citas]", error);
    return NextResponse.json(
      { error: "Error al crear la cita" },
      { status: 500 }
    );
  }
}
