import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types.js';
import { fetchRank } from './fetchRank.js';

// Emojis para cada modo de juego
const GAME_MODE_EMOJIS = {
  standard3v3: '🏆',
  doubles2v2: '🎯',
  duel1v1: '⚔️',
  tournament: '🏅',
};

// Emojis para plataformas
const PLATFORM_EMOJIS: Record<string, string> = {
  epic: '🎮',
  steam: '💻',
  psn: '🎮',
  xbl: '🎮',
  switch: '🎮',
};

// Colores basados en el rango
function getRankColor(rank: string): number {
  const rankLower = rank.toLowerCase();
  if (rankLower.includes('supersonic legend')) return 0xb19cd9; // SSL - Light Purple
  if (rankLower.includes('grand champion')) return 0xe32636; // GC - Red
  if (rankLower.includes('champion')) return 0xc55dff; // Champion - Purple
  if (rankLower.includes('diamond')) return 0x4169e1; // Diamond - Royal Blue
  if (rankLower.includes('platinum')) return 0x00ced1; // Platinum - Cyan
  if (rankLower.includes('gold')) return 0xffd700; // Gold
  if (rankLower.includes('silver')) return 0xc0c0c0; // Silver
  if (rankLower.includes('bronze')) return 0xcd7f32; // Bronze
  return 0x7289da; // Default - Discord Blue
}

// Obtener el rango más alto para el color del embed
function getHighestRank(rankData: any): string {
  const ranks = [
    rankData.standard3v3?.rank,
    rankData.doubles2v2?.rank,
    rankData.duel1v1?.rank,
    rankData.tournament?.rank,
  ].filter((r) => r !== undefined);

  // Prioridad: SSL > GC > Champion > Diamond > Platinum > Gold > Silver > Bronze
  const priority = [
    'supersonic legend',
    'grand champion',
    'champion',
    'diamond',
    'platinum',
    'gold',
    'silver',
    'bronze',
  ];

  for (const rank of priority) {
    const found = ranks.find((r) => r.toLowerCase().includes(rank));
    if (found) return found;
  }

  return ranks[0] || 'Unranked';
}

// Crear barra de progreso más elegante
function createProgressBar(division: number): string {
  const divisions = 4; // Rocket League tiene 4 divisiones
  const percentage = (division + 1) / divisions;
  const filled = Math.round(percentage * 8);
  const empty = 8 - filled;

  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

export const rank: Command = {
  name: 'rank',
  description: 'Obtiene el rango de Rocket League de un jugador',
  execute: async (interaction: ChatInputCommandInteraction) => {
    const platform = interaction.options.getString('platform', true);
    const username = interaction.options.getString('username', true);
    const playerId = `${platform}:${username}`;

    await interaction.deferReply();

    try {
      const rankData = await fetchRank(playerId);

      // Obtener el rango más alto para el color
      const highestRank = getHighestRank(rankData);
      const embedColor = getRankColor(highestRank);

      // Obtener emoji de plataforma
      const platformEmoji = PLATFORM_EMOJIS[platform] || '🎮';

      // Procesar cada modo de juego
      const modes = [
        { key: 'standard3v3' as const, name: 'Standard 3v3', emoji: '🏆' },
        { key: 'doubles2v2' as const, name: 'Doubles 2v2', emoji: '🎯' },
        { key: 'duel1v1' as const, name: 'Duel 1v1', emoji: '⚔️' },
        { key: 'tournament' as const, name: 'Tournament', emoji: '🏅' },
      ];

      const embeds: EmbedBuilder[] = [];
      let rankedModes = 0;

      // Embed principal con header
      const mainEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${rankData.playerId}`)
        .setDescription(`${platformEmoji} **${platform.toUpperCase()}**`)
        .setTimestamp()
        .setFooter({
          text: `Tracker Network`,
          iconURL:
            'https://trackercdn.com/cdn/tracker.gg/rocket-league/logos/tracker-rocket-league.png',
        });

      for (const mode of modes) {
        const modeData = rankData[mode.key];
        if (modeData && modeData.rank) {
          rankedModes++;

          const divisionText =
            modeData.division !== undefined ? `Div ${modeData.division + 1}` : '';

          const progressBar =
            modeData.division !== undefined ? createProgressBar(modeData.division) : '▱▱▱▱▱▱▱▱';

          // Crear un embed separado para cada modo con su icono
          const modeEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${mode.emoji} ${mode.name}`)
            .setDescription(
              `**${modeData.rank}${divisionText ? ` • ${divisionText}` : ''}**\n` +
                `${progressBar}  \`${modeData.mmr} MMR\``
            )
            .setThumbnail(modeData.iconUrl || null);

          embeds.push(modeEmbed);
        }
      }

      // Si no hay modos clasificados
      if (rankedModes === 0) {
        mainEmbed.setDescription(
          `${platformEmoji} **${platform.toUpperCase()}**\n\n⚠️ Este jugador no tiene rangos clasificados.`
        );
        await interaction.editReply({ embeds: [mainEmbed] });
      } else {
        // Actualizar footer con número de modos
        mainEmbed.setFooter({
          text: `Tracker Network • ${rankedModes} ranked mode${rankedModes !== 1 ? 's' : ''}`,
          iconURL:
            'https://trackercdn.com/cdn/tracker.gg/rocket-league/logos/tracker-rocket-league.png',
        });

        // Enviar el embed principal + los embeds de cada modo
        await interaction.editReply({ embeds: [mainEmbed, ...embeds] });
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(
          `No se pudo obtener información de **${username}**\n\n` +
            `**Posibles causas:**\n` +
            `• Nombre de usuario incorrecto\n` +
            `• Plataforma incorrecta\n` +
            `• Perfil privado o inexistente`
        )
        .setFooter({ text: 'Verifica el nombre y la plataforma' })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

export const data = new SlashCommandBuilder()
  .setName(rank.name)
  .setDescription(rank.description)
  .addStringOption((option) =>
    option
      .setName('platform')
      .setDescription('Plataforma del jugador')
      .setRequired(true)
      .addChoices(
        { name: '🎮 Epic Games', value: 'epic' },
        { name: '💻 Steam', value: 'steam' },
        { name: '🎮 PlayStation', value: 'psn' },
        { name: '🎮 Xbox', value: 'xbl' },
        { name: '🎮 Nintendo Switch', value: 'switch' }
      )
  )
  .addStringOption((option) =>
    option.setName('username').setDescription('Nombre de usuario del jugador').setRequired(true)
  );
