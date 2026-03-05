import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const PACIENTE_ID = 1;

export async function GET() {
  try {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];

    // 3 days from now
    const en3Dias = new Date(hoy);
    en3Dias.setDate(en3Dias.getDate() + 3);
    const en3DiasStr = en3Dias.toISOString().split("T")[0];

    const citas = await db
      .select()
      .from(schema.citas)
      .where(eq(schema.citas.pacienteId, PACIENTE_ID));

    const autorizaciones = await db
      .select()
      .from(schema.autorizaciones)
      .where(eq(schema.autorizaciones.pacienteId, PACIENTE_ID));

    const ordenes = await db
      .select()
      .from(schema.ordenes)
      .where(eq(schema.ordenes.pacienteId, PACIENTE_ID));

    const notificaciones: {
      id: string;
      tipo: "cita" | "autorizacion" | "orden";
      titulo: string;
      mensaje: string;
      urgencia: "alta" | "media" | "baja";
      fecha?: string;
    }[] = [];

    // Citas in the next 3 days
    citas
      .filter(
        (c) =>
          c.fecha >= hoyStr &&
          c.fecha <= en3DiasStr &&
          c.estado !== "cancelada" &&
          c.estado !== "completada"
      )
      .forEach((c) => {
        const esHoy = c.fecha === hoyStr;
        const esManana =
          c.fecha ===
          new Date(hoy.getTime() + 86400000).toISOString().split("T")[0];
        notificaciones.push({
          id: `cita-${c.id}`,
          tipo: "cita",
          titulo: esHoy
            ? "Cita HOY"
            : esManana
              ? "Cita MANANA"
              : "Cita proxima",
          mensaje: `${c.especialidad}${c.hora ? ` a las ${c.hora}` : ""}${c.lugar ? ` en ${c.lugar}` : ""}`,
          urgencia: esHoy ? "alta" : esManana ? "media" : "baja",
          fecha: c.fecha,
        });
      });

    // Pending authorizations
    autorizaciones
      .filter((a) => a.estado === "pendiente" || a.estado === "solicitada")
      .forEach((a) => {
        notificaciones.push({
          id: `aut-${a.id}`,
          tipo: "autorizacion",
          titulo: "Autorizacion pendiente",
          mensaje: `${a.especialidad} - ${a.tipo}`,
          urgencia: "media",
        });
      });

    // Pending orders
    ordenes
      .filter((o) => o.estado === "pendiente")
      .forEach((o) => {
        notificaciones.push({
          id: `ord-${o.id}`,
          tipo: "orden",
          titulo: "Orden por tramitar",
          mensaje: o.descripcion,
          urgencia: "baja",
        });
      });

    // Sort by urgency
    const urgenciaOrder = { alta: 0, media: 1, baja: 2 };
    notificaciones.sort(
      (a, b) => urgenciaOrder[a.urgencia] - urgenciaOrder[b.urgencia]
    );

    return NextResponse.json({
      total: notificaciones.length,
      notificaciones,
    });
  } catch (error) {
    console.error("[GET /api/notificaciones]", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}
