import { Player, GuildQueue, Track } from 'discord-player';
import { Logger } from '../../core/logger.js';
import { QueueMetadata } from './types.js';

/**
 * Observer Pattern - Maneja eventos del reproductor de música
 */
export class MusicEventHandler {
  constructor(private player: Player) {}

  registerEvents(): void {
    // CRITICAL WORKAROUND: Intercept stream config to fix skipFFmpeg bug
    this.player.events.on('willPlayTrack', async (queue, track, options) => {
      Logger.warn(`[🔧 INTERCEPTOR] ═══════════════════════════════`);
      Logger.warn(`[🔧 INTERCEPTOR] willPlayTrack para: ${track.title}`);
      Logger.warn(`[🔧 INTERCEPTOR] Source: ${track.source}`);

      // Access nested dispatcherConfig
      const dispatcher = (options as any).dispatcherConfig;
      if (dispatcher) {
        Logger.warn(`[🔧 INTERCEPTOR] dispatcherConfig.skipFFmpeg: ${dispatcher.skipFFmpeg}`);
        Logger.warn(`[🔧 INTERCEPTOR] dispatcherConfig.type: ${dispatcher.type}`);

        // FORCE FFmpeg processing
        if (dispatcher.skipFFmpeg === true) {
          Logger.warn(`[🔧 INTERCEPTOR] ⚠️ FORCING skipFFmpeg: true → false`);
          dispatcher.skipFFmpeg = false;
        }

        // Force arbitrary type for FFmpeg processing
        if (dispatcher.type === 'raw') {
          Logger.warn(`[🔧 INTERCEPTOR] ⚠️ FORCING type: 'raw' → 'arbitrary'`);
          dispatcher.type = 'arbitrary';
        }

        Logger.warn(
          `[🔧 INTERCEPTOR] ✅ Final - skipFFmpeg: ${dispatcher.skipFFmpeg}, type: ${dispatcher.type}`
        );
      } else {
        Logger.warn(`[🔧 INTERCEPTOR] ⚠️ No dispatcherConfig found!`);
      }

      Logger.warn(`[🔧 INTERCEPTOR] ═══════════════════════════════`);
    });

    this.player.events.on('playerStart', (queue, track) => {
      this.onPlayerStart(queue, track);
    });

    this.player.events.on('playerStart', (queue, track) => {
      this.onPlayerStart(queue, track);
    });

    this.player.events.on('audioTrackAdd', (queue, track) => {
      this.onTrackAdd(queue, track);
    });

    this.player.events.on('emptyQueue', (queue) => {
      this.onEmptyQueue(queue);
    });

    this.player.events.on('emptyChannel', (queue) => {
      this.onEmptyChannel(queue);
    });

    this.player.events.on('playerError', (queue, error) => {
      this.onPlayerError(queue, error);
    });

    this.player.events.on('error', (queue, error) => {
      this.onError(queue, error);
    });

    this.player.events.on('connection', (queue) => {
      this.onConnection(queue);
    });

    this.player.events.on('disconnect', (queue) => {
      this.onDisconnect(queue);
    });

    this.player.events.on('playerSkip', (queue, track) => {
      Logger.info(`[Skipped] ${track.title} en ${queue.guild.name}`);
    });

    // Eventos adicionales de estado
    this.player.events.on('audioTracksAdd', (queue, tracks) => {
      Logger.info(`[Tracks Added] ${tracks.length} tracks añadidos a la cola`);
    });

    this.player.events.on('playerPause', (queue) => {
      Logger.info(`[Paused] Reproducción pausada en ${queue.guild.name}`);
    });

    this.player.events.on('playerResume', (queue) => {
      Logger.info(`[Resumed] Reproducción reanudada en ${queue.guild.name}`);
    });

    this.player.events.on('debug', (queue, message) => {
      // Mostrar todos los mensajes debug para diagnosticar
      Logger.debug(`[Player Debug] ${message}`);
    });

    Logger.info('[MusicEventHandler] Eventos registrados');
  }

  private onPlayerStart(queue: GuildQueue, track: Track): void {
    Logger.info(`[▶️ Playing] ═══════════════════════════════`);
    Logger.info(`[▶️ Playing] 🎵 ${track.title} en ${queue.guild.name}`);
    Logger.info(`[▶️ Playing] 📊 Cola: ${queue.tracks.size} tracks en espera`);
    Logger.info(`[▶️ Playing] ✓ Playing: ${queue.isPlaying()}`);
    Logger.info(
      `[▶️ Playing] 🔗 Connection: ${queue.connection ? 'Conectado ✓' : 'Desconectado ❌'}`
    );
    Logger.info(`[▶️ Playing] 🔊 Volumen: ${queue.node.volume}%`);
    Logger.info(`[▶️ Playing] 🎬 URL: ${track.url}`);
    Logger.info(`[▶️ Playing] 📻 Source: ${track.raw?.source || track.source}`);
    Logger.info(`[▶️ Playing] ═══════════════════════════════`);

    const metadata = queue.metadata as QueueMetadata;
    if (metadata?.channel && 'send' in metadata.channel) {
      metadata.channel
        .send({
          content:
            `🎵 **Reproduciendo ahora**\n` +
            `📀 **${track.title}**\n` +
            `👤 Por: ${track.author}\n` +
            `⏱️ Duración: ${track.duration}\n` +
            `👥 Solicitado por: ${track.requestedBy}`,
        })
        .catch(() => {});
    }
  }

  private onTrackAdd(queue: GuildQueue, track: Track): void {
    Logger.info(`[➕ Added] ${track.title} a la cola de ${queue.guild.name}`);
  }

  private onEmptyQueue(queue: GuildQueue): void {
    Logger.info(`[✅ Finished] Cola vacía en ${queue.guild.name}`);

    const metadata = queue.metadata as QueueMetadata;
    if (metadata?.channel && 'send' in metadata.channel) {
      metadata.channel.send('✅ Cola de reproducción terminada. ¡Hasta luego!').catch(() => {});
    }
  }

  private onEmptyChannel(queue: GuildQueue): void {
    Logger.info(`[👋 Left] Canal vacío en ${queue.guild.name}, desconectando...`);

    const metadata = queue.metadata as QueueMetadata;
    if (metadata?.channel && 'send' in metadata.channel) {
      metadata.channel.send('👋 Me voy porque no hay nadie en el canal.').catch(() => {});
    }
  }

  private onPlayerError(queue: GuildQueue, error: Error): void {
    Logger.error(`[❌ Player Error] en ${queue.guild.name}:`, error);
    if (error.stack) {
      Logger.error(`[❌ Player Error] Stack: ${error.stack}`);
    }
    const currentTrack = queue.currentTrack;
    Logger.error(`[❌ Player Error] Current track: ${currentTrack?.title || 'None'}`);
    if (currentTrack) {
      Logger.error(`[❌ Player Error] Track URL: ${currentTrack.url}`);
      Logger.error(`[❌ Player Error] Track source: ${currentTrack.raw?.source || 'unknown'}`);
    }

    const metadata = queue.metadata as QueueMetadata;
    if (metadata?.channel && 'send' in metadata.channel) {
      const errorMessage = this.getUserFriendlyErrorMessage(error);
      metadata.channel.send(errorMessage).catch(() => {});
    }

    // Intentar saltar a la siguiente canción automáticamente
    if (queue.tracks.size > 0) {
      Logger.info('[❌ Player Error] Intentando reproducir siguiente canción...');
      setTimeout(() => {
        try {
          queue.node.skip();
        } catch (skipError) {
          Logger.error('[❌ Player Error] No se pudo saltar:', skipError as Error);
        }
      }, 1000);
    }
  }

  private onError(queue: GuildQueue, error: Error): void {
    Logger.error(`[❌ Error] en ${queue.guild.name}:`, error);
    if (error.stack) {
      Logger.error(`[❌ Error] Stack: ${error.stack}`);
    }

    const metadata = queue.metadata as QueueMetadata;
    if (metadata?.channel && 'send' in metadata.channel) {
      const errorMessage = this.getUserFriendlyErrorMessage(error);
      metadata.channel.send(errorMessage).catch(() => {});
    }
  }

  private getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('could not extract') || message.includes('err_no_result')) {
      return (
        `❌ No se pudo extraer el audio de esta canción.\n` +
        `💡 Posibles soluciones:\n` +
        `  • Intenta con otra canción o URL\n` +
        `  • Busca por nombre en lugar de URL\n` +
        `  • El video puede tener restricciones\n` +
        `Usa \`/skip\` para saltar esta canción.`
      );
    }

    if (message.includes('stream') || message.includes('audio')) {
      return `❌ Error con el stream de audio. Usa \`/skip\` para continuar.`;
    }

    return `❌ Error al reproducir: ${error.message}\nUsa \`/skip\` para saltar esta canción.`;
  }

  private onConnection(queue: GuildQueue): void {
    Logger.info(`[🔗 Connected] a canal de voz en ${queue.guild.name}`);
    Logger.info(`[🔗 Connected] Estado: playing=${queue.isPlaying()}, tracks=${queue.tracks.size}`);
  }

  private onDisconnect(queue: GuildQueue): void {
    Logger.info(`[🔌 Disconnected] ═══════════════════════════════`);
    Logger.info(`[🔌 Disconnected] ❌ Desconectado de canal en ${queue.guild.name}`);
    Logger.info(`[🔌 Disconnected] 📊 Cola vacía: ${queue.tracks.size === 0}`);
    Logger.info(`[🔌 Disconnected] 🎵 Estaba reproduciendo: ${queue.isPlaying()}`);
    Logger.info(`[🔌 Disconnected] 🎬 Track actual: ${queue.currentTrack?.title || 'Ninguno'}`);
    Logger.info(
      `[🔌 Disconnected] 🔗 Connection state: ${queue.connection?.state?.status || 'Unknown'}`
    );
    Logger.info(`[🔌 Disconnected] ═══════════════════════════════`);
  }
}
