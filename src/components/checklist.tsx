"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2, ListChecks } from "lucide-react";

interface Tarea {
  id: number;
  descripcion: string;
  completada: boolean;
}

interface Props {
  autorizacionId?: number;
  ordenId?: number;
}

export function Checklist({ autorizacionId, ordenId }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Create tasks if they don't exist
        await fetch("/api/tareas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autorizacionId, ordenId }),
        });

        // Fetch tasks
        const param = autorizacionId
          ? `autorizacionId=${autorizacionId}`
          : `ordenId=${ordenId}`;
        const res = await fetch(`/api/tareas?${param}`);
        if (res.ok) {
          setTareas(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [autorizacionId, ordenId]);

  const toggle = async (tarea: Tarea) => {
    setToggling((prev) => ({ ...prev, [tarea.id]: true }));
    try {
      const res = await fetch(`/api/tareas/${tarea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: !tarea.completada }),
      });
      if (res.ok) {
        setTareas((prev) =>
          prev.map((t) =>
            t.id === tarea.id ? { ...t, completada: !t.completada } : t
          )
        );
      }
    } finally {
      setToggling((prev) => ({ ...prev, [tarea.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando checklist...
      </div>
    );
  }

  if (tareas.length === 0) return null;

  const completadas = tareas.filter((t) => t.completada).length;
  const progreso = Math.round((completadas / tareas.length) * 100);

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          Checklist
        </div>
        <span className="text-xs text-muted-foreground">
          {completadas}/{tareas.length} ({progreso}%)
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progreso}%` }}
        />
      </div>

      <div className="space-y-1">
        {tareas.map((tarea) => (
          <button
            key={tarea.id}
            onClick={() => toggle(tarea)}
            disabled={toggling[tarea.id]}
            className="flex items-center gap-2 w-full text-left py-1 px-1 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 group"
          >
            {toggling[tarea.id] ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            ) : tarea.completada ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
            )}
            <span
              className={`text-xs ${tarea.completada ? "line-through text-muted-foreground" : "text-gray-700"}`}
            >
              {tarea.descripcion}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
