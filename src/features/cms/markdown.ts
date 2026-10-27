import "server-only";

import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

const marked = new Marked({ gfm: true, breaks: false, async: false });

/**
 * Markdown → HTML sanitizado con lista blanca estricta: sin scripts, estilos, iframes ni atributos
 * de eventos. Los encabezados empiezan en h2 (la página aporta el h1).
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md?.trim()) return "";
  const raw = marked.parse(md) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "a", "blockquote", "code", "pre", "hr", "br",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: { a: ["href", "rel", "target"], th: ["scope"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      h1: "h2",
      h5: "h4",
      h6: "h4",
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href);
        const next: Record<string, string> = { href };
        if (external) Object.assign(next, { rel: "noopener noreferrer nofollow", target: "_blank" });
        return { tagName, attribs: next };
      },
    },
  });
}

/** Texto plano para descripciones (sin marcado). */
export function plainText(md: string | null | undefined, max = 160): string {
  const text = sanitizeHtml(marked.parse(md ?? "") as string, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
