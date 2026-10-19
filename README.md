# madleads

A lead management app: Node.js + Express API, a vanilla web front end, and MySQL for storage — all run with Docker Compose. No local Node or MySQL install required.

## Requirements

- Docker
- Docker Compose (v2)

## Getting started

```bash
cp .env.example .env      # optional, defaults work out of the box
docker compose up --build
```

Then open http://localhost:3000 in your browser.

The database is initialised from `db/init.sql` on first run and seeded with sample leads. To start fresh and wipe the data volume:

```bash
docker compose down -v
```

## Configuration

Environment variables (see `.env.example`):

| Variable              | Default     | Description                          |
| --------------------- | ----------- | ------------------------------------ |
| `APP_PORT`            | `3000`      | Host port for the web app            |
| `DB_PORT`             | `3307`      | Host port mapped to MySQL (optional) |
| `MYSQL_ROOT_PASSWORD` | `rootpass`  | MySQL root password                  |
| `MYSQL_DATABASE`      | `madleads`  | Database name                        |
| `MYSQL_USER`          | `leads`     | App database user                    |
| `MYSQL_PASSWORD`      | `leadspass` | App database password                |

## API

Base URL: `/api/leads`

| Method | Path              | Description                                   |
| ------ | ----------------- | --------------------------------------------- |
| GET    | `/api/leads`      | List leads. Filters: `?status=won&search=ada` |
| GET    | `/api/leads/stats`| Aggregated counts and pipeline value          |
| GET    | `/api/leads/:id`  | Get one lead                                  |
| POST   | `/api/leads`      | Create a lead                                 |
| PUT    | `/api/leads/:id`  | Update a lead (partial updates allowed)       |
| DELETE | `/api/leads/:id`  | Delete a lead                                 |

Lead fields: `name` (required), `email`, `phone`, `company`, `source`, `status`
(`new`, `contacted`, `qualified`, `proposal`, `won`, `lost`), `value`, `notes`.

Example:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","status":"new","value":1000}'
```

## Project layout

```
.
├── docker-compose.yml
├── Dockerfile
├── db/init.sql            # schema + seed data
├── server/
│   ├── index.js           # Express app entrypoint
│   ├── db.js              # MySQL connection pool
│   └── routes/leads.js    # Lead CRUD API
└── public/                # web front end (static)
    ├── index.html
    ├── styles.css
    └── app.js
```
