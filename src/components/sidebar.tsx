"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  FileCheck,
  FolderOpen,
  ClipboardList,
  Mail,
  HeartPulse,
  LogOut,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Citas", href: "/citas", icon: Calendar },
  { label: "Autorizaciones", href: "/autorizaciones", icon: FileCheck },
  { label: "Documentos", href: "/documentos", icon: FolderOpen },
  { label: "Ordenes", href: "/ordenes", icon: ClipboardList },
  { label: "Correos", href: "/correos", icon: Mail },
];

const ADMIN_EMAIL = "dsbaenar@gmail.com";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0f172a] text-white">
      {/* App branding */}
      <div className="flex flex-col gap-1 px-6 pt-8 pb-6">
        <div className="flex items-center gap-2.5">
          <HeartPulse className="size-7 text-sky-400" />
          <span className="text-lg font-semibold tracking-tight text-white">
            Salud Familiar
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-400">Paciente</p>
        <p className="text-[15px] font-semibold text-slate-200">
          Alvaro Baena
        </p>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-slate-700/60" />

      {/* Navigation */}
      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px] transition-colors duration-200",
                  isActive
                    ? "text-sky-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              {item.label}
            </Link>
          );
        })}
        {session?.user?.email === ADMIN_EMAIL && (
          <>
            <div className="mx-3 my-2 h-px bg-slate-700/60" />
            <Link
              href="/actividad"
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                pathname === "/actividad"
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Activity
                className={cn(
                  "size-[18px] transition-colors duration-200",
                  pathname === "/actividad"
                    ? "text-sky-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              Actividad
            </Link>
          </>
        )}
      </nav>

      {/* User + Footer */}
      <div className="px-4 py-4 space-y-3">
        {session?.user && (
          <div className="flex items-center gap-3 px-2">
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-7 w-7 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">
                {session.user.name}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="px-2 text-xs text-slate-600">Salud Familiar v0.1</p>
      </div>
    </aside>
  );
}
