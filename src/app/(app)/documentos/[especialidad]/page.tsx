import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  FileText,
  ArrowLeft,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SubirDocumento } from "@/components/subir-documento";

const tipoLabels: Record<string, string> = {
  historia_clinica: "Historia clinica",
  orden: "Orden",
  autorizacion: "Autorizacion",
  examen: "Examen",
  medicamento: "Medicamento",
  cita: "Cita",
};

const tipoStyles: Record<string, string> = {
  historia_clinica: "bg-blue-100 text-blue-700",
  orden: "bg-purple-100 text-purple-700",
  autorizacion: "bg-green-100 text-green-700",
  examen: "bg-amber-100 text-amber-700",
  medicamento: "bg-red-100 text-red-700",
  cita: "bg-cyan-100 text-cyan-700",
};

export const dynamic = "force-dynamic";

export default async function EspecialidadDocumentosPage({
  params,
}: {
  params: Promise<{ especialidad: string }>;
}) {
  const { especialidad } = await params;
  const nombreEspecialidad = decodeURIComponent(especialidad);

  const documentos = await db
    .select()
    .from(schema.documentos)
    .where(
      and(
        eq(schema.documentos.pacienteId, 1),
        eq(schema.documentos.especialidad, nombreEspecialidad)
      )
    )
    .orderBy(schema.documentos.createdAt);

  const categorias = ["autorizacion", "historia_clinica", "orden", "examen", "medicamento", "cita"];

  const docsPorTipo = categorias
    .map((tipo) => ({
      tipo,
      label: tipoLabels[tipo] || tipo,
      style: tipoStyles[tipo] || "bg-gray-100 text-gray-700",
      docs: documentos.filter((d) => d.tipo === tipo),
    }))
    .filter((g) => g.docs.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/documentos">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{nombreEspecialidad}</h2>
          <p className="text-sm text-muted-foreground">{documentos.length} documento(s)</p>
        </div>
        <SubirDocumento especialidades={[nombreEspecialidad]} especialidadInicial={nombreEspecialidad} />
      </div>

      {documentos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay documentos en esta especialidad</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {docsPorTipo.map((grupo) => (
            <div key={grupo.tipo}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {grupo.label}s ({grupo.docs.length})
              </h3>
              <div className="space-y-2">
                {grupo.docs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.rutaArchivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="hover:shadow-md transition-shadow hover:border-blue-200">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center rounded-lg p-2.5 ${grupo.style}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{doc.nombre}</p>
                              {doc.encriptado && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 shrink-0">
                                  <Lock className="h-2.5 w-2.5" />
                                  No se pudo desencriptar
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const d = new Date(doc.createdAt);
                                return isNaN(d.getTime())
                                  ? "Sin fecha"
                                  : d.toLocaleDateString("es-CO", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    });
                              })()}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
