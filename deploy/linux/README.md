# Linux Deploy

This folder contains the Linux/server deployment stack for ePrinting + Pricing ML.

## Contents

- `docker-compose.yml`: Docker Compose stack for Linux.
- `setup-mounts.sh`: Creates the host mount folders under `/opt/pricing` and seeds the required static CSV.
- `.env.example`: Example environment file to copy into `.env`.
- `.env`: Local environment file for the server. It is ignored by Git.

## Host folders created by setup

The setup script prepares these folders under `/opt/pricing`:

- `sql-dumps`
- `processed`
- `static`
- `consolidated`
- `processed-data`
- `enriched`
- `features`
- `runtime`
- `artifacts`

It also copies `deploy/seed-data/epac_historiquee.csv` into `/opt/pricing/static/epac_historiquee.csv`.

## First-time setup

1. Copy the example environment file:

```bash
cp ./deploy/linux/.env.example ./deploy/linux/.env
```

2. Edit `deploy/linux/.env` with your real secrets and values.

3. Make the setup script executable:

```bash
chmod +x ./deploy/linux/setup-mounts.sh
```

4. Create the mount folders and seed the static CSV:

```bash
sudo ./deploy/linux/setup-mounts.sh
```

## Run the stack

```bash
docker compose -f ./deploy/linux/docker-compose.yml --env-file ./deploy/linux/.env up -d
```

## Check status

```bash
docker compose -f ./deploy/linux/docker-compose.yml --env-file ./deploy/linux/.env ps
```

## Watch ML logs

```bash
docker compose -f ./deploy/linux/docker-compose.yml --env-file ./deploy/linux/.env logs -f pricing-watcher
```

## Stop the stack

```bash
docker compose -f ./deploy/linux/docker-compose.yml --env-file ./deploy/linux/.env down
```
