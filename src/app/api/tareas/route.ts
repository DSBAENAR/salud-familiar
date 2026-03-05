import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const PACIENTE_ID = 1;

const TAREAS_AUTORIZACION = [
  "Solicitar autorizacion a la EPS",
  "Recibir aprobacion",
  "Buscar y agendar cita",
  "Asistir a la cita",
];

const TAREAS_ORDEN = [
  "Revisar orden medica",
  "Solicitar autorizacion (si aplica)",
  "Agendar cita o examen",
  "Completar tramite",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const autorizacionId = searchParams.get("autorizacionId");
    const ordenId = searchParams.get("ordenId");

    const conditions = [eq(schema.tareas.pacienteId, PACIENTE_ID)];
    if (autorizacionId) {
      conditions.push(
        eq(schema.tareas.autorizacionId, parseInt(autorizacionId))
      );
    }
    if (ordenId) {
      conditions.push(eq(schema.tareas.ordenId, parseInt(ordenId)));
    }

    const tareas = await db
      .select()
      .from(schema.tareas)
      .where(and(...conditions))
      .orderBy(schema.tareas.id);

    return NextResponse.json(tareas);
  } catch (error) {
    console.error("[GET /api/tareas]", error);
    return NextResponse.json(
      { error: "Error al obtener tareas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { autorizacionId, ordenId } = body;

    if (!autorizacionId && !ordenId) {
      return NextResponse.json(
        { error: "Se requiere autorizacionId o ordenId" },
        { status: 400 }
      );
    }

    const plantilla = autorizacionId ? TAREAS_AUTORIZACION : TAREAS_ORDEN;

    // Check if tasks already exist
    const conditions = [eq(schema.tareas.pacienteId, PACIENTE_ID)];
    if (autorizacionId) {
      conditions.push(eq(schema.tareas.autorizacionId, autorizacionId));
    }
    if (ordenId) {
      conditions.push(eq(schema.tareas.ordenId, ordenId));
    }

    const existentes = await db
      .select()
      .from(schema.tareas)
      .where(and(...conditions));

    if (existentes.length > 0) {
      return NextResponse.json(existentes);
    }

    const nuevas = await db
      .insert(schema.tareas)
      .values(
        plantilla.map((desc) => ({
          pacienteId: PACIENTE_ID,
          autorizacionId: autorizacionId ?? null,
          ordenId: ordenId ?? null,
          descripcion: desc,
        }))
      )
      .returning();

    return NextResponse.json(nuevas, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tareas]", error);
    return NextResponse.json(
      { error: "Error al crear tareas" },
      { status: 500 }
    );
  }
}
