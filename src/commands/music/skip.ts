import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';
import { getAudioManager } from '../../services/music/v2/instances.js';

export const skip: Command = {
  name: 'skip',
  description: 'Salta a la siguiente canción',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Este comando solo funciona en servidores.',
        ephemeral: true,
      });
      return;
    }

    const manager = getAudioManager();
    const skipped = manager.skip(interaction.guildId);

    if (skipped) {
      await interaction.reply('⏭️ Canción saltada.');
    } else {
      await interaction.reply({
        content: '❌ No hay música reproduciéndose.',
        ephemeral: true,
      });
    }
  },
};

export const data = new SlashCommandBuilder().setName(skip.name).setDescription(skip.description);
