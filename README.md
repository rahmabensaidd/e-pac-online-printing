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
