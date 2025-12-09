import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger } from '../../core/logger.js';
import { config } from '../../config.js';
import { SpotifyAuthService } from '../spotify/SpotifyAuthService.js';

export class OAuthServer {
  private app: express.Application;
  private server: any = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configura middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * Configura las rutas del servidor
   */
  private setupRoutes(): void {
    // Página principal con instrucciones
    this.app.get('/', (_req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MalamBot OAuth</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #1DB954; }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background: #1DB954;
              color: white;
              text-decoration: none;
              border-radius: 25px;
              margin: 20px 0;
              font-weight: bold;
            }
            .btn:hover { background: #1ed760; }
            .status {
              padding: 10px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .success { background: #d4edda; color: #155724; }
            .warning { background: #fff3cd; color: #856404; }
            .code { 
              background: #f4f4f4;
              padding: 10px;
              border-radius: 5px;
              font-family: monospace;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎵 MalamBot - OAuth Server</h1>
            <p>Servidor de autenticación para integración con Spotify</p>
            
            ${this.getStatusHTML()}
            
            <h2>Configuración</h2>
            <p>Para usar Spotify con el bot, sigue estos pasos:</p>
            <ol>
              <li>Ve al <a href="https://developer.spotify.com/dashboard" target="_blank">Spotify Developer Dashboard</a></li>
              <li>Crea una aplicación (o usa una existente)</li>
              <li>Agrega esta URI de redirección:</li>
              <div class="code">${config.spotify.redirectUri}</div>
              <li>Copia el Client ID y Client Secret a tu archivo .env</li>
              <li>Haz clic en el botón de abajo para autorizar:</li>
            </ol>
            
            ${this.getAuthButtonHTML()}
            
            <h2>Endpoints Disponibles</h2>
            <ul>
              <li><code>GET /</code> - Esta página</li>
              <li><code>GET /auth/spotify</code> - Iniciar autenticación de Spotify</li>
              <li><code>GET /callback/spotify</code> - Callback OAuth de Spotify</li>
              <li><code>GET /status</code> - Estado de autenticación (JSON)</li>
            </ul>
          </div>
        </body>
        </html>
      `);
    });

    // Ruta para iniciar autenticación de Spotify
    this.app.get('/auth/spotify', (_req: Request, res: Response) => {
      try {
        if (!config.spotify.clientId) {
          res.status(400).send(`
            <html>
            <head><title>Error - Configuración</title></head>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1>⚠️ Error de Configuración</h1>
              <p>SPOTIFY_CLIENT_ID no está configurado en las variables de entorno.</p>
              <p><a href="/">Volver al inicio</a></p>
            </body>
            </html>
          `);
          return;
        }

        const authUrl = SpotifyAuthService.getAuthorizationUrl();
        Logger.info('[OAuthServer] Redirigiendo a Spotify para autorización');
        res.redirect(authUrl);
      } catch (error) {
        Logger.error('[OAuthServer] Error al generar URL de autorización:', error as Error);
        res.status(500).send(`
          <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1>❌ Error</h1>
            <p>${(error as Error).message}</p>
            <p><a href="/">Volver al inicio</a></p>
          </body>
          </html>
        `);
      }
    });

    // Callback de Spotify OAuth
    this.app.get('/callback/spotify', async (req: Request, res: Response) => {
      const { code, error } = req.query;

      if (error) {
        Logger.error(`[OAuthServer] Error en callback de Spotify: ${error}`);
        res.send(`
          <html>
          <head><title>Error - Autorización</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1>❌ Autorización Cancelada</h1>
            <p>Error: ${error}</p>
            <p><a href="/">Volver al inicio</a></p>
          </body>
          </html>
        `);
        return;
      }

      if (!code || typeof code !== 'string') {
        Logger.error('[OAuthServer] Código de autorización no recibido');
        res.status(400).send(`
          <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1>❌ Error</h1>
            <p>Código de autorización no recibido</p>
            <p><a href="/">Volver al inicio</a></p>
          </body>
          </html>
        `);
        return;
      }

      try {
        Logger.info('[OAuthServer] Procesando callback de Spotify...');
        const success = await SpotifyAuthService.exchangeCodeForToken(code);

        if (success) {
          Logger.info('[OAuthServer] ✅ Autenticación exitosa con Spotify');
          res.send(`
            <html>
            <head>
              <title>Éxito - Autorización</title>
              <meta http-equiv="refresh" content="3;url=/">
            </head>
            <body style="font-family: Arial; padding: 50px; text-align: center; background: #f5f5f5;">
              <div style="background: white; padding: 40px; border-radius: 10px; display: inline-block;">
                <h1 style="color: #1DB954;">✅ Autorización Exitosa</h1>
                <p>Tu bot ahora puede usar Spotify para buscar música</p>
                <p style="color: #666;">Redirigiendo en 3 segundos...</p>
                <p><a href="/" style="color: #1DB954;">Volver al inicio</a></p>
              </div>
            </body>
            </html>
          `);
        } else {
          throw new Error('No se pudo obtener el token de acceso');
        }
      } catch (error) {
        Logger.error('[OAuthServer] Error al procesar callback:', error as Error);
        res.status(500).send(`
          <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1>❌ Error al Procesar Autorización</h1>
            <p>${(error as Error).message}</p>
            <p><a href="/">Volver al inicio</a></p>
          </body>
          </html>
        `);
      }
    });

    // Status endpoint (JSON)
    this.app.get('/status', (_req: Request, res: Response) => {
      const status = SpotifyAuthService.getStatus();
      res.json({
        server: 'running',
        oauth: {
          enabled: config.oauth.enabled,
          configured: !!config.spotify.clientId && !!config.spotify.clientSecret,
        },
        spotify: status,
      });
    });

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  /**
   * Genera HTML para el botón de autenticación
   */
  private getAuthButtonHTML(): string {
    if (!config.spotify.clientId) {
      return `
        <div class="status warning">
          <strong>⚠️ Spotify no configurado</strong>
          <p>Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET a tu archivo .env</p>
        </div>
      `;
    }

    const status = SpotifyAuthService.getStatus();
    if (status.authenticated) {
      const expiresDate = new Date(status.expiresAt!).toLocaleString();
      return `
        <div class="status success">
          <strong>✅ Spotify Autenticado</strong>
          <p>Token expira: ${expiresDate}</p>
        </div>
      `;
    }

    return '<a href="/auth/spotify" class="btn">🎵 Autorizar con Spotify</a>';
  }

  /**
   * Genera HTML para el status
   */
  private getStatusHTML(): string {
    const configured = !!config.spotify.clientId && !!config.spotify.clientSecret;
    const status = SpotifyAuthService.getStatus();

    if (!configured) {
      return `
        <div class="status warning">
          <strong>⚠️ Configuración Pendiente</strong>
          <p>Configure SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en su .env</p>
        </div>
      `;
    }

    if (status.authenticated) {
      return `
        <div class="status success">
          <strong>✅ Todo Listo</strong>
          <p>Spotify está configurado y autenticado correctamente</p>
        </div>
      `;
    }

    return `
      <div class="status warning">
        <strong>⏳ Esperando Autorización</strong>
        <p>Haz clic en el botón de abajo para autorizar Spotify</p>
      </div>
    `;
  }

  /**
   * Inicia el servidor
   */
  public start(): void {
    if (this.server) {
      Logger.warn('[OAuthServer] El servidor ya está ejecutándose');
      return;
    }

    const port = config.oauth.port;

    this.server = this.app.listen(port, () => {
      Logger.info(`[OAuthServer] ✅ Servidor OAuth iniciado en http://localhost:${port}`);
      Logger.info(`[OAuthServer] 📝 Callback URI: ${config.spotify.redirectUri}`);
      Logger.info(`[OAuthServer] 🌐 Abre http://localhost:${port} para configurar Spotify`);
    });

    this.server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        Logger.error(`[OAuthServer] Puerto ${port} ya está en uso`);
      } else {
        Logger.error('[OAuthServer] Error al iniciar servidor:', error);
      }
    });
  }

  /**
   * Detiene el servidor
   */
  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        Logger.info('[OAuthServer] Servidor OAuth detenido');
      });
      this.server = null;
    }
  }

  /**
   * Verifica si el servidor está corriendo
   */
  public isRunning(): boolean {
    return this.server !== null;
  }
}
