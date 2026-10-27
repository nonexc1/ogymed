import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

export const DB_URL = process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return (await client.query(query, params)).rows as T[];
  } finally {
    await client.end();
  }
}

const MAIL_DIR = path.join(process.cwd(), ".dev-mail");

export type DevMail = { id: string; at: string; to: string; subject: string; text: string; html: string; attachments?: { filename: string }[] };

export async function clearMail() {
  await rm(MAIL_DIR, { recursive: true, force: true });
}

export async function mailFor(to: string, predicate: (m: DevMail) => boolean = () => true, timeoutMs = 20_000): Promise<DevMail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = await readdir(MAIL_DIR).catch(() => [] as string[]);
    const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(MAIL_DIR, f), "utf8")) as DevMail));
    const match = mails.filter((m) => m.to === to && predicate(m)).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (match) return match;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó correo para ${to}`);
}

export const codeFrom = (mail: DevMail) => /\b(\d{6})\b/.exec(mail.text)?.[1] ?? "";
