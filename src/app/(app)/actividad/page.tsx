import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogIn,
  LogOut,
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Activity,
} from "lucide-react";

const ADMIN_EMAIL = "dsbaenar@gmail.com";

const iconMap: Record<string, typeof LogIn> = {
  inicio_sesion: LogIn,
  cierre_sesion: LogOut,
  documento_subido: Upload,
  autorizacion_creada: FileCheck,
  autorizacion_iniciada: Activity,
  autorizacion_exitosa: CheckCircle,
  autorizacion_fallida: AlertTriangle,
};

const colorMap: Record<string, string> = {
  inicio_sesion: "text-blue-500 bg-blue-100",
  cierre_sesion: "text-gray-500 bg-gray-100",
  documento_subido: "text-purple-500 bg-purple-100",
  autorizacion_creada: "text-green-500 bg-green-100",
  autorizacion_iniciada: "text-amber-500 bg-amber-100",
  autorizacion_exitosa: "text-green-600 bg-green-100",
  autorizacion_fallida: "text-red-500 bg-red-100",
};

const labelMap: Record<string, string> = {
  inicio_sesion: "Inicio de sesion",
  cierre_sesion: "Cierre de sesion",
  documento_subido: "Documento subido",
  autorizacion_creada: "Autorizacion creada",
  autorizacion_iniciada: "Autorizacion iniciada",
  autorizacion_exitosa: "Autorizacion exitosa",
  autorizacion_fallida: "Autorizacion fallida",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Hace ${diffD}d`;
}

export const dynamic = "force-dynamic";

export default async function ActividadPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const registros = await db
    .select()
    .from(schema.actividad)
    .orderBy(desc(schema.actividad.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Actividad</h1>
        <p className="text-sm text-muted-foreground">
          Registro de acciones en la plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {registros.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay actividad registrada aun
            </p>
          ) : (
            <div className="space-y-1">
              {registros.map((r) => {
                const Icon = iconMap[r.accion] || Activity;
                const color = colorMap[r.accion] || "text-gray-500 bg-gray-100";
                const label = labelMap[r.accion] || r.accion;

                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`flex items-center justify-center rounded-full p-2 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{label}</span>
                        {r.detalle && (
                          <span className="text-sm text-muted-foreground truncate">
                            — {r.detalle}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.usuario}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
