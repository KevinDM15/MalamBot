@echo off
REM Script para build y run de MalamBot en Docker (Windows)

echo ========================================
echo  MalamBot - Docker Build and Run
echo ========================================
echo.

REM Verificar que Docker este corriendo
docker version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no esta corriendo
    echo Por favor inicia Docker Desktop
    pause
    exit /b 1
)

echo [OK] Docker esta corriendo
echo.

REM Ir al directorio del proyecto
cd /d "%~dp0"

echo ========================================
echo  Step 1: Building Docker image...
echo ========================================
docker build -t malambot:latest .
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [OK] Image built successfully!
echo.

echo ========================================
echo  Step 2: Starting container...
echo ========================================
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start container
    pause
    exit /b 1
)

echo.
echo [OK] Container started!
echo.

echo ========================================
echo  Logs (Press Ctrl+C to exit):
echo ========================================
docker-compose logs -f
