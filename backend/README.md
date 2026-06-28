# Backend — Timesheet Hub API

Modulo FastAPI (Python) che espone le API REST dell'applicazione.
In locale gira sulla porta **8000** (avviato tramite `make up` o direttamente con uvicorn).

## Documentazione API

FastAPI genera automaticamente la documentazione OpenAPI 3.0. Gli endpoint sono
accessibili **direttamente sul backend** (porta 8000), non attraverso nginx, poiché
il reverse proxy ruota verso il backend solo i path `/api/*`.

| Endpoint | Descrizione |
|---|---|
| `GET /openapi.json` | Schema OpenAPI 3.0 in formato JSON |
| `GET /docs` | Swagger UI interattiva |
| `GET /redoc` | ReDoc UI |

In locale (stack avviato con `make up`):

```
http://localhost:8000/docs
http://localhost:8000/redoc
http://localhost:8000/openapi.json
```

> In produzione e staging questi endpoint non sono esposti via nginx.

## Comandi principali

```bash
# Avvia lo stack completo
make up

# Test
cd backend
uv run pytest                          # tutti i test
uv run pytest tests/unit/              # solo unit
uv run pytest tests/integration/       # solo integration

# Lint e format
uv run ruff check .
uv run ruff format --check .

# Migrazioni Alembic
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "descrizione"
```

Vedi il `Makefile` nella root del progetto per tutti i comandi disponibili.
