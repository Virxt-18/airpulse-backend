# AirPulse Backend

**Fastify + TypeScript** service that fuses **reference stations (AQICN)**, **satellite fire detections (NASA FIRMS)**, **weather (Open-Meteo)** and **citizen reports** into:

- Hidden-hotspot detection
- Corridor-scale AQ forecasting
- Authority-routed alerting
- Federated model catalogue (no raw data exchange)

```
citizen photo ─┐
AQICN station ─┼─► hotspotService ─► alertService ─► authority routing ─► incidents
FIRMS fires   ─┤         │                ▲
Open-Meteo   ──┘         │                │
              historyService         corridorService ─► per-city forecasts ─► risk
```

## Quick Start

```bash
cp .env.example .env     # add AQICN_TOKEN and NASA_FIRMS_MAP_KEY
npm install
npm run dev              # http://localhost:4000
```

The Python AI/vision service runs separately (`../python-ai`, port 8000) and is reached via `PYTHON_AI_URL`.

```bash
cd python-ai
pip install -r requirements.txt
python app.py            # http://localhost:8000
```

Every AI call degrades gracefully: no model service ⇒ heuristic forecast, no vision service ⇒ category-based classification.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HOST` | No | Bind address (default: `0.0.0.0`) |
| `PORT` | No | HTTP port (default: `4000`) |
| `PYTHON_AI_URL` | No | Python AI service URL (default: `http://127.0.0.1:8000`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `AQICN_TOKEN` | **Yes** | AQICN API token for reference stations |
| `NASA_FIRMS_MAP_KEY` | **Yes** | NASA FIRMS MAP KEY for satellite fire data |
| `FIREBASE_PROJECT_ID` | No | Enables Firestore persistence |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | No | Firebase service account private key |
| `INDIA_BBOX` | No | Bounding box for fire queries (default: India) |
| `UPLOAD_DIR` | No | Citizen photo upload directory (default: `uploads`) |

## API Endpoints

All routes prefixed with `/api` unless noted.

### Health & Metadata

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Service manifest, provider status, route index |
| GET | `/health` | Liveness probe |
| GET | `/api/data-health` | Data freshness & cache status |

### Overview & Air Quality

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/overview?location=` | Command-centre snapshot: AQI, hotspots, corridors, incidents |
| GET | `/api/air-quality?location=&latitude=&longitude=` | Live AQI (`source: station \| estimate`) |

### Hotspots

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/hotspots?location=` | Fused hotspot list (5 min cache) |
| POST | `/api/hotspots/detect` | Force fresh detection pass |

### Predictions

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/predictions?location=&horizonHours=&latitude=&longitude=` | Spike forecast for a point (1–168 h) |

### Corridors

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/corridors` | Economic-corridor forecasts |
| POST | `/api/corridors/refresh` | Force refresh corridor forecasts |

### Citizen Reports

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/reports` | List all reports |
| POST | `/api/reports` | Create report (JSON **or** `multipart/form-data` with `image` file) |
| PATCH | `/api/reports/:id` | Update status: `received \| reviewed \| under-investigation \| actioned` |

### Alerts & Incidents

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/alerts` | List alert rules |
| GET | `/api/alerts/incidents` | List open incidents |
| POST | `/api/alerts/evaluate?refresh=true` | Run forecast sweep, raise routed alerts |
| POST | `/api/alerts` | Create threshold rule `{ location, threshold: 50–500 }` |
| PATCH | `/api/alerts/:id` | `{ action: "resolve" \| "enable" \| "disable" }` |

### Analytics

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/analytics?location=` | Trends from recorded observations |

### Federation (Privacy-Preserving Model Sharing)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/federation` | Federated network nodes |
| GET | `/api/federation/stats` | Privacy-preserving statistics |
| GET | `/api/federation/models` | Shared model catalogue |
| POST | `/api/federation/nodes` | Register node `{ city, accuracy, samples?, status? }` |
| POST | `/api/federation/models` | Publish model update `{ city, accuracy, version?, samples?, meanResidual?, drift? }` |

### Raw Provider Access

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/environment/aqicn?latitude=&longitude=` | Reference station data |
| GET | `/api/environment/open-meteo?latitude=&longitude=` | Weather data |
| GET | `/api/environment/nasa-firms?bbox=&days=` | Satellite fire detections |
| GET | `/api/environment/fires?bbox=&days=` | Parsed fire points (map/hotspot input) |

### Geocoding

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/geocoding/reverse?latitude=&longitude=` | Reverse geocode (Nominatim) |
| GET | `/api/geocoding/search?q=` | City search |

### Python AI Service (Port 8000)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Service health + endpoint list |
| POST | `/predict` | AQI forecast from fused features `{ features: {...} }` |
| POST | `/classify` | Pollution photo classification (`multipart/form-data` with `image` file, optional `hint`) |

## Data Honesty

- AQI readings tagged `station` (live reference) or `estimate` (distance-decayed corridor profile)
- PM2.5/PM10 converted from AQICN sub-indices to µg/m³ via EPA breakpoints
- Hotspot `confidence` rises only with corroborating signals (fires, citizen reports, station data)
- Analytics trends from recorded readings; empty history reported as such, never faked
- Missing `NASA_FIRMS_MAP_KEY` → no fire evidence (explicit, not silent failure)

## Persistence

- **Default**: In-memory (demo/hackathon friendly)
- **Optional**: Firestore via `FIREBASE_*` credentials
- **Federated design**: No raw citizen data leaves a node; only model updates & statistics are shared

## Project Structure

```
src/
├── app.ts                    # Fastify bootstrap, route registration
├── config/env.ts             # Validated env schema
├── plugins/
│   ├── cors.ts               # CORS configuration
│   └── firebase.ts           # Optional Firestore init
├── routes/                   # All HTTP endpoints
│   ├── health.ts
│   ├── dataHealth.ts
│   ├── overview.ts
│   ├── airQuality.ts
│   ├── hotspots.ts
│   ├── predictions.ts
│   ├── corridors.ts
│   ├── reports.ts
│   ├── alerts.ts
│   ├── analytics.ts
│   ├── environmentData.ts
│   ├── federation.ts
│   └── geocoding.ts
├── services/                 # Business logic
│   ├── airQualityService.ts
│   ├── hotspotService.ts
│   ├── predictionService.ts
│   ├── corridorService.ts
│   ├── reportService.ts
│   ├── alertService.ts
│   ├── analyticsService.ts
│   ├── overviewService.ts
│   ├── environmentDataService.ts
│   ├── networkService.ts     # Federation logic
│   ├── fireService.ts
│   ├── geocodingService.ts
│   ├── historyService.ts
│   ├── uploadService.ts
│   ├── visionService.ts      # Python AI vision bridge
│   ├── authorityService.ts
│   └── geo.ts
└── types/index.ts            # Shared TypeScript types

python-ai/
├── app.py                    # Flask service: /predict, /classify
├── prediction/predict.py     # AQI forecasting model
├── vision/pollution_detection.py  # Photo classification
└── requirements.txt
```

## Scripts

```bash
npm run dev      # tsx watch mode
npm run build    # tsc compile
npm start        # node dist/app.js
```

## License

MIT — Built for the AirPulse hackathon project.