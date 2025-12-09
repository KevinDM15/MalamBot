import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAudioManager } from '../../services/music/v2/instances.js';
import { Logger } from '../../core/logger.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Muestra información sobre la canción actual');

/**
 * Convierte una duración en formato MM:SS o HH:MM:SS a segundos
 */
function durationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return 0;
}

/**
 * Convierte segundos a formato MM:SS o HH:MM:SS
 */
function secondsToDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Crea una barra de progreso visual
 */
function createProgressBar(current: number, total: number, length: number = 20): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;

  const filledBar = '▬'.repeat(filled);
  const emptyBar = '─'.repeat(empty);

  return `${filledBar}🔘${emptyBar}`;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.editReply('❌ Este comando solo funciona en servidores.');
      return;
    }

    const audioManager = getAudioManager();
    const queue = audioManager.getQueue(guildId);

    if (!queue || queue.songs.length === 0) {
      await interaction.editReply('❌ No hay nada reproduciéndose.');
      return;
    }

    const currentSong = queue.songs[0];
    const totalSeconds = durationToSeconds(currentSong.duration);

    // Calcular tiempo transcurrido
    let elapsedSeconds = 0;
    if (queue.currentSongStartTime && queue.playing) {
      elapsedSeconds = Math.floor((Date.now() - queue.currentSongStartTime) / 1000);
      elapsedSeconds = Math.min(elapsedSeconds, totalSeconds); // No exceder la duración total
    }

    const progressBar = createProgressBar(elapsedSeconds, totalSeconds);
    const elapsedTime = secondsToDuration(elapsedSeconds);

    // Iconos para el estado
    const statusIcon = queue.playing ? '▶️' : '⏸️';
    const loopIcons = {
      off: '',
      track: '🔂',
      queue: '🔁',
    };

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎵 Reproduciendo Ahora')
      .setDescription(`**${currentSong.title}**`)
      .addFields(
        { name: '🎤 Artista', value: currentSong.author, inline: true },
        { name: '👥 Solicitado por', value: currentSong.requestedBy.username, inline: true },
        { name: '🔊 Volumen', value: `${queue.volume}%`, inline: true }
      )
      .addFields({
        name: '⏱️ Progreso',
        value: `${progressBar}\n\`${elapsedTime}\` / \`${currentSong.duration}\``,
        inline: false,
      });

    // Agregar información adicional
    const statusParts = [statusIcon];
    if (queue.loop !== 'off') {
      statusParts.push(loopIcons[queue.loop]);
    }
    if (queue.songs.length > 1) {
      statusParts.push(`📋 ${queue.songs.length - 1} en cola`);
    }

    if (statusParts.length > 1) {
      embed.addFields({
        name: '📊 Estado',
        value: statusParts.join(' • '),
        inline: false,
      });
    }

    if (currentSong.thumbnail) {
      embed.setThumbnail(currentSong.thumbnail);
    }

    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    Logger.info('[NowPlayingCommand] Información mostrada');
  } catch (error) {
    Logger.error('[NowPlayingCommand] Error:', error as Error);
    await interaction.editReply('❌ Ocurrió un error al obtener la información de la canción.');
  }
}
