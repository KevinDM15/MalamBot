import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';
import { getAudioManager } from '../../services/music/v2/instances.js';

export const queue: Command = {
  name: 'queue',
  description: 'Muestra la cola de reproducción',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Este comando solo funciona en servidores.',
        ephemeral: true,
      });
      return;
    }

    const manager = getAudioManager();
    const serverQueue = manager.getQueue(interaction.guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
      await interaction.reply({
        content: '📭 La cola está vacía.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎵 Cola de Reproducción')
      .setDescription(
        serverQueue.songs
          .map(
            (song, index) =>
              `**${index + 1}.** ${song.title} \`[${song.duration}]\`\n└ 🎤 ${song.author} | Solicitado por ${song.requestedBy.username}`
          )
          .join('\n\n')
      )
      .setFooter({ text: `Total: ${serverQueue.songs.length} canción(es) en cola` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const data = new SlashCommandBuilder().setName(queue.name).setDescription(queue.description);
