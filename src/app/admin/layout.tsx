import type { Metadata, Viewport } from "next";

import "../globals.css";

import { fontVariables } from "../fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Panel · OGYMED", template: "%s · Panel OGYMED" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#faf8f5", width: "device-width", initialScale: 1 };

/** Root layout del panel: sin analítica, sin indexación, siempre dinámico y sin caché compartida. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className={fontVariables}>
      <body className="min-h-dvh bg-ivory">{children}</body>
    </html>
  );
}
