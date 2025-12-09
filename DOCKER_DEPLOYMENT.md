# 🐳 Guía de Deployment con Docker

## 📦 **Archivos Creados**

- ✅ `Dockerfile` - Imagen multi-stage optimizada
- ✅ `docker-compose.yml` - Orquestación local
- ✅ `.dockerignore` - Archivos excluidos
- ✅ `docker-entrypoint.sh` - Script de inicio

---

## 🚀 **Opción 1: Docker Local**

### Build y Run:

```bash
# 1. Build la imagen
docker build -t malambot:latest .

# 2. Run con docker-compose (recomendado)
docker-compose up -d

# 3. Ver logs
docker-compose logs -f

# 4. Parar
docker-compose down
```

### O con Docker directamente:

```bash
docker run -d \
  --name malambot \
  --restart unless-stopped \
  -e DISCORD_TOKEN="tu_token" \
  -e DISCORD_CLIENT_ID="tu_client_id" \
  -e MICROSERVICE_URL="http://localhost:8080" \
  -e SPOTIFY_CLIENT_ID="tu_spotify_client" \
  -e SPOTIFY_CLIENT_SECRET="tu_spotify_secret" \
  -p 3000:3000 \
  -p 8080:8080 \
  malambot:latest
```

---

## ☁️ **Opción 2: Railway.app (Recomendado)**

### Setup:

1. **Subir a GitHub:**

```bash
git add .
git commit -m "Add Docker support"
git push
```

2. **En Railway.app:**
   - New Project → Deploy from GitHub
   - Selecciona tu repo
   - Railway detecta el `Dockerfile` automáticamente

3. **Variables de entorno:**
   - Add todas las variables de tu `.env`
   - `MICROSERVICE_URL=http://localhost:8080`

4. **Deploy:**
   - Railway construye y deploya automáticamente
   - Se asigna un dominio: `malambot.railway.app`

**Ventajas:**

- ✅ Auto-deploy en cada push
- ✅ $5/mes (~500 horas)
- ✅ Logs en tiempo real
- ✅ Métricas integradas

---

## 🌊 **Opción 3: Render.com (Gratis con limitaciones)**

### Setup:

1. **Crear cuenta en render.com**
2. **New → Web Service**
3. **Conectar GitHub repo**
4. **Configuración:**
   - Environment: `Docker`
   - Instance Type: `Free` (se apaga después de 15 min de inactividad)
   - Variables de entorno: Agregar todas

**Nota:** El plan gratis se apaga si no hay actividad, bueno solo para testing.

---

## 🦅 **Opción 4: Fly.io (Gratis hasta 3 VMs)**

### Setup:

```bash
# 1. Instalar Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Crear app
flyctl launch

# 4. Configurar secrets
flyctl secrets set DISCORD_TOKEN="tu_token"
flyctl secrets set DISCORD_CLIENT_ID="tu_client_id"
flyctl secrets set SPOTIFY_CLIENT_ID="tu_spotify_client"
flyctl secrets set SPOTIFY_CLIENT_SECRET="tu_spotify_secret"

# 5. Deploy
flyctl deploy
```

**Configuración en `fly.toml`:**

```toml
app = "malambot"
primary_region = "iad" # US-East (cerca de Discord)

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  MICROSERVICE_URL = "http://localhost:8080"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

---

## 🐙 **Opción 5: GitHub Container Registry + VPS**

### 1. Push a GitHub Container Registry:

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag y push
docker tag malambot:latest ghcr.io/USERNAME/malambot:latest
docker push ghcr.io/USERNAME/malambot:latest
```

### 2. Deploy en cualquier VPS:

```bash
# En tu servidor (DigitalOcean, Oracle Cloud, etc.)
docker pull ghcr.io/USERNAME/malambot:latest

docker run -d \
  --name malambot \
  --restart unless-stopped \
  --env-file .env \
  ghcr.io/USERNAME/malambot:latest
```

---

## 🏠 **Opción 6: Oracle Cloud Free Tier (100% GRATIS)**

**Recursos gratuitos permanentes:**

- 4 CPUs ARM (Ampere A1)
- 24GB RAM
- 200GB storage

### Setup:

```bash
# 1. Crear instancia Ubuntu en Oracle Cloud

# 2. SSH al servidor
ssh ubuntu@tu-ip

# 3. Instalar Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# 4. Clonar repo
git clone https://github.com/TU_USER/MalamBot.git
cd MalamBot

# 5. Crear .env con tus variables

# 6. Deploy
sudo docker-compose up -d

# 7. Ver logs
sudo docker-compose logs -f
```

**Configurar Auto-start:**

```bash
# Crear servicio systemd
sudo nano /etc/systemd/system/malambot.service
```

```ini
[Unit]
Description=MalamBot Discord Bot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/MalamBot
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable malambot
sudo systemctl start malambot
```

---

## 📊 **Comparación de Opciones**

| Plataforma       | Precio   | Facilidad  | Performance | Uptime  |
| ---------------- | -------- | ---------- | ----------- | ------- |
| **Railway**      | $5/mes   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | 99.9%   |
| **Fly.io**       | Gratis\* | ⭐⭐⭐⭐   | ⭐⭐⭐⭐    | 99.9%   |
| **Render**       | Gratis\* | ⭐⭐⭐⭐⭐ | ⭐⭐        | ~90%    |
| **Oracle Cloud** | GRATIS   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐  | 99.5%   |
| **DigitalOcean** | $6/mes   | ⭐⭐⭐     | ⭐⭐⭐⭐    | 99.9%   |
| **Local/PC**     | ~$2/mes  | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐  | Depende |

\* Con limitaciones

---

## 🎯 **Recomendación según tu caso:**

### **Para empezar rápido:**

👉 **Railway.app** ($5/mes)

- Más fácil
- Auto-deploy
- Buena performance

### **Quieres gratis y estable:**

👉 **Oracle Cloud Free Tier**

- 100% gratis para siempre
- Muy potente (4 CPUs, 24GB RAM)
- Requiere setup manual

### **Solo testing:**

👉 **Render.com** (gratis)

- Se apaga después de 15 min
- Bueno para probar

### **Quieres aprender:**

👉 **Oracle Cloud + Docker**

- Experiencia real de DevOps
- Control total

---

## 🔧 **Optimizaciones de la Imagen Docker**

### **Multi-stage build:**

- ✅ Stage 1: Build Go microservice (Alpine)
- ✅ Stage 2: Build Node.js (Alpine)
- ✅ Stage 3: Runtime optimizado (Alpine)

### **Tamaño final:**

- Sin optimizar: ~1.5GB
- Optimizado: ~350MB

### **Incluye:**

- ✅ FFmpeg para audio
- ✅ yt-dlp (más actualizado que youtube-dl)
- ✅ Health check integrado
- ✅ Restart automático
- ✅ Logs estructurados

---

## 📝 **Comandos Útiles**

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar
docker-compose restart

# Ver uso de recursos
docker stats malambot

# Entrar al contenedor
docker exec -it malambot sh

# Limpiar todo y rebuild
docker-compose down -v
docker system prune -a
docker-compose up -d --build

# Ver health check
docker inspect --format='{{json .State.Health}}' malambot
```

---

## 🐛 **Troubleshooting**

### **Error: Cannot connect to Discord**

```bash
# Verificar variables de entorno
docker exec malambot env | grep DISCORD
```

### **Error: Microservice not ready**

```bash
# Ver logs del microservice
docker-compose logs microservice

# Test manual del endpoint
curl http://localhost:8080/health
```

### **Lag en audio:**

- Verificar región del servidor (Railway/Fly.io)
- Usar región US-East o EU-West (más cerca de Discord)
- Aumentar recursos si está en VPS

---

## ✅ **Next Steps:**

1. **Elegir plataforma** (recomiendo Railway para empezar)
2. **Subir código a GitHub** si no está ya
3. **Configurar variables de entorno** en la plataforma
4. **Deploy y probar**

¿Con cuál quieres empezar? Te puedo ayudar con el setup específico. 🚀
