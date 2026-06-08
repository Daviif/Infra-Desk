"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionUser } from "@/lib/auth";
import { useTheme } from "@/components/ThemeProvider";

const BASE_LINKS = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/tickets", label: "Chamados", icon: "📋" },
  { href: "/clients", label: "Clientes", icon: "🏢" },
  { href: "/equipment", label: "Equipamentos", icon: "💻" },
  { href: "/monitor", label: "Monitoramento", icon: "📡" },
  { href: "/search", label: "Busca", icon: "🔍" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const { isDark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser);
  }, []);

  const links = user?.role === "admin"
    ? [...BASE_LINKS, { href: "/users", label: "Usuários", icon: "👥" }]
    : BASE_LINKS;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className={[
      "fixed inset-y-0 left-0 z-50 w-56 bg-gray-900 text-gray-100 flex flex-col",
      "transition-transform duration-200 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full",
      "md:static md:translate-x-0 md:z-auto",
    ].join(" ")}>
      <div className="px-5 py-5 border-b border-gray-700 flex items-center justify-between">
        <div>
          <span className="font-bold text-lg tracking-tight text-white">Infra</span>
          <span className="font-bold text-lg text-blue-400">Desk</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="md:hidden p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700 space-y-2">
        {user && (
          <div className="px-1 pb-1">
            <div className="text-xs font-medium text-gray-300 truncate">{user.name}</div>
            <div className="text-xs text-gray-500">
              {user.role === "admin" ? "Administrador" : "Técnico"}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Infra-Desk v0.1</span>
          <button
            onClick={toggleTheme}
            title={isDark ? "Modo claro" : "Modo escuro"}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {isDark ? "☀" : "☾"}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <span>↩</span> Sair
        </button>
      </div>
    </aside>
  );
}
