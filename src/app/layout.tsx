import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Infra-Desk",
  description: "Sistema de suporte técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
