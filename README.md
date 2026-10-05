# AirPulse Backend

Fastify + TypeScript service that fuses **reference stations (AQICN)**, **satellite fire detections (NASA FIRMS)**,
**weather (Open-Meteo)** and **citizen reports** into hidden-hotspot detection, corridor-scale AQ forecasting,
authority-routed alerting, and a federated model catalogue.

```
citizen photo ─┐
AQICN station ─┼─► hotspotService ─► alertService ─► authority routing ─► incidents
FIRMS fires   ─┤         │                ▲
Open-Meteo   ──┘         │                │
              historyService         corridorService ─► per-city forecasts ─► risk
```

## Run

```bash
cp .env.example .env     # add AQICN_TOKEN and NASA_FIRMS_MAP_KEY
npm install
npm run dev              # http://localhost:4000
```

The Python model/vision service runs separately (`../python-ai`, port 8000) and is reached via `PYTHON_AI_URL`.
Every AI call degrades gracefully: no model service ⇒ transparent heuristic forecast, no vision service ⇒
category-based classification.

## Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | Service manifest + provider status |
| GET | `/health` | Liveness |
| GET | `/api/overview?location=` | Command-centre snapshot: AQI, hotspots, corridors, incidents |
| GET | `/api/air-quality?location=&latitude=&longitude=` | Live AQI (`source: station \| estimate`) |
| GET | `/api/hotspots?location=` | Fused hotspot list (5 min cache) |
| POST | `/api/hotspots/detect` | Force a fresh detection pass |
| GET | `/api/predictions?location=&horizonHours=` | Spike forecast for a point (1–168 h) |
| GET | `/api/corridors` · POST `/api/corridors/refresh` | Economic-corridor forecasts |
| GET/POST/PATCH | `/api/reports` | Citizen reports, JSON **or** multipart photo upload |
| GET | `/api/alerts` · `/api/alerts/incidents` | Alert rules and open incidents |
| POST | `/api/alerts/evaluate?refresh=true` | Run the forecast sweep, raise routed alerts |
| POST | `/api/alerts` | Create a threshold rule |
| PATCH | `/api/alerts/:id` | `resolve` / `enable` / `disable` |
| GET | `/api/analytics?location=` | Trends computed from recorded observations |
| GET | `/api/federation` · `/stats` · `/models` | Federated nodes, privacy stats, shared model catalogue |
| POST | `/api/federation/nodes` · `/models` | Join a node / publish a model update |
| GET | `/api/environment/aqicn\|open-meteo\|nasa-firms\|fires` | Raw provider access |
| GET | `/api/geocoding/reverse` · `/search` | Nominatim geocoding |

## Data honesty

- AQI readings are tagged `station` (live reference data) or `estimate` (distance-decayed corridor profile).
- PM2.5/PM10 are converted from AQICN sub-indices to µg/m³ with EPA breakpoints.
- Hotspot `confidence` rises only with corroborating signals (fires, citizen reports, station data).
- Analytics trends come from recorded readings; empty history is reported as such, never faked.
- Firestorms without `NASA_FIRMS_MAP_KEY` simply contribute no fire evidence.

## Persistence

State is in-memory by default (fine for a demo/hackathon). Setting `FIREBASE_*` credentials keeps Firestore
available on the app instance for a future durable store; no raw citizen data leaves a node in the federated design.