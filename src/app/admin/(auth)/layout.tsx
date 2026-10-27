import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8">
        <Logo />
        <p className="mt-1 text-sm text-muted">Acceso exclusivo del personal</p>
      </div>
      {children}
    </main>
  );
}
