# Data Entry Module

A secure, scalable, concurrency-safe Data Entry module built with **Node.js + Supabase**.

---

## Architecture Overview

```
data-entry-module/
├── config/
│   └── supabase.js          # Supabase client (service-role key)
├── src/
│   ├── server.js            # Entry point — HTTP server + graceful shutdown
│   ├── app.js               # Express app — middleware stack, routing
│   ├── controllers/
│   │   └── company.controller.js   # Request parsing, response shaping
│   ├── services/
│   │   ├── company.service.js      # Business logic, merge rules, concurrency lock
│   │   └── export.service.js       # PDF / CSV / JSON generation
│   ├── repositories/
│   │   └── company.repository.js   # All Supabase queries — single responsibility
│   ├── middleware/
│   │   ├── errorHandler.js         # Global error handler
│   │   └── requestLogger.js        # HTTP request logging
│   └── utils/
│       ├── AppError.js             # Typed operational errors
│       ├── logger.js               # Winston logger (console + file)
│       └── validation.js           # Joi schema — parse + normalise
├── public/
│   ├── index.html           # Single-page UI (upload + query tabs)
│   ├── css/style.css        # Dark industrial theme
│   └── js/app.js            # Vanilla JS frontend logic
├── supabase_schema.sql      # Run once in Supabase SQL editor
├── sample_data.json         # Test payload
├── .env.example             # Environment variable template
└── package.json
```

---

## Quick Start

### 1. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the contents of `supabase_schema.sql` to create the `companies` table, indexes, and trigger.
3. Copy your **Project URL** and **service_role** key from _Project Settings → API_.

### 2. Environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   SUPABASE_URL=https://xxxxx.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Install & Run

```bash
npm install
npm start          # production
npm run dev        # development (nodemon)
```

Open **http://localhost:3000** in your browser.

---

## API Reference

### POST `/api/companies/upload`
Upload and upsert company records.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | ✓ | One of the six supported cities |
| `jsonText` | string | ✓ or `jsonFile` | Raw JSON array pasted as text |
| `jsonFile` | file (.json) | ✓ or `jsonText` | JSON file (max 5 MB) |

**Response 200:**
```json
{
  "success": true,
  "message": "Successfully processed 3 record(s).",
  "data": { "inserted": 2, "updated": 1, "total": 3 }
}
```

---

### GET `/api/companies?city=Mohali`
Query records by city.

**Response 200:**
```json
{
  "success": true,
  "city": "Mohali",
  "count": 42,
  "data": [ { "companyName": "...", ... } ]
}
```

---

### GET `/api/companies/export?city=Mohali&format=pdf`
Download all records for a city.

| Param | Values |
|-------|--------|
| `city` | Mohali / Delhi NCR / Bangalore / Hyderabad / Pune / Mumbai |
| `format` | `pdf` \| `csv` \| `json` |

Returns a file download with appropriate `Content-Disposition` header.

---

## Data Schema (Supabase `companies` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Auto-generated PK |
| `companyName` | TEXT | **Unique** — upsert key |
| `companyType` | TEXT | Optional |
| `careersPageURL` | TEXT | Required |
| `careerEmail` | TEXT | Optional; kept if new value absent |
| `hiringManagerEmail` | TEXT | Optional; kept if new value absent |
| `HREmails` | TEXT[] | Union-merged; no duplicates |
| `city` | TEXT | One of six supported cities |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto via trigger |

---

## Key Design Decisions

### Concurrency Safety
An **in-process promise-based lock** (`withLock`) in `company.service.js` serialises concurrent write operations under the same key. This prevents race conditions where two simultaneous requests read the same DB state, produce conflicting merge results, and overwrite each other. Supabase's `upsert` with `onConflict` provides DB-level atomicity.

### Merge Rules
| Field | Rule |
|-------|------|
| `careerEmail` | Use new value if non-empty; otherwise keep existing |
| `hiringManagerEmail` | Use new value if non-empty; otherwise keep existing |
| `HREmails` | Union of existing + incoming, deduplicated case-insensitively |
| All other fields | Overwrite with new value |

### Zero Partial Updates
All records in a batch are built in memory first. A single `bulkUpsert` call sends them all to Supabase in one round-trip. Supabase runs this inside a Postgres transaction — the batch either fully succeeds or fully fails.

### Validation
- Payload must be a JSON **array** (not an object or primitive).
- Each record is validated with a **Joi schema** — unknown fields are stripped, type coercions applied.
- `HREmails` normalised from comma-separated strings or arrays before storage.
- Duplicate `companyName` within a single batch is rejected immediately.

### Security
- `helmet` sets secure HTTP headers.
- `express-rate-limit` (100 req / 15 min per IP) on all `/api` routes.
- File uploads stored in **memory only** (no disk write).
- Service-role key never exposed to the browser (server-side only).

---

## Supported Cities
- Mohali
- Delhi NCR
- Bangalore
- Hyderabad
- Pune
- Mumbai

---

## Logs
Winston writes to:
- `logs/combined.log` — all levels
- `logs/error.log` — errors only
- Console (colourised in dev)
