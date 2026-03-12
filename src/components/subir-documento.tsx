"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

const tipoOptions = [
  { value: "historia_clinica", label: "Historia clinica" },
  { value: "orden", label: "Orden" },
  { value: "autorizacion", label: "Autorizacion" },
  { value: "examen", label: "Examen" },
  { value: "medicamento", label: "Medicamento" },
  { value: "cita", label: "Cita" },
];

interface Props {
  especialidades: string[];
  especialidadInicial?: string;
}

export function SubirDocumento({ especialidades, especialidadInicial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [especialidad, setEspecialidad] = useState(especialidadInicial || "");
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!file || !especialidad || !tipo) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("especialidad", especialidad);
      formData.append("tipo", tipo);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Error al subir (${res.status})`);
        return;
      }

      setOpen(false);
      setFile(null);
      setTipo("");
      if (!especialidadInicial) setEspecialidad("");
      router.refresh();
    } catch (err) {
      setError(err instanceof DOMException && err.name === "AbortError"
        ? "Tiempo agotado. Intenta de nuevo."
        : "Error de conexion. Verifica tu red.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" /> Subir documento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            Sube un archivo PDF u otro documento medico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!especialidadInicial && (
            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Select value={especialidad} onValueChange={setEspecialidad}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp} value={esp}>
                      {esp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
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

          <div className="space-y-2">
            <Label>Archivo</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileUp className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar un archivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG, DOC
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!file || !especialidad || !tipo || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Subiendo...
              </>
            ) : (
              "Subir documento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
