import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';

export const ping: Command = {
  name: 'ping',
  description: 'Responde con Pong!',
  execute: async (interaction: ChatInputCommandInteraction) => {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`🏓 Pong! Latency: ${latency}ms`);
  },
};

export const data = new SlashCommandBuilder()
  .setName(ping.name)
  .setDescription(ping.description);
