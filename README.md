# MalamBot

Bot de Discord con TypeScript + Microservicio en Go para estadísticas de Rocket League.

## 📋 Requisitos

- Node.js 18+ y Yarn
- Go 1.21+
- Token de bot de Discord

## 🚀 Instalación

### 1. Configurar el Bot de Discord (TypeScript)

```bash
# Instalar dependencias
yarn install

# Copiar el archivo de ejemplo y configurar variables
cp .env.example .env
# Editar .env con tu token de Discord, CLIENT_ID y GUILD_ID
```

### 2. Configurar el Microservicio (Go)

```bash
cd microservice
go mod download
```

## ▶️ Ejecución

### Iniciar el Microservicio Go

```bash
cd microservice
go run main.go
```

El microservicio estará disponible en `http://localhost:8080`

### Iniciar el Bot de Discord

En otra terminal:

```bash
# Modo desarrollo (con hot reload)
yarn dev

# Modo producción
yarn build
yarn start
```

## 📁 Estructura del Proyecto

```
MalamBot/
├── src/                        # Código del bot en TypeScript
│   ├── commands/               # Comandos del bot
│   │   ├── utility/           # Comandos de utilidad
│   │   ├── music/             # Comandos de música
│   │   └── rocketleague/      # Comandos de Rocket League
│   ├── events/                # Eventos de Discord
│   ├── core/                  # Núcleo del bot
│   │   ├── client.ts          # Cliente personalizado
│   │   └── logger.ts          # Sistema de logs
│   ├── config.ts              # Configuración
│   ├── types.ts               # Tipos TypeScript
│   └── index.ts               # Punto de entrada
├── microservice/              # Microservicio en Go
│   ├── internal/
│   │   ├── handlers/          # Manejadores HTTP
│   │   ├── services/          # Lógica de negocio
│   │   └── models/            # Modelos de datos
│   ├── main.go                # Servidor HTTP
│   └── go.mod                 # Dependencias Go
├── package.json
├── tsconfig.json
└── .env.example
```

## 🎮 Comandos Disponibles

- `/ping` - Verifica la latencia del bot
- `/play [cancion]` - Reproduce música de SoundCloud, Spotify, YouTube y más
- `/skip` - Salta la canción actual
- `/stop` - Detiene la reproducción
- `/queue` - Muestra la cola de reproducción
- `/rank [playerid]` - Obtiene el rango de Rocket League

## 🌐 API del Microservicio

### Endpoints

- `GET /rl/rank/{playerId}` - Obtiene el rango de un jugador
- `GET /health` - Health check

### Ejemplo de respuesta

```json
{
  "playerId": "player123",
  "rank": "Diamond III",
  "division": 2,
  "mmr": 1150
}
```

## 🔧 Variables de Entorno

Copia `.env.example` a `.env` y configura:

**Requeridas:**

- `DISCORD_TOKEN` - Token del bot de Discord
- `CLIENT_ID` - ID de la aplicación de Discord
- `GUILD_ID` - ID del servidor (opcional, para comandos de desarrollo)
- `MICROSERVICE_URL` - URL del microservicio (por defecto: http://localhost:8080)

**Opcionales (Spotify OAuth):**

- `OAUTH_ENABLED` - Habilitar servidor OAuth (true/false)
- `OAUTH_PORT` - Puerto del servidor OAuth (por defecto: 3000)
- `SPOTIFY_CLIENT_ID` - Client ID de Spotify Developer
- `SPOTIFY_CLIENT_SECRET` - Client Secret de Spotify
- `SPOTIFY_REDIRECT_URI` - URI de callback (por defecto: http://localhost:3000/callback/spotify)

Ver [SPOTIFY_OAUTH_SETUP.md](SPOTIFY_OAUTH_SETUP.md) para configuración detallada de Spotify.

## 📝 Scripts Disponibles

```bash
yarn dev      # Inicia el bot en modo desarrollo con hot reload
yarn build    # Compila TypeScript a JavaScript
yarn start    # Inicia el bot en producción
yarn lint     # Ejecuta el linter
yarn format   # Formatea el código con Prettier
```

## 🔄 Flujo de Comunicación

1. Usuario ejecuta `/rank player123` en Discord
2. Bot envía request a `http://localhost:8080/rl/rank/player123`
3. Microservicio procesa y retorna datos JSON
4. Bot muestra información formateada en Discord

## 🚧 Estado Actual

**Implementado:**

- ✅ Estructura base del proyecto
- ✅ Sistema de comandos slash
- ✅ Logger personalizado
- ✅ Microservicio REST en Go
- ✅ Comunicación TypeScript ↔ Go
- ✅ Sistema de reproducción de música multi-plataforma
- ✅ Servidor OAuth para Spotify
- ✅ Extractores: SoundCloud, Spotify, Vimeo, YouTube

**Por implementar:**

- ⏳ Integración real con API de Rocket League
- ⏳ Tests unitarios
- ⏳ CI/CD

## 🎵 Configuración de Música

El bot soporta múltiples plataformas de música:

1. **SoundCloud** (recomendado - sin bloqueos)
2. **Spotify** (requiere OAuth - mejor búsqueda)
3. **Vimeo**
4. **YouTube** (puede fallar por bloqueos)

### Configurar Spotify (Opcional pero Recomendado)

Para mejor calidad de búsqueda:

1. Ve a `http://localhost:3000` cuando el bot esté ejecutándose
2. Sigue las instrucciones en pantalla
3. Autoriza con tu cuenta de Spotify

Ver guía completa: [SPOTIFY_OAUTH_SETUP.md](SPOTIFY_OAUTH_SETUP.md)

### Uso de Música

```
# Buscar por nombre (prueba en todas las plataformas)
/play Imagine Dragons - Believer

# SoundCloud (recomendado)
/play https://soundcloud.com/artist/track

# Spotify
/play https://open.spotify.com/track/...

# YouTube (puede fallar)
/play https://youtube.com/watch?v=...
```

Ver documentación completa: [MUSIC_SOURCES.md](MUSIC_SOURCES.md)

## 📄 Licencia

MIT
