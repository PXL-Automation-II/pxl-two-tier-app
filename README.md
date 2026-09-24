# 🚀 PXL Two-Tier Cloud Web Application

A lightweight, production-ready Node.js Express web application and REST API designed specifically for the **PXL Automation II** course evaluation (PE1). The application connects to a MySQL database, auto-creates its schema, and provides an interactive web dashboard alongside standard JSON health check and API endpoints.

---

## 🌟 Features

- **Interactive Web Dashboard (`GET /`)**: Visual UI displaying serving EC2 instance metadata (hostname, private IP address, uptime) and real-time database connection status with round-trip latency.
- **ALB Health Check (`GET /health`)**: JSON health endpoint returning HTTP `200 OK` when healthy (or HTTP `503 Service Unavailable` when degraded), ideal for AWS Application Load Balancer Target Group probes.
- **REST CRUD API (`/api/contacts`)**: Full endpoint suite for storing and retrieving records from the persistent MySQL database.
- **Resilient Auto-Retry Connection**: Patiently retries connecting to the MySQL database if the database instance is still starting up or installing packages during cloud bootstrapping.
- **Auto Schema Initialization**: Automatically creates the `contacts` table and seeds default rows on first successful database connection.

---

## ⚙️ Environment Variables

The application is configured entirely via standard environment variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Network port for the Express HTTP server |
| `DB_HOST` | `127.0.0.1` | Hostname or private IP address of the MySQL database |
| `DB_PORT` | `3306` | Network port for MySQL |
| `DB_USER` | `pxluser` | MySQL database user |
| `DB_PASSWORD` | `PxlSecurePassword123!` | Password for the MySQL user |
| `DB_NAME` | `pxldb` | Target MySQL database name |

---

## 🛠️ Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Web dashboard (HTML/CSS) showing server metadata and database records |
| `GET` | `/health` | JSON health check for AWS ALB Target Groups |
| `GET` | `/api/info` | Detailed JSON telemetry of the Node runtime and operating system |
| `GET` | `/api/contacts` | Retrieve all persistent contact records from MySQL |
| `POST` | `/api/contacts` | Create a new contact record (`{"name": "...", "email": "...", "department": "..."}`) |
| `DELETE`| `/api/contacts/:id` | Delete a contact record by ID |

---

## 💻 Local Quickstart

### 1. Clone & Install
```bash
git clone https://github.com/PXL-Automation-II/pxl-two-tier-app.git
cd pxl-two-tier-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL settings
```

### 3. Start Application
```bash
npm start
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ EC2 User Data Bootstrap Example

To deploy this application unattended inside an Ubuntu EC2 instance via Terraform `user_data`:

```bash
#!/bin/bash
set -e

# Update and install Node.js 20 LTS and Git
apt-get update -y
apt-get install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Clone application
cd /opt
git clone https://github.com/PXL-Automation-II/pxl-two-tier-app.git app
cd /opt/app

# Install production dependencies
npm ci --omit=dev

# Export configuration (or write to systemd EnvironmentFile)
cat <<EOF > /etc/pxl-app.env
PORT=3000
DB_HOST=${db_private_ip}
DB_PORT=3306
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=${db_name}
EOF

# Start service (or enable systemd unit)
node server.js &
```
