import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAudioManager } from '../../services/music/v2/instances.js';
import { Logger } from '../../core/logger.js';
import { LoopMode } from '../../services/music/v2/types.js';

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Configura el modo de repetición')
  .addStringOption((option) =>
    option
      .setName('mode')
      .setDescription('Modo de repetición')
      .setRequired(true)
      .addChoices(
        { name: 'Desactivado', value: 'off' },
        { name: 'Repetir canción actual', value: 'track' },
        { name: 'Repetir toda la cola', value: 'queue' }
      )
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

    const mode = interaction.options.getString('mode', true) as LoopMode;
    const success = audioManager.setLoop(guildId, mode);

    if (success) {
      const messages = {
        off: '🔁 **Repetición desactivada**',
        track: '🔂 **Repitiendo canción actual**',
        queue: '🔁 **Repitiendo toda la cola**',
      };

      await interaction.editReply(messages[mode]);
      Logger.info(`[LoopCommand] Modo de repetición cambiado a: ${mode}`);
    } else {
      await interaction.editReply('❌ No se pudo cambiar el modo de repetición.');
    }
  } catch (error) {
    Logger.error('[LoopCommand] Error:', error as Error);
    await interaction.editReply('❌ Ocurrió un error al cambiar el modo de repetición.');
  }
}
