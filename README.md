# SmartSeason Field Monitoring

Small full-stack app for tracking crop progress across fields during a season. Coordinators (admins) manage the catalog and assignments, and **both admins and assigned field agents** can log observations (stage and/or notes) on fields they can access.

## Stack

- **Backend:** Node.js 20+, Express 5, Prisma 5, SQLite (file DB for easy local setup).
- **Frontend:** React 19, Vite 8, React Router 7.
- **Auth:** JWT in `Authorization: Bearer` header; passwords hashed with bcrypt.

## Field lifecycle (stages)

The product uses exactly **four** stages, in this order everywhere (API validation, DB values, forms, filters, dashboard):

1. **PLANTED** — 2. **GROWING** — 3. **READY** — 4. **HARVESTED**

Source of truth: `backend/src/lib/constants.ts` (`FIELD_STAGES`) and `frontend/src/lib/fieldStages.ts` — keep them identical when changing the model.

## Field status logic (computed, not stored)

Status is derived in the API whenever a field is returned or aggregated for the dashboard:

1. **Completed** — current stage is `HARVESTED` (season closed for that plot).
2. **At risk** — otherwise, if either:
   - nothing meaningful has changed on the field for **14 days** (latest of `Field.updatedAt`, `Field.createdAt`, or any `FieldUpdate.createdAt`), monitoring is considered stale, or
   - the crop is still in `READY` but has been in the ground **120+ days since planting** without being marked harvested (possible spoilage / missed harvest window).
3. **Active** — all other in-season plots that are being watched on time.

This keeps the rules explainable without asking users to manually set a health flag.

## Getting started

### Prerequisites

- Node.js 20 or newer recommended (tested with the current LTS line).

### Backend

```bash
cd backend
npm install
cp .env.example .env   # first-time setup only; then edit secrets if needed
npx prisma generate
npx prisma db push
npm run db:seed   # optional: demo users + sample fields
npm run dev       # http://localhost:4000
```

Environment variables live in `backend/.env`. Change `JWT_SECRET` before any real deployment.

### Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173, proxies /api → :4000
```

Open the UI, sign in with a demo account, and browse the dashboard and fields.

### Demo credentials

| Role        | Email                     | Password   |
|-------------|---------------------------|------------|
| Admin       | `admin@smartseason.local` | `demo1234` |
| Field agent | `agent1@smartseason.local` | `demo1234` |
| Field agent | `agent2@smartseason.local` | `demo1234` |

Seed data assigns two fields to Jamie (`agent1`) and two to Riley (`agent2`). Riverbend Plot is intentionally left in `READY` with an older planting date so the **At risk** bucket is non-zero on the admin dashboard.

## API overview

- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` (auth)
- `GET /api/dashboard` (auth) — field counts and status/stage breakdown (scoped by role)
- `GET /api/fields`, `GET /api/fields/:id` (auth, scoped)
- `POST /api/fields` (admin) — create + optional assignment
- `PATCH /api/fields/:id` (admin) — metadata, stage override, reassignment
- `DELETE /api/fields/:id` (admin)
- `POST /api/fields/:id/updates` (auth) — note and/or stage change; writes `FieldUpdate` and updates `Field.currentStage` when a stage is supplied (**admins may post on any field; agents only on assigned fields**)
- `GET /api/agents` (admin) — list field agents for assignment pickers
- `GET /api/reports/fields` (auth) — Field register; default CSV, add `?format=pdf` for a landscape PDF table. Same with `GET /api/reports/fields.csv`.
- `GET /api/reports/updates` (auth) — Activity log (newest first, max 2000 rows); `?format=pdf` for PDF. Alias `GET /api/reports/updates.csv`.

## Design choices & assumptions

- **SQLite** keeps the assessment clone-and-run story simple; Prisma models map cleanly to PostgreSQL later by swapping the datasource URL.
- **Role-based scoping** is enforced in route handlers (not only in the UI) so agents cannot read or mutate fields they are not assigned to.
- **Field updates** are append-only rows for auditability; the field record holds the authoritative `currentStage` for fast list rendering.
- **Registration** is omitted: admins/agents are created via seed or direct DB for this demo scope.
- **CORS** is permissive for local dev; tighten to your deployed frontend origin in production.

## Optional hard reset

```bash
cd backend
npx prisma db push --force-reset
npm run db:seed
```

This wipes the SQLite file’s tables and re-applies the schema plus seed data.

## Repository layout

```
backend/   Express API + Prisma schema/seed
frontend/  Vite + React SPA
```

## License

Provided as a technical assessment sample; adapt as needed for your process.
