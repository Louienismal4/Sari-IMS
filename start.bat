@echo off
REM ==============================================================================
REM Sari-Sari Store IMS - One-Click Initialization Script for Windows
REM ==============================================================================

setlocal enabledelayedexpansion

echo =====================================================
echo  Initializing Sari-Sari Store IMS...
echo =====================================================

REM 1. Check Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Docker daemon is not running.
    echo Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)

REM 2. Ensure .env
if not exist ".env" (
    echo [*] Generating .env configuration...
    if exist ".env.example" (
        copy .env.example .env >nul
    ) else (
        type nul > .env
    )
)

REM 3. Ensure backend/.env and frontend/.env
if not exist "backend\.env" (
    copy .env backend\.env >nul 2>nul
)
if not exist "frontend\.env" (
    echo NEXT_PUBLIC_API_URL=/api> frontend\.env
)

REM Clean any stale host cache
if exist "backend\bootstrap\cache\config.php" del /f /q "backend\bootstrap\cache\config.php" >nul 2>nul
if exist "backend\bootstrap\cache\routes-v7.php" del /f /q "backend\bootstrap\cache\routes-v7.php" >nul 2>nul

REM 4. Start Containers
echo [*] Building and starting Docker containers...
docker compose --env-file .env up -d --build

REM 5. Wait for MySQL and run migrations + seed
echo [*] Waiting for MySQL database to initialize...
timeout /t 10 /nobreak >nul

echo [*] Running database migrations...
docker compose exec -T backend php artisan migrate --force

echo [*] Seeding initial store catalog...
docker compose exec -T backend php artisan db:seed --force

echo =====================================================
echo  SARI-SARI STORE IMS IS READY!
echo =====================================================
echo  App Dashboard: http://localhost:3001
echo  Backend API:   http://localhost:8000
echo =====================================================

REM 6. Open Browser
start http://localhost:3001

echo Done! Press any key to close this window.
pause >nul
