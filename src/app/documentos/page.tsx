import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  FolderOpen,
  FileText,
  ChevronRight,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const tipoLabels: Record<string, string> = {
  historia_clinica: "Historias clinicas",
  orden: "Ordenes",
  autorizacion: "Autorizaciones",
  examen: "Examenes",
  medicamento: "Medicamentos",
  cita: "Citas",
};

const tipoIcons: Record<string, string> = {
  historia_clinica: "bg-blue-100 text-blue-700",
  orden: "bg-purple-100 text-purple-700",
  autorizacion: "bg-green-100 text-green-700",
  examen: "bg-amber-100 text-amber-700",
  medicamento: "bg-red-100 text-red-700",
  cita: "bg-cyan-100 text-cyan-700",
};

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const especialidades = await db
    .select()
    .from(schema.especialidades)
    .where(eq(schema.especialidades.pacienteId, 1));

  const documentos = await db
    .select()
    .from(schema.documentos)
    .where(eq(schema.documentos.pacienteId, 1));

  const docsPorEspecialidad = especialidades.map((esp) => ({
    ...esp,
    documentos: documentos.filter((d) => d.especialidad === esp.nombre),
  }));

  const categorias = ["cita", "historia_clinica", "autorizacion", "orden", "examen", "medicamento"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Documentos medicos</h2>
          <p className="text-sm text-muted-foreground">
            Organizados por especialidad - {documentos.length} documento(s) total
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" /> Subir documento
        </Button>
      </div>

      {especialidades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay especialidades registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docsPorEspecialidad.map((esp) => (
            <Link key={esp.id} href={`/documentos/${encodeURIComponent(esp.nombre)}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center bg-slate-100 text-slate-700 rounded-lg p-2">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{esp.nombre}</CardTitle>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categorias.map((cat) => {
                    const count = esp.documentos.filter((d) => d.tipo === cat).length;
                    return (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${tipoIcons[cat]?.split(" ")[0] || "bg-gray-100"}`} />
                          <span className="text-muted-foreground">{tipoLabels[cat]}</span>
                        </div>
                        <span className="text-muted-foreground font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">{esp.documentos.length} documento(s)</p>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
