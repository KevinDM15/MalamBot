import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';

export const play: Command = {
  name: 'play',
  description: 'Reproduce música (placeholder)',
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply('🎵 Comando de música en desarrollo. Próximamente...');
  },
};

export const data = new SlashCommandBuilder()
  .setName(play.name)
  .setDescription(play.description)
  .addStringOption((option) =>
    option.setName('cancion').setDescription('Nombre o URL de la canción').setRequired(true)
  );
