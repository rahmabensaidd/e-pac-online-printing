# ePrinting

## Run Locally

### Option 1: Run everything with Docker

This is the simplest way to run the project locally after a `git pull`.

#### Prerequisites

- Docker Desktop installed and running

#### Steps

1. Go to the project root:

```powershell
cd C:\Users\21692\Desktop\eprinting
```

2. Create the backend environment file the first time only:

```powershell
Copy-Item .\eprinting\.env.example .\eprinting\.env
```

3. Start the full stack:

```powershell
docker compose up --build
```

#### Services

Once the containers are running:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:8080`
- MySQL: `localhost:3306`

#### Stop the project

```powershell
docker compose down
```

#### Notes

- `docker compose up --build` starts:
  - MySQL
  - Spring Boot backend
  - Angular frontend served through Nginx
- The backend environment variables are loaded from `eprinting/.env`
- If you already created `.env`, you do not need to recreate it after each pull

### Option 3: Run the deploy stack with pushed images

Use this option when you want the full application to run from Docker Hub images, including the pricing ML API.

#### Steps

1. Go to the project root:

```powershell
cd C:\Users\21692\Desktop\eprinting
```

2. Create the deploy environment file:

```powershell
Copy-Item .\deploy\.env.example .\deploy\.env
```

3. Edit `deploy/.env` and set the real image tags and secrets you need.

Important values:

- `BACKEND_IMAGE`
- `FRONTEND_IMAGE`
- `PRICING_API_IMAGE`
- `MLFLOW_IMAGE`
- `JWT_SECRET`
- `MYSQL_ROOT_PASSWORD`
- `MLFLOW_POSTGRES_PASSWORD`
- `MLFLOW_S3_ACCESS_KEY`
- `MLFLOW_S3_SECRET_KEY`

Keep these internal URLs as they are:

- `SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/...`
- `PRICING_API_BASE_URL=http://pricing-api:8000`

4. Start the deploy stack:

```powershell
docker compose -f .\deploy\docker-compose.prod.yml --env-file .\deploy\.env up -d
```

#### Services

Once the containers are running:

- Frontend: `http://localhost`
- Backend: `http://localhost:8080`
- Pricing API: `http://localhost:8000/health`
- MLflow: `http://localhost:5000`
- MinIO console: `http://localhost:9001`

#### Logs

```powershell
docker compose -f .\deploy\docker-compose.prod.yml --env-file .\deploy\.env logs -f backend
docker compose -f .\deploy\docker-compose.prod.yml --env-file .\deploy\.env logs -f pricing-api
docker compose -f .\deploy\docker-compose.prod.yml --env-file .\deploy\.env logs -f mlflow-server
```

#### Stop the deploy stack

```powershell
docker compose -f .\deploy\docker-compose.prod.yml --env-file .\deploy\.env down
```
