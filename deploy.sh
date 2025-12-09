#!/bin/bash

# Script de ayuda para Docker deployment

set -e

echo "🐳 MalamBot - Docker Deployment Helper"
echo "========================================"
echo ""

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    echo "Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker está instalado"
docker --version
echo ""

# Menu
echo "Selecciona una opción:"
echo "1) Build imagen"
echo "2) Run con docker-compose"
echo "3) Ver logs"
echo "4) Parar contenedor"
echo "5) Rebuild (limpio)"
echo "6) Push a GitHub Container Registry"
echo "7) Salir"
echo ""

read -p "Opción: " option

case $option in
    1)
        echo "🔨 Building imagen..."
        docker build -t malambot:latest .
        echo "✅ Build completado"
        ;;
    2)
        echo "🚀 Starting con docker-compose..."
        docker-compose up -d
        echo "✅ Bot iniciado"
        echo "Ver logs: docker-compose logs -f"
        ;;
    3)
        echo "📋 Logs (Ctrl+C para salir):"
        docker-compose logs -f
        ;;
    4)
        echo "🛑 Stopping..."
        docker-compose down
        echo "✅ Bot detenido"
        ;;
    5)
        echo "🧹 Limpiando y rebuild..."
        docker-compose down -v
        docker system prune -f
        docker build --no-cache -t malambot:latest .
        docker-compose up -d
        echo "✅ Rebuild completado"
        ;;
    6)
        read -p "GitHub username: " github_user
        read -p "GitHub token (PAT): " -s github_token
        echo ""
        
        echo "🔐 Login a ghcr.io..."
        echo "$github_token" | docker login ghcr.io -u "$github_user" --password-stdin
        
        echo "📦 Tagging imagen..."
        docker tag malambot:latest "ghcr.io/$github_user/malambot:latest"
        
        echo "⬆️  Pushing..."
        docker push "ghcr.io/$github_user/malambot:latest"
        
        echo "✅ Push completado"
        echo "Tu imagen está en: ghcr.io/$github_user/malambot:latest"
        ;;
    7)
        echo "👋 Adiós"
        exit 0
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac
