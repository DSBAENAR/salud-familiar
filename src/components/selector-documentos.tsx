"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Paperclip,
  Search,
  FolderOpen,
  ChevronDown,
  FileText,
  Check,
} from "lucide-react";

interface Doc {
  id: number;
  nombre: string;
  especialidad: string;
  tipo: string;
}

export function SelectorDocumentos({
  docs,
  selectedIds,
  onConfirm,
}: {
  docs: Doc[];
  selectedIds: Set<number>;
  onConfirm: (ids: Set<number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedEsp, setExpandedEsp] = useState<string | null>(null);
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [localSelected, setLocalSelected] = useState<Set<number>>(new Set());

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setLocalSelected(new Set(selectedIds));
      setExpandedEsp(null);
      setSearches({});
    }
    setOpen(isOpen);
  }

  function toggleDoc(id: number) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(localSelected);
    setOpen(false);
  }

  const grouped = docs.reduce<Record<string, Doc[]>>((acc, doc) => {
    (acc[doc.especialidad] ||= []).push(doc);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full gap-2">
          <Paperclip className="h-4 w-4" />
          Seleccionar documentos
          {selectedIds.size > 0 && (
            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs ml-auto">
              {selectedIds.size}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documentos para llevar</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md min-h-0">
          {Object.entries(grouped).map(([esp, espDocs]) => {
            const isOpen = expandedEsp === esp;
            const selectedCount = espDocs.filter((d) => localSelected.has(d.id)).length;
            const query = (searches[esp] || "").toLowerCase();
            const filtered = query
              ? espDocs.filter((d) => d.nombre.toLowerCase().includes(query))
              : espDocs;

            return (
              <div key={esp}>
                <button
                  type="button"
                  onClick={() => setExpandedEsp(isOpen ? null : esp)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-accent border-b"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{esp}</span>
                  {selectedCount > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                      {selectedCount}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{espDocs.length}</span>
                </button>
                {isOpen && (
                  <div className="border-b">
                    <div className="relative px-3 py-2 border-b bg-muted/30">
                      <Search className="absolute left-5.5 top-4.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Buscar en ${esp}...`}
                        value={searches[esp] || ""}
                        onChange={(e) =>
                          setSearches((prev) => ({ ...prev, [esp]: e.target.value }))
                        }
                        className="pl-9 h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">
                          Sin resultados
                        </p>
                      ) : (
                        filtered.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => toggleDoc(doc.id)}
                            className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                              localSelected.has(doc.id) ? "bg-blue-50" : ""
                            }`}
                          >
                            <div
                              className={`flex items-center justify-center h-5 w-5 rounded border shrink-0 ${
                                localSelected.has(doc.id)
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-gray-300"
                              }`}
                            >
                              {localSelected.has(doc.id) && <Check className="h-3 w-3" />}
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="truncate">{doc.nombre}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {localSelected.size} documento(s) seleccionado(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
