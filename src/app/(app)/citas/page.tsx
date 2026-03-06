import { db, schema } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  ExternalLink,
  FileText,
  Paperclip,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EditarCita } from "@/components/editar-cita";
import { EliminarCita } from "@/components/eliminar-cita";

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

  // Load linked documents for all citas
  const citaIds = citas.map((c) => c.id);
  const allLinks = citaIds.length > 0
    ? await db
        .select()
        .from(schema.citasDocumentos)
        .where(inArray(schema.citasDocumentos.citaId, citaIds))
    : [];

  const docIds = [...new Set(allLinks.map((l) => l.documentoId))];
  const allDocs = docIds.length > 0
    ? await db
        .select()
        .from(schema.documentos)
        .where(inArray(schema.documentos.id, docIds))
    : [];

  const docsMap = new Map(allDocs.map((d) => [d.id, d]));
  const docsPorCita = new Map<number, typeof allDocs>();
  for (const link of allLinks) {
    const doc = docsMap.get(link.documentoId);
    if (doc) {
      const arr = docsPorCita.get(link.citaId) || [];
      arr.push(doc);
      docsPorCita.set(link.citaId, arr);
    }
  }

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
            <CitaCard key={cita.id} cita={cita} documentos={docsPorCita.get(cita.id) || []} />
          ))}
        </div>
      )}

      {pasadas.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8">Historial</h2>
          <div className="space-y-3">
            {pasadas.map((cita) => (
              <CitaCard key={cita.id} cita={cita} documentos={docsPorCita.get(cita.id) || []} past />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CitaCard({
  cita,
  documentos,
  past,
}: {
  cita: typeof schema.citas.$inferSelect;
  documentos: typeof schema.documentos.$inferSelect[];
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
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline ml-6"
                >
                  <ExternalLink className="h-4 w-4" />
                  {cita.direccion}
                </a>
              )}
            </div>
            {cita.notas && (
              <p className="text-sm text-muted-foreground mt-3 italic">
                {cita.notas}
              </p>
            )}
            {cita.observaciones && (
              <div className="mt-3 rounded-md bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5 mb-1">
                  <FileText className="h-4 w-4" /> Observaciones
                </p>
                <p className="text-sm text-blue-700 whitespace-pre-line">
                  {cita.observaciones}
                </p>
              </div>
            )}
            {documentos.length > 0 && (
              <div className="mt-3 rounded-md bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5 mb-2">
                  <Paperclip className="h-4 w-4" /> Documentos para llevar ({documentos.length})
                </p>
                <div className="space-y-1">
                  {documentos.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.rutaArchivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900 hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{doc.nombre}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <EditarCita cita={cita} />
            <EliminarCita id={cita.id} especialidad={cita.especialidad} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
