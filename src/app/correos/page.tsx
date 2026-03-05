"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link2,
  FileCheck,
  Calendar,
  CalendarX2,
  FileText,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SyncDetail {
  emailId: string;
  type: string;
  summary: string;
}

interface SyncResult {
  total: number;
  processed: number;
  skipped: number;
  errors: string[];
  details: SyncDetail[];
}

const typeIcons: Record<string, typeof Calendar> = {
  cita_confirmada: Calendar,
  cita_cancelada: CalendarX2,
  autorizacion_aprobada: FileCheck,
  documentos_salud: FileText,
};

const typeLabels: Record<string, string> = {
  cita_confirmada: "Cita confirmada",
  cita_cancelada: "Cita cancelada",
  autorizacion_aprobada: "Autorizacion aprobada",
  documentos_salud: "Documentos de salud",
};

const typeStyles: Record<string, string> = {
  cita_confirmada: "bg-blue-100 text-blue-700",
  cita_cancelada: "bg-red-100 text-red-700",
  autorizacion_aprobada: "bg-green-100 text-green-700",
  documentos_salud: "bg-purple-100 text-purple-700",
};

export default function CorreosPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
      } else {
        setSyncResult(data);
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sincronizacion de correos</h2>
          <p className="text-sm text-muted-foreground">
            Detecta automaticamente citas, autorizaciones y documentos de EPS Sura
          </p>
        </div>
      </div>

      {/* Connection status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center rounded-lg p-3 ${
                  connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">
                  {connected === null
                    ? "Verificando conexion..."
                    : connected
                      ? "Gmail conectado"
                      : "Gmail no conectado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {connected
                    ? "Tu cuenta de Gmail esta vinculada. Puedes sincronizar correos."
                    : "Conecta tu cuenta de Gmail para empezar a detectar correos de Sura."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {connected ? (
                <Button onClick={handleSync} disabled={syncing} className="gap-2">
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {syncing ? "Sincronizando..." : "Sincronizar ahora"}
                </Button>
              ) : (
                <a href="/api/gmail/auth">
                  <Button className="gap-2">
                    <Link2 className="h-4 w-4" /> Conectar Gmail
                  </Button>
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      {!syncResult && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center gap-3 p-4">
                <div className="flex items-center justify-center bg-blue-100 text-blue-700 rounded-full p-3">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Citas confirmadas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detecta correos de confirmacion de citas y extrae fecha, hora, especialidad y lugar
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-3 p-4">
                <div className="flex items-center justify-center bg-green-100 text-green-700 rounded-full p-3">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Autorizaciones aprobadas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detecta aprobaciones de autorizaciones con numero, especialidad y datos de la cita asignada
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-3 p-4">
                <div className="flex items-center justify-center bg-purple-100 text-purple-700 rounded-full p-3">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Documentos y ordenes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Descarga automaticamente PDFs adjuntos (ordenes de remision, historias clinicas) y crea tareas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error al sincronizar</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync results */}
      {syncResult && (
        <>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Sincronizacion completada</p>
                  <p className="text-sm text-green-800">
                    {syncResult.total} correo(s) encontrados - {syncResult.processed} procesados,{" "}
                    {syncResult.skipped} ya existentes
                    {syncResult.errors.length > 0 && `, ${syncResult.errors.length} con error`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {syncResult.details.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Correos procesados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncResult.details.map((detail, i) => {
                    const Icon = typeIcons[detail.type] || Mail;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50"
                      >
                        <div
                          className={`flex items-center justify-center rounded-lg p-2 ${typeStyles[detail.type] || "bg-gray-100 text-gray-700"}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{detail.summary}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabels[detail.type] || detail.type}
                          </p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {syncResult.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-800">Errores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {syncResult.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700">
                      {err}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
