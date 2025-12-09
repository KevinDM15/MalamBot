import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  AutocompleteInteraction,
  TextChannel,
  NewsChannel,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types.js';
import { getAudioManager, getSearchService } from '../../services/music/v2/instances.js';
import { Logger } from '../../core/logger.js';

export const play: Command = {
  name: 'play',
  description: 'Reproduce música de YouTube, Spotify y más',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Este comando solo funciona en servidores.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
      await interaction.reply({
        content: '❌ Debes estar en un canal de voz para usar este comando.',
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString('url', true);

    await interaction.deferReply();

    try {
      Logger.info(`[Play Command] Buscando: ${query}`);

      const manager = getAudioManager();
      const search = getSearchService();

      // Verificar si es una playlist
      const isPlaylist =
        query.includes('youtube.com/playlist') ||
        query.includes('list=') ||
        query.includes('spotify.com/playlist/') ||
        query.includes('spotify.com/album/');

      if (isPlaylist) {
        // Buscar playlist
        const loadingEmbed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('🔍 Cargando playlist...')
          .setDescription('Por favor espera mientras procesamos la playlist')
          .setTimestamp();

        await interaction.editReply({ embeds: [loadingEmbed] });
        const songs = await search.searchPlaylist(query, interaction.user);

        if (songs.length === 0) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Error')
            .setDescription('No se pudo cargar la playlist. Verifica que la URL sea correcta.')
            .setTimestamp();

          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        // Reproducir todas las canciones
        const textChannel = interaction.channel as TextChannel | NewsChannel;
        await manager.playMultiple(member.voice.channel, textChannel, songs);

        const successEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ Playlist cargada')
          .setDescription(`**${songs.length} canciones** añadidas a la cola`)
          .addFields({ name: '🎵 Primera canción', value: songs[0].title, inline: false })
          .setTimestamp();

        if (songs[0].thumbnail) {
          successEmbed.setThumbnail(songs[0].thumbnail);
        }

        await interaction.editReply({ embeds: [successEmbed] });
      } else {
        // Buscar canción individual
        const loadingEmbed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('🔍 Buscando...')
          .setDescription(`Buscando: **${query}**`)
          .setTimestamp();

        await interaction.editReply({ embeds: [loadingEmbed] });
        const song = await search.search(query, interaction.user);

        if (!song) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ No se encontró')
            .setDescription(
              'No se encontró la canción. Intenta con:\n\n' +
                '• Un enlace de YouTube\n' +
                '• Un enlace de Spotify\n' +
                '• Un nombre de canción más específico'
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        // Reproducir
        const textChannel = interaction.channel as TextChannel | NewsChannel;
        await manager.play(member.voice.channel, textChannel, song);

        // Mensaje de confirmación si ya hay cola
        const queue = manager.getQueue(interaction.guildId);
        if (queue && queue.songs.length > 1) {
          // El AudioManager ya envió el mensaje de "añadido a cola"
          const confirmEmbed = new EmbedBuilder()
            .setColor(0x00d9ff)
            .setTitle('✅ Canción encontrada')
            .setDescription(`**[${song.title}](${song.url})**`)
            .setTimestamp();

          if (song.thumbnail) {
            confirmEmbed.setThumbnail(song.thumbnail);
          }

          await interaction.editReply({ embeds: [confirmEmbed] });
        } else {
          // Primera canción, AudioManager enviará el "Now Playing"
          await interaction.deleteReply();
        }
      }
    } catch (error) {
      Logger.error('[Play Command] Error:', error as Error);
      await interaction.editReply(`❌ Error: ${(error as Error).message}`);
    }
  },
  autocomplete: async (interaction: AutocompleteInteraction) => {
    const query = interaction.options.getFocused();

    // Si no hay query o es muy corto, no buscar
    if (!query || query.length < 2) {
      await interaction.respond([]);
      return;
    }

    // Si es una URL, mostrarla directamente
    if (query.startsWith('http://') || query.startsWith('https://')) {
      await interaction.respond([
        {
          name: `🔗 ${query.substring(0, 97)}...`,
          value: query,
        },
      ]);
      return;
    }

    // Por ahora, sugerir buscar como está
    await interaction.respond([
      {
        name: `🔍 Buscar: ${query}`,
        value: query,
      },
    ]);
  },
};

export const data = new SlashCommandBuilder()
  .setName(play.name)
  .setDescription(play.description)
  .addStringOption((option) =>
    option
      .setName('url')
      .setDescription('URL de YouTube/Spotify o nombre de canción')
      .setRequired(true)
      .setAutocomplete(true)
  );
