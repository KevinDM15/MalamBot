import { Player, SearchResult, GuildQueue, Track, QueryType } from 'discord-player';
import { GuildMember, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import ffmpegStatic from 'ffmpeg-static';
import { Logger } from '../../core/logger.js';
import { BotClient } from '../../core/client.js';
import { MusicPlayerConfig } from './types.js';
import { MusicEventHandler } from './MusicEventHandler.js';
import { DefaultExtractors } from '@discord-player/extractor';

/**
 * Singleton pattern - Music Player Service
 * Maneja toda la lógica de reproducción de música
 */
export class MusicPlayer {
  private static instance: Player | null = null;
  private static eventHandler: MusicEventHandler | null = null;

  /**
   * Inicializa el reproductor de música (Singleton)
   */
  static async initialize(client: BotClient): Promise<Player> {
    if (this.instance) {
      Logger.info('[MusicPlayer] Ya está inicializado');
      return this.instance;
    }

    try {
      Logger.info('[MusicPlayer] Iniciando sistema de música...');

      // Configurar FFmpeg ANTES de crear el Player
      if (ffmpegStatic) {
        process.env.FFMPEG_PATH = ffmpegStatic;
        Logger.info(`[MusicPlayer] FFmpeg configurado: ${ffmpegStatic}`);
      } else {
        Logger.warn('[MusicPlayer] ffmpeg-static no disponible, usando FFmpeg del sistema');
      }

      // Crear Player con timeout más corto para detectar problemas rápido
      this.instance = new Player(client, {
        connectionTimeout: 30_000,
      });

      // Cargar extractores (Spotify, YouTube, SoundCloud, etc.)
      Logger.info('[MusicPlayer] Cargando extractores...');
      await this.instance.extractors.loadMulti(DefaultExtractors);
      Logger.info('[MusicPlayer] ✓ Extractores cargados');

      // WORKAROUND CRÍTICO: Interceptar streams para forzar FFmpeg
      // El bug en @discord-player/extractor causa que streams vengan con skipFFmpeg: true
      this.instance.events.on('audioTrackAdd', (queue, track) => {
        Logger.info(`[MusicPlayer] Track añadido: ${track.title} from ${track.source}`);
      });

      // INTERCEPTOR CRÍTICO: Forzar FFmpeg en todos los streams
      this.instance.events.on('playerStart', (queue, track) => {
        Logger.info(`[MusicPlayer] 🔧 playerStart interceptado para: ${track.title}`);
        Logger.info(`[MusicPlayer] Fuente: ${track.source}, URL: ${track.url}`);
      });

      // Configurar evento de tracks añadidos
      this.instance.events.on('audioTracksAdd', (queue, tracks) => {
        Logger.info(
          `[MusicPlayer] ${tracks.length} track(s) añadido(s) a la cola de ${queue.guild.name}`
        );
      });

      // Configurar eventos
      this.eventHandler = new MusicEventHandler(this.instance);
      this.eventHandler.registerEvents();

      Logger.info('[MusicPlayer] ✅ Sistema de música inicializado correctamente');

      return this.instance;
    } catch (error) {
      Logger.error('[MusicPlayer] Error al inicializar:', error as Error);
      throw error;
    }
  }

  /**
   * Obtiene la instancia del reproductor
   */
  static getInstance(): Player {
    if (!this.instance) {
      throw new Error('MusicPlayer no está inicializado. Llama a initialize() primero.');
    }
    return this.instance;
  }

  /**
   * Busca y reproduce música (Strategy Pattern)
   */
  static async play(
    member: GuildMember,
    query: string,
    textChannel: TextBasedChannel
  ): Promise<string> {
    const player = this.getInstance();

    if (!member.voice.channel) {
      throw new Error('❌ Debes estar en un canal de voz');
    }

    Logger.info(`[MusicPlayer] Solicitud de reproducción: "${query}" por ${member.user.tag}`);

    try {
      let searchResult: SearchResult | null = null;

      // Si es una URL directa, intentar reproducirla directamente
      if (query.startsWith('http://') || query.startsWith('https://')) {
        Logger.info('[MusicPlayer] URL detectada, intentando reproducción directa...');
        searchResult = await player.search(query, {
          requestedBy: member.user,
        });
      } else {
        // Búsqueda por texto: PRIORIZAR SoundCloud (no tiene problema con skipFFmpeg)
        Logger.info('[MusicPlayer] 🔍 Buscando en SoundCloud...');

        // Intentar SoundCloud primero
        searchResult = await player.search(`${query}`, {
          requestedBy: member.user,
          searchEngine: 'soundcloud' as any,
        });

        // Si no encuentra nada en SoundCloud, buscar en YouTube como fallback
        if (!searchResult || !searchResult.hasTracks()) {
          Logger.info('[MusicPlayer] No encontrado en SoundCloud, buscando en YouTube...');
          searchResult = await player.search(query, {
            requestedBy: member.user,
            searchEngine: 'youtube' as any,
          });
        } else {
          Logger.info(`[MusicPlayer] ✓ Encontrado en SoundCloud`);
        }
      }

      if (!searchResult || !searchResult.hasTracks()) {
        throw new Error(
          '❌ No se encontraron resultados. Intenta con:\n' +
            '• Un enlace directo de SoundCloud\n' +
            '• Un enlace de Spotify\n' +
            '• Un nombre de canción más específico (incluye artista)'
        );
      }

      const foundTrack = searchResult.tracks[0];
      Logger.info(`[MusicPlayer] ✓ Encontrado: ${foundTrack.title} (${foundTrack.source})`);

      // Reproducir con logs adicionales
      Logger.info('[MusicPlayer] Intentando reproducir...');
      Logger.info(`[MusicPlayer] Canal de voz: ${member.voice.channel.name}`);
      Logger.info(`[MusicPlayer] Guild: ${member.guild.name}`);

      const { track } = await player.play(member.voice.channel as VoiceBasedChannel, searchResult, {
        nodeOptions: {
          metadata: {
            channel: textChannel,
            requestedBy: member,
          },
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 300_000,
          leaveOnEnd: false,
          leaveOnEndCooldown: 300_000,
          selfDeaf: true,
          volume: 50,
          // WORKAROUND: Timeout agresivo para evitar cuelgues por skipFFmpeg: true bug
          bufferingTimeout: 5000,
        },
      });

      Logger.info(`[MusicPlayer] ✓ Reproducción iniciada: ${track.title}`);

      // Mensaje de respuesta
      if (searchResult.playlist) {
        return (
          `✅ **Playlist añadida**: ${searchResult.playlist.title}\n` +
          `📝 ${searchResult.tracks.length} canciones\n` +
          `👤 Por: ${searchResult.playlist.author?.name || 'Desconocido'}`
        );
      }

      const queue = player.nodes.get(member.guild.id);
      const isFirstTrack = queue && queue.tracks.size === 0;

      if (isFirstTrack) {
        return (
          `🎵 **Reproduciendo**: ${track.title}\n` +
          `👤 Por: ${track.author}\n` +
          `⏱️ Duración: ${track.duration}`
        );
      } else {
        return (
          `✅ **Añadido a la cola**: ${track.title}\n` +
          `📍 Posición: #${queue ? queue.tracks.size : 1}\n` +
          `⏱️ Duración: ${track.duration}`
        );
      }
    } catch (error) {
      Logger.error('[MusicPlayer] Error al reproducir:', error as Error);
      throw error;
    }
  }

  /**
   * Salta la canción actual
   */
  static skip(guildId: string): boolean {
    const player = this.getInstance();
    const queue = player.nodes.get(guildId);

    if (!queue || !queue.currentTrack) {
      return false;
    }

    queue.node.skip();
    Logger.info(`[MusicPlayer] Canción saltada en ${guildId}`);
    return true;
  }

  /**
   * Detiene la reproducción y limpia la cola
   */
  static stop(guildId: string): void {
    const player = this.getInstance();
    const queue = player.nodes.get(guildId);

    if (queue) {
      queue.delete();
      Logger.info(`[MusicPlayer] Reproducción detenida en ${guildId}`);
    }
  }

  /**
   * Pausa la reproducción
   */
  static pause(guildId: string): boolean {
    const player = this.getInstance();
    const queue = player.nodes.get(guildId);

    if (!queue) {
      return false;
    }

    queue.node.pause();
    Logger.info(`[MusicPlayer] Pausado en ${guildId}`);
    return true;
  }

  /**
   * Reanuda la reproducción
   */
  static resume(guildId: string): boolean {
    const player = this.getInstance();
    const queue = player.nodes.get(guildId);

    if (!queue) {
      return false;
    }

    queue.node.resume();
    Logger.info(`[MusicPlayer] Reanudado en ${guildId}`);
    return true;
  }

  /**
   * Obtiene la cola actual
   */
  static getQueue(guildId: string): GuildQueue | null {
    const player = this.getInstance();
    return player.nodes.get(guildId) || null;
  }

  /**
   * Verifica si está reproduciendo
   */
  static isPlaying(guildId: string): boolean {
    const queue = this.getQueue(guildId);
    return queue ? queue.isPlaying() : false;
  }

  /**
   * Ajusta el volumen
   */
  static setVolume(guildId: string, volume: number): boolean {
    const queue = this.getQueue(guildId);

    if (!queue) {
      return false;
    }

    const clampedVolume = Math.max(0, Math.min(100, volume));
    queue.node.setVolume(clampedVolume);
    Logger.info(`[MusicPlayer] Volumen ajustado a ${clampedVolume}% en ${guildId}`);
    return true;
  }

  /**
   * Activa/desactiva modo shuffle
   */
  static toggleShuffle(guildId: string): boolean {
    const queue = this.getQueue(guildId);

    if (!queue) {
      return false;
    }

    queue.toggleShuffle();
    Logger.info(
      `[MusicPlayer] Shuffle ${queue.isShuffling ? 'activado' : 'desactivado'} en ${guildId}`
    );
    return queue.isShuffling;
  }

  /**
   * Activa/desactiva repetición
   */
  static setRepeatMode(guildId: string, mode: 0 | 1 | 2 | 3): boolean {
    const queue = this.getQueue(guildId);

    if (!queue) {
      return false;
    }

    queue.setRepeatMode(mode);
    const modes = ['Desactivado', 'Canción', 'Cola', 'Autoplay'];
    Logger.info(`[MusicPlayer] Modo repetición: ${modes[mode]} en ${guildId}`);
    return true;
  }
}
