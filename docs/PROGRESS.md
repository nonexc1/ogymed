# Progreso de OGYMED

Última actualización: 2026-10-27.

## Estado por fase

| Fase | Estado |
|---|---|
| 1. Auditoría, decisiones, datos faltantes, esquema y sistema visual | En curso |
| 2. Web pública | Pendiente |
| 3. Supabase, migraciones, Auth/RLS, admin y CMS | Esquema, RLS y funciones listos y probados; panel pendiente |
| 4. Agenda y reserva transaccional | Lógica SQL lista y probada; API y UI pendientes |
| 5. SEO local, consentimiento, analítica | Pendiente |
| 6. QA y preparación de despliegue | Pendiente |

## Hecho

* Repositorio vacío inicializado: Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3, pnpm 10.28, Node 22.
* Supabase local (CLI 2.122, Postgres 17) con Auth sin registro público y MFA TOTP habilitado.
* Migraciones `supabase/migrations/2026102700010x_*.sql`: fundaciones, catálogo/horarios, CMS, agenda,
  operación. Diseño de capacidad documentado en `ARCHITECTURE.md` §5.
* Pruebas SQL reales (`tests/db`, 39 casos) en verde.

## Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `pnpm exec supabase db reset` | 5 migraciones aplicadas sin errores |
| `pnpm test:db` | 2 archivos, 39 pruebas OK |

## Siguiente tarea

Web pública (fase 2) y API de reservas (fase 4).
