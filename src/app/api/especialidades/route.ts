import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET() {
  try {
    const especialidades = await db
      .select()
      .from(schema.especialidades)
      .where(eq(schema.especialidades.pacienteId, PACIENTE_ID))
      .orderBy(schema.especialidades.nombre);

    return NextResponse.json(especialidades);
  } catch (error) {
    console.error("[GET /api/especialidades]", error);
    return NextResponse.json(
      { error: "Error al obtener las especialidades" },
      { status: 500 }
    );
  }
}
