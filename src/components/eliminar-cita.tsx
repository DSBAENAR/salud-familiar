"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function EliminarCita({ id, especialidad }: { id: number; especialidad: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Eliminar cita de "${especialidad}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/citas/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al eliminar");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-red-600"
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar cita"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
