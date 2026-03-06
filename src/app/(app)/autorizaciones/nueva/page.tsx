"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Send,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const STEPS = [
  { num: 1, label: "Iniciando sesion SSO" },
  { num: 2, label: "Navegando a autorizaciones" },
  { num: 3, label: "Buscando procedimiento" },
  { num: 4, label: "Validando procedimiento" },
  { num: 5, label: "Abriendo formulario" },
  { num: 6, label: "Llenando formulario" },
  { num: 7, label: "Subiendo archivos" },
  { num: 8, label: "Enviando solicitud" },
];

const tipoOptions = [
  { value: "6", label: "Citas con especialistas, laboratorios, radiografias y ecografias" },
  { value: "1", label: "Cirugias, resonancias y autorizaciones No PBS" },
  { value: "2", label: "Medicamentos" },
  { value: "5", label: "Reembolsos" },
];

interface ProgressEvent {
  step: number;
  message: string;
}

interface DoneEvent {
  success: boolean;
  numero?: string;
  mensaje?: string;
  error?: string;
}

export default function NuevaAutorizacionPage() {
  const router = useRouter();
  const [procedimiento, setProcedimiento] = useState("");
  const [tipo, setTipo] = useState("6");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [historia, setHistoria] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const historiaRef = useRef<HTMLInputElement>(null);

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<DoneEvent | null>(null);

  const handleSubmit = async () => {
    if (!archivo || !procedimiento) return;

    setSending(true);
    setProgress([]);
    setResult(null);

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("procedimiento", procedimiento);
    formData.append("tipo", tipo);
    formData.append("observaciones", observaciones);
    if (historia) formData.append("historia", historia);

    try {
      const res = await fetch("/api/autorizaciones/solicitar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setResult({ success: false, error: err.error });
        setSending(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventStr of events) {
          const lines = eventStr.split("\n");
          let eventName = "";
          let eventData = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7);
            if (line.startsWith("data: ")) eventData = line.slice(6);
          }
          if (!eventName || !eventData) continue;

          try {
            const data = JSON.parse(eventData);
            if (eventName === "progress") {
              setProgress((prev) => [...prev, data]);
            } else if (eventName === "done") {
              setResult(data);
            }
          } catch {}
        }
      }
    } catch {
      setResult({ success: false, error: "Error de conexion con el servidor" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/autorizaciones">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-semibold">Nueva solicitud de autorizacion</h2>
          <p className="text-sm text-muted-foreground">
            Sube la formula medica y se enviara automaticamente al portal EPS Sura
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Procedimiento */}
          <div className="space-y-2">
            <Label htmlFor="proc">Procedimiento *</Label>
            <input
              id="proc"
              type="text"
              placeholder="ej: consulta medicina general, ecografia, resonancia..."
              value={procedimiento}
              onChange={(e) => setProcedimiento(e.target.value)}
              disabled={sending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de solicitud *</Label>
            <Select value={tipo} onValueChange={setTipo} disabled={sending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Formula medica PDF */}
          <div className="space-y-2">
            <Label>Formula medica / orden (PDF) *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                sending ? "opacity-50 pointer-events-none" : "hover:border-blue-400 hover:bg-blue-50/50"
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              {archivo ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileUp className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{archivo.name}</span>
                  <span className="text-muted-foreground">
                    ({(archivo.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar la formula medica
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, TIFF (max 4MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Historia clinica (opcional) */}
          <div className="space-y-2">
            <Label>Historia clinica (opcional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                sending ? "opacity-50 pointer-events-none" : "hover:border-gray-400 hover:bg-gray-50/50"
              }`}
              onClick={() => historiaRef.current?.click()}
            >
              <input
                ref={historiaRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                className="hidden"
                onChange={(e) => setHistoria(e.target.files?.[0] || null)}
              />
              {historia ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileUp className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">{historia.name}</span>
                  <span className="text-muted-foreground">
                    ({(historia.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Clic para adjuntar historia clinica (opcional)
                </p>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="obs">Observaciones</Label>
            <textarea
              id="obs"
              placeholder="Detalle adicional (max 300 caracteres)"
              maxLength={300}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={sending}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!archivo || !procedimiento || sending}
            className="w-full gap-2"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando solicitud...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Solicitar autorizacion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress.length > 0 && (() => {
        const currentStep = progress[progress.length - 1]?.step || 0;
        const hasError = progress.some(p => p.message.includes("ERROR"));
        const stepDetails = new Map<number, string[]>();
        for (const p of progress) {
          if (!stepDetails.has(p.step)) stepDetails.set(p.step, []);
          // Only add detail lines (not the step header itself)
          if (!/^\[\d\/8\]/.test(p.message)) {
            stepDetails.get(p.step)!.push(p.message);
          }
        }

        return (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                {sending && <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />}
                {!sending && result?.success && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                {!sending && result && !result.success && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      hasError ? "bg-red-500" : result?.success ? "bg-green-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${(currentStep / 8) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {currentStep}/8
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-1">
                {STEPS.map((s) => {
                  const isDone = currentStep > s.num || (currentStep === 8 && s.num === 8 && !sending);
                  const isActive = currentStep === s.num && sending;
                  const isPending = currentStep < s.num;
                  const details = stepDetails.get(s.num) || [];
                  const stepHasWarn = details.some(d => d.includes("WARN"));
                  const stepHasError = details.some(d => d.includes("ERROR"));

                  return (
                    <div key={s.num} className={`flex items-start gap-3 py-1.5 px-2 rounded-md transition-colors ${
                      isActive ? "bg-blue-50" : ""
                    }`}>
                      <div className="mt-0.5 shrink-0">
                        {stepHasError ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : isDone && stepHasWarn ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-tight ${
                          isActive ? "text-blue-700 font-medium" :
                          isDone ? "text-foreground" :
                          "text-muted-foreground"
                        }`}>
                          {s.label}
                        </p>
                        {details.length > 0 && (currentStep >= s.num) && (
                          <div className="mt-0.5">
                            {details.map((d, i) => (
                              <p key={i} className={`text-xs ${
                                d.includes("ERROR") ? "text-red-600" :
                                d.includes("WARN") ? "text-amber-600" :
                                "text-muted-foreground"
                              }`}>
                                {d.replace(/^\s*(OK\s*:?\s*|WARN\s*:?\s*|ERROR\s*:?\s*)/, "").trim() || d.trim()}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Result */}
      {result && (
        <Card className={result.success ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
              )}
              <div>
                <h3 className="font-semibold text-lg">
                  {result.success ? "Solicitud enviada" : "Error"}
                </h3>
                {result.numero && (
                  <p className="text-sm mt-1">
                    Numero de solicitud: <strong className="font-mono">{result.numero}</strong>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {result.mensaje || result.error}
                </p>
                {result.success && (
                  <Link href="/autorizaciones">
                    <Button variant="outline" className="mt-4 gap-2" size="sm">
                      <ArrowLeft className="h-3 w-3" /> Volver a autorizaciones
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
