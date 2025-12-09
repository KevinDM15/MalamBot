import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  entersState,
  VoiceConnectionStatus,
  StreamType,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import {
  VoiceBasedChannel,
  TextChannel,
  NewsChannel,
  VoiceChannel,
  StageChannel,
  EmbedBuilder,
} from 'discord.js';
import youtubedl from 'youtube-dl-exec';
import { Logger } from '../../../core/logger.js';
import { Song, ServerQueue, LoopMode } from './types.js';

type MusicTextChannel = TextChannel | NewsChannel;

/**
 * Sistema de audio simple y directo usando @discordjs/voice
 */
export class AudioManager {
  private queues: Map<string, ServerQueue> = new Map();
  private readonly INACTIVITY_TIMEOUT = 60_000; // 1 minuto en milisegundos

  /**
   * Añade una canción a la cola y empieza a reproducir si es la primera
   */
  async play(
    voiceChannel: VoiceBasedChannel,
    textChannel: MusicTextChannel,
    song: Song
  ): Promise<void> {
    const guildId = voiceChannel.guild.id;
    let queue = this.queues.get(guildId);

    if (!queue) {
      // Crear nueva cola
      const connection = await this.connect(voiceChannel);

      // Crear audio player con configuración optimizada
      const audioPlayer = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
          maxMissedFrames: Math.round(5000 / 20), // 5 segundos de frames (20ms por frame)
        },
      });

      queue = {
        textChannel,
        voiceConnection: connection,
        audioPlayer,
        songs: [song],
        volume: 50,
        playing: true,
        loop: 'off',
      };

      this.queues.set(guildId, queue);

      // Configurar eventos del reproductor
      this.setupPlayerEvents(queue, guildId);

      // Iniciar timer de inactividad
      this.resetInactivityTimer(queue, guildId);

      // Empezar a reproducir
      await this.playSong(queue);
    } else {
      // Añadir a cola existente
      queue.songs.push(song);
      Logger.info(`[AudioManager] Canción añadida a la cola: ${song.title}`);

      // Resetear timer de inactividad
      this.resetInactivityTimer(queue, voiceChannel.guild.id);

      // Crear embed para canción añadida a la cola
      const queueEmbed = new EmbedBuilder()
        .setColor(0x00d9ff)
        .setTitle('✅ Añadido a la cola')
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
          { name: '🎤 Artista', value: song.author, inline: true },
          { name: '⏱️ Duración', value: song.duration, inline: true },
          { name: '📍 Posición', value: `#${queue.songs.length}`, inline: true }
        )
        .setFooter({
          text: `Solicitado por ${song.requestedBy.username}`,
          iconURL: song.requestedBy.displayAvatarURL(),
        })
        .setTimestamp();

      if (song.thumbnail) {
        queueEmbed.setThumbnail(song.thumbnail);
      }

      await textChannel.send({ embeds: [queueEmbed] });
    }
  }

  /**
   * Añade múltiples canciones a la cola (para playlists)
   */
  async playMultiple(
    voiceChannel: VoiceBasedChannel,
    textChannel: MusicTextChannel,
    songs: Song[]
  ): Promise<void> {
    if (songs.length === 0) {
      return;
    }

    const guildId = voiceChannel.guild.id;
    let queue = this.queues.get(guildId);

    if (!queue) {
      // Crear nueva cola con todas las canciones
      const connection = await this.connect(voiceChannel);

      // Crear audio player con configuración optimizada
      const audioPlayer = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
          maxMissedFrames: Math.round(5000 / 20), // 5 segundos de frames
        },
      });

      queue = {
        textChannel,
        voiceConnection: connection,
        audioPlayer,
        songs: [...songs],
        volume: 50,
        playing: true,
        loop: 'off',
      };

      this.queues.set(guildId, queue);

      // Configurar eventos del reproductor
      this.setupPlayerEvents(queue, guildId);

      // Iniciar timer de inactividad
      this.resetInactivityTimer(queue, guildId);

      // Empezar a reproducir
      await this.playSong(queue);
    } else {
      // Añadir todas las canciones a la cola existente
      queue.songs.push(...songs);
      Logger.info(`[AudioManager] ${songs.length} canciones añadidas a la cola`);

      // Resetear timer de inactividad
      this.resetInactivityTimer(queue, voiceChannel.guild.id);

      // Crear embed para playlist añadida
      const playlistEmbed = new EmbedBuilder()
        .setColor(0x00d9ff)
        .setTitle('✅ Playlist añadida a la cola')
        .setDescription(`**${songs.length} canciones** han sido añadidas`)
        .addFields(
          { name: '🎵 Primera canción', value: songs[0].title, inline: false },
          { name: '📊 Total en cola', value: `${queue.songs.length} canciones`, inline: true },
          { name: '⏱️ Duración estimada', value: this.calculateTotalDuration(songs), inline: true }
        )
        .setFooter({
          text: `Solicitado por ${songs[0].requestedBy.username}`,
          iconURL: songs[0].requestedBy.displayAvatarURL(),
        })
        .setTimestamp();

      if (songs[0].thumbnail) {
        playlistEmbed.setThumbnail(songs[0].thumbnail);
      }

      await textChannel.send({ embeds: [playlistEmbed] });
    }
  }

  /**
   * Conecta al canal de voz con configuración optimizada
   */
  private async connect(voiceChannel: VoiceBasedChannel): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
      selfDeaf: true,
      selfMute: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      Logger.info(`[AudioManager] Conectado a ${voiceChannel.name}`);
      return connection;
    } catch (error) {
      connection.destroy();
      Logger.error('[AudioManager] Error conectando al canal de voz:', error as Error);
      throw error;
    }
  }

  /**
   * Reproduce la canción actual
   */
  private async playSong(queue: ServerQueue): Promise<void> {
    const song = queue.songs[0];

    if (!song) {
      // Crear embed de despedida
      const endEmbed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('👋 Cola terminada')
        .setDescription(
          'No hay más canciones en la cola. Me desconectaré en 1 minuto si no añades más.'
        )
        .setTimestamp();

      queue.textChannel.send({ embeds: [endEmbed] });

      // El timer de inactividad ya se inició en el evento Idle
      return;
    }

    // Si hay una canción, cancelar el timer de inactividad
    this.clearInactivityTimer(queue);

    try {
      Logger.info(`[AudioManager] Reproduciendo: ${song.title}`);
      Logger.info(`[AudioManager] URL: ${song.url}`);
      Logger.info(`[AudioManager] Source: ${song.source}`);

      // Usar youtube-dl-exec para crear un stream de audio directamente
      Logger.info(`[AudioManager] Creando stream con youtube-dl-exec...`);

      // youtube-dl-exec con configuración optimizada para streaming
      const process = youtubedl.exec(song.url, {
        output: '-', // Output to stdout
        format: 'bestaudio[ext=webm][acodec=opus]/bestaudio[ext=m4a]/bestaudio', // Preferir opus nativo
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
        rmCacheDir: true,
        // Opciones de buffering moderadas
        socketTimeout: 30,
        retries: 3,
      });

      if (!process.stdout) {
        throw new Error('No se pudo crear el stream de audio');
      }

      // Guardar el proceso actual para poder limpiarlo luego
      queue.currentProcess = process;

      // Manejar errores del proceso sin romper la app
      process.on('error', (error) => {
        Logger.error('[AudioManager] Error en proceso youtube-dl:', error);
      });

      // Manejar errores del stream stdout
      process.stdout?.on('error', (error) => {
        Logger.error('[AudioManager] Error en stdout stream:', error);
        // No hacer nada más, el error se maneja en el player
      });

      process.stderr?.on('data', (data) => {
        const message = data.toString();
        // Solo loggear advertencias importantes
        if (message.includes('ERROR') || message.includes('WARNING')) {
          Logger.debug(`[AudioManager] youtube-dl: ${message}`);
        }
      });

      Logger.info(`[AudioManager] Stream creado, creando recurso de audio...`);

      // Crear recurso de audio optimizado
      const resource = createAudioResource(process.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
        metadata: {
          title: song.title,
        },
      });

      // Establecer volumen
      resource.volume?.setVolume(queue.volume / 100);

      Logger.info(`[AudioManager] Reproduciendo recurso de audio...`);

      // Reproducir
      queue.audioPlayer.play(resource);
      queue.voiceConnection.subscribe(queue.audioPlayer);

      // Guardar el tiempo de inicio de la canción
      queue.currentSongStartTime = Date.now();

      // Esperar a que el reproductor esté realmente reproduciendo
      await entersState(queue.audioPlayer, AudioPlayerStatus.Playing, 5_000);
      Logger.info(`[AudioManager] Reproductor en estado Playing`);

      // Crear embed bonito para "Now Playing"
      const nowPlayingEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎵 Reproduciendo ahora')
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
          { name: '🎤 Artista', value: song.author, inline: true },
          { name: '⏱️ Duración', value: song.duration, inline: true },
          { name: '🔊 Volumen', value: `${queue.volume}%`, inline: true }
        )
        .setFooter({
          text: `Solicitado por ${song.requestedBy.username}`,
          iconURL: song.requestedBy.displayAvatarURL(),
        })
        .setTimestamp();

      if (song.thumbnail) {
        nowPlayingEmbed.setThumbnail(song.thumbnail);
      }

      // Añadir información de la cola si hay más canciones
      if (queue.songs.length > 1) {
        nowPlayingEmbed.addFields({
          name: '📋 Siguiente en la cola',
          value: queue.songs[1].title,
          inline: false,
        });
      }

      queue.textChannel.send({ embeds: [nowPlayingEmbed] });
    } catch (error) {
      Logger.error('[AudioManager] Error reproduciendo canción:', error as Error);
      if (error instanceof Error && error.stack) {
        Logger.error('[AudioManager] Stack:', error.stack as any);
      }
      queue.textChannel.send(`❌ Error al reproducir: ${song.title}`);
      queue.songs.shift();
      await this.playSong(queue);
    }
  }

  /**
   * Configura eventos del reproductor
   */
  private setupPlayerEvents(queue: ServerQueue, guildId: string): void {
    queue.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
      Logger.info('[AudioManager] Canción terminada - Estado: Idle');

      // Limpiar el proceso anterior
      this.cleanupCurrentProcess(queue);

      if (queue.loop === 'track') {
        // Repetir la misma canción
        Logger.info('[AudioManager] Repitiendo canción actual (loop: track)');
      } else if (queue.loop === 'queue') {
        // Mover la canción al final de la cola
        const currentSong = queue.songs.shift();
        if (currentSong) {
          queue.songs.push(currentSong);
        }
        Logger.info('[AudioManager] Rotando cola (loop: queue)');
      } else {
        // Sin loop, quitar la canción
        queue.songs.shift();
      }

      // Si no hay más canciones, iniciar timer de inactividad
      if (queue.songs.length === 0) {
        Logger.info('[AudioManager] No hay más canciones, iniciando timer de inactividad');
        this.resetInactivityTimer(queue, guildId);
      }

      await this.playSong(queue);
    });

    queue.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      Logger.info('[AudioManager] Estado del reproductor: Playing');
    });

    queue.audioPlayer.on(AudioPlayerStatus.Paused, () => {
      Logger.info('[AudioManager] Estado del reproductor: Paused');
    });

    queue.audioPlayer.on(AudioPlayerStatus.Buffering, () => {
      Logger.info('[AudioManager] Estado del reproductor: Buffering');
    });

    queue.audioPlayer.on(AudioPlayerStatus.AutoPaused, () => {
      Logger.info('[AudioManager] Estado del reproductor: AutoPaused');
    });

    queue.audioPlayer.on('error', (error) => {
      Logger.error('[AudioManager] Error en el reproductor:', error);
      this.cleanupCurrentProcess(queue);
      queue.songs.shift();
      this.playSong(queue);
    });

    queue.voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(queue.voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(queue.voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        Logger.warn('[AudioManager] Desconectado, limpiando cola');
        this.cleanupCurrentProcess(queue);
        this.clearInactivityTimer(queue);
        try {
          if (queue.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            queue.voiceConnection.destroy();
          }
        } catch (destroyError) {
          Logger.warn('[AudioManager] Error al destruir (ya estaba destruida)');
        }
        this.queues.delete(guildId);
      }
    });
  }

  /**
   * Salta la canción actual
   */
  skip(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || queue.songs.length === 0) {
      return false;
    }

    // Detener y limpiar el proceso de youtube-dl actual
    this.cleanupCurrentProcess(queue);

    // Detener el reproductor (esto triggereará el evento Idle)
    queue.audioPlayer.stop();
    return true;
  }

  /**
   * Detiene la reproducción y limpia la cola
   */
  stop(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    // Limpiar el proceso actual
    this.cleanupCurrentProcess(queue);

    // Limpiar timer de inactividad
    this.clearInactivityTimer(queue);

    queue.songs = [];
    queue.audioPlayer.stop();

    try {
      if (queue.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
        queue.voiceConnection.destroy();
      }
    } catch (error) {
      Logger.warn('[AudioManager] Error al destruir en stop (ya estaba destruida)');
    }

    this.queues.delete(guildId);
    return true;
  }

  /**
   * Limpia el proceso de youtube-dl actual
   */
  private cleanupCurrentProcess(queue: ServerQueue): void {
    if (queue.currentProcess) {
      try {
        // Remover listeners para evitar errores
        queue.currentProcess.removeAllListeners();

        // Matar el proceso si está corriendo
        if (!queue.currentProcess.killed) {
          queue.currentProcess.kill('SIGKILL');
          Logger.info('[AudioManager] Proceso youtube-dl terminado');
        }

        queue.currentProcess = undefined;
      } catch (error) {
        Logger.warn('[AudioManager] Error al limpiar proceso');
      }
    }
  }

  /**
   * Resetea el timer de inactividad
   */
  private resetInactivityTimer(queue: ServerQueue, guildId: string): void {
    // Limpiar timer anterior si existe
    if (queue.inactivityTimer) {
      clearTimeout(queue.inactivityTimer);
    }

    // Crear nuevo timer
    queue.inactivityTimer = setTimeout(() => {
      Logger.info(`[AudioManager] Inactividad detectada en ${guildId}, desconectando...`);

      const inactivityEmbed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('⏱️ Desconectado por inactividad')
        .setDescription('Me he desconectado después de 1 minuto de inactividad.')
        .setTimestamp();

      queue.textChannel.send({ embeds: [inactivityEmbed] });

      this.stop(guildId);
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Limpia el timer de inactividad
   */
  private clearInactivityTimer(queue: ServerQueue): void {
    if (queue.inactivityTimer) {
      clearTimeout(queue.inactivityTimer);
      queue.inactivityTimer = undefined;
    }
  }

  /**
   * Obtiene la cola de un servidor
   */
  getQueue(guildId: string): ServerQueue | undefined {
    return this.queues.get(guildId);
  }

  /**
   * Pausa la reproducción
   */
  pause(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.playing) {
      return false;
    }

    queue.audioPlayer.pause();
    queue.playing = false;

    // Iniciar timer de inactividad cuando se pausa
    this.resetInactivityTimer(queue, guildId);

    return true;
  }

  /**
   * Reanuda la reproducción
   */
  resume(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || queue.playing) {
      return false;
    }

    queue.audioPlayer.unpause();
    queue.playing = true;

    // Cancelar timer de inactividad cuando se reanuda
    this.clearInactivityTimer(queue);

    return true;
  }

  /**
   * Ajusta el volumen
   */
  setVolume(guildId: string, volume: number): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    queue.volume = Math.max(0, Math.min(100, volume));
    // El volumen se aplicará en la próxima canción
    return true;
  }

  /**
   * Establece el modo de repetición
   */
  setLoop(guildId: string, mode: LoopMode): boolean {
    const queue = this.queues.get(guildId);
    if (!queue) {
      return false;
    }

    queue.loop = mode;
    Logger.info(`[AudioManager] Modo de repetición establecido a: ${mode}`);
    return true;
  }

  /**
   * Obtiene el modo de repetición actual
   */
  getLoopMode(guildId: string): LoopMode | null {
    const queue = this.queues.get(guildId);
    return queue ? queue.loop : null;
  }

  /**
   * Calcula la duración total de una lista de canciones
   */
  private calculateTotalDuration(songs: Song[]): string {
    let totalSeconds = 0;

    for (const song of songs) {
      const parts = song.duration.split(':').map(Number);
      if (parts.length === 2) {
        totalSeconds += parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3) {
        totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
