# PXL Two-Tier Cloud Web Application

Node.js Express web application and REST API for the PXL Automation II course evaluation (PE1). The application connects to a MySQL database, initializes its table schema, and provides an HTML dashboard and JSON API endpoints.

## Features

- Web Dashboard (`GET /`): HTML interface displaying server metadata (hostname, private IP, uptime) and database connection status with round-trip latency.
- Health Check (`GET /health`): JSON endpoint returning HTTP 200 when healthy or HTTP 503 when degraded. Used for AWS Application Load Balancer Target Group health checks.
- REST API (`/api/contacts`): Endpoints for reading, creating, and deleting records from MySQL.
- Connection Retry: Retries connecting to MySQL on startup if the database server is still initializing.
- Schema Initialization: Creates the `contacts` table and seeds default rows on first connection.

## Environment Variables

| Variable      | Default                 | Description                                          |
| :------------ | :---------------------- | :--------------------------------------------------- |
| `PORT`        | `3000`                  | Port for the Express HTTP server                     |
| `DB_HOST`     | `127.0.0.1`             | Hostname or private IP address of the MySQL database |
| `DB_PORT`     | `3306`                  | Port for MySQL                                       |
| `DB_USER`     | `pxluser`               | MySQL database user                                  |
| `DB_PASSWORD` | `PxlSecurePassword123!` | Password for the MySQL user                          |
| `DB_NAME`     | `pxldb`                 | Database name                                        |

## Endpoints

| Method   | Endpoint            | Description                                                               |
| :------- | :------------------ | :------------------------------------------------------------------------ |
| `GET`    | `/`                 | Web dashboard                                                             |
| `GET`    | `/health`           | Health check for ALB Target Groups                                        |
| `GET`    | `/api/info`         | Server and database metadata (JSON)                                       |
| `GET`    | `/api/contacts`     | List all contacts                                                         |
| `POST`   | `/api/contacts`     | Create a contact (`{"name": "...", "email": "...", "department": "..."}`) |
| `DELETE` | `/api/contacts/:id` | Delete a contact by ID                                                    |

## Project Structure

```text
pxl-two-tier-app/
|-- public/
|   |-- css/
|   |   \-- style.css
|   |-- js/
|   |   \-- app.js
|   \-- index.html
|-- scripts/
|   \-- db-check.js
|-- src/
|   |-- config/
|   |   |-- db.js
|   |   \-- env.js
|   |-- controllers/
|   |   |-- contactController.js
|   |   \-- healthController.js
|   |-- routes/
|   |   |-- apiRoutes.js
|   |   \-- healthRoutes.js
|   |-- services/
|   |   \-- contactService.js
|   |-- utils/
|   |   \-- logger.js
|   \-- app.js
|-- tests/
|   |-- e2e/
|   |   \-- workflow.test.js
|   |-- integration/
|   |   \-- api.test.js
|   \-- unit/
|       |-- env.test.js
|       |-- service.test.js
|       \-- validation.test.js
|-- .env.example
|-- .gitattributes
|-- .gitignore
|-- .prettierignore
|-- .prettierrc
|-- eslint.config.js
|-- package.json
|-- README.md
\-- server.js
```

## Available npm Scripts

| Command                    | Action                                                         |
| :------------------------- | :------------------------------------------------------------- |
| `npm start`                | Starts the Express server in production mode                   |
| `npm run dev`              | Starts the server in watch mode with automatic reloads         |
| `npm run build`            | Validates syntax, linting, and formatting                      |
| `npm test`                 | Runs the entire test suite (unit, integration, and e2e)        |
| `npm run test:unit`        | Runs isolated unit tests (config, validation, services)        |
| `npm run test:integration` | Runs integration tests against Express HTTP endpoints          |
| `npm run test:e2e`         | Runs end-to-end client lifecycle and outage recovery tests     |
| `npm run test:watch`       | Runs all tests continuously in watch mode                      |
| `npm run lint`             | Analyzes code for errors using ESLint                          |
| `npm run lint:fix`         | Automatically fixes autofixable ESLint issues                  |
| `npm run format`           | Formats all code using Prettier                                |
| `npm run format:check`     | Verifies code conforms to Prettier style rules                 |
| `npm run db:check`         | CLI diagnostic tool testing TCP and MySQL connectivity         |
| `npm run ci`               | Full pipeline check (lint, format verification, and all tests) |

## Local Usage

### Installation

```bash
git clone https://github.com/PXL-Automation-II/pxl-two-tier-app.git
cd pxl-two-tier-app
npm install
```

For production deployments on EC2 instances where development tools are unnecessary:

```bash
npm install --omit=dev
```

### Configuration

```bash
cp .env.example .env
```

### Database Diagnostic Test

Before running the server, test connectivity to your MySQL host:

```bash
npm run db:check
```

### Start Server

```bash
npm start
```

The web dashboard will be available at `http://localhost:3000`.
