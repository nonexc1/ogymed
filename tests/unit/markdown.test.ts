import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { renderMarkdown, plainText } = await import("@/features/cms/markdown");

describe("Markdown sanitizado del CMS", () => {
  it("elimina scripts, manejadores de eventos, iframes y estilos", () => {
    const html = renderMarkdown(
      'Hola <script>alert(1)</script><img src=x onerror="alert(1)"><iframe src="https://evil"></iframe><p style="color:red" onclick="x()">t</p>',
    );
    expect(html).not.toMatch(/script|onerror|onclick|iframe|style=|<img/i);
  });

  it("bloquea javascript: en enlaces y marca los externos", () => {
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("javascript:");
    expect(renderMarkdown("[fuente](https://example.org)")).toContain('rel="noopener noreferrer nofollow"');
    expect(renderMarkdown("[interno](/contacto)")).toBe('<p><a href="/contacto">interno</a></p>\n');
  });

  it("convierte h1 en h2 (la página aporta el h1)", () => {
    expect(renderMarkdown("# Título")).toContain("<h2>");
  });

  it("genera texto plano acotado para descripciones", () => {
    expect(plainText("**Hola** _mundo_", 160)).toBe("Hola mundo");
    expect(plainText("a".repeat(300), 20).length).toBe(20);
  });
});
