"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/citas": "Citas",
  "/autorizaciones": "Autorizaciones",
  "/documentos": "Documentos",
  "/ordenes": "Ordenes",
  "/correos": "Correos",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }
  // Handle nested routes by matching the first segment
  const segment = "/" + pathname.split("/").filter(Boolean)[0];
  return pageTitles[segment] ?? "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-sm">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Notificaciones"
        >
          <Bell className="size-5" />
          {/* Notification dot */}
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-sky-500" />
        </button>
      </div>
    </header>
  );
}
