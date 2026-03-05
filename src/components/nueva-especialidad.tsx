"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export function NuevaEspecialidad() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!nombre.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/especialidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear");
        return;
      }

      setOpen(false);
      setNombre("");
      router.refresh();
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva especialidad
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva especialidad</DialogTitle>
          <DialogDescription>
            Agrega una nueva especialidad para organizar los documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la especialidad</Label>
            <Input
              placeholder="Ej: Cardiologia, Oftalmologia..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!nombre.trim() || saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creando...
              </>
            ) : (
              "Crear especialidad"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
