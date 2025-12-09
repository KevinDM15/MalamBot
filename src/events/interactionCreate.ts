import { Events, Interaction } from 'discord.js';
import { BotClient } from '../core/client.js';
import { Logger } from '../core/logger.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  const client = interaction.client as BotClient;

  // Manejar autocomplete
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      Logger.warn(`Comando no encontrado para autocomplete: ${interaction.commandName}`);
      return;
    }

    if (!command.autocomplete) {
      Logger.warn(`Comando ${interaction.commandName} no tiene función autocomplete`);
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      Logger.error(`Error en autocomplete ${interaction.commandName}`, error as Error);
    }
    return;
  }

  // Manejar comandos normales
  if (!interaction.isChatInputCommand()) return;

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
