import { Events, Interaction } from 'discord.js';
import { BotClient } from '../core/client.js';
import { Logger } from '../core/logger.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const client = interaction.client as BotClient;
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    Logger.warn(`Comando no encontrado: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
    Logger.info(`Comando ejecutado: ${interaction.commandName} por ${interaction.user.tag}`);
  } catch (error) {
    Logger.error(`Error ejecutando comando ${interaction.commandName}`, error as Error);
    const reply = {
      content: '❌ Hubo un error al ejecutar este comando.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
