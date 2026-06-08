import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Infra-Desk",
  description: "Sistema de suporte técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: aplica o tema antes do React hidratar */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t=localStorage.getItem('theme');
            var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
            if(t==='dark'||(!t&&d))document.documentElement.classList.add('dark');
          })();
        `}} />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
