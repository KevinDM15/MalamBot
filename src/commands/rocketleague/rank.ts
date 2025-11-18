import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';
import { fetchRank } from './fetchRank.js';

export const rank: Command = {
  name: 'rank',
  description: 'Obtiene el rango de Rocket League de un jugador',
  execute: async (interaction: CommandInteraction) => {
    const playerId = interaction.options.get('playerid')?.value as string;

    await interaction.deferReply();

    try {
      const rankData = await fetchRank(playerId);
      await interaction.editReply(
        `🚗 **Jugador:** ${rankData.playerId}\n**Rango:** ${rankData.rank}\n**División:** ${rankData.division}\n**MMR:** ${rankData.mmr}`
      );
    } catch (error) {
      await interaction.editReply('❌ No se pudo obtener el rango del jugador.');
    }
  },
};

export const data = new SlashCommandBuilder()
  .setName(rank.name)
  .setDescription(rank.description)
  .addStringOption((option) =>
    option.setName('playerid').setDescription('ID del jugador de Rocket League').setRequired(true)
  );
