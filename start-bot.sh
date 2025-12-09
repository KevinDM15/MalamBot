#!/bin/bash

echo "🔍 Verificando puerto 3000..."
PORT_IN_USE=$(lsof -i :3000 2>/dev/null | grep LISTEN)

if [ ! -z "$PORT_IN_USE" ]; then
    echo "⚠️  Puerto 3000 en uso, deteniendo proceso..."
    PID=$(lsof -ti :3000)
    kill $PID 2>/dev/null
    sleep 2
    echo "✅ Puerto liberado"
fi

echo "🔍 Verificando ngrok..."
NGROK_RUNNING=$(ps aux | grep "ngrok http 3000" | grep -v grep)

if [ -z "$NGROK_RUNNING" ]; then
    echo "⚠️  ngrok no está corriendo"
    echo "💡 Ejecuta en otra terminal: ngrok http 3000"
    read -p "¿Ya tienes ngrok corriendo? (y/n): " yn
    if [ "$yn" != "y" ]; then
        exit 1
    fi
fi

NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4)

if [ ! -z "$NGROK_URL" ]; then
    echo "✅ ngrok detectado: $NGROK_URL"
    echo ""
    echo "📝 Asegúrate de tener esta URI en Spotify Dashboard:"
    echo "   $NGROK_URL/callback/spotify"
    echo ""
fi

echo "🚀 Iniciando bot..."
npm run dev

