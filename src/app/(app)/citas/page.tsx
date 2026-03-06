import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EditarCita } from "@/components/editar-cita";

const estadoStyles: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-blue-100 text-blue-800",
  completada: "bg-gray-100 text-gray-600",
  cancelada: "bg-red-100 text-red-800",
};

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

function mapsUrl(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

export const dynamic = "force-dynamic";

export default async function CitasPage() {
  const citas = await db
    .select()
    .from(schema.citas)
    .where(eq(schema.citas.pacienteId, 1))
    .orderBy(schema.citas.fecha);

  const hoy = new Date().toISOString().split("T")[0];
  const proximas = citas.filter(
    (c) => c.fecha >= hoy && c.estado !== "cancelada" && c.estado !== "completada"
  );
  const pasadas = citas.filter(
    (c) => c.fecha < hoy || c.estado === "cancelada" || c.estado === "completada"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Proximas citas</h2>
          <p className="text-sm text-muted-foreground">
            {proximas.length} cita(s) programada(s)
          </p>
        </div>
        <Link href="/citas/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        </Link>
      </div>

      {proximas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay citas programadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proximas.map((cita) => (
            <CitaCard key={cita.id} cita={cita} />
          ))}
        </div>
      )}

      {pasadas.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8">Historial</h2>
          <div className="space-y-3">
            {pasadas.map((cita) => (
              <CitaCard key={cita.id} cita={cita} past />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CitaCard({
  cita,
  past,
}: {
  cita: typeof schema.citas.$inferSelect;
  past?: boolean;
}) {
  const meses = [
    "",
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  const dateColor = past
    ? "bg-gray-100 text-gray-500"
    : "bg-blue-100 text-blue-700";

  return (
    <Card className={`hover:shadow-md transition-shadow ${past ? "opacity-70" : ""}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[60px] lg:px-4 lg:py-3 lg:min-w-[72px] ${dateColor}`}
          >
            <span className="text-xl lg:text-2xl font-bold leading-none">
              {cita.fecha.split("-")[2]}
            </span>
            <span className="text-xs mt-0.5 lg:mt-1">
              {meses[parseInt(cita.fecha.split("-")[1])]}{" "}
              {cita.fecha.split("-")[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm lg:text-base">
                {cita.especialidad}
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[cita.estado] || "bg-gray-100 text-gray-800"}`}
              >
                {estadoLabels[cita.estado] || cita.estado}
              </span>
            </div>
            <div className="space-y-1">
              {cita.profesional && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0" /> {cita.profesional}
                </p>
              )}
              {cita.hora && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" /> {cita.hora}
                </p>
              )}
              {cita.lugar && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{cita.lugar}</span>
                </p>
              )}
              {cita.direccion && (
                <a
                  href={mapsUrl(cita.direccion)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline ml-6"
                >
                  <ExternalLink className="h-3 w-3" />
                  {cita.direccion}
                </a>
              )}
            </div>
            {cita.notas && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {cita.notas}
              </p>
            )}
            {cita.observaciones && (
              <div className="mt-2 rounded-md bg-blue-50 p-2.5">
                <p className="text-xs font-medium text-blue-800 flex items-center gap-1 mb-0.5">
                  <FileText className="h-3 w-3" /> Observaciones
                </p>
                <p className="text-xs text-blue-700 whitespace-pre-line">
                  {cita.observaciones}
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0">
            <EditarCita cita={cita} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
