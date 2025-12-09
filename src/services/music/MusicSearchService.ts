import { Player, SearchResult } from 'discord-player';
import { User } from 'discord.js';
import play from 'play-dl';
import { Logger } from '../../core/logger.js';

export interface SearchOptions {
  requestedBy: User;
}

/**
 * Servicio de búsqueda de música usando play-dl directamente
 */
export class MusicSearchService {

  /**
   * Busca música SOLO en YouTube usando play-dl
   */
  static async search(
    player: Player,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult> {
    Logger.info(`[SearchService] 🔍 Búsqueda: "${query}" por ${options.requestedBy.tag}`);

    try {
      let finalUrl = query;

      // Si no es una URL, buscar en YouTube con play-dl
      if (!query.startsWith('http://') && !query.startsWith('https://')) {
        Logger.info(`[SearchService] 🎯 Buscando en YouTube con play-dl...`);

        const searchResults = await play.search(query, {
          limit: 1,
          source: { youtube: 'video' }
        });

        if (!searchResults || searchResults.length === 0) {
          throw new Error('❌ No se encontraron resultados en YouTube');
        }

        finalUrl = searchResults[0].url;
        Logger.info(`[SearchService] ✓ Encontrado: ${searchResults[0].title}`);
        Logger.info(`[SearchService] 🔗 URL: ${finalUrl}`);
      } else {
        Logger.info(`[SearchService] 🔗 URL directa: ${finalUrl}`);
      }

      // Verificar que sea una URL de YouTube válida
      const urlType = await play.validate(finalUrl);
      Logger.info(`[SearchService] 📦 Tipo: ${urlType}`);

      if (urlType !== 'yt_video' && urlType !== 'yt_playlist') {
        throw new Error('❌ Solo se aceptan URLs de YouTube');
      }

      // Crear SearchResult simple sin usar extractores de discord-player
      // Pasar la URL directamente para que player.play() la procese
      Logger.info(`[SearchService] ✓ URL validada, pasando a reproducción directa`);

      const searchResult = await player.search(finalUrl, {
        requestedBy: options.requestedBy,
        searchEngine: 'youtube' // Forzar engine de YouTube
      });

      if (!searchResult || !searchResult.hasTracks()) {
        Logger.error(`[SearchService] ❌ discord-player no pudo procesar la URL`);
        throw new Error('❌ No se pudo procesar el video. Intenta con otra canción.');
      }

      const track = searchResult.tracks[0];
      Logger.info(`[SearchService] ✓ Track: "${track.title}" | Duración: ${track.duration}`);

      return searchResult;
    } catch (error) {
      const errorMsg = (error as Error).message;
      Logger.error(`[SearchService] ❌ Error: ${errorMsg}`);

      // Mensajes de error amigables
      if (errorMsg.includes('No results') || errorMsg.includes('No se encontraron')) {
        throw new Error('❌ No se encontraron resultados. Intenta con otra búsqueda.');
      }

      if (errorMsg.includes('restricted') || errorMsg.includes('unavailable')) {
        throw new Error('❌ Este video no está disponible.');
      }

      throw error; // Propagar el error original
    }
  }

  /**
   * Valida que la consulta sea válida
   */
  static validateQuery(query: string): boolean {
    const trimmed = query.trim();
    return trimmed.length > 0 && trimmed.length <= 500;
  }
}
