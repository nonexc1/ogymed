import { Container } from "@/components/ui/surface";

export default function NotFound() {
  return (
    <Container className="py-24">
      <h1 className="text-4xl">No encontramos esta página</h1>
      <a href="/reservar" className="mt-6 inline-flex font-semibold text-plum underline underline-offset-4">
        Ir a reservas
      </a>
    </Container>
  );
}
