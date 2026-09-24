# PXL Two-Tier Cloud Web Application

Node.js Express web application and REST API for the PXL Automation II course evaluation (PE1). The application connects to a MySQL database, initializes its table schema, and provides an HTML dashboard and JSON API endpoints.

## Features

- Web Dashboard (`GET /`): HTML interface displaying server metadata (hostname, private IP, uptime) and database connection status with round-trip latency.
- Health Check (`GET /health`): JSON endpoint returning HTTP 200 when healthy or HTTP 503 when degraded. Used for AWS Application Load Balancer Target Group health checks.
- REST API (`/api/contacts`): Endpoints for reading, creating, and deleting records from MySQL.
- Connection Retry: Retries connecting to MySQL on startup if the database server is still initializing.
- Schema Initialization: Creates the `contacts` table and seeds default rows on first connection.

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the Express HTTP server |
| `DB_HOST` | `127.0.0.1` | Hostname or private IP address of the MySQL database |
| `DB_PORT` | `3306` | Port for MySQL |
| `DB_USER` | `pxluser` | MySQL database user |
| `DB_PASSWORD` | `PxlSecurePassword123!` | Password for the MySQL user |
| `DB_NAME` | `pxldb` | Database name |

## Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Web dashboard |
| `GET` | `/health` | Health check for ALB Target Groups |
| `GET` | `/api/info` | Server and database metadata (JSON) |
| `GET` | `/api/contacts` | List all contacts |
| `POST` | `/api/contacts` | Create a contact (`{"name": "...", "email": "...", "department": "..."}`) |
| `DELETE`| `/api/contacts/:id` | Delete a contact by ID |

## Local Usage

### Installation
```bash
git clone https://github.com/PXL-Automation-II/pxl-two-tier-app.git
cd pxl-two-tier-app
npm install
```

### Configuration
```bash
cp .env.example .env
```

### Start
```bash
npm start
```
The server will be available at http://localhost:3000.

