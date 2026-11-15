# AGENTS.md — Ardor

Internal sales / orders / delivery tracker for the furniture salon "Ardor". UI language is Bosnian (lang="bs"); keep all user-facing copy in Bosnian. Currency is KM, set once in `src/lib/format.ts` (`CURRENCY`).

**Continue from the roadmap in `PLAN.md`** — Phases 1, 2, most of 4 and the basic reports of 6 are done. Next: customers screen, real login (Phase 3), PDF documents (Phase 5).

## Architecture
- TanStack Start + React 19, file routes in `src/routes/` (`routeTree.gen.ts` is generated — don't edit).
- `src/routes/__root.tsx` — document shell, fonts (Fraunces + Manrope), wraps everything in `StoreProvider` and `AppShell`.
- `db/schema.ts`, `db/seed.ts` — Netlify Database schema (Drizzle) and demo seed. Server logic in `src/server/logic.ts`, server functions in `src/server/api.ts`. Stock = sum of `stock_movements`.
- `src/lib/types.ts` — domain types.
- `src/lib/reports.ts` — accounting maths (revenue recognised on `issuedAt`, COGS from movements, VAT, debts); tested in `reports.test.ts`. `src/lib/excel.ts` — lazy-loaded .xlsx export.
- `src/lib/store.tsx` — React context holding orders in browser memory with actions (`addOrder`, `setOrderStatus`, `setDeliveryStatus`, `addPayment`). In Phase 2 these become TanStack server functions backed by Netlify Database; keep the same action names so pages don't change.
- `src/lib/stats.ts` — derived metrics (revenue excludes `ponuda` and `otkazana`; commission = revenue × employee.commissionRate).
- `src/lib/format.ts` — formatting (bs-BA), lookup helpers, status labels and badge colors.
- `src/components/` — `AppShell` (grouped sidebar, user switcher, toasts, busy bar), `CommandPalette` (Ctrl+K), `ui.tsx` (Card, Stat, Badge, Button, Field, Segmented, Chip, EmptyState…), `Charts.tsx`, `Modal` (portalled to body), `OrderDrawer`, `NewOrderDialog`, `ReceiptDialog`, `ProductDialog`, `ProductCard`, `EmployeeDialog`.

## Conventions
- Tailwind theme tokens in `src/styles.css` (`walnut-*`, `copper-*`, `moss-*`, `paper`, `linen`). Use `font-display` for headings, `tabular` for numbers.
- Order status flow: ponuda → potvrđena → u_izradi → spremna → isporučena (or otkazana). Marking a delivery `dostavljeno` sets the order to `isporučena` and vice versa.
- Routes use ASCII slugs (`/narudzbe`, `/zaposlenici`) with Bosnian labels.
- Number formatting is hand-rolled in `format.ts` (not Intl) so SSR and browser output match — keep it that way.
- Tables use the `.data-table` class from `styles.css`; cards that hold a full-width table use `<Card flush>`.
- Persistence must use Netlify platform primitives (Netlify Database via `@netlify/database` + Drizzle, schema in `db/schema.ts`).
