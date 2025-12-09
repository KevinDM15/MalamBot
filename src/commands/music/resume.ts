import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAudioManager } from '../../services/music/v2/instances.js';
import { Logger } from '../../core/logger.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Reanuda la música pausada');

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

    if (queue.playing) {
      await interaction.editReply('▶️ La música ya está reproduciéndose.');
      return;
    }

    const success = audioManager.resume(guildId);

    if (success) {
      await interaction.editReply('▶️ **Música reanudada**');
      Logger.info('[ResumeCommand] Música reanudada');
    } else {
      await interaction.editReply('❌ No se pudo reanudar la música.');
    }
  } catch (error) {
    Logger.error('[ResumeCommand] Error:', error as Error);
    await interaction.editReply('❌ Ocurrió un error al reanudar la música.');
  }
}
