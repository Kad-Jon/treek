# Treek

Find the nearest tree of a given species in London and get walking directions to it.

Treek takes your location from the browser, lets you search the ~1.1 million borough-maintained trees in London by common name, and returns a Google Maps link to the closest match.

## Stack

- **Frontend:** React 18 + Vite ([frontend/](frontend/))
- **Backend:** FastAPI ([backend/](backend/))
- **Database:** PostgreSQL 16 + PostGIS for nearest-neighbour queries
- **Data:** London borough tree list (November 2025 export), loaded from CSV

## Getting started

### 1. Get the data

The seed script expects the tree dataset at:

```
backend/data/Borough_tree_list_2025Nov.csv
```

The file is ~200 MB, so it isn't committed to the repo. Download it and place it at that path before starting the app.

### 2. Run with Docker Compose

```bash
docker compose up --build
```

This starts three services:

| Service    | URL                     | Notes                                          |
|------------|-------------------------|------------------------------------------------|
| `frontend` | http://localhost:5173   | Vite dev server with hot reload                |
| `backend`  | http://localhost:8000   | FastAPI with `--reload`; docs at `/docs`       |
| `db`       | `localhost:5432`        | PostGIS, user/password/database all `treek`    |

When the backend starts it runs [seed.py](backend/seed.py), which creates the `trees` table and loads the CSV. The first run takes a few minutes. Later runs skip the load if the table already has rows. Data persists in the `pgdata` volume. Run `docker compose down -v` to wipe it and reseed.

The geolocation API only works on `localhost` or over HTTPS, so open the app at `http://localhost:5173`, not via a LAN IP.

### Running without Docker

You'll need a PostgreSQL database with the PostGIS extension available.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit DATABASE_URL
python seed.py
uvicorn main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend (default `http://localhost:8000`, override with `API_URL`).

## API

| Method | Path             | Query params                  | Returns                                         |
|--------|------------------|-------------------------------|-------------------------------------------------|
| GET    | `/species`       | none                          | Sorted list of distinct common names            |
| GET    | `/trees/nearest` | `species`, `lat`, `lng`       | `{ lat, lon, common_name, borough }`, or 404    |

Species matching is case-insensitive. Distance is computed with PostGIS `geography`, so results are in true metres rather than degrees.

## Roadmap

See [requirements.md](requirements.md).

- **M1** (done): find the nearest tree of a chosen species and link to it on Google Maps.
- **M2:** pick several trees and get a circular walking route that visits them all.
