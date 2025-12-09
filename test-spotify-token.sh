#!/bin/bash

# Este script simula el intercambio de código por token
# Úsalo solo si tienes un código válido de Spotify

echo "⚠️  Este es un script de prueba"
echo ""
echo "Para probarlo necesitas:"
echo "1. Ir manualmente a la URL de autorización"
echo "2. Copiar el 'code' que viene en la URL de callback"
echo "3. Pegarlo aquí"
echo ""
read -p "Código de Spotify (o Enter para salir): " CODE

if [ -z "$CODE" ]; then
    echo "Saliendo..."
    exit 0
fi

source .env

echo ""
echo "🔄 Intercambiando código por token..."
echo ""

curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Authorization: Basic $(echo -n "$SPOTIFY_CLIENT_ID:$SPOTIFY_CLIENT_SECRET" | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=$CODE&redirect_uri=$SPOTIFY_REDIRECT_URI" \
  -v

