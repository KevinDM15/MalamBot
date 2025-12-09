import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAudioManager } from '../../services/music/v2/instances.js';
import { Logger } from '../../core/logger.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pausa la canción actual');

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
    if (!queue) {
      await interaction.editReply('❌ No hay nada reproduciéndose.');
      return;
    }

    if (!queue.playing) {
      await interaction.editReply('⏸️ La música ya está en pausa.');
      return;
    }

    const success = audioManager.pause(guildId);

    if (success) {
      await interaction.editReply('⏸️ **Música en pausa**');
      Logger.info('[PauseCommand] Música pausada');
    } else {
      await interaction.editReply('❌ No se pudo pausar la música.');
    }
  } catch (error) {
    Logger.error('[PauseCommand] Error:', error as Error);
    await interaction.editReply('❌ Ocurrió un error al pausar la música.');
  }
}
