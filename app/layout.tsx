import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "FlowSend — Automação de Mensagens",
  description: "Sistema de automação de mensagens WhatsApp via Chatwoot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(240 10% 8%)",
                border: "1px solid hsl(240 10% 15%)",
                color: "hsl(240 10% 95%)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
