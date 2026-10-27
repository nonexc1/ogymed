import { cn } from "@/lib/utils";

/** HTML ya sanitizado por renderMarkdown (lista blanca estricta). */
export function Prose({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  return <div className={cn("prose-ogymed", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
