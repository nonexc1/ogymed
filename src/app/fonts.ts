import localFont from "next/font/local";

// Autoalojadas (SIL OFL 1.1, ver ./fonts/LICENSE-OFL.txt). Sin peticiones a terceros.
export const fraunces = localFont({
  src: "./fonts/fraunces-latin-opsz.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const figtree = localFont({
  src: [
    { path: "./fonts/figtree-latin-wght.woff2", style: "normal", weight: "300 900" },
    { path: "./fonts/figtree-latin-wght-italic.woff2", style: "italic", weight: "300 900" },
  ],
  variable: "--font-figtree",
  display: "swap",
});

export const fontVariables = `${fraunces.variable} ${figtree.variable}`;
