import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET() {
  try {
    const [
      citasPendientesResult,
      citasConfirmadasResult,
      autorizacionesPendientesResult,
      autorizacionesAprobadasResult,
      ordenesPendientesResult,
    ] = await Promise.all([
      db
        .select({ total: count() })
        .from(schema.citas)
        .where(
          and(
            eq(schema.citas.pacienteId, PACIENTE_ID),
            eq(schema.citas.estado, "pendiente")
          )
        ),
      db
        .select({ total: count() })
        .from(schema.citas)
        .where(
          and(
            eq(schema.citas.pacienteId, PACIENTE_ID),
            eq(schema.citas.estado, "confirmada")
          )
        ),
      db
        .select({ total: count() })
        .from(schema.autorizaciones)
        .where(
          and(
            eq(schema.autorizaciones.pacienteId, PACIENTE_ID),
            eq(schema.autorizaciones.estado, "pendiente")
          )
        ),
      db
        .select({ total: count() })
        .from(schema.autorizaciones)
        .where(
          and(
            eq(schema.autorizaciones.pacienteId, PACIENTE_ID),
            eq(schema.autorizaciones.estado, "aprobada")
          )
        ),
      db
        .select({ total: count() })
        .from(schema.ordenes)
        .where(
          and(
            eq(schema.ordenes.pacienteId, PACIENTE_ID),
            eq(schema.ordenes.estado, "pendiente")
          )
        ),
    ]);

    return NextResponse.json({
      citasPendientes: citasPendientesResult[0]?.total ?? 0,
      citasConfirmadas: citasConfirmadasResult[0]?.total ?? 0,
      autorizacionesPendientes: autorizacionesPendientesResult[0]?.total ?? 0,
      autorizacionesAprobadas: autorizacionesAprobadasResult[0]?.total ?? 0,
      ordenesPendientes: ordenesPendientesResult[0]?.total ?? 0,
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json(
      { error: "Error al obtener las estadísticas" },
      { status: 500 }
    );
  }
}
