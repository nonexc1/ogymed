import { Container } from "@/components/ui/surface";

export default function Loading() {
  return (
    <Container className="py-16" aria-busy="true">
      <p role="status" className="text-muted">
        Cargando la agenda…
      </p>
    </Container>
  );
}
