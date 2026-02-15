# Project Wizard (Node.js + PostgreSQL)

This project provides a simple web-based wizard to create new projects, storing them in a PostgreSQL database. It uses Docker Compose to orchestrate the backend, frontend, and database services.

## Quick Start

1. Build and start all services:

```sh
docker compose up --build
```

2. Initialize the database (in a new terminal):

```sh
docker exec -i <backend_container_name> psql -U postgres -d wizard < /app/init.sql
```

3. Open the frontend:
- Visit http://localhost:8080 in your browser.

## Services
- **frontend**: Simple HTML/JS form (port 8080)
- **backend**: Node.js/Express API (port 9000)
- **db**: PostgreSQL (port 5432)

## Endpoints
- `POST /api/projects` — create a new project
- `GET /api/projects` — list all projects