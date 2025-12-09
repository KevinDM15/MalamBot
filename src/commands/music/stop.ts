import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';
import { getAudioManager } from '../../services/music/v2/instances.js';

export const stop: Command = {
  name: 'stop',
  description: 'Detiene la música y limpia la cola',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Este comando solo funciona en servidores.',
        ephemeral: true,
      });
      return;
    }

    const manager = getAudioManager();
    manager.stop(interaction.guildId);
    await interaction.reply('⏹️ Música detenida y desconectado del canal de voz.');
  },
};

export const data = new SlashCommandBuilder().setName(stop.name).setDescription(stop.description);
