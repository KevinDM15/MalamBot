import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAudioManager } from '../../services/music/v2/instances.js';
import { Logger } from '../../core/logger.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Ajusta el volumen de la música')
  .addIntegerOption((option) =>
    option
      .setName('level')
      .setDescription('Nivel de volumen (0-100)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100)
  );

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

    const level = interaction.options.getInteger('level', true);
    const success = audioManager.setVolume(guildId, level);

    if (success) {
      await interaction.editReply(`🔊 **Volumen ajustado a ${level}%**`);
      Logger.info(`[VolumeCommand] Volumen ajustado a: ${level}%`);
    } else {
      await interaction.editReply('❌ No se pudo ajustar el volumen.');
    }
  } catch (error) {
    Logger.error('[VolumeCommand] Error:', error as Error);
    await interaction.editReply('❌ Ocurrió un error al ajustar el volumen.');
  }
}
