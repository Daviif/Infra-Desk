"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/tickets", label: "Chamados", icon: "📋" },
  { href: "/clients", label: "Clientes", icon: "🏢" },
  { href: "/equipment", label: "Equipamentos", icon: "💻" },
  { href: "/search", label: "Busca", icon: "🔍" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <span className="font-bold text-lg tracking-tight text-white">Infra</span>
        <span className="font-bold text-lg text-blue-400">Desk</span>
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

      <div className="px-4 py-4 border-t border-gray-700 text-xs text-gray-500">
        Infra-Desk v0.1
      </div>
    </aside>
  );
}
