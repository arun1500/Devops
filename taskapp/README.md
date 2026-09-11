# Task App — 3-Tier Node.js Demo

A minimal but complete 3-tier application for practicing DevOps:

- **Frontend** — static HTML/CSS/JS served by Nginx, proxies `/api` to the backend
- **Backend** — Node.js + Express REST API (`/api/tasks`), with `/health` and `/ready` probes
- **Database** — PostgreSQL, schema auto-created from `db/init.sql`

```
taskapp/
├── frontend/       # Nginx + static assets
├── backend/        # Express API
├── db/             # init.sql (schema + seed data)
├── k8s/            # Kubernetes manifests
├── .github/workflows/ci.yml
└── docker-compose.yml
```

## Run it with Docker Compose

```bash
cd taskapp
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api/tasks
- Backend health: http://localhost:4000/health and /ready
- Postgres: localhost:5432 (user/pass in docker-compose.yml)

Stop and wipe data:
```bash
docker compose down -v
```

## Run it locally without Docker

```bash
# 1. Start Postgres however you like, then create the schema:
psql -U postgres -f db/init.sql

# 2. Backend
cd backend
cp .env.example .env   # edit if your DB creds differ
npm install
npm start

# 3. Frontend — any static server works, e.g.:
cd frontend
npx serve .
# point app.js's API_BASE at your backend, or add a proxy
```

## Run it on Kubernetes (kind / minikube)

```bash
# Build images so the cluster can find them locally
docker build -t taskapp-backend:latest ./backend
docker build -t taskapp-frontend:latest ./frontend

# If using kind, load them into the cluster:
kind load docker-image taskapp-backend:latest
kind load docker-image taskapp-frontend:latest

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

kubectl -n taskapp get pods -w
```

Frontend is exposed via NodePort 30080 — with `kind`/`minikube` use their
respective port-forward/tunnel commands to reach it from your browser.

## API reference

| Method | Path              | Description       |
|--------|-------------------|--------------------|
| GET    | /api/tasks        | List all tasks     |
| GET    | /api/tasks/:id    | Get one task       |
| POST   | /api/tasks        | Create a task      |
| PUT    | /api/tasks/:id    | Update a task      |
| DELETE | /api/tasks/:id    | Delete a task      |
| GET    | /health           | Liveness probe     |
| GET    | /ready            | Readiness probe (checks DB) |

## Things to practice with this app

- **Containers**: tweak the Dockerfiles, try multi-stage builds, shrink image size, add non-root users (backend already runs as `node`).
- **Compose**: add a `depends_on` health-gated startup order (already wired for backend→db), scale the backend with `docker compose up --scale backend=3` and put a load balancer in front.
- **Kubernetes**: apply the manifests, kill a pod and watch it self-heal, try `kubectl scale`, add a `HorizontalPodAutoscaler`, add an Ingress instead of NodePort, convert Secret to use a proper secrets manager.
- **CI/CD**: the included GitHub Actions workflow builds images and smoke-tests the API on every push — extend it to push images to a registry and deploy on merge.
- **Observability**: the backend logs every request; try wiring up Prometheus metrics, structured logging, or shipping logs to an ELK/Loki stack.
- **Config/secrets**: DB credentials currently come from env vars / a plain k8s Secret — try Vault, sealed-secrets, or SOPS.
- **Persistence**: the Postgres data is on a named volume (Compose) or PVC (k8s) — practice backup/restore, or switching to a managed DB.
