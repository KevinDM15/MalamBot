import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { BotClient } from './core/client.js';
import { Logger } from './core/logger.js';
import * as pingCommand from './commands/utility/ping.js';
import * as playCommand from './commands/music/play.js';
import * as rankCommand from './commands/rocketleague/rank.js';
import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';

const client = new BotClient();

client.commands.set(pingCommand.ping.name, pingCommand.ping);
client.commands.set(playCommand.play.name, playCommand.play);
client.commands.set(rankCommand.rank.name, rankCommand.rank);

client.once(readyEvent.name, () => readyEvent.execute(client));
client.on(interactionCreateEvent.name, interactionCreateEvent.execute);

async function registerCommands() {
  const commands = [pingCommand.data, playCommand.data, rankCommand.data].map((command) =>
    command.toJSON()
  );

  const rest = new REST().setToken(config.discordToken);

  try {
    Logger.info('Registrando comandos slash...');

    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: commands,
      });
      Logger.info('✅ Comandos registrados en el servidor de desarrollo');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      Logger.info('✅ Comandos registrados globalmente');
    }
  } catch (error) {
    Logger.error('Error registrando comandos', error as Error);
  }
}

async function start() {
  try {
    await registerCommands();
    await client.login(config.discordToken);
  } catch (error) {
    Logger.error('Error iniciando el bot', error as Error);
    process.exit(1);
  }
}

start();
