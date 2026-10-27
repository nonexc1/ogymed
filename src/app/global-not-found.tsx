import type { Metadata } from "next";

import "./globals.css";

import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: "Página no encontrada · OGYMED",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="es-PE" className={fontVariables}>
      <body>
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
          <p className="font-display text-2xl tracking-[0.08em] text-plum-strong">OGYMED</p>
          <h1 className="mt-8 text-4xl">No encontramos esta página</h1>
          <p className="mt-3 text-lg text-muted">Puede que la dirección haya cambiado o que la página ya no esté disponible.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/" className="inline-flex min-h-11 items-center rounded-full bg-plum px-5 font-semibold text-ivory">
              Ir a la portada
            </a>
            <a href="/contacto" className="inline-flex min-h-11 items-center rounded-full border border-plum/30 px-5 font-semibold text-plum">
              Contacto
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
