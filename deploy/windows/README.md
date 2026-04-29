# Windows Deploy

This folder contains the Windows-local deployment stack for ePrinting + Pricing ML.

## Contents

- `docker-compose.yml`: Docker Compose stack for Windows.
- `setup-mounts.ps1`: Creates the host mount folders under `C:\pricing` and seeds the required static CSV.
- `pricing-watcher-poll.py`: Polling-based watcher wrapper used on Windows because Docker Desktop file events are less reliable than on Linux.
- `.env.example`: Example environment file to copy into `.env`.
- `.env`: Local environment file for your machine. It is ignored by Git.

## Host folders created by setup

The setup script prepares these folders under `C:\pricing`:

- `sql-dumps`
- `processed`
- `static`
- `consolidated`
- `processed-data`
- `enriched`
- `features`
- `runtime`
- `artifacts`

It also copies `deploy/seed-data/epac_historiquee.csv` into `C:\pricing\static\epac_historiquee.csv`.

## First-time setup

1. Copy the example environment file:

```powershell
Copy-Item .\deploy\windows\.env.example .\deploy\windows\.env
```

2. Edit `deploy/windows/.env` with your real secrets and values.

3. Create the mount folders and seed the static CSV:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\setup-mounts.ps1
```

## Run the stack

```powershell
docker compose -f .\deploy\windows\docker-compose.yml --env-file .\deploy\windows\.env up -d
```

## Check status

```powershell
docker compose -f .\deploy\windows\docker-compose.yml --env-file .\deploy\windows\.env ps
```

## Watch ML logs

```powershell
docker compose -f .\deploy\windows\docker-compose.yml --env-file .\deploy\windows\.env logs -f pricing-watcher
```

## Stop the stack

```powershell
docker compose -f .\deploy\windows\docker-compose.yml --env-file .\deploy\windows\.env down
```
