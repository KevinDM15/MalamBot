import { Logger } from '../../core/logger.js';
import { config } from '../../config.js';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface SpotifyTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Servicio de autenticación OAuth2 para Spotify
 * Gestiona tokens de acceso y refresh
 */
export class SpotifyAuthService {
  private static tokenData: SpotifyTokenData | null = null;
  private static readonly SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';
  private static readonly SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';

  /**
   * Genera la URL de autorización de Spotify
   */
  static getAuthorizationUrl(): string {
    if (!config.spotify.clientId || !config.spotify.redirectUri) {
      throw new Error('Spotify Client ID o Redirect URI no configurados');
    }

    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
    ].join(' ');

    // Construir la URL manualmente para evitar doble codificación
    const url =
      `${this.SPOTIFY_AUTHORIZE_URL}?` +
      `client_id=${encodeURIComponent(config.spotify.clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(config.spotify.redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&show_dialog=true`;

    Logger.info('[SpotifyAuth] URL de autorización generada');
    Logger.info(`[SpotifyAuth] Redirect URI: ${config.spotify.redirectUri}`);
    return url;
  }

  /**
   * Intercambia el código de autorización por un token de acceso
   */
  static async exchangeCodeForToken(code: string): Promise<boolean> {
    if (!config.spotify.clientId || !config.spotify.clientSecret || !config.spotify.redirectUri) {
      throw new Error('Credenciales de Spotify no configuradas correctamente');
    }

    try {
      Logger.info('[SpotifyAuth] Intercambiando código por token...');
      Logger.info(`[SpotifyAuth] Usando redirect_uri: ${config.spotify.redirectUri}`);

      // Construir body manualmente para evitar problemas de codificación
      const body = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(config.spotify.redirectUri)}`;

      const credentials = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await fetch(this.SPOTIFY_AUTH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`[SpotifyAuth] Error HTTP ${response.status}: ${errorText}`);

        // Mensajes de error específicos
        if (response.status === 503) {
          throw new Error(
            'Spotify API temporalmente no disponible. Intenta de nuevo en unos minutos.'
          );
        } else if (response.status === 400) {
          throw new Error('Credenciales inválidas. Verifica Client ID y Client Secret.');
        } else if (response.status === 401) {
          throw new Error('No autorizado. Verifica las credenciales de Spotify.');
        }

        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = (await response.json()) as SpotifyTokenResponse;

      this.tokenData = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      Logger.info('[SpotifyAuth] ✅ Token obtenido exitosamente');
      Logger.info(`[SpotifyAuth] Expira en: ${data.expires_in} segundos`);

      return true;
    } catch (error) {
      Logger.error('[SpotifyAuth] Error al intercambiar código:', error as Error);
      throw error;
    }
  }

  /**
   * Refresca el token de acceso usando el refresh token
   */
  static async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenData?.refreshToken) {
      Logger.warn('[SpotifyAuth] No hay refresh token disponible');
      return false;
    }

    if (!config.spotify.clientId || !config.spotify.clientSecret) {
      throw new Error('Credenciales de Spotify no configuradas');
    }

    try {
      Logger.info('[SpotifyAuth] Refrescando token...');

      // Construir body manualmente
      const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.tokenData.refreshToken)}`;

      const credentials = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await fetch(this.SPOTIFY_AUTH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`[SpotifyAuth] Error HTTP ${response.status}: ${errorText}`);
        return false;
      }

      const data = (await response.json()) as SpotifyTokenResponse;

      this.tokenData.accessToken = data.access_token;
      this.tokenData.expiresAt = Date.now() + data.expires_in * 1000;

      // Actualizar refresh token si viene uno nuevo
      if (data.refresh_token) {
        this.tokenData.refreshToken = data.refresh_token;
      }

      Logger.info('[SpotifyAuth] ✅ Token refrescado exitosamente');

      return true;
    } catch (error) {
      Logger.error('[SpotifyAuth] Error al refrescar token:', error as Error);
      return false;
    }
  }

  /**
   * Obtiene un token de acceso válido (refresca si es necesario)
   */
  static async getValidToken(): Promise<string | null> {
    if (!this.tokenData) {
      Logger.warn('[SpotifyAuth] No hay token disponible. Ejecuta la autenticación primero.');
      return null;
    }

    // Verificar si el token está por expirar (5 minutos antes)
    const isExpiringSoon = this.tokenData.expiresAt - Date.now() < 5 * 60 * 1000;

    if (isExpiringSoon) {
      Logger.info('[SpotifyAuth] Token expirando pronto, refrescando...');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        return null;
      }
    }

    return this.tokenData.accessToken;
  }

  /**
   * Verifica si hay un token activo
   */
  static hasValidToken(): boolean {
    if (!this.tokenData) {
      return false;
    }

    return this.tokenData.expiresAt > Date.now();
  }

  /**
   * Limpia los tokens almacenados
   */
  static clearTokens(): void {
    this.tokenData = null;
    Logger.info('[SpotifyAuth] Tokens limpiados');
  }

  /**
   * Obtiene información del estado actual
   */
  static getStatus(): { authenticated: boolean; expiresAt?: number } {
    if (!this.tokenData) {
      return { authenticated: false };
    }

    return {
      authenticated: this.hasValidToken(),
      expiresAt: this.tokenData.expiresAt,
    };
  }
}
