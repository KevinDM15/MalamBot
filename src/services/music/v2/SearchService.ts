import * as play from 'play-dl';
import SpotifyWebApi from 'spotify-web-api-node';
import { User } from 'discord.js';
import { Logger } from '../../../core/logger.js';
import { Song } from './types.js';

/**
 * Servicio de búsqueda para múltiples plataformas
 */
export class SearchService {
  private spotifyApi: SpotifyWebApi | null = null;

  constructor() {
    // Configurar Spotify API si hay credenciales
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (clientId && clientSecret) {
      this.spotifyApi = new SpotifyWebApi({
        clientId,
        clientSecret,
      });

      // Obtener access token
      this.spotifyApi.clientCredentialsGrant().then(
        (data: any) => {
          this.spotifyApi!.setAccessToken(data.body['access_token']);
          Logger.info('[SearchService] Spotify API configurada');
        },
        (err: any) => {
          Logger.error('[SearchService] Error configurando Spotify:', err);
          this.spotifyApi = null;
        }
      );
    }
  }

  /**
   * Busca y resuelve una canción desde query/URL
   */
  async search(query: string, requestedBy: User): Promise<Song | null> {
    try {
      // Si es URL de YouTube
      if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
        return await this.getYouTubeInfo(query, requestedBy);
      }

      // Si es URL de Spotify
      if (query.includes('spotify.com/track/')) {
        return await this.searchSpotifyTrack(query, requestedBy);
      }

      // Si es URL de Spotify playlist
      if (query.includes('spotify.com/playlist/')) {
        Logger.warn('[SearchService] Use searchPlaylist() for playlists');
        return null;
      }

      // Si es URL de YouTube playlist
      if (query.includes('youtube.com/playlist') || query.includes('list=')) {
        Logger.warn('[SearchService] Use searchPlaylist() for playlists');
        return null;
      }

      // Búsqueda de texto en YouTube
      return await this.searchYouTube(query, requestedBy);
    } catch (error) {
      Logger.error('[SearchService] Error buscando canción:', error as Error);
      return null;
    }
  }

  /**
   * Busca y resuelve una playlist completa
   */
  async searchPlaylist(query: string, requestedBy: User): Promise<Song[]> {
    try {
      // Si es URL de YouTube playlist
      if (query.includes('youtube.com/playlist') || query.includes('list=')) {
        return await this.getYouTubePlaylist(query, requestedBy);
      }

      // Si es URL de Spotify playlist
      if (query.includes('spotify.com/playlist/')) {
        return await this.getSpotifyPlaylist(query, requestedBy);
      }

      // Si es URL de Spotify album
      if (query.includes('spotify.com/album/')) {
        return await this.getSpotifyAlbum(query, requestedBy);
      }

      Logger.warn('[SearchService] URL no es una playlist válida');
      return [];
    } catch (error) {
      Logger.error('[SearchService] Error buscando playlist:', error as Error);
      return [];
    }
  }

  /**
   * Obtiene información de un video de YouTube
   */
  private async getYouTubeInfo(url: string, requestedBy: User): Promise<Song | null> {
    try {
      Logger.info(`[SearchService] Obteniendo info de YouTube: ${url}`);
      const info = await play.video_info(url);

      Logger.info(`[SearchService] Info obtenida: ${info.video_details.title}`);
      Logger.info(`[SearchService] URL del video: ${info.video_details.url}`);

      return {
        title: info.video_details.title || 'Unknown',
        url: info.video_details.url,
        duration: this.formatDuration(info.video_details.durationInSec),
        thumbnail: info.video_details.thumbnails[0]?.url || '',
        author: info.video_details.channel?.name || 'Unknown',
        requestedBy,
        source: 'youtube',
      };
    } catch (error) {
      Logger.error('[SearchService] Error obteniendo info de YouTube:', error as Error);
      return null;
    }
  }

  /**
   * Busca en YouTube por texto
   */
  private async searchYouTube(query: string, requestedBy: User): Promise<Song | null> {
    try {
      Logger.info(`[SearchService] Buscando en YouTube: "${query}"`);
      const searchResults = await play.search(query, { limit: 1 });

      if (!searchResults || searchResults.length === 0) {
        Logger.warn('[SearchService] No se encontraron resultados');
        return null;
      }

      const video = searchResults[0];
      Logger.info(`[SearchService] Encontrado: ${video.title} - URL: ${video.url}`);

      return {
        title: video.title || 'Unknown',
        url: video.url,
        duration: this.formatDuration(video.durationInSec),
        thumbnail: video.thumbnails[0]?.url || '',
        author: video.channel?.name || 'Unknown',
        requestedBy,
        source: 'youtube',
      };
    } catch (error) {
      Logger.error('[SearchService] Error buscando en YouTube:', error as Error);
      return null;
    }
  }

  /**
   * Busca track de Spotify y lo convierte a YouTube
   */
  private async searchSpotifyTrack(url: string, requestedBy: User): Promise<Song | null> {
    if (!this.spotifyApi) {
      Logger.warn('[SearchService] Spotify API no configurada');
      return null;
    }

    try {
      const trackId = this.extractSpotifyId(url);
      if (!trackId) {
        return null;
      }

      const data = await this.spotifyApi.getTrack(trackId);
      const track = data.body;

      // Buscar el track en YouTube
      const searchQuery = `${track.artists[0].name} ${track.name} audio`;
      Logger.info(`[SearchService] Buscando en YouTube: ${searchQuery}`);

      return await this.searchYouTube(searchQuery, requestedBy);
    } catch (error) {
      Logger.error('[SearchService] Error buscando track de Spotify:', error as Error);
      return null;
    }
  }

  /**
   * Extrae el ID de un URL de Spotify
   */
  private extractSpotifyId(url: string): string | null {
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (trackMatch) return trackMatch[1];

    const playlistMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (playlistMatch) return playlistMatch[1];

    const albumMatch = url.match(/album\/([a-zA-Z0-9]+)/);
    if (albumMatch) return albumMatch[1];

    return null;
  }

  /**
   * Obtiene canciones de una playlist de YouTube
   */
  private async getYouTubePlaylist(url: string, requestedBy: User): Promise<Song[]> {
    try {
      Logger.info(`[SearchService] Obteniendo playlist de YouTube: ${url}`);
      const playlist = await play.playlist_info(url, { incomplete: true });
      const videos = await playlist.all_videos();

      Logger.info(
        `[SearchService] Playlist encontrada: ${playlist.title} (${videos.length} videos)`
      );

      const songs: Song[] = [];
      for (const video of videos.slice(0, 50)) {
        // Limitar a 50 canciones
        songs.push({
          title: video.title || 'Unknown',
          url: video.url,
          duration: this.formatDuration(video.durationInSec),
          thumbnail: video.thumbnails[0]?.url || '',
          author: video.channel?.name || 'Unknown',
          requestedBy,
          source: 'youtube',
        });
      }

      return songs;
    } catch (error) {
      Logger.error('[SearchService] Error obteniendo playlist de YouTube:', error as Error);
      return [];
    }
  }

  /**
   * Obtiene canciones de una playlist de Spotify
   */
  private async getSpotifyPlaylist(url: string, requestedBy: User): Promise<Song[]> {
    if (!this.spotifyApi) {
      Logger.warn('[SearchService] Spotify API no configurada');
      return [];
    }

    try {
      const playlistId = this.extractSpotifyId(url);
      if (!playlistId) {
        return [];
      }

      Logger.info(`[SearchService] Obteniendo playlist de Spotify: ${playlistId}`);
      const data = await this.spotifyApi.getPlaylist(playlistId);
      const playlist = data.body;

      Logger.info(
        `[SearchService] Playlist encontrada: ${playlist.name} (${playlist.tracks.total} tracks)`
      );

      const songs: Song[] = [];
      for (const item of playlist.tracks.items.slice(0, 50)) {
        // Limitar a 50 canciones
        if (item.track && item.track.type === 'track') {
          const track = item.track as any;
          const searchQuery = `${track.artists[0].name} ${track.name} audio`;
          const song = await this.searchYouTube(searchQuery, requestedBy);
          if (song) {
            songs.push(song);
          }
        }
      }

      return songs;
    } catch (error) {
      Logger.error('[SearchService] Error obteniendo playlist de Spotify:', error as Error);
      return [];
    }
  }

  /**
   * Obtiene canciones de un álbum de Spotify
   */
  private async getSpotifyAlbum(url: string, requestedBy: User): Promise<Song[]> {
    if (!this.spotifyApi) {
      Logger.warn('[SearchService] Spotify API no configurada');
      return [];
    }

    try {
      const albumId = this.extractSpotifyId(url);
      if (!albumId) {
        return [];
      }

      Logger.info(`[SearchService] Obteniendo álbum de Spotify: ${albumId}`);
      const data = await this.spotifyApi.getAlbum(albumId);
      const album = data.body;

      Logger.info(`[SearchService] Álbum encontrado: ${album.name} (${album.tracks.total} tracks)`);

      const songs: Song[] = [];
      for (const track of album.tracks.items) {
        const searchQuery = `${track.artists[0].name} ${track.name} audio`;
        const song = await this.searchYouTube(searchQuery, requestedBy);
        if (song) {
          songs.push(song);
        }
      }

      return songs;
    } catch (error) {
      Logger.error('[SearchService] Error obteniendo álbum de Spotify:', error as Error);
      return [];
    }
  }

  /**
   * Formatea duración en segundos a MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
